<#
.SYNOPSIS
Stops OpenChamber development and installed-app process trees on Windows.

.DESCRIPTION
Finds repo-launched OpenChamber, Electron, Vite, and nodemon processes by
command line. It also probes local HTTP listeners and recognizes OpenChamber
servers by their /health response, which catches orphaned backends whose command
line no longer contains the repository path.

The script terminates whole process trees so managed OpenCode children do not
remain behind. It deliberately does not match arbitrary opencode.exe processes.

.EXAMPLE
.\kill-openchamber.ps1

.EXAMPLE
.\kill-openchamber.ps1 -WhatIf
#>

[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'Medium')]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\')
$repoPattern = [regex]::Escape($repoRoot)
$devCommandPattern = '(?i)(electron-dev\.mjs|dev-web-(?:hmr|full)\.mjs|oc-dev\.mjs|node_modules[\\/].*(?:vite|nodemon)|server[\\/]index\.js|packages[\\/]electron[\\/](?:main|dist-bundle))'
$candidateProcessNames = @('bun.exe', 'electron.exe', 'node.exe', 'OpenChamber.exe')

# Get-NetTCPConnection auto-loads NetTCPIP. Import it outside WhatIf mode so
# module initialization does not print misleading "New Alias" dry-run lines.
$requestedWhatIf = $WhatIfPreference
$WhatIfPreference = $false
Import-Module NetTCPIP -ErrorAction Stop
$WhatIfPreference = $requestedWhatIf

function Get-ProcessSnapshot {
  $snapshot = @{}
  foreach ($process in Get-CimInstance -ClassName Win32_Process) {
    $snapshot[[int]$process.ProcessId] = $process
  }
  return $snapshot
}

function Get-OpenChamberHealthListeners {
  param(
    [Parameter(Mandatory)]
    [hashtable]$ProcessSnapshot
  )

  $result = @{}
  $handler = [System.Net.Http.HttpClientHandler]::new()
  $client = [System.Net.Http.HttpClient]::new($handler)
  $client.Timeout = [TimeSpan]::FromMilliseconds(400)

  try {
    $listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
      Where-Object {
        $ProcessSnapshot.ContainsKey([int]$_.OwningProcess) -and
        $candidateProcessNames -contains [string]$ProcessSnapshot[[int]$_.OwningProcess].Name
      } |
      Sort-Object LocalPort -Unique

    foreach ($listener in $listeners) {
      $port = [int]$listener.LocalPort
      try {
        $json = $client.GetStringAsync("http://127.0.0.1:$port/health").GetAwaiter().GetResult()
        $health = $json | ConvertFrom-Json
        if (
          $health.status -eq 'ok' -and
          $null -ne $health.openchamberVersion -and
          $null -ne $health.compatibility.apiVersion
        ) {
          $result[[int]$listener.OwningProcess] = "OpenChamber server on port $port"

          if ($health.openCodePort -is [int] -or $health.openCodePort -is [long]) {
            $openCodeListener = Get-NetTCPConnection -State Listen -LocalPort ([int]$health.openCodePort) -ErrorAction SilentlyContinue |
              Select-Object -First 1
            if ($null -ne $openCodeListener) {
              $result[[int]$openCodeListener.OwningProcess] = "managed OpenCode for port $port"
            }
          }
        }
      } catch {
        # Most local listeners are unrelated services. A failed health probe is
        # expected and must not turn them into cleanup candidates.
      }
    }
  } finally {
    $client.Dispose()
    $handler.Dispose()
  }

  return $result
}

function Find-OpenChamberProcesses {
  $snapshot = Get-ProcessSnapshot
  $candidates = Get-OpenChamberHealthListeners -ProcessSnapshot $snapshot

  foreach ($entry in $snapshot.GetEnumerator()) {
    $process = $entry.Value
    $processId = [int]$process.ProcessId
    if ($processId -eq $PID) {
      continue
    }

    $name = [string]$process.Name
    $commandLine = [string]$process.CommandLine

    if ($name -ieq 'OpenChamber.exe') {
      $candidates[$processId] = 'installed OpenChamber process'
      continue
    }

    if ($commandLine -match $repoPattern -and $commandLine -match $devCommandPattern) {
      $candidates[$processId] = 'OpenChamber development process'
    }
  }

  $queue = [System.Collections.Generic.Queue[int]]::new()
  foreach ($processId in @($candidates.Keys)) {
    $queue.Enqueue([int]$processId)
  }

  while ($queue.Count -gt 0) {
    $parentId = $queue.Dequeue()
    foreach ($entry in $snapshot.GetEnumerator()) {
      $process = $entry.Value
      $processId = [int]$process.ProcessId
      if ([int]$process.ParentProcessId -eq $parentId -and -not $candidates.ContainsKey($processId)) {
        $candidates[$processId] = "child of process $parentId"
        $queue.Enqueue($processId)
      }
    }
  }

  return [pscustomobject]@{
    Snapshot = $snapshot
    Candidates = $candidates
  }
}

function Stop-OpenChamberPass {
  param(
    [Parameter(Mandatory)]
    [int]$Pass
  )

  $discovery = Find-OpenChamberProcesses
  $snapshot = $discovery.Snapshot
  $candidates = $discovery.Candidates

  if ($candidates.Count -eq 0) {
    return 0
  }

  $rootIds = @(
    $candidates.Keys | Where-Object {
      $process = $snapshot[[int]$_]
      $null -eq $process -or -not $candidates.ContainsKey([int]$process.ParentProcessId)
    }
  )

  foreach ($processId in $rootIds) {
    $process = $snapshot[[int]$processId]
    $name = if ($null -ne $process) { [string]$process.Name } else { 'process' }
    $reason = [string]$candidates[[int]$processId]
    $description = "$name PID $processId ($reason)"

    if ($PSCmdlet.ShouldProcess($description, "terminate process tree on cleanup pass $Pass")) {
      & taskkill.exe /PID ([string]$processId) /T /F 2>&1 | Out-Null
      if ($LASTEXITCODE -ne 0 -and $null -ne (Get-Process -Id $processId -ErrorAction SilentlyContinue)) {
        Write-Error "Failed to terminate $description."
      }
      Write-Host "Stopped $description"
    }
  }

  return $candidates.Count
}

if (-not $IsWindows) {
  Write-Error 'kill-openchamber.ps1 currently supports Windows only.'
  exit 1
}

$firstPassCount = Stop-OpenChamberPass -Pass 1
if ($WhatIfPreference) {
  if ($firstPassCount -eq 0) {
    Write-Host 'No OpenChamber processes found.'
  }
  exit 0
}

Start-Sleep -Milliseconds 750
$secondPassCount = Stop-OpenChamberPass -Pass 2
Start-Sleep -Milliseconds 250

$remaining = Find-OpenChamberProcesses
if ($remaining.Candidates.Count -gt 0) {
  foreach ($processId in $remaining.Candidates.Keys) {
    Write-Host "Remaining PID ${processId}: $($remaining.Candidates[$processId])"
  }
  Write-Error "OpenChamber cleanup incomplete. $($remaining.Candidates.Count) associated process(es) remain."
  exit 1
}

if ($firstPassCount + $secondPassCount -eq 0) {
  Write-Host 'No OpenChamber processes found.'
} else {
  Write-Host 'All OpenChamber processes stopped.'
}

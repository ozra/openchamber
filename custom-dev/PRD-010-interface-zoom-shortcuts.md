---
id: PRD-010
title: Interface zoom shortcuts
status: ready
created: 2026-09-02
depends_on: []
complexity: medium
estimated_effort: 2-4 dev-days
related:
  - PRD-004
  - PRD-013
---

# PRD-010 — Interface zoom shortcuts

## Goal

Restore Chromium page zoom in Electron and expose configurable zoom-in,
zoom-out, and reset commands. Page zoom scales the whole rendered interface,
including text, icons, spacing, and controls.

## Background

- Native Electron zoom is currently neutralized in the shell:
  `packages/electron/main.mjs:2656-2659` pins `setZoomFactor(1)` and resets on
  `zoom-changed`, again at `:2680`. Electron therefore cannot retain Chromium's
  normal page zoom.
- Normal browsers already own page zoom. OpenChamber must leave their native
  shortcuts alone rather than substituting the typography-only `fontSize`
  setting.
- Electron's page zoom scales CSS pixels after layout. An explicit diff font
  size from PRD-004 therefore scales with the rest of the interface without
  coupling the two settings.

## Requirements

- Add configurable `zoom_in`, `zoom_out`, and `zoom_reset` commands for Electron.
- Use platform-native default bindings:
  - Windows/Linux: `Ctrl +`, `Ctrl -`, and `Ctrl 0`.
  - macOS: `Command +`, `Command -`, and `Command 0`.
- Treat Shift as implicit when the active keyboard layout requires it to type
  `+`; the setting should display the familiar `Ctrl +` or `Command +`, not an
  extra Shift chord.
- Plain `+`/`-`/`0` keys only — no numpad-specific bindings (no keyboards in
  use have numpads; users can rebind anyway).
- Each command changes the Electron page zoom factor by **5 percentage points**.
- Clamp the Electron page zoom factor to 50–200%; reset returns to 100%.
- Keep the current zoom when Electron reloads the renderer or switches between
  HMR and bundled UI documents.
- In web runtimes, do not register an app handler for the default zoom chords or
  prevent their native behavior. Browser-owned zoom continues to work normally.
- Show the configurable commands only where OpenChamber can execute them. A web
  browser cannot programmatically control its native page zoom.

## Implementation anchors

- Register `zoom_in`, `zoom_out`, and `zoom_reset` in the shared shortcut schema
  as desktop-capable configurable commands, with i18n labels and Help entries.
- Route execution through the desktop bridge. Electron main owns
  `webContents.getZoomFactor()` / `setZoomFactor()` and the 50–200% clamp.
- Remove the unconditional factor-1 reset. Retain the current factor across
  renderer reloads and apply Electron's normal same-origin zoom behavior to
  OpenChamber windows.

## Acceptance criteria

- The platform-native defaults scale the whole Electron interface in 5-point
  steps; clamp is 50–200%, and reset restores 100%.
- Commands work from composer focus and every OpenChamber renderer surface.
- All three are listed and configurable in Keyboard Shortcuts settings when
  running in Electron.
- Reloading or opening another same-origin OpenChamber window retains the
  current zoom according to Electron's normal page-zoom behavior.
- Web keeps the browser's native zoom behavior and does not intercept the
  browser's default zoom chords.

## Out of scope / future

- Per-surface zoom.
- Numpad-specific bindings.
- Replacing browser-owned zoom with an app-controlled web implementation.

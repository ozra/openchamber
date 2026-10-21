# Fork differences from upstream

One-glance index of every intentional change this fork carries over upstream
(openchamber/openchamber). Follow the OCH ticket links for detail; this file tracks
what differs and where each change lives.

Last verified 2026-09-09 against upstream/main at c498beaa6.

## Upstream position

- Fork base: the last upstream main merged into this fork is c498beaa6
  ("fix(small-model): use selected runtime model endpoint (#3437)").
- This fork's main carries 35 commits upstream does not
  (`git log upstream/main..HEAD`); the net code change against the base is 94
  files, +2,410 / -198 lines
  (`git diff upstream/main HEAD -- ':!custom-dev'`).
- The work-status turn statistics from #3177 sit in both trees and are not a
  fork difference.

## The differences

### 1. Monozrakai themes (OCH-012, done)

Two new presets, `monozrakai-dark` and `monozrakai-light`, registered in
`packages/ui/src/lib/theme/themes/presets.ts`, documented in
`docs/CUSTOM_THEMES.md`. The dark preset uses the deeper `#17150E` surface
background.

### 2. Per-tool prefix label colors (OCH-011, done)

Tool, reasoning and user-prompt prefix labels in the chat render with per-tool
semantic colors instead of one fixed treatment. Owned by
`lib/toolHelpers.ts` and `theme/cssGenerator.ts`. A tool the theme does not
name takes `tools.labels.default` when the theme sets it (Monozrakai dark:
yellow `#E6DB74`), then the generic tool title. The timeline rail (OCH-001)
reads the same function.

### 3. Quota usage pace against reset windows (OCH-020, done)

Usage cards show whether consumption runs ahead of or behind time within each
quota reset window. New `lib/quota/pace.ts`; the usage section, card and
progress bar consume it.

### 4. Composer arrow-key prompt history gate (OCH-024, done)

New setting `chat.arrow-key-prompt-history`, default off. Off (the default)
means ArrowUp/ArrowDown never recall prompt history while typing, so a caret at
the top of a multiline prompt cannot swap in the previous message.

### 5. Composer send-key setting (OCH-031, in-progress)

Adopts upstream's `enterToSend` toggle with three fork overrides:

- Fork default is "Enter sends off" (`enterToSendConfigured: true`).
- Shift+Enter is always a newline and never submits.
- With Enter-sends off: Ctrl/Cmd+Enter submits and honors queue/steer;
  Ctrl/Cmd+Shift+Enter submits now.

The edits live in `composer/keyboardPolicy.ts`, `chat/ChatInput.tsx` (sendNow
derivation) and `stores/useUIStore.ts` (the default).

### 6. Sidebar keep-open and always-visible row actions (OCH-014/015, done)

Two live differences, and one entry that has since been overtaken:

- **Keep the sidebar open** — `sidebarKeepOpen` (`registry.ts:374`, `profile`),
  toggled from the sidebar header (`SidebarHeader.tsx:156`), not from the Settings
  page.
- **Row actions always visible** — no setting. `SessionSidebar.tsx` pins
  `alwaysShowSidebarActions = true`, so project, group and session action icons
  stay on screen in their muted tone on web and desktop instead of waiting for
  hover; upstream shows them at rest only where there is no hover. The fork's own
  toggle (`sidebarActionsAlwaysVisible`, with a `SidebarSettings.tsx` control) was
  removed by the v2.5.0 merge commit, and its `actionsAlwaysVisible{,Aria,Hint}`
  strings were deleted from the fifteen dictionary files that carried them: the
  twelve settings sub-dicts plus the `ar`, `he` and `nl` main dicts, which hold
  their `settings.*` keys inline.
- **Hide the header "New session" button** — dropped. Upstream no longer has a
  global New-session button in the sidebar header, so there is nothing left for the
  setting to hide, and the fork keeps no trace of it (no registry field, no
  strings, no control).

### 7. Chat paging and desktop zoom shortcuts (OCH-010, done)

Five new shortcuts, all user-configurable in settings:

- `scroll_chat_history_up`: mod+PageUp
- `scroll_chat_history_down`: mod+PageDown
- `zoom_in`: mod+Plus, `zoom_out`: mod+Minus, `zoom_reset`: mod+0 (Electron only)

Electron owns the page zoom factor (`packages/electron/page-zoom.mjs`) instead
of pinning it to 1; the shortcuts schema gained plus/minus key tokens and an
`electronOnly` flag.

### 8. Conversation send and close-tab behavior (no ticket, merged)

- Normal sends no longer park the new turn at the top of the viewport. The
  viewport stays on the live edge, and a send from mid-history keeps the
  reader's position (`useChatTimelineScroll.ts`; the anchor mode stays as
  legacy support).
- The Electron window menu binds close to Cmd/Ctrl+Shift+W, aligning the
  desktop shell with the app's close-session-tab shortcut.

### 9. Windows dev and cleanup tooling (no ticket, merged)

- `kill-openchamber.ps1` in the repo root: nukes stray OpenChamber processes.
- `.gitignore` ignores the literal `%TEMP%/` path opencode writes session state
  into.
- `scripts/dev-web-hmr.mjs` runs the API under `bun x nodemon` (watch the
  server dir) so backend edits restart the dev server. nodemon is a dev
  dependency in the root, packages/ui and packages/web.

### 10. Fork-local docs and agent instructions

- `_makedone/` holds the ticket backlog (key OCH, formerly `custom-dev/PRD-NNN`), ideas as
  `refine` tickets; `custom-dev/` holds the engineering guidance (README.md), the technical
  design (DOCUMENTATION.md) and this index. These are fork-owned planning
  docs, not code changes: they never exist upstream by design.
- `AGENTS.md` carries a fork-local requirements section pointing agents at
  `custom-dev/README.md`.

### 11. English fallback in every locale dictionary (OCH-039, done)

All 14 non-English locale files in `packages/ui/src/lib/i18n/messages/` import the
English dict and spread it first (`...enDict`) inside their own dict. Effect: fork
i18n keys live in `en.ts` only and read as English on other locales, and the
upstream key-parity test stays green without editing it. Four stale keys left by
the old `TRANSLATE ME` convention were deleted (`de.settings.ts`, `tr.settings.ts`).

### 12. Timeline rail replaces the prompt rail (OCH-001, in-progress)

`TimelineRail` (`components/chat/components/timelineRail/`) mounts where
`PromptNavigatorRail` did and keeps its setting and shortcut. Edits outside that
folder:

- `ChatContainer.tsx`: the imports, the mount block in `ChatViewport`, and an
  `onSelectMessage` prop (type, destructure, memo comparator, the
  `handleTimelineRailSelectMessage` callback, call site).
- `MessageList.tsx`: `MessageListHandle.getTimelineLayout()` and the
  `MessageListTimelineLayout` type, plus `allEntriesRef` behind it, and
  `MessageListHandle.revealFoldedMessage` (the list's existing function).
- `knip.json`: `PromptNavigatorRail.tsx` listed as a `packages/ui` entry, since
  nothing imports it any more.
- `en.ts`: `chat.timelineRail.*` keys.

When upstream changes `PromptNavigatorRail.tsx`, compare it with
`TimelineRail.tsx` and port what applies.

## Keeping this current

Regenerate the raw lists after each upstream merge with:

- `git log --oneline upstream/main..HEAD`
- `git diff --stat upstream/main HEAD -- ':!custom-dev'`

Update the upstream position line to the new merge base and refresh the
verification date.

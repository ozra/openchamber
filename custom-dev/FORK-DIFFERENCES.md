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
background and a darker, slightly warm `#221F18` muted surface (sidebar and context
panel).

### 2. Per-tool prefix label colors (OCH-011, done)

Tool, reasoning and user-prompt prefix labels in the chat render with per-tool
semantic colors instead of one fixed treatment. Owned by
`lib/toolHelpers.ts` and `theme/cssGenerator.ts`. A tool the theme does not
name takes `tools.labels.default` when the theme sets it (Monozrakai dark:
yellow `#E6DB74`), then the generic tool title. The timeline rail (OCH-001)
reads the same function. `remote_bash` takes the write tools' red in both
Monozrakai presets. Monozrakai light maps the same tool groups to paper inks
(vermilion for writes, sap green for reads, prussian blue for web, violet for
agents, light walnut for thinking, ochre for the default); black stays for prompts
and replies.

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
`PromptNavigatorRail` does and keeps its setting and shortcut; since OCH-047 a
setting picks one of the two (item 14). Edits outside that
folder:

- `ChatContainer.tsx`: the imports, the mount block in `ChatViewport`, and an
  `onSelectMessage` prop (type, destructure, memo comparator, the
  `handleTimelineRailSelectMessage` callback, call site). The rail shows from
  the first prompt: upstream's prompt rail waits for two (`>= 2` in
  `showPromptNavigator` and the mount block), changed to `> 0` by Oscar's
  decision on 2026-10-21.
- `MessageList.tsx`: `MessageListHandle.getTimelineLayout()` and the
  `MessageListTimelineLayout` type, plus `allEntriesRef` behind it, and
  `MessageListHandle.revealFoldedMessage` (the list's existing function).
- Theme `colors.timelineRail.system` (`--timeline-rail-system`; default
  `#00FFFF` dark, `#0097A7` light) and `config.timelineRail.restOpacity` and `.minLightness`
  (`definition.ts`, `types/theme.ts`), emitted by `cssGenerator.ts` as
  `--timeline-rail-rest-opacity` and `--timeline-rail-min-lightness` with
  variant defaults (dark 1 and 0, light 0.55 and 0.62); documented in
  `docs/CUSTOM_THEMES.md`.
- `en.ts`: `chat.timelineRail.*` keys.
- `styles/typography.css`: `--prompt-rail-room` is at least `12px + 1.25rem`,
  so the composer stays clear of the full-height rail at small interface
  sizes.

When upstream changes `PromptNavigatorRail.tsx`, compare it with
`TimelineRail.tsx` and port what applies.

### 13. Conversation map visibility setting (OCH-046, done)

`conversationMapVisibility` (`registry.ts`, `profile`, `perSurface`), chip values
`always` (default), `whenRoom`, `off`, choosing when the timeline rail's
conversation map shows its boxes. The hover card is unaffected.

Edits outside `timelineRail/`: `lib/settings/registry.ts`,
`lib/settings/search.ts` (`chat.conversation-map`), `stores/useUIStore.ts`,
`components/sections/openchamber/ChatSettings.tsx` (Reading section, chips
always visible), `lib/i18n/messages/en.settings.ts` (English only, OCH-039), the
two generated `settings-registry.json` snapshots, and a value set plus branch in
`packages/web/server/lib/opencode/settings-helpers.js` with its drift-test sample.

### 14. Timeline rail or prompt navigator (OCH-047, done)

`chatRailKind` (`registry.ts`, `profile`, `perSurface`), `timeline` (default) or
`prompt`, picks which rail shows while upstream's `promptNavigatorEnabled` is on.
One rail at a time, so the toggle shortcut and `[data-prompt-rail]` room are
upstream's, unchanged. `PromptNavigatorRail` is mounted again, unmodified, with
upstream's two-prompt minimum; the timeline rail keeps showing from the first
prompt.

Edits: `ChatContainer.tsx` (import and the two mount blocks in `ChatViewport`),
`knip.json` (the `PromptNavigatorRail.tsx` entry from item 12 removed),
`ChatSettings.tsx` (the Prompt navigator checkbox becomes a "Chat rail" chip row:
Timeline, Prompt navigator, Off), `search.ts` (`chat.prompt-navigator` retitled),
`useUIStore.ts`, `registry.ts`, `en.settings.ts`, the generated snapshots and
the server sanitizer with its drift sample. Upstream's
`promptNavigatorEnabled` label keys stay in the dictionaries, unused, to keep
the locale files untouched.

## Keeping this current

Regenerate the raw lists after each upstream merge with:

- `git log --oneline upstream/main..HEAD`
- `git diff --stat upstream/main HEAD -- ':!custom-dev'`

Update the upstream position line to the new merge base and refresh the
verification date.

---
id: PRD-031
title: Composer send key setting
status: in-progress
created: 2026-09-05
depends_on: []
complexity: small
estimated_effort: 0.5-1 dev-day
related:
  - PRD-013
  - PRD-024
---

# PRD-031 — Composer send key setting

## Goal

Let the user pick between the composer's original send behavior and one where
Enter always writes a newline and Ctrl/Cmd+Enter submits. This splits
requirement 1 of PRD-013 — Keyboard navigation and focus into its own
deliverable.

Two options, not a general keybinding surface. Making the send key a rebindable
entry in the shortcuts registry was considered and rejected: see "Why not the
shortcuts registry".

## Background (current state)

The send key is a hardcoded heuristic in the composer's keydown handler
(`ChatInput.tsx:1737`):

```ts
const requiresModifierToSend = isMobile || isDesktopExpanded;
if (e.key === 'Enter' && !e.shiftKey && (!requiresModifierToSend || e.ctrlKey || e.metaKey)) {
```

Which produces the rules in force today:

- **Shift+Enter never submits.** It falls through to CodeMirror as a newline.
- **Ctrl/Cmd+Enter always submits, and always "sends now"** — it bypasses
  queue/steer (`isCtrlEnter` at `ChatInput.tsx:1741-1759`).
- **Plain Enter submits on desktop**, following the `followUpBehavior` setting
  (queue or steer). On mobile and in desktop focus mode (`isDesktopExpanded`) it
  writes a newline instead.

So today the composer already has two distinct submit actions on the keyboard,
and the difference matters:

| Key (today, desktop) | Action |
|---|---|
| Enter | submit, honoring `followUpBehavior` — queue it, or steer it into the running turn |
| Ctrl/Cmd+Enter | submit **now**, bypassing queue/steer entirely |

`followUpBehavior` defaults to `'queue'` (`messageQueueStore.ts:11`), so on a
busy session plain Enter parks the message and Ctrl/Cmd+Enter forces it through.
**Any change to the send key has to keep both actions reachable**, or the queue
becomes keyboard-unreachable.

## Requirements

### The setting

New composer setting **Send prompt with**, two options, persisted through the
normal autosave round trip:

**`auto` — "Enter sends (original)"**

Exactly today's behavior, unchanged on every surface. Enter submits on desktop
and writes a newline on mobile and in focus mode; Ctrl/Cmd+Enter submits now;
Shift+Enter is a newline. No new chords.

**`mod-enter` — "Ctrl+Enter sends, Enter makes a newline"** (**default**)

| Key | Action |
|---|---|
| Enter | newline, on every surface |
| Shift+Enter | newline |
| Ctrl/Cmd+Enter | submit, honoring `followUpBehavior` |
| Ctrl/Cmd+Shift+Enter | submit **now**, bypassing queue/steer |

Ctrl/Cmd+Enter takes over the role plain Enter had, including its queue/steer
behavior, and the send-now escalation moves up to Ctrl/Cmd+Shift+Enter so it is
not lost. This is the one genuinely new chord; it exists only in this option, so
`auto` stays byte-identical to today.

### Invariants in both options

- Shift+Enter on its own is always a newline and never submits.
- Both submit actions — "submit per `followUpBehavior`" and "submit now" — stay
  reachable from the keyboard.
- Nothing about queueing or steering changes. This PRD decides *which key*
  submits, not *what* submitting does.
- Both options make Enter a newline on mobile, so the setting only changes the
  desktop composer. Settings are shared across every client of one server (see
  below), and this keeps that from mattering.

### Persistence

Full round trip per the custom-dev README, "Adding persisted settings": client
type, store default and setter, hydration and apply, write path, and the server
allowlist in `packages/web/server/lib/opencode/settings-helpers.js`. Without the
server entry the setting appears to save and resets on restart.

Note that settings are stored **per connected server**, not per device:
`updateDesktopSettings` writes to `PUT /api/config/settings` on the current
runtime (`persistence.ts:2122`) and the server copy is authoritative on
hydration. One value therefore covers desktop, browser, and phone. That is
acceptable here only because both options behave identically on mobile.

## Why not the shortcuts registry

`packages/ui/src/lib/shortcuts/` supports customizable bindings, and
`compose_send` would fit there. It was rejected for this PRD:

- `shortcuts/DOCUMENTATION.md:13` and `:50` exclude text-editing keys from
  `SHORTCUT_SCHEMA` by design. A newline binding is text editing.
- The dispatcher listens on the window. A bare `enter` binding as an application
  command would route every Enter in the app through the registry and rely on
  handlers returning `false` to get out of the way.
- The override contract is `Record<string, string>` and cannot express a
  per-surface (desktop vs mobile) binding without a migration.

Revisit if the requirement grows beyond these two presets.

## Component strategy

Direct shared modification. A small setting belongs on the shared path
(custom-dev README, "Fork customization strategy"), and this replaces one
boolean expression inside an existing handler. Following PRD-024's precedent in
the same file, the decision moves into a pure module under `submit/` that maps a
keydown to an intent (`newline` / `submit` / `submit-now`); `ChatInput` keeps
only the call and the existing queue/steer branch.

## Implementation anchors

Mirror the `arrowKeyPromptHistoryEnabled` plumbing (PRD-024) end to end:

- `stores/useUIStore.ts` — `ComposerSendKey` type, `DEFAULT_COMPOSER_SEND_KEY`,
  `isComposerSendKey`, `normalizeComposerSendKey`, state field, setter, migrate
  sanitize, `partialize`.
- `components/chat/composer/submit/sendKey.ts` — `resolveComposerKeyIntent`
  plus `__tests__/sendKey.test.ts` covering the full key/option matrix.
- `components/chat/ChatInput.tsx:1735-1761` — switch on the intent; the
  queue/steer branch below keeps its shape with `isCtrlEnter` replaced by
  `intent === 'submit-now'`.
- `lib/persistence.ts` — defaults snapshot, apply-to-store, sanitize.
- `lib/api/types.ts`, `lib/desktop.ts` — `composerSendKey?: 'auto' | 'mod-enter'`.
- `packages/web/server/lib/opencode/settings-helpers.js` (+ `.test.js`) — allowlist.
- `OpenChamberVisualSettings.tsx` — `SettingsControlGroup` + `SettingsRadioGroup`
  in the existing Composer section, next to Large text paste; new
  `VisibleSetting` id `'sendKey'`, listed in `OpenChamberPage.tsx`.
- `lib/settings/search.ts` — item `chat.send-key`.
- i18n keys in `en.settings.ts` with real English; `TRANSLATE ME` in the other
  locale files per the custom-dev localization note.

## Acceptance criteria

- `auto` behaves exactly as the current build on desktop, mobile, and in focus
  mode, including Ctrl/Cmd+Shift+Enter still being a newline there.
- `mod-enter` (default): Enter writes a newline on desktop; Ctrl/Cmd+Enter
  submits and honors queue/steer; Ctrl/Cmd+Shift+Enter submits now.
- Shift+Enter alone writes a newline in both options.
- The setting survives a restart (client autosave and server `settings.json`)
  and is reachable from settings search.
- Intentional behavior for web, desktop, VS Code, hosted mobile, and Capacitor
  mobile — the resolver lives in the shared composer, so all runtimes agree.

## Validation

- `bun test packages/ui/src/components/chat/composer/submit/__tests__/sendKey.test.ts`
- `bun test packages/ui/src/lib/persistence.test.ts` (round trip)
- `bun test packages/web/server/lib/opencode/settings-helpers.test.js` (sanitizer)
- Manual, per the composer DOCUMENTATION note that keyboard behavior is not
  covered by tests: both options on desktop, in focus mode, and on mobile,
  against a busy session so queue/steer is exercised.

## Known limitation (pre-existing)

iOS and Chrome Android defer Enter through a synthetic re-dispatch that drops
modifiers; `ComposerEditor` restores only the shift state
(`ComposerEditor.tsx:225-235`). A hardware Ctrl/Cmd+Enter on those platforms can
therefore arrive as a plain Enter. This already affects today's mobile behavior
and is not introduced here.

## Out of scope / future

- Making the send key a rebindable entry in the shortcuts registry.
- Changing queue/steer semantics or the `followUpBehavior` setting.
- A separate send key for other Enter-submitting inputs (question card, inline
  comments, dialogs).
- The remaining PRD-013 requirements.

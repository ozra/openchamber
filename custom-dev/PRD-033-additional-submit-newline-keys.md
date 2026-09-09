---
id: PRD-033
title: Additional submit and newline keys
status: draft
created: 2026-09-09
depends_on:
  - PRD-031
deliver_with:
  - PRD-034
complexity: small
estimated_effort: 0.5-1 dev-day
related:
  - PRD-013
  - PRD-024
  - PRD-034
---

# PRD-033 — Additional submit and newline keys

## Goal

Let the user define extra keys that submit and extra keys that write a newline,
active only while the prompt box is focused. They work in addition to the
built-in chords: Enter, Ctrl/Cmd+Enter, Ctrl/Cmd+Shift+Enter, Shift+Enter.

Motivation is habit transfer from the opencode TUI, where Ctrl+J is a newline
and Alt+S submits. Both combos are dead in this composer today, and Ctrl+J even
toggles the terminal panel instead.

## Background (current state)

The composer owns its own keys. Every keydown in the prompt box passes through
`ChatInput.tsx` `handleKeyDown` (wired from `ComposerEditor`'s
highest-precedence keymap). That already gives "only active in the prompt box"
for free: the handler only runs while the composer has focus.

The built-in matrix after PRD-031 (Enter-sends off is the fork default):

| Key | Action |
|---|---|
| Enter | newline |
| Shift+Enter | newline |
| Ctrl/Cmd+Enter | submit, honoring `followUpBehavior` (queue or steer) |
| Ctrl/Cmd+Shift+Enter | submit now, bypassing queue/steer |

Two submit actions exist on purpose. With `followUpBehavior` defaulting to
`queue`, a busy session parks plain submits in the queue; the send-now chord is
the only keyboard way to force a message through. Any additional submit key
must pick one of the two. The TUI habit is a plain submit, so the additional
submit key maps to the queue/steer path, exactly like Enter.

Two constraints shape the design:

- App shortcuts live at window scope (`useKeyboardShortcuts.ts`). `mod+j`
  (Ctrl+J on Windows) is already bound to `toggle_terminal` and fires even
  while the composer is focused. A bound additional key must be consumed inside
  the composer so the window dispatcher never sees it.
- PRD-031 rejected the shortcuts registry for text keys: `SHORTCUT_SCHEMA`
  excludes text editing by design, the dispatcher is window-scoped, and the
  override contract cannot express a per-surface binding. The same reasoning
  applies here, so these keys are a composer-local setting, not a registry
  entry.

Settings persistence follows the custom-dev README "Adding persisted settings":
client type, store default and setter, hydration/apply, write path, server
allowlist, settings search, i18n.

## Requirements

### The settings

Two new shared settings, both defaulting to empty:

- `chat.additional-submit-keys`: list of combos that submit.
- `chat.additional-newline-keys`: list of combos that write a newline.

Each entry uses the app's shortcut notation (`modifier+key`), for example
`alt+s` or `ctrl+j`. Defaults are empty, so nothing changes until the user
adds a combo. That makes the feature opt-in, as chosen.

### Behavior

- Active only while the composer (prompt box) is focused. Handled at the same
  point as the Enter branch in `handleKeyDown`, so the existing early returns
  (sub-mode pickers, IME composition, expanded-input escapes) shield them too.
- An additional submit key does the plain submit: it honors `followUpBehavior`
  (queue or steer) exactly like Enter. It never sends now.
- An additional newline key inserts a line break at the caret, the same command
  Shift+Enter produces today. It never submits.
- Built-in keys win. A configured combo that collides with a built-in chord
  (for example `shift+enter`) is ignored; the invariant that Shift+Enter never
  submits stays absolute.
- When the composer consumes a bound additional key, it must also stop the
  event reaching the window-level shortcut dispatcher. Outside the composer,
  the same combo keeps its app binding (Ctrl+J still toggles the terminal when
  the prompt box is not focused).
- IME composition never triggers these keys.
- The settings survive a restart (client autosave and server `settings.json`)
  and are reachable from settings search.
- Intentional behavior on every runtime. The composer is shared, so web,
  desktop, VS Code, hosted mobile and Capacitor mobile agree; on mobile there
  is no hardware keyboard, and with empty defaults nothing changes there.

## Design decisions

**"Can I just press the submit key twice to steer?"** Not from this PRD
alone. With `followUpBehavior` set to `queue`, the first submit queues the
message and clears the box, so a second press finds an empty composer.
PRD-034 answers that second press: with its setting on (the default), an empty
submit promotes the oldest queued message to steer. It is its own PRD because
it changes what *every* submit does on an empty box, not just the additional
keys.

**Key conflicts.** Ctrl+J collides with the app's `toggle_terminal` binding.
Because the feature is opt-in and configurable, a user who dislikes the
trade-off can bind another key. The requirement above (consume inside the
composer, app binding intact outside) is what keeps the two from fighting.

## Implementation anchors

- `ChatInput.tsx` `handleKeyDown`: evaluate the configured combos next to the
  Enter branch (~lines 1997-2034), before the queue/steer decision. Consume
  with `preventDefault` plus `stopPropagation`.
- A small pure matcher beside `composer/keyboardPolicy.ts` (or inside it):
  parse each configured combo with the existing shortcut grammar and match it
  against the event.
- Newline insertion through the composer's normal newline path, the command
  Shift+Enter produces today.
- `stores/useUIStore.ts`: two new persisted fields with defaults and setters.
- `lib/persistence.ts`: hydration/apply and write path.
- `packages/web/server/lib/opencode/settings-helpers.js`: allowlist entries
  (without them the settings reset on restart).
- Settings UI next to the existing composer controls and settings search
  entries in `lib/settings/search.ts`.
- i18n: proper English text, `TRANSLATE ME` in the other locales, per the
  custom-dev README.
- Guard with `isIMECompositionEvent` like the rest of the composer.

## Acceptance criteria

- With `chat.additional-submit-keys: ["alt+s"]`: Alt+S submits from the prompt
  box, honoring queue/steer, on every surface. It never sends now.
- With `chat.additional-newline-keys: ["ctrl+j"]`: Ctrl+J inserts a newline in
  the prompt box and never submits. With the prompt box unfocused, Ctrl+J still
  toggles the terminal panel.
- Empty defaults change nothing: the built-in matrix from PRD-031 is byte for
  byte the same.
- A configured combo that collides with a built-in chord is ignored.
- Additional keys do nothing while a composer sub-picker (command, skill,
  mention, snippet) is open and during IME composition.
- The settings survive a restart and are reachable from settings search.
- Intentional behavior for web, desktop, VS Code, hosted mobile and Capacitor
  mobile.

## Validation

- Unit tests for the matcher (extend `keyboardPolicy.test.ts`): the combo
  matrix, collision handling, modifier matching.
- `bun test src/lib/persistence.test.ts` (round trip).
- `bun test server/lib/opencode/settings-helpers.test.js` (sanitizer).
- Manual: both keys in the prompt box on desktop and in focus mode, against a
  busy session so queue/steer is exercised, and with the prompt box unfocused
  to confirm the app binding still works.

## Out of scope / future

- A send-now additional key. Ctrl/Cmd+Shift+Enter stays the only escalation.
- Empty-composer submit behavior. Promoting the oldest queued message to
  steer on empty submit is PRD-034.
- Making the send key a rebindable entry in the shortcuts registry.
- Additional keys for other Enter-submitting inputs (question card, inline
  comments, dialogs).
- Changing queue/steer semantics or the `followUpBehavior` setting.
- The remaining PRD-013 requirements.
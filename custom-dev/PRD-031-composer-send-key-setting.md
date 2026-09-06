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

Upstream shipped this capability independently while the fork's first cut was in
flight, as the composer toggle **Enter sends** (`enterToSend` plus
`enterToSendConfigured`), with settings UI, settings search and i18n in every
locale. The fork uses **that** setting rather than a parallel one — see
"Relationship to upstream" below. The two positions read:

**Enter sends *on* — "Enter sends (original)"**

Today's desktop behavior. Enter submits, Ctrl/Cmd+Enter submits now, Shift+Enter
is a newline. No new chords.

**Enter sends *off*** (**the fork default**)

| Key | Action |
|---|---|
| Enter | newline, on every surface |
| Shift+Enter | newline |
| Ctrl/Cmd+Enter | submit, honoring `followUpBehavior` |
| Ctrl/Cmd+Shift+Enter | submit **now**, bypassing queue/steer |

Ctrl/Cmd+Enter takes over the role plain Enter had, including its queue/steer
behavior, and the send-now escalation moves up to Ctrl/Cmd+Shift+Enter so it is
not lost. This is the one genuinely new chord; it exists only in this option, so
"Enter sends" on stays byte-identical to today.

## Relationship to upstream

Upstream's `enterToSend` covers the same ground with a different taste in two
places, and the fork overrides exactly those two:

| | upstream, Enter sends off | this fork |
|---|---|---|
| Shift+Enter | **submits** | newline, always |
| Ctrl/Cmd+Enter | submits now, bypassing queue/steer | submits, honoring queue/steer |
| Ctrl/Cmd+Shift+Enter | submits now | submits now |
| default | unconfigured — the old per-surface heuristic | Enter sends off |

Spending Shift+Enter on "submit" costs the one chord every text editor uses for
a line break, and leaving Ctrl/Cmd+Enter as the only send makes the queue
unreachable from the keyboard when `followUpBehavior` is `queue` (its default).

Everything else — the stored keys, the sanitizer, the server allowlist, the
settings toggle, settings search and all i18n — is upstream's and is *not*
forked. Reusing it deleted the fork's parallel `composerSendKey` setting and its
`submit/sendKey.ts` resolver, and shrank this feature's merge surface to three
edits, all of which carry a `PRD-031 (fork)` comment:

1. `composer/keyboardPolicy.ts` — one expression: Shift+Enter never submits.
2. `chat/ChatInput.tsx` — the `sendNow` derivation: with Enter-sends off, the
   send-now escalation is Ctrl/Cmd+**Shift**+Enter, so plain Ctrl/Cmd+Enter
   falls through to the queue/steer branch.
3. `stores/useUIStore.ts` — the `enterToSendConfigured: true` default.

Upstream's `keyboardPolicy.test.ts` asserts the behavior the fork overrides; its
`configured disabled Shift+Enter` case is inverted here and marked. If a future
catch-up drops these, the symptom is Shift+Enter sending mid-sentence.

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

Direct shared modification, kept as small as it will go. A small setting belongs
on the shared path (custom-dev README, "Fork customization strategy"), and point
5 of that strategy — do not make routine upstream merges resolve broad
fork-specific edits inside the original component — is what settled the shape
here: adopt upstream's setting whole and override two expressions, rather than
run a second setting alongside it.

## Implementation anchors

The three fork edits listed under "Relationship to upstream". No new store
field, no new sanitizer entry, no new server allowlist entry, no new i18n key:
the setting already exists upstream and already round-trips.

Note that upstream's hint text for the toggle still says the setting controls
Enter *and Shift+Enter*. Under the fork it controls Enter only. The string is
left alone on purpose — rewording it in thirteen locale files would reintroduce
the merge surface this design just removed.

## Acceptance criteria

- Enter sends **on**: Enter submits on desktop, Ctrl/Cmd+Enter submits now,
  Shift+Enter writes a newline.
- Enter sends **off** (the default): Enter writes a newline on desktop;
  Ctrl/Cmd+Enter submits and honors queue/steer; Ctrl/Cmd+Shift+Enter submits
  now.
- Shift+Enter alone writes a newline in both positions.
- The setting survives a restart (client autosave and server `settings.json`)
  and is reachable from settings search.
- Intentional behavior for web, desktop, VS Code, hosted mobile, and Capacitor
  mobile — the policy lives in the shared composer, so all runtimes agree.

## Validation

- `bun test src/components/chat/composer/keyboardPolicy.test.ts` (the key matrix)
- `bun test src/lib/persistence.test.ts` (round trip)
- `bun test server/lib/opencode/settings-helpers.test.js` (sanitizer)
- Manual, per the composer DOCUMENTATION note that keyboard behavior is not
  covered by tests: both positions on desktop, in focus mode, and on mobile,
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

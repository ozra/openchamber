---
id: PRD-034
title: Empty submit promotes oldest queued message
status: draft
created: 2026-09-09
depends_on: []
deliver_with:
  - PRD-033
complexity: small
estimated_effort: 0.5-1 dev-day
related:
  - PRD-031
  - PRD-033
---

# PRD-034 — Empty submit promotes oldest queued message

## Goal

When the composer is empty and the user submits, promote the oldest queued
message to steer instead of doing nothing. This makes "Alt+S Alt+S" (or any
submit twice) force a queued message through on a busy session, entirely from
the keyboard. Gated by a setting, enabled by default.

## Background (current state)

- With `followUpBehavior` at its default `queue`, a submit on a busy session
  queues the message and clears the composer (`handleQueueMessage`,
  `ChatInput.tsx:1050`).
- A submit with an empty composer is a no-op today: `handleSubmit` returns at
  `if (queuedOnly || !inputSnapshot.message) return;` (`ChatInput.tsx:1317`).
- So the only ways to force a queued message through are the queued-message
  chip's Send button (mouse) or Ctrl/Cmd+Shift+Enter with new text in the box.
  A keyboard-only workflow cannot push a queued message through without typing
  something.
- The chip's Send button already performs exactly this promotion:
  `handleQueuedMessageSend` calls
  `handleSubmitRef.current({ queuedOnly: true, queuedMessageId, delivery: 'steer' })`
  (`ChatInput.tsx:1226-1229`). The oldest queued message is the front of the
  `queuedMessages` list, the same ordering the chips render.

## Requirements

### The setting

New shared setting `chat.empty-submit-promotes-oldest-queued`, boolean,
default **true**.

- Enabled (the default): an empty-composer submit promotes the oldest queued
  message to steer.
- Disabled: an empty-composer submit does nothing, exactly as today.

### Behavior

- Trigger: any submit while the composer has no text, the same condition that
  makes a submit a no-op today. An empty box means there is no message to
  queue or send.
- "Any submit" covers every submit gesture in the shared composer: Enter (in
  the positions where it submits), Ctrl/Cmd+Enter, Ctrl/Cmd+Shift+Enter, and
  the additional submit keys from PRD-033. The queue chip's own Send button
  keeps its current behavior (it already steers) and never triggers the
  promotion path.
- Action: the oldest queued message is force-sent with delivery `steer`,
  reusing the queue chip's send path so queued context (mentions, attachments,
  linked references) resolves the same way it does today.
- If there is no queued message, an empty submit still does nothing.
- Repeated empty submits promote one message each, oldest first.
- When the setting is off, behavior is identical to today.

## Design decisions

- Reuse the existing force-send path instead of a new delivery mechanism.
  `delivery: 'steer'` on a queued message is exactly what the chip's Send
  button does, so promotion carries the same semantics and context handling.
- The setting defaults on because the point is keyboard-only queue control.
  Someone who wants the strict no-op can turn it off.
- Promotion always targets the main queue, matching where the queue affordance
  lives. In btw mode the composer submits to the fork session, but the queue
  belongs to the main chat either way (`ChatInput.tsx:977-978`).
- Lives in the shared composer, so web, desktop, VS Code, hosted mobile and
  Capacitor mobile agree. VS Code keeps its local queue; the promote path runs
  through that same UI-side queue, so it works there too. On mobile the send
  button is the main submit gesture; if the button is disabled while empty
  (the existing UI guard), only the keyboard paths trigger promotion, which is
  the intended scope.

## Implementation anchors

- `ChatInput.tsx` `handleSubmit` empty guard (`~1317`): when
  `!inputSnapshot.message`, the setting is on, and the queue is non-empty
  (and not a `queuedOnly` call, which returns before this point), route to the
  promote path instead of returning. Putting the hook here covers every submit
  entry point.
- Extract the oldest-queued send from `handleQueuedMessageSend` (or call it
  directly with the oldest message id) so the keyboard and the chip share one
  path.
- `stores/useUIStore.ts`: new persisted boolean field, default true, with
  setter.
- `lib/persistence.ts`: hydration/apply and write path.
- `packages/web/server/lib/opencode/settings-helpers.js`: allowlist entry
  (without it the setting resets on restart).
- Settings UI next to the composer controls and settings search entry in
  `lib/settings/search.ts`.
- i18n: proper English text, `TRANSLATE ME` in the other locales, per the
  custom-dev README.

## Acceptance criteria

- With the setting on (the default) on a busy session: submit with text
  queues the message; submit with an empty box promotes the oldest queued
  message into the running turn. Same result from Enter, Ctrl/Cmd+Enter,
  Ctrl/Cmd+Shift+Enter, and the PRD-033 additional submit keys.
- Repeated empty submits promote one queued message each, oldest first.
- With no queued messages, empty submits do nothing.
- With the setting off, empty submits do nothing.
- Queued context (mentions, attachments) resolves the same way as the chip's
  Send button.
- The setting survives a restart and is reachable from settings search.
- Intentional behavior for web, desktop, VS Code, hosted mobile and Capacitor
  mobile.

## Validation

- Unit test for the promotion decision (extend `keyboardPolicy.test.ts` or a
  small test next to the queue helpers): empty + setting on + queue non-empty
  promotes; every other combination no-ops.
- `bun test src/lib/persistence.test.ts` (round trip).
- `bun test server/lib/opencode/settings-helpers.test.js` (sanitizer).
- Manual: busy session, queue a message, then empty-submit with each key; idle
  session with a queued message; setting off.

## Out of scope / future

- Promoting more than the oldest message in one submit.
- Changing queue/steer semantics, ordering, or the `followUpBehavior` setting.
- Behavior of other Enter-submitting inputs (question card, inline comments,
  dialogs).
- The remaining PRD-013 requirements.
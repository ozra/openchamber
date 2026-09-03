---
id: PRD-024
title: Arrow keys no longer recall prompt history by default
status: in-progress
created: 2026-09-03
related:
  - PRD-013
---

# PRD-024 — Arrow keys no longer recall prompt history by default

## Goal

Make prompt history a deliberate action instead of an arrow-key surprise. Arrow
keys in the composer stop recalling previous prompts by default; a chat
setting opts back into the old behavior.

## Background (current state)

The composer walks loaded prompt history with the arrow keys
(`ChatInput.tsx:1673-1721`):

- ArrowUp recalls an older prompt when the caret is at position 0 or the field
  is empty.
- ArrowDown returns toward the draft when the caret is at the end.
- Entering history stashes the draft and restores it on the way back out
  (`useMessageHistory`, `composer/state/useMessageHistory.ts`).

In a multiline prompt this misfires: the caret naturally sits at the start when
you are trying to reach the top of the text, and one ArrowUp replaces the
prompt with the previous message. The history list itself is a live projection
of the current session: `useUserMessageHistory(currentSessionId)`
(`sync/sync-context.tsx:3398`) builds it from
`buildUserMessageHistorySnapshot` (`sync/user-message-history.ts:53`).
Index 0 is the most recent prompt.

## Component strategy

Direct shared modification: a small setting belongs on the shared path, and the
gate is a narrow branch in the existing key handler. No new component. The
history state and walking functions in `useMessageHistory` stay untouched;
only the composer decides whether the keys may walk at all.

## Requirements

### Setting (default off)

- New chat setting "Arrow keys recall previous prompts", default **off**,
  persisted across sessions through the normal autosave path.
- Off (default): ArrowUp/ArrowDown never enter prompt history in the composer.
  The recalled-message branch in `ChatInput` is inactive; the keys behave like
  an ordinary multiline textbox.
- On: the current behavior is restored unchanged, including the caret
  conditions and the stash/restore of the draft.

## Acceptance criteria

- With the setting off (default), ArrowUp/ArrowDown never replace the draft
  with a recalled prompt.
- With the setting on, arrow-key walking behaves exactly as today, including
  draft stash/restore.
- The setting is persisted across sessions (autosave path) and is reachable
  from settings search.
- Intentional behavior is defined for web, desktop, VS Code, hosted mobile, and
  Capacitor mobile — the gate lives in the shared composer, so all runtimes
  behave identically.

## Validation

- Settings tests: default off, persistence round-trip, and a search entry
  (`chat.arrow-key-prompt-history`) that reaches the control.
- Key-handler tests: off disables the history branch; on preserves
  `stepOlder` / `stepNewer` behavior (existing `useMessageHistory` tests stay
  green).
- Manual checks: reach the top of a multiline prompt without recalling history,
  then enable the setting and confirm the previous behavior returns.

## Out of scope / future

- A prompt-history picker (icon, popover, cards) — deliberately not built.
- Search or filter inside prompt history.
- Cross-session or project-wide prompt history.
- Pinning, reordering, editing, or timestamps on history entries.
- Changing the arrow-walking implementation itself beyond the new gate.
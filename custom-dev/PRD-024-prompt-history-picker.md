---
id: PRD-024
title: Prompt history picker
status: draft
created: 2026-09-03
related:
  - PRD-013
---

# PRD-024 — Prompt history picker

## Goal

Make prompt history a deliberate action instead of an arrow-key surprise. Arrow
keys in the composer stop recalling previous prompts by default; prompt history
moves behind a small icon in the composer's bottom-left icon group, opening a
picker whose cards you can browse with the mouse or the keyboard.

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

Direct shared modification for the setting and the arrow-key gate: small
settings belong on the shared path, and the gate is a narrow branch in the
existing key handler. Add a new fork-owned picker component (e.g.
`components/chat/promptHistory/PromptHistoryPicker.tsx`) mounted near the
composer. Reuse `useUserMessageHistory` as the single history source. Do not
persist a second history and do not copy `ComposerFooter` or `ChatInput`.

## Requirements

### Setting (default off)

- New chat setting "Arrow keys recall previous prompts", default **off**,
  persisted across sessions through the normal autosave path.
- Off (default): ArrowUp/ArrowDown never enter prompt history in the composer.
  The recalled-message branch in `ChatInput` is inactive; the keys behave like
  an ordinary multiline textbox.
- On: the current behavior is restored unchanged, including the caret
  conditions and the stash/restore of the draft.

### Icon

- A small icon button in the composer's bottom-left icon group, the same
  cluster as the attachment/issue/PR controls in `ComposerFooter` in both the
  mobile and desktop variants, using the existing
  `footerIconButtonClass` / `iconSizeClass` conventions.
- Accessible name and tooltip reading "Prompt history"; keyboard reachable like
  its siblings.
- Clicking opens the prompt-history picker.

### Picker

- A popover picker anchored to the composer that dismisses like the other
  pickers/popups: Escape or clicking outside closes without selecting.
- Lists the current session's prompt history from `useUserMessageHistory` —
  the same list the arrow keys walk — newest prompt at the top.
- Each prompt is a card with the composer's surface background, rounded
  corners, and no prominent border (hairline or none). Multi-line text; very
  long prompts are height-capped with internal scrolling so cards stay
  readable.
- Mouse: clicking a card puts that prompt in the composer, replacing the
  current draft, closes the picker, and returns focus to the composer.
- Keyboard: ArrowUp/ArrowDown move the selection one card (the first press
  selects the nearest end; the selection stays put at the ends), Enter selects
  the highlighted card like a click, Escape dismisses.
- Empty state: a session with no history shows an explicit empty message; the
  icon stays available.
- PRD-013 invoke consistency: a future shortcut or command-palette entry opens
  this same picker, never a second UI.

## Acceptance criteria

- With the setting off (default), ArrowUp/ArrowDown never replace the draft
  with a recalled prompt.
- With the setting on, arrow-key walking behaves exactly as today, including
  draft stash/restore.
- The icon is present in the composer's bottom-left icon group on desktop and
  mobile, with an accessible name.
- The picker shows the session's prompts newest first; click or Enter puts the
  prompt in the composer, closes the picker, and refocuses it.
- Escape and outside click close without selecting and leave the draft
  untouched.
- Cards use the composer's surface background, rounded corners, and no
  prominent border.
- An empty session shows an explicit empty state instead of a blank list.
- Intentional behavior is defined for web, desktop, VS Code, hosted mobile, and
  Capacitor mobile.

## Validation

- Settings tests: default off, persistence round-trip, and a search entry
  (`chat.arrow-key-prompt-history`) that reaches the control.
- Key-handler tests: off disables the history branch; on preserves
  `stepOlder` / `stepNewer` behavior (existing `useMessageHistory` tests stay
  green).
- Picker tests: list order, keyboard selection movement, select-to-draft
  replacement, Escape/outside dismissal, and empty state.
- Manual checks: reach the top of a multiline prompt without recalling history,
  keyboard-only picker use, and touch selection on mobile.

## Out of scope / future

- Search or filter inside the picker.
- Cross-session or project-wide prompt history.
- Pinning, reordering, editing, or timestamps on history entries.
- Changing the arrow-walking implementation itself beyond the new gate.
---
id: PRD-018
title: Complete conversation search in the timeline
status: ready
created: 2026-09-02
related:
  - PRD-001
  - PRD-013
  - PRD-016
---

# PRD-018 - Complete conversation search in the timeline

> A constituent of the PRD-013 keyboard epic; implemented under that
> coordination.

## Goal

Make the existing Conversation Timeline the reliable find dialog for a chat.
It should search the complete session across user messages, agent output, and
tool activity, show where each match occurred, and make ongoing search work
visible so a long search never looks frozen.

## Background

The repo already has the right overview UI:

- `TimelineDialog.tsx` opens from `/timeline` and the configurable
  `open_timeline_dialog` shortcut, currently `mod+k t`.
- The dialog lists matching messages and can jump to a message.
- It has a search input and builds a short context snippet around a match.

The current behavior is incomplete:

- `TimelineDialog.tsx:73-89` filters records to `role === 'user'` before
  searching. Agent and tool content cannot match.
- `getFullText` in `components/chat/lib/messagePreview.ts:12-17` extracts text
  parts only. It does not define searchable tool content.
- The snippet renders as plain text. The matching term is not highlighted, and
  the result does not clearly identify its message type.
- Search covers only messages already materialized in the client. Older pages
  remain outside the search corpus until loaded.
- A query selects the oldest result first. Find should begin at the recent end
  of the conversation and move backward.
- The shortcut is configurable, but assigning `mod+f` conflicts with the
  internal, non-configurable `find_in_file` action.

This also conflicts with the `1.10.1` changelog description of full-text
timeline search across user, assistant, and tool messages. The work should
restore that promised coverage rather than create a second search surface.

## Requirements

### One dialog, all entry points

- Keep Conversation Timeline as the single UI opened by `/timeline`, its
  keyboard shortcut, and any future command-palette entry.
- Opening it for find focuses the existing search input. Invoking its shortcut
  again while open focuses that input instead of opening another dialog.
- Improvements in this PRD apply to the shared dialog, regardless of how it was
  opened.

### Placement and simultaneous inspection

- Keep the chat visible and interactive while the find dialog is open. The
  dialog must not behave as a modal that blocks inspection of the transcript.
- When horizontal space allows, float the dialog immediately to the right of
  the chat column. This lets the result overview and matching chat content sit
  side by side.
- When there is not enough room beside the chat, place the dialog as far right
  as the viewport and current right-side views allow without making its results
  unusably narrow or covering essential controls.
- Placement must coexist with the stackable right-side view model in PRD-016.
  The find dialog is a temporary overlay, not another persistent stackable
  view.
- On narrow/mobile layouts, use the existing constrained dialog treatment; do
  not force side-by-side placement.

### Search scopes

- Show three independent filters beside the search input:
  - `[x] User`
  - `[x] Agent`
  - `[ ] Tool`
- User and Agent are selected by default. Tool is opt-in because tool output can
  be noisy and large.
- Each result clearly identifies its type as User, Agent, or Tool.
- If every filter is cleared, ask the user to select a message type. Do not
  report "no matches" for an empty scope.

Search the text represented in chat, not arbitrary serialized SDK objects:

- User includes the user's visible message text and visible attached-context
  text.
- Agent includes visible assistant text and reasoning/justification text.
- Tool includes the visible tool name, summary or description, textual input,
  and textual output.
- Do not expose hidden credentials or fields that the chat does not present as
  searchable text.

### Complete-history search

- Once the query becomes non-empty, load the complete history for the current
  session through `SessionMessageLoader`, the existing authority for message
  pagination.
- Older history currently loads in pages of 100 messages
  (`session-message-loader.ts:23,216-240`). Results update as each page arrives
  and is searched; the user need not wait for full completion to inspect recent
  matches.
- Continue loading until the loader authoritatively marks the session complete.
- "No matches" is valid only after complete history has loaded and been
  searched.
- A fetch failure preserves matches from loaded pages and shows an explicit
  retry action. Failure must not look like complete empty success.
- Changing the query or filters while history is loading updates results from
  records already available without restarting or duplicating pagination.

### Search progress and life signs

- While older pages are loading or newly arrived records are being searched,
  show an active search indicator near the query/results status.
- Tie the indicator to actual work. It starts when complete-history loading or
  page scanning starts, updates when a page is accepted and searched, and stops
  on authoritative completion, cancellation/session change, or failure.
- Show concrete progress where available, such as "Searching older history -
  250 messages searched" and the current result count. Do not show a spinner
  that can continue after work has stalled or failed.
- Keep already found results interactive while older history is still being
  searched.
- On failure, replace the active state with the error and retry action. On
  completion, settle to a clear result count or "No matches".
- Progress text and the active indicator must be accessible to screen readers
  without announcing every message/page update excessively.

### Result context and highlighting

- Use one result row per matching message, even when that message contains the
  term more than once.
- Show a contextual snippet around the first occurrence. Include enough text on
  both sides to distinguish similar matches; expand the current roughly
  30-character context if needed for readability.
- Visibly highlight the matching text inside the snippet.
- If the message contains more than one occurrence, show a match-count badge on
  the row.
- Highlighting is case-insensitive in the same way as matching and must preserve
  the original text and casing.
- Selecting a result jumps to its message. User rows retain valid timeline
  actions such as revert/fork; Agent and Tool rows must not show user-only
  actions.

### Result ordering and navigation

- Keep result rows in chronological order so the timeline remains an overview.
- Add an Oldest first / Newest first switch for result ordering. Newest first is
  the default because find begins from the recent end of the conversation.
- When a query starts or ordering changes, select the first result in the
  chosen order.
- Arrow Up selects the previous visible row; Arrow Down selects the next. The
  order switch determines whether that movement goes toward older or newer
  matches.
- Enter jumps to the selected result.

### Result preview and chat synchronization

- Hovering or keyboard-selecting a result highlights its corresponding location
  in the existing prompt navigator/timeline rail. PRD-001 must preserve this
  find-result preview when it expands that rail into the trajectory timeline.
- Clicking or pressing Enter on a result scrolls the chat to the matching
  message but keeps the find dialog open and preserves the query, filters,
  ordering, selected result, and scroll position.
- The user can move through several results and inspect each location without
  reopening the dialog.
- After navigation, visibly highlight the matched search phrase in the target
  chat message. Scope the highlight to the selected result/message rather than
  painting every match across the transcript.
- Clear the rail preview and in-chat search highlight when the query is cleared,
  the dialog closes, the selected session changes, or the selected result is no
  longer valid.
- If a result points to tool content inside a collapsed group, reveal enough of
  that group to show the matched text without changing the user's unrelated
  expansion state.

### Ctrl+F and contextual find

- `open_timeline_dialog` remains configurable in Keyboard Shortcuts settings.
- A user can assign `mod+f` to it even though file find also uses `mod+f`.
- In the active file editor or rendered Markdown preview, `mod+f` continues to
  open file find.
- In chat, including while the composer is focused, the configured timeline
  shortcut opens Conversation Timeline and focuses search.
- Contextual handlers yield outside their owning UI so neither command steals
  find from the other surface or from native browser behavior.
- The shortcut implementation follows the shared shortcut registry. Do not add
  component-level window/document key listeners.

### Memory and responsiveness

- Complete history stays in the existing session message store and follows its
  ordinary cache lifecycle. Do not retain a second permanent copy of the full
  transcript solely for search.
- Do not add special post-search eviction unless representative measurement
  shows it is needed. Desktop can retain up to 40 materialized sessions; mobile
  and VS Code use smaller caches and evict heavy inactive sessions more
  aggressively.
- Search remains responsive for a representative session containing about
  300k tokens. Measure query input latency, history-load work, result rendering,
  and heap growth before adding an index or cache.
- The chat transcript is virtualized, but `TimelineDialog` currently renders its
  result list directly. If broad queries create a measured rendering problem,
  virtualize or otherwise bound the result rows without changing navigation,
  focus, or chronological ordering.

## Acceptance criteria

- User and Agent are enabled by default; Tool can be enabled independently.
- Known terms in user text, agent output, reasoning, and enabled tool content
  produce correctly typed result rows.
- Search automatically loads and searches the complete session history.
- Results appear incrementally while older pages continue loading.
- Actual loading/scanning work has a visible, accessible progress indication
  that settles on completion and changes to an explicit retry state on failure.
- Every result shows readable context with the matched term highlighted; repeat
  occurrences produce one row with a count badge.
- Results can be ordered Oldest first or Newest first, with Newest first as the
  default.
- When space allows, the dialog sits beside the chat and both remain usable;
  constrained layouts use a right-aligned or narrow-screen fallback.
- Hovering/selecting a result previews its location in the timeline rail.
- Activating a result scrolls the chat without closing or resetting the dialog,
  and the selected phrase is highlighted in the target chat message.
- "No matches" appears only after authoritative complete-history coverage.
- `mod+f` can be assigned to Conversation Timeline and routes to file find or
  chat find according to the active context.
- A representative 300k-token session does not create a second persistent text
  copy and remains responsive while loading and searching.

## Validation

- Unit tests for role filtering, searchable text extraction, case-insensitive
  matching, contextual snippets, highlighting ranges, and occurrence counts.
- Tests for both ordering modes, default ordering, and keyboard movement.
- Loader/integration tests for incremental pages, complete coverage, query
  changes during loading, failure preservation, and retry.
- Shortcut tests for chat, composer, file editor, Markdown preview, and native
  fallthrough contexts.
- Manual placement, rail preview, persistent-dialog navigation, in-chat
  highlighting, keyboard, and focus checks because the UI package has no DOM
  test environment for this behavior.
- Production profiling with a representative 300k-token fixture, recording
  search input latency, long tasks, accepted page/result counts, and heap growth.

## Out of scope / future

- Cross-session or project-wide message search.
- Server-side search or a persistent full-text index.
- Special eviction of history loaded by search unless profiling shows ordinary
  session-cache behavior is insufficient.

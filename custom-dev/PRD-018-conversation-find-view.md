---
id: PRD-018
title: Conversation Find view
status: ready
created: 2026-09-02
related:
  - PRD-001
  - PRD-013
  - PRD-019
---

# PRD-018 - Conversation Find view

> A constituent of the PRD-013 keyboard epic and PRD-019 stackable-view epic.
> Read both before implementation.

## Goal

Add a dedicated Find view for searching a complete conversation across user
messages, agent output, and tool activity. It shows contextual, highlighted
results while the chat remains visible, and gives a real life sign while older
history is loading and being searched.

## Separate from Conversation Timeline

Leave the existing `TimelineDialog.tsx` UI and behavior alone. Its primary job
is user-turn navigation, revert, and fork. Find has a different interaction
model: it searches every message kind, remains open during inspection, loads
complete history, and participates in the workspace view stack.

This is the additive-variant path from `custom-dev/README.md`: a new fork-owned
view beside Timeline, with shared lower-level authorities rather than edits that
turn Timeline into Find.

- `/timeline` and `open_timeline_dialog` continue to open Conversation Timeline.
- Find gets its own component/view and its own `open_conversation_find` action.
- Reuse or extract lower-level code where behavior genuinely matches: searchable
  text projection, snippet/range helpers, complete-history loading, and
  message/turn scrolling.
- Do not copy Timeline into a second component or force both UIs through a
  generic dialog abstraction.

Useful existing anchors:

- `TimelineDialog.tsx` has basic filtering, snippet, and message-jump behavior.
- `components/chat/lib/messagePreview.ts` extracts text from message parts.
- `SessionMessageLoader.loadComplete` owns complete-history pagination.
- `useChatTimelineController.scrollToMessage` can reveal materialized messages.

## Stackable-view behavior

- Find is a normal stackable workspace view governed by PRD-019, not a modal or
  temporary overlay.
- It has the same reorderable toolbar icon, single-click toggle, double-click
  isolation, base priority, acute priority, and minimum/normal/maximum-normal
  width settings as every other view.
- Its horizontal position comes only from toolbar/view order. It may appear to
  the left or right of Chat or any other view.
- Opening Find by shortcut enables it if closed or auto-hidden, gives it acute
  priority, and focuses the query field. Invoking the shortcut while visible
  focuses the existing query without resetting state.
- Find remains enabled while the user clicks through results. PRD-019 may
  auto-hide it only when the stack cannot satisfy visible views' width and
  effective-priority contracts.

## Query and filter layout

- Put the query field at the top of the view, spanning its usable width.
- Put compact filter controls in a row immediately below the query, like file
  type and search-option filters in an editor:
  - `[x] User`
  - `[x] Agent`
  - `[ ] Tool`
  - Regex toggle
  - Oldest first / Newest first
- User and Agent are selected by default. Tool is opt-in because tool output can
  be noisy and large.
- Newest first is the default order.
- Keep controls usable at the view's minimum width by wrapping or using compact
  labels without moving them above the query.
- If every message-type filter is cleared, ask the user to select a type. Do not
  report "no matches" for an empty scope.

## Literal and regular-expression search

- Literal search is the default and is case-insensitive.
- Regex mode interprets the query as a regular expression and applies the same
  message-type filters and ordering.
- A malformed expression shows an inline error tied to the query field. It does
  not clear prior valid results, claim "no matches," or restart pagination.
- Highlight the exact ranges matched by either literal or regex mode while
  preserving original text and casing.
- Regex evaluation must be bounded so a pathological expression cannot freeze
  the UI. Measure representative and adversarial patterns; use cancellation,
  chunking, a worker, or another bounded mechanism if main-thread evaluation
  cannot meet the interaction budget.

## Search scopes

Search text represented in chat, not arbitrary serialized SDK objects:

- User includes visible user text and visible attached-context text.
- Agent includes visible assistant text and reasoning/justification text.
- Tool includes visible tool name, summary or description, textual input, and
  textual output.
- Do not expose hidden credentials or fields that chat does not present as
  searchable text.

Project results from rendered chat entries. A user message, assistant text
entry, or tool call gets one result row when it matches. Repeated occurrences in
that same entry produce a count badge rather than duplicate rows.

## Complete-history search

- Once a non-empty, valid query is present, load the complete current-session
  history through `SessionMessageLoader`, the existing pagination authority.
- Older history currently loads in pages of 100 messages. Results update as
  each page arrives and is searched; recent matches stay usable while loading
  continues.
- Continue until the loader authoritatively marks history complete.
- "No matches" is valid only after complete history has loaded and been
  searched.
- Fetch failure preserves results from loaded pages and shows an explicit retry
  action. Failure must not look like complete empty success.
- Query, regex-mode, filter, or ordering changes update available results
  without restarting or duplicating pagination.

## Search progress and life signs

- Show an active indicator near the query/results status while older pages are
  loading or newly accepted records are being searched.
- Tie it to real work. It starts with loading/scanning, advances as pages are
  accepted and searched, and stops on authoritative completion, session change,
  cancellation, or failure.
- Show concrete progress where available, for example "Searching older history
  - 250 messages searched" plus the current result count.
- Never leave an animated indicator running after work has stalled or failed.
- Keep found results interactive during continued search.
- On failure, replace active state with error and retry. On completion, settle
  to a result count or "No matches."
- Make progress accessible without announcing every page/message update to a
  screen reader.

## Results

- Show a contextual snippet around the first occurrence in each matching entry.
  Include enough text on both sides to distinguish similar results.
- Visibly highlight the matched literal text or regex range in the snippet.
- Show a match-count badge when that entry contains more than one occurrence.
- Clearly identify each row as User, Agent, or Tool.
- Apply Oldest first / Newest first to visible row order. When query or ordering
  changes, select the first row in the chosen order.
- Arrow Up selects the previous visible row; Arrow Down selects the next. Enter
  activates the selected row.

## Chat and timeline synchronization

- Hovering or keyboard-selecting a result highlights its corresponding turn
  location in the existing prompt navigator rail. PRD-001 must preserve this
  preview when it expands the rail into the trajectory timeline.
- Clicking or pressing Enter scrolls Chat to the matching entry without closing
  Find or resetting its query, filters, ordering, selection, or result scroll.
- Double clicking or ctrl+enter does as above, but also closes/hides the find
  view, considering it "job done".
- Highlight the selected search phrase in the target chat entry. For regex,
  highlight the concrete matched range, not the pattern text.
- Scope transcript highlighting to the selected result rather than painting all
  matches across the virtualized chat.
- If matched tool content is collapsed, reveal enough to show the match without
  changing unrelated expansion state.
- Clear rail preview and transcript highlight when the query clears, Find
  closes, session changes, or the selected result becomes invalid.
- Loose idea - refine further: perhaps match highlights should continue to be
  highlighted for a certain time (preferably settings option), and then fade
  until not highlighted, after find view has been closed (whichever way it was
  closed)

## Ctrl+F and other entry points

- Add configurable action `open_conversation_find`. Its default may remain
  unassigned or use `mod+f` once contextual file-find coexistence is complete.
- The user must be able to assign `mod+f` even though file find also uses it.
- In an active file editor or rendered Markdown preview, `mod+f` continues to
  open file find.
- In Chat, including composer focus, it opens/enables Find and focuses query.
- Contextual handlers yield outside their owning view so neither steals native
  browser find.
- Use the shared shortcut registry, not component-level window/document
  listeners.
- Icon, shortcut, and any future command-palette entry open the same Find view.

## Memory and responsiveness

- Complete history stays in the existing session message store and follows its
  ordinary cache lifecycle. Do not retain a second permanent transcript solely
  for Find.
- Do not add special post-search eviction unless measurement shows it is needed.
- Keep query input, filtering, regex evaluation, and result scrolling responsive
  for a representative session containing about 300k tokens.
- Measure before adding an index/cache. Any retained index needs explicit
  invalidation, session/runtime identity, and memory bounds.
- If broad results make direct rendering expensive, virtualize or otherwise
  bound result rows without breaking focus, ordering, or selected-row identity.

## Acceptance criteria

- Conversation Timeline remains behaviorally unchanged and Find is a separate
  stackable view.
- Query is at the top with User, Agent, Tool, Regex, and ordering controls below.
- User and Agent default on; Tool defaults off; Newest first is the default.
- Literal and valid regex searches match and highlight the expected ranges;
  malformed regex has a non-destructive inline error.
- Search automatically loads and searches complete session history.
- Results appear incrementally with action-backed progress and explicit failure
  recovery.
- Each matching rendered entry has one typed row with context, highlighted
  first match, and occurrence count.
- Hover/selection previews the turn in the timeline rail.
- Activation scrolls and highlights Chat without closing or resetting Find.
- Reordering Find's icon positions the view according to PRD-019; no fixed side
  is encoded.
- Contextual `mod+f` routing works in Chat and file surfaces.
- A representative 300k-token session remains responsive without a second
  persistent transcript copy.

## Validation

- Unit tests for scope projection, literal/regex matching, invalid regex,
  snippets, highlight ranges, occurrence counts, filters, and ordering.
- Loader tests for incremental pages, complete coverage, query changes,
  failure preservation, retry, cancellation, and stale-session rejection.
- Shortcut tests for Chat, composer, file editor, Markdown preview, auto-hidden
  Find, and native fallthrough.
- Stack integration tests for reordering, width pressure, acute priority on
  open/focus, and state preservation through auto-hide/restore.
- Manual rail preview, transcript highlighting, collapsed-tool reveal, keyboard,
  focus, and screen-reader checks.
- Production profiling with a representative 300k-token fixture and adversarial
  regex patterns, recording input latency, long tasks, result counts, and heap.

## Out of scope / future

- Cross-session or project-wide search.
- Server-side search or a persistent full-text index.
- Changing Conversation Timeline's purpose or current behavior.
- Special search-history eviction unless profiling shows ordinary lifecycle is
  insufficient.

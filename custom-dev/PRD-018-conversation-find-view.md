---
id: PRD-018
title: Conversation Find view
status: ready
created: 2026-09-02
related:
  - PRD-001
  - PRD-013
  - PRD-019
  - PRD-022
  - PRD-023
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

- User includes visible user text, visible attached-context text, and parsed
  question-tool answers from PRD-023. A question answer keeps a visible
  question-tool source marker but follows the User filter.
- Agent includes visible assistant text and reasoning/justification text.
- Tool includes visible tool name, summary or description, textual input, and
  textual output. Do not duplicate a parsed question answer here after it has
  been classified as user-originated input.
- Do not expose hidden credentials or fields that chat does not present as
  searchable text.

Project results from rendered chat entries. A user message, question-tool
answer, assistant text entry, or tool call gets one result row when it matches.
Repeated occurrences in that same entry produce a count badge rather than
duplicate rows.

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

- A non-empty valid query publishes one `conversation-find` decoration layer to
  the PRD-022 Conversation Decoration Registry. Find does not send rendering
  instructions directly to TimelineRail, Chat, or the trajectory ledger.
- Use `composition: "exclusive"`. Find results should not be visually mixed
  with lower-priority additive decoration layers while Find is active.
- Use `entryStates.unlistedState: "dimmed"`. Every accepted result message or
  part is `highlighted`, including matches discovered incrementally while older
  history loads.
- The keyboard-selected result is `selected`. A hovered result may temporarily
  use `focused`; when hover ends, restore the producer's selected/highlighted
  state. Each target has one state in this layer.
- A tool result targets its matching part span when the result projection has a
  stable `partId`. Message-level results target the matching message spans.
- Publish the active literal or regex query through `textMatches`. Every
  occurrence in text currently visible in a capable conversation view is
  decorated, even when that message type is excluded by Find's User/Agent/Tool
  result filters. The selected or hovered result may override those occurrences
  with `selected` or `focused` in its target.
- Text decoration never expands a collapsed tool, untruncates ellipsized text,
  or mounts an off-screen virtualized message. If that content later becomes
  visible, it reads and applies the retained layer at its current lifecycle
  phase.
- A malformed regex preserves the previous valid result layer along with the
  previous valid result rows. It does not replace them with an empty or dim-only
  layer.
- Clicking or pressing Enter scrolls Chat to the matching entry without closing
  Find or resetting its query, filters, ordering, selection, or result scroll.
- Double clicking or ctrl+enter does as above, but also closes/hides the find
  view, considering it "job done".
- For regex, decorate each concrete visible matched range, not the pattern text.
- Clearing the query removes the decoration layer immediately. Session,
  directory, or runtime changes also clear it before a different conversation
  renders.
- Search-result, query, filter, ordering, hover, and selection changes replace
  the same layer atomically and use `changed.transitionMs: 100`. They do not
  start the withdrawal hold.
- Closing Find by any explicit close path withdraws its last valid layer. The
  layer holds at full strength for its configured duration, 5 seconds by
  default, then transitions every channel to the next applicable decoration or
  intrinsic style over 2 seconds. This includes toolbar toggle, double click,
  Ctrl+Enter, and isolation of another view.
- PRD-019 responsive auto-hide does not close Find or start the hold timer.
  While Find remains enabled with a valid query, its result layer stays active
  even if the layout temporarily hides the view.
- Add a Find setting for `withdrawn.holdMs`. Zero skips the hold and starts the
  fixed `withdrawn.transitionMs: 2000` transition immediately.
- Reopening Find during hold or transition republishes the layer, cancels
  withdrawal, and transitions from its current displayed state to current
  results.
- Invalid selection removes only its selected or focused state; it does not
  discard valid highlighted matches. Reduced-motion mode may remove motion from
  the transition, but must still clear the layer after the same lifetime.

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
- Question-tool answers participate in the User filter and read as
  user-originated results while retaining a question-tool source marker.
- Hover/selection previews the matching message or part span in the timeline
  rail.
- While valid results are active, unmatched timeline spans are dimmed, matching
  spans are highlighted, the keyboard-selected result is selected, and a
  hovered result may be focused.
- Every query occurrence in actually visible Chat or ledger text is decorated
  regardless of Find's result-type filters; hidden content is not expanded or
  mounted for decoration.
- Closing Find withdraws one exclusive layer, retaining all channels for the
  configured duration, 5 seconds by default, then transitioning them over 2
  seconds. Reopening cancels withdrawal; conversation or query clearing removes
  stale decoration immediately.
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
- Manual rail preview, visible transcript highlighting, collapsed and ellipsized
  content, keyboard, focus, and screen-reader checks.
- PRD-022 integration tests for incremental matches, message and part targets,
  one state per target, result-filter-independent visible text matching,
  invalid-regex preservation, atomic replacement, every withdrawal path,
  configurable hold including zero, synchronized channel transition, reopen
  cancellation, reduced motion, and stale identity clearing.
- Production profiling with a representative 300k-token fixture and adversarial
  regex patterns, recording input latency, long tasks, result counts, and heap.

## Out of scope / future

- Cross-session or project-wide search.
- Server-side search or a persistent full-text index.
- Changing Conversation Timeline's purpose or current behavior.
- Special search-history eviction unless profiling shows ordinary lifecycle is
  insufficient.

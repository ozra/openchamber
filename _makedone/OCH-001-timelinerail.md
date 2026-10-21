---
status: review
created: 2026-09-01
related: ["OCH-002","OCH-011","OCH-018","OCH-019","OCH-022","OCH-023"]
kind: "feature"
aliases: ["PRD-001"]
depends_on: []
complexity: medium
estimated_effort: "3"
---

# TimelineRail

## Goal

Replace the prompt-navigator rail with a slim timeline rail that shows the flow
of user, agent, and tool activity in miniature, plus a minimap frame showing
which part of the transcript Chat currently shows. It is the compact overview
of a session, used for quick navigation and for reading the shape of a turn.

## Background

The chat's right edge has a vertical gutter of ticks, one per user prompt, with
hover preview, click-to-jump, keyboard navigation, and a load-earlier button:

- `packages/ui/src/components/chat/components/PromptNavigatorRail.tsx`
- mounted once, in `ChatViewport`, `packages/ui/src/components/chat/ChatContainer.tsx:587-597`
- gated by the `promptNavigatorEnabled` setting ("Prompt navigator"), hidden on
  mobile and in expanded input; the toggle shortcut drives
  `isPromptNavigatorPanelOpen` in `useUIStore`.

## Component strategy

Additive variant that replaces the upstream rail at its single mount point.

- Build a fork-owned `TimelineRail` component in its own files under
  `packages/ui/src/components/chat/components/` (component, plus pure modules for
  span projection, sizing, and geometry). Start from a copy of
  `PromptNavigatorRail` where that preserves hover, keyboard, load-earlier, and
  jump behavior.
- The upstream integration is the import and the JSX block in `ChatViewport`:
  `PromptNavigatorRail` is swapped for `TimelineRail`, a change of a few lines.
  `TimelineRail` takes the data `ChatViewport` already has (rendered messages,
  turn ids, active turn, select/jump callbacks, load-earlier state, scroll
  container ref). Shaping its props to fit what is there keeps the
  merge-sensitive edit small; projection happens inside the fork's files.
- `PromptNavigatorRail.tsx` stays in the repo unmodified and is no longer
  mounted. There is no setting to choose between the two. When upstream changes
  it, compare and port useful improvements into `TimelineRail` deliberately.
- Reuse the existing `promptNavigatorEnabled` setting, its Settings row, the
  toggle shortcut, and `isPromptNavigatorPanelOpen` as they are. No new settings
  in v1.
- Shared and not duplicated: message sync, the turn projection, the timeline
  scroll controller, history loading, and `useChatTurnNavigation`.
- If geometry needs a seam the list does not expose yet (see Open questions),
  add it narrowly on the timeline/list side and record it in
  `custom-dev/FORK-DIFFERENCES.md`.

## Requirements (v1)

### Placement and shape

- Same place as today: an overlay on the chat viewport's end edge (right in LTR),
  clear of the overlay scrollbar. Unlike the current rail, which is vertically
  centered with a fixed tick pitch, it spans the full height of the chat
  viewport.
- As slim as possible; the current rail is 12 to 28px. Keep the narrow-gutter
  behavior that stops the rail from swallowing clicks on user bubbles.
- Shown under the same conditions as the current rail: the setting is on, not
  mobile, not expanded input, and at least two turns.

### Spans and lanes

- One span per user message, agent text output, reasoning block, and tool call
  in the materialized conversation, positioned along the rail by transcript
  position.
- Lanes are offsets, not columns. User spans are start-aligned, agent spans
  centered, tool spans end-aligned. A few pixels of offset is enough because
  lanes also differ by color; color first, offset second. A turn with many tool
  calls reads as a clear end-side cluster.
- System/control messages (`role === 'system'`, synthetic-role messages such as
  plan-mode injections, header/control messages) use the centered geometry with
  a distinct neutral treatment, and never read as user input or agent output.
- Question tools render as ordinary tool spans in v1 (WIP; OCH-023 handles
  answers later).
- Every span carries stable `spanId`, `turnId`, `messageId`, optional `partId`,
  and its semantic kind, so later decorations and Find can target it without
  reshaping the projection.

### Span length

- Painted length follows represented content, on one continuous logarithmic
  scale:

  ```text
  ratio = log1p(min(contentChars, 10,000)) / log1p(10,000)
  length = minLength + ratio * (maxLength - minLength)
  ```

- Count user-visible source text, including visible tool input and output.
  Exclude hidden fields, credentials, and presentation-only labels. A span with
  no meaningful text uses `minLength`.
- `minLength` is a hard visual floor at every supported rail size and zoom; no
  span collapses to a zero-length line or subpixel artifact.
- Content beyond 10,000 characters clamps to `maxLength` and adds a compact
  vertical ellipsis marker that belongs to the same span.
- Each span gets an interaction target at least `minHitLength` tall, spanning
  the rail width. Where padded targets would overlap, split the shared space at
  the midpoint between their positions so each point activates exactly one span.
- Painted length never changes the span's transcript position or the viewport
  frame.

### Colors

- User input and system/control messages use distinct tonal variants; evaluate
  in use and unify groups that read better the same.
- Thinking and tool spans take their hue from the same semantic source as the
  OCH-011 message-prefix labels: the shared tool-label classifier maps a tool to
  its kind once, and the prefix and the span read the same theme token. No
  separate tool-color map. Thinking uses `tools.label.thinking`; unknown tools
  use the prefix fallback.
- Theme tokens only; works in every theme, including Monozrakai (OCH-012).

### Viewport frame

- A translucent outlined frame over the rail shows the portion of Chat currently
  visible, like an editor minimap's viewport box.
- Spans and frame share one normalized transcript coordinate model. Positions
  come from the timeline/virtualizer geometry; the rail does not build its own
  scroll model or measure mounted message DOM.
- The frame follows scroll, resize, history prepend, and changed row
  measurements, and the current Chat anchor stays put while history loads.
- The load-earlier button stays visible while older history is not
  materialized, so the frame never implies the loaded records are the whole
  session.
- The frame is presentation only and does not intercept hover, click, or
  keyboard input.

### Navigation

- Clicking a span jumps Chat to that span's message, instantly, as the current
  rail does: a prompt through `navigation.scrollToTurnId`, every other span
  through `navigation.scrollToMessageId`.
- Hovering the rail shows a card for the nearest span: its kind (Prompt,
  Reply, Thinking, System, or the tool name) and a preview of its text, after
  the same rest delay the prompt rail used.
- Keyboard: the toggle shortcut focuses the rail on the active turn. ArrowUp
  and ArrowDown step by span, PageUp and PageDown by prompt, Home/End, Enter
  jumps, Escape closes.
- Load-earlier keeps the prompt rail's button and behavior.
- Accessible name on the rail; each span is a listbox option labelled with its
  kind and preview.

## Acceptance criteria

- With "Prompt navigator" on, Chat shows `TimelineRail` where the prompt rail
  was; `PromptNavigatorRail.tsx` is unchanged and unmounted.
- The upstream edit in `ChatContainer.tsx` is limited to the import and the
  mount block, plus any geometry seam recorded in `FORK-DIFFERENCES.md`.
- User, agent, and tool activity of each turn is distinguishable at a glance by
  color and offset; system/control messages read differently from user input.
- Span lengths scale continuously with content, clamp at 10,000 characters with
  an ellipsis marker, and empty or short spans stay visible and clickable.
- Tool and thinking span hues match their OCH-011 prefix hues in every theme.
- The viewport frame tracks the visible Chat range through scroll, resize,
  history prepend, and remeasurement.
- Clicking a span lands Chat on that message; hover preview, keyboard
  navigation, and load-earlier work as on the old rail.

## Validation

- Projection tests: stable span, turn, message, and part identities; lane and
  kind classification for user, agent, reasoning, tool, and system/control.
- Sizing tests: the log formula, empty content, the 10,000-character cutoff and
  marker, visual minimum, hit-target minimum, neighbor target ownership, and
  hidden-field exclusion.
- Geometry tests: frame position and size, resize, history prepend, incomplete
  history, changed measurements.
- Theme test: tool and thinking prefixes and spans resolve the same tokens,
  including the unknown-tool fallback.
- Profile with the representative 300k-token fixture: scrolling and streaming
  must not rescan the whole conversation per frame.

## Decisions taken during implementation

- **Geometry source.** `MessageListHandle.getTimelineLayout()` returns the
  list's rows (`TimelineEntry[]`) and LegendList state. Row tops come from
  `positionAtIndex`; a row's size is the next row's position minus its own,
  so rows placed from estimates count too. The extent and the frame come from
  the scroll node. The rail subscribes to `lastPositionUpdate` and `totalSize`.
- **Positions inside a row.** A row is split between its spans by an estimated
  rendered height: text by line count, tool rows, reasoning blocks and notices
  by a fixed header height.
- **Length vs. position.** Spans paint in transcript order, later on top. The
  whole gutter is one pointer target: the nearest span within 8 px wins, later
  spans win ties, gaps split at the midpoint.
- **Long empty stretches** (a long answer, the list's tail spacer) are cut to
  a short gap and the scale grows until the spans fill the rail. The frame
  maps through the same anchors. A line marking each cut was tried and
  dropped. (UAT 2026-10-21: the holes read as time gaps.)
- **Pointer lookup weighs the lane**, so pointing at a prompt no longer picks
  the tool call level with it. The rail keeps the normal arrow pointer; a
  crosshair hid the spans it pointed at. (UAT 2026-10-21.)
- **Units are rem**, snapped to device pixels, so the rail follows the
  interface size setting like the rest of the UI. (UAT 2026-10-21.)
- **Hover** outlines the hovered span and dims the others.
- **Non-prompt clicks** release live follow and ask the list for the message:
  the controller's message index skips v2 replies (no `parentID`), which
  `windowTurns.test.ts` pins. Whether that upstream rule is stale is open; see
  Comments. (UAT 2026-10-21: only prompt clicks moved Chat.)
- Starting values, to tune in UAT, at the default 16 px root: span width
  0.3125rem (5 px), lane gap 0.09375rem (1.5 px, three device pixels on a
  2x screen), span length 0.1875rem to 1.75rem, hit reach 0.5rem, lane
  penalty 0.375rem, cut gap 0.4375rem.

## Later iterations

Kept from the earlier version of this ticket; each becomes its own ticket or
iteration once v1 lands.

- **Message-type toggles.** Tiny square/dot toggles at the top of the rail, one
  per class (user input, agent output, tool/activity, system/control), all on
  initially; user-only gives the old prompt-rail view. A disabled class has no
  spans or hit targets, keeps its decoration state, and does not move the frame.
  Temporary view state: survives responsive auto-hide, resets when the rail
  closes or the conversation changes. Keyboard reachable, accessible name,
  pressed state, tooltip, not color alone.
- **Content/Time length mode.** A two-state control beside the toggles using the
  shared sprite `Icon` (content-size or clock), translated state name and
  tooltip, persisted across conversations. Time mode sizes non-user spans by
  authoritative duration on a log scale with a five-minute cutoff, falls back to
  content for missing or invalid timing, never infers duration from neighbors or
  busy events, grows live spans at most once per second, and does no timer work
  when hidden or in Content mode. User-originated spans stay content-sized,
  anchored to the median of completed timed spans (midpoint when none) per
  `custom-dev/DOCUMENTATION.md`, recalculated only when the history boundary
  changes. Switching modes changes painted length only.
- **OCH-023 question answers.** Answer subspans from parsed question-tool output
  with user-input lane, color, sizing, filtering, preview, and navigation,
  keeping the owning `partId` and question/answer index, no synthetic SDK user
  message. The request stays tool-identified.
- **OCH-022 decorations.** Consume `entryStates` per span; render `dimmed`,
  `highlighted`, `selected`, `focused` for the narrow rail over the intrinsic
  hue. The rail does not own the registry or take Find props.
- **OCH-018 Find.** Find results preview at matching message or part spans
  through OCH-022, without navigating Chat.
- **OCH-019 placement.** Move the rail into the workspace stack as a stackable
  view with user-ordered side and position and the shared width rules.
- **OCH-002.** Range selection in the rail reflected in the trajectory ledger
  and Chat.

Dropped: approximate tokens-per-second in the title bar.

## Comments

### 2026-10-20 19:09 · Claude

Refined with Oscar. Decisions: replace `PromptNavigatorRail` at its single mount
point with a fork-owned `TimelineRail`, with no legacy selector; keep the existing
setting and shortcut; stay an in-place overlay, with OCH-019 placement deferred;
v1 is lanes, content-sized spans, colors, and the viewport frame. Toggles, Time
mode, OCH-018/022/023 integration moved to later iterations; question tools
render as plain tool spans for now; tokens/s dropped.

### 2026-10-20 19:17 · oscar

Set status=in-progress; estimated_effort=3.

### 2026-10-20 19:40 · oscar

Set status=review.

### 2026-10-21 06:28 · oscar

UAT round 1 found three issues, fixed: duplicate React key left the previous transcript mounted on session switch; lanes overlapped (now 1 px apart); empty stretches, imprecise pointer, and non-prompt clicks (see Decisions). Open question for Oscar: windowTurns.ts refuses v2 reply ids because it maps them through parentID, and windowTurns.test.ts pins that. It looks like a v1 leftover that also breaks #message-<id> links to replies; fixing it upstream-side is a separate decision.

### 2026-10-21 09:00 · oscar

Pre-commit review fixed: wheel over the rail scrolls Chat; a pointer no longer focuses the rail; clicks in a folded turn unfold it (Thinking spans also open the reasoning block); reasoning spans follow Show reasoning traces; memoized spans, so hover re-renders two; StrictMode no longer leaves the rail empty; stale list positions cannot reorder spans; header offset 3rem; frame height is no longer reset by React; shortcut before the first layout; aria-current on the active turn.

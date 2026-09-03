---
id: PRD-001
title: TimelineRail
status: draft
created: 2026-09-01
related:
  - PRD-002
  - PRD-011
  - PRD-018
  - PRD-019
  - PRD-022
  - PRD-023
---

# PRD-001 - TimelineRail

## Goal

Turn the existing prompt-navigator rail into a slim, full-height timeline rail
that shows the flow of user, agent, and tool activity in miniature. When
enabled, this timeline scrollbar is the compact overview of a session, usable
for quick navigation and for reading the shape of a turn.

## Background

The repo already has a vertical gutter of ticks on the chat's right edge, one
tick per user prompt, with hover preview, click-to-jump, keyboard navigation,
and a load-earlier boundary:

- `packages/ui/src/components/chat/components/PromptNavigatorRail.tsx`
- mounted at `packages/ui/src/components/chat/ChatContainer.tsx:517`

This feature builds on that pattern: each single user tick becomes a small
three-lane strip showing the full turn flow.

## Component strategy

Build a fully independent fork-owned `TimelineRailView` component beside
`PromptNavigatorRail`. It is not a mode, conditional rendering branch, or
expanded prop set inside the original rail.
Start from a direct copy where that best preserves hover, keyboard, load-earlier,
and jump behavior. Keep the original prompt navigator available as an
independently selectable legacy view so both can be compared and upstream rail
improvements can be ported deliberately.

Share the authoritative turn projection, scroll/navigation controller, and
history-loading contracts. Do not duplicate message synchronization or create a
second source of turn truth. Core changes should be limited to PRD-019 view
registration/layout and the narrow preview/navigation contracts both rails use.

## Requirements

### Placement and shape

- The timeline rail is a normal stackable view governed by PRD-019. Its side
  and position follow user view order rather than a hardcoded Chat edge.
- Default order may place it immediately beside Chat, preserving the current
  rail relationship until the user reorders it.
- The rail spans the full stack height and is as slim as possible (it already is
  roughly 12–28px; keep minimum, normal, and maximum-normal widths close).
- One strip per turn, positioned along the rail like the existing ticks.

### Message-type toggles

- Put a compact set of message-type toggles at the top of the rail. These are
  tiny square, blob, or dot controls suited to the rail width, not regular
  checkbox components squeezed below their usable size.
- Provide one toggle for each displayed class: user-originated input, agent
  output, tool/activity, and system/control when that class is present.
- All classes are enabled initially. Turning off every class except
  user-originated input gives the focused prompt-navigation view of the legacy
  prompt rail.
- A disabled class has no visible spans or hover/click targets. Its decoration
  state remains retained and applies again if the class is re-enabled.
- Filtering changes visibility only. It does not reflow transcript coordinates
  or move the viewport frame, which must remain aligned with Chat.
- Treat this as temporary view state: preserve it through responsive auto-hide,
  but reset to all enabled when TimelineRail closes or changes conversation.
- Each tiny control remains keyboard reachable and has an accessible name,
  pressed state, tooltip, and visible enabled/disabled distinction. Do not rely
  on color alone.

### Span-length mode

- Put a compact two-state length-mode control beside the message-type toggles so
  it is available directly from the rail. It switches between Content and Time
  without opening Settings.
- Use the shared sprite `Icon` with a changing content-size or clock symbol.
  Translate its accessible state name and tooltip, such as "Span length:
  Content" or "Span length: Time". The control is keyboard reachable and does
  not rely on icon shape alone.
- Content is the default. Persist the chosen mode as a TimelineRail preference
  across conversations and responsive auto-hide. Closing the rail does not
  reset it.
- Switching mode changes painted span lengths only. It does not reflow
  transcript coordinates, move the viewport frame, change filtering, or replace
  span identities and navigation targets.

### Transcript map and viewport

- The rail is a minimap of the materialized conversation, not an unrelated
  fixed-pitch list. Rail spans and the viewport frame use the same normalized
  transcript coordinate model.
- Draw a translucent outlined frame over the rail showing the portion of Chat
  currently visible, like the viewport box in an editor minimap.
- Derive span positions and viewport bounds from geometry published by the chat
  timeline or virtualizer controller. `TimelineRailView` must not maintain a
  competing scroll model or infer authoritative positions by querying mounted
  message DOM on its own.
- Update the frame while Chat scrolls, resizes, prepends older history, or
  accepts changed virtualizer measurements. Preserve the current Chat anchor
  while complete-history loading changes the mapped extent.
- Keep the existing load-earlier boundary visible while older history is not
  materialized. Do not make the frame imply that loaded records are the complete
  session when the loader says otherwise.
- The frame is presentation only and does not intercept span hover, click, or
  keyboard navigation.

### Three lanes — offset, not columns

- User message spans are **left-aligned**.
- Agent message spans are **centered**.
- Tool message spans are **right-aligned**.
- This must **not** be three rigid columns. A few pixels of left/center/right
  difference is enough to convey the lane, because spans also have distinct
  colors. Lane is conveyed by color first, offset second.
- A turn with many tool calls still reads as a clear right-side cluster.
- System/control spans use the centered geometry with a distinct neutral
  treatment. They remain a separate filter class and never count as agent
  output.

### User-originated input vs system/scope/control

- Actual user input must be visually distinct from system/scope/control
  messages (plan-mode hidden user messages, `role === 'system'` messages,
  header/control messages).
- **Approach (initial):** give the different kinds distinct tonal variants of
  styling/color first, then evaluate whether some groups feel better styled the
  same and unify where it reads better. Not fixed in advance.

### Span length

- In Content mode, every user, agent, tool/activity, and system/control span
  derives its visual length from the amount of user-visible content represented
  by that span.
- Use one continuous logarithmic content scale rather than message-type
  thresholds or size tiers:

  ```text
  ratio = log1p(min(contentChars, 10,000)) / log1p(10,000)
  length = minLength + ratio * (maxLength - minLength)
  ```

- Count the source text that the span represents, including visible tool input
  and output. Exclude hidden fields, credentials, and presentation-only labels.
  A span with no meaningful text uses `minLength`.
- `minLength` is a hard visual floor. Every projected span remains visibly
  distinct at every supported rail size and zoom level; no span may collapse to
  a zero-length line or subpixel artifact.
- Give each span an interaction target at least as long as `minHitLength`, using
  invisible padding when its painted length is smaller. The hit target spans the
  usable rail width. Where neighboring padded targets would overlap, divide the
  shared space at the midpoint between their transcript positions so each point
  activates exactly one span.
- At 10,000 characters, clamp the span to `maxLength`. Content beyond that
  cutoff adds a compact vertical ellipsis marker, or a horizontal ellipsis
  rotated 90 degrees, to show that the entry is longer than the rail can encode.
  The marker belongs to the same span and does not add a separate hit target.
- In Content mode, user prompts and question-tool answers follow this same
  formula. They differ from other message types by lane and intrinsic color,
  not by sizing rules.
- In Time mode, agent, tool/activity, and system/control spans use a continuous
  logarithmic duration scale with a five-minute cutoff between the same
  `minLength` and `maxLength`.
  Accept duration only from valid authoritative start/end fields on the part or
  from created/completed fields when the span represents the whole message.
  Never infer duration from neighboring entries, repeated busy events, or the
  wall-clock gap around a persisted record.
- A non-user span with missing, incomplete, or invalid timing data falls back to
  the Content-mode formula. A live span with an authoritative start may grow
  from elapsed time no more than once per second, then settle to its
  authoritative duration when the end arrives. A closed, auto-hidden, or
  Content-mode rail performs no elapsed-time updates.
- User prompts and user-originated question answers always remain content-sized.
  In Time mode, anchor their content curve to the median painted length of valid,
  completed timed spans in the materialized conversation. Use the midpoint
  between `minLength` and `maxLength` when no timed sample exists. Apply the
  median-based formula in `DOCUMENTATION.md` so short and long user inputs remain
  distinguishable without dominating or disappearing beside timed spans.
- Recalculate the Time-mode user anchor when the materialized-history boundary
  changes. Do not update the anchor for every streaming part or animation frame.
  If the visual length change is animated, use transform or opacity rather than
  animating layout geometry.
- Painted length does not change the span's transcript position or the viewport
  frame. Both remain tied to Chat geometry.

### Question tool

- Follow the shared user-originated answer contract in PRD-023.
- Keep the question request identifiable as a question tool.
- Treat each completed answer as user-originated input in visual contexts. The
  fact that the user supplied it is more important for presentation than the
  fact that it travelled through a tool response.
- In TimelineRail, project answer subspans from the parsed question-tool output.
  Give them user-input lane, color, sizing, filtering, preview, and navigation
  behavior while retaining their owning question `partId` and question/answer
  index. Do not fabricate an SDK user-message identity.
- A question request may remain tool-aligned and tool-identified. Its answer
  subspans use the user-originated class and appear when the user-input toggle
  is enabled, not when only tool/activity is enabled.

### Semantic colors shared with message prefixes

- Thinking, reasoning, and tool spans use the same semantic color source as the
  corresponding message-prefix labels from PRD-011.
- The shared tool-label classifier maps a tool to its semantic kind once. Both
  the prefix and timeline span consume that result and the same theme token;
  neither keeps a separate tool-color map.
- Thinking spans use the same `tools.label.thinking` token as the Thinking or
  Justification prefix.
- Unknown tools use the same fallback as their prefix label.
- Decorations may change opacity, outline, weight, or glow, but they retain the
  span's semantic hue so a marked Read span still reads as Read.

### Conversation decorations

- Consume the PRD-022 `entryStates` channel for each projected span.
  `TimelineRailView` does not receive direct Find props or own the registry.
- Every span exposes `spanId`, `turnId`, `messageId`, optional `partId`, and its
  intrinsic semantic kind to the decoration adapter.
- Render `dimmed`, `highlighted`, `selected`, and `focused` states in a form
  suitable for the narrow rail. Preserve the intrinsic tool, Thinking, and
  user-input hue beneath the temporary treatment.
- A disabled message-type toggle skips rendering its spans, including
  decorations, without deleting or rewriting registry state.

### Tokens per second in the title bar

- Approximate input and output tokens-per-second for the current session appear
  in the title bar, next to the used-tokens indicator
  (`ContextUsageDisplay`, `packages/ui/src/components/layout/Header.tsx:1650`).
- Values are derived from creation deltas and are **always labeled
  approximate**; hidden when token data is unavailable.
- See `DOCUMENTATION.md` for the derivation model.

### Navigation

- Clicking a span scrolls the chat to that message (reusing the existing
  on-select-turn jump).
- Conversation Find publishes its result, hover, and selection states through
  PRD-022. These decorations do not navigate Chat.
- Later: clicking/selecting a range in the rail reflects in both the trajectory
  ledger (PRD-002) and the chat.

## Acceptance criteria

- Each turn's user/agent/tool activity is distinguishable at a glance by
  color + offset.
- Compact top controls can isolate user-originated, agent, tool/activity, and
  system/control spans without moving the viewport frame.
- The rail-local length control switches between Content and Time immediately
  and preserves the chosen mode across conversations.
- Every span scales continuously with represented content size, clamps at the
  shared cutoff, and marks content beyond that cutoff with a vertical ellipsis
  in Content mode.
- Time mode uses authoritative durations for non-user spans, content fallback
  for missing timing, and context-scaled content lengths for user-originated
  spans.
- Empty and short spans remain visible and pointer-clickable through the shared
  visual and hit-target minimums.
- System/scope/control messages read differently from user-originated input.
- Question requests remain identifiable as tools while completed answers read
  and filter as user-originated input without losing question-tool identity.
- Approx tps shows beside the tokens indicator when data exists, and is hidden
  when it does not.
- Clicking a span navigates the chat to that message.
- A viewport frame tracks the visible Chat range against the same transcript
  map used to place spans, including through resize and history prepend.
- The rail follows PRD-019 ordering and width rules, and previews PRD-018 Find
  results at the matching message or part span.
- PRD-022 decoration states render at matching message, part, and span targets;
  stale conversation layers never mark the current rail.
- Tool and thinking span hues match their PRD-011 message-prefix hues while
  decoration treatment remains visibly distinct.
- The implementation is `TimelineRailView`, separate from
  `PromptNavigatorRail`; the original rail remains independently usable.

## Validation

- Projection tests for stable span, turn, message, and part identities.
- Sizing tests for the logarithmic formula, empty content, the 10,000-character
  cutoff, overflow marker, visual minimum, hit-target minimum, neighboring target
  ownership, hidden-field exclusion, and all message classes.
- Length-mode tests for control accessibility and persistence, authoritative
  duration selection, invalid and missing timing fallback, live bounded updates,
  user-anchor calculation and recalculation, and stable geometry and identity
  while switching modes.
- Profile mode switching and one-second live updates with the representative
  300k-token fixture. Hidden and Content-mode rails perform no timer work, and a
  live tick updates only affected spans rather than rescanning the conversation.
- Projection tests for question-answer subspan identity and user-originated
  classification without synthetic SDK messages.
- Toggle tests for every class, user-only mode, hidden hit targets, reset and
  auto-hide lifecycle, decoration retention, and accessible operation.
- PRD-022 integration tests for target specificity, lifecycle transitions, and
  conversation-scope clearing.
- Geometry tests for viewport position and size, resize, history prepend,
  incomplete-history boundaries, and changed virtualizer measurements.
- Integration tests proving Find can mark message and part spans without
  navigation and without feature-specific rail props.
- Theme tests proving tool and thinking prefixes and rail spans resolve the same
  semantic tokens, including unknown-tool fallback.

## Out of scope / future

- The full trajectory ledger view (PRD-002).
- Bidirectional navigation sync across rail/ledger/chat (PRD-002, later).
- Live streaming tps (measured client-side from part deltas) — a separate
  feature, also latency-inclusive.
- Any change to the prompt navigator's existing hover preview or keyboard
  navigation unless it conflicts with the lane or viewport layout.

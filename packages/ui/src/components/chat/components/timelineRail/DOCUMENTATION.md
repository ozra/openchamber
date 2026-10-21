# Timeline rail

Fork-owned (OCH-001). The rail on the chat's end edge: one span per prompt, reply text, thinking block, tool call and system record, laid out like a minimap of the transcript, with a frame over the part Chat shows. It replaces `PromptNavigatorRail` at its one mount point in `ChatViewport` (`ChatContainer.tsx`); the upstream file stays in the repo unmounted, listed as a Knip entry, so upstream changes to it can be compared and ported.

## Ownership

- `projectRailSpans.ts` turns the list's rows into spans: kind, lane, content size, stable ids, preview text.
- `layoutRailSpans.ts` owns the span-length formula, the placement of spans on the rail, and the pointer lookup.
- `TimelineRail.tsx` reads the list, subscribes to its position updates, paints spans and the frame, and handles hover, click, keyboard and load-earlier.

The rail owns no transcript data. Rows and their positions come from `MessageList` through `MessageListHandle.getTimelineLayout()`. A prompt jumps through the timeline controller (`onSelectTurn`); every other span through `onSelectMessage` in `ChatContainer`, which unfolds the message's turn (`MessageListHandle.revealFoldedMessage`, plus `requestReasoningReveal` for a Thinking span), releases live follow and asks the list for the message (see the decision below). Reasoning spans follow the "Show reasoning traces" setting, as Chat does. The setting (`promptNavigatorEnabled`), the toggle shortcut and `isPromptNavigatorPanelOpen` are the prompt rail's and are reused unchanged.

## Invariants

- Spans and the frame map content offsets through the same anchors (`RailLayout.toRail`), so the frame covers exactly the spans Chat shows.
- Spans come from the rows the list renders, in list order, so span tops only grow. `findRailSpanAt` depends on that; placement clamps against a fixed bound to keep it true at the rail's end.
- Every rail size is set in rem (`RAIL_SIZES_REM`) and resolved to px snapped to whole device pixels (`resolveRailMetrics`), so the rail follows the interface size setting like the rest of the UI and its thin gaps stay sharp. Only the offset that clears the overlay scrollbar is px, because the scrollbar is.
- Every span is at least `minLength` tall, and every point within `hitReach` of a span reaches exactly one span.
- No empty stretch on the rail is longer than `gapMax`.
- A span id is the part id, or the message id for records without parts. The rail is keyed by session, so view state never crosses conversations. Its key is prefixed (`timeline-rail:<session key>`): `MessageList` is a sibling keyed by the bare session key, and two siblings sharing a key left the previous transcript mounted under the new one on every switch.
- Scrolling only moves the frame: it writes the frame's transform and height and renders nothing. React never writes the frame's height.
- A wheel over the rail scrolls Chat, and a pointer never focuses the rail; only the toggle shortcut does, so keys stay with Chat.
- Spans rest at the theme's `--timeline-rail-rest-opacity`: `config.timelineRail.restOpacity` when the theme sets it, otherwise 1 on dark themes and 0.55 on light ones (`cssGenerator.ts`). Hover dims the others to the same 0.47 ratio of that value.
- Prompts and replies paint in the text color; system records in `--timeline-rail-system` (`colors.timelineRail.system`, otherwise `#00FFFF` dark and `#0097A7` light), opaque at rest.
- A span that runs into the next span of its lane shrinks by at most 30% and never below its width; the minimum length is the span width.
- The rail runs the chat's full height; the composer pads its end edge by the rail's room (`[data-prompt-rail]`, typography.css), at least `12px + 1.25rem`, so it never covers the rail at any interface size.
- Tool and thinking spans are lifted to at least the theme's `--timeline-rail-min-lightness` (OKLCH; `config.timelineRail.minLightness`, otherwise 0 on dark themes and 0.62 on light ones). Prompts and replies stay ink. Engines without relative color syntax paint the plain color.
- Moving the highlight re-renders only the spans it moves between (`RailSpanMark` is memoized; the ring and the dimming are CSS on `aria-selected` and `data-dimmed`).
- Span content positions never go back, even when the list reports a stale row position.

## Decisions

### Why read the list's rows and not project the messages again

`ChatViewport` has the raw messages, but grouping them into rows (notices that open turns, hidden prompts merged into the previous turn, synthetic context folded away) is the turn projection's job. Reading `TimelineEntry[]` from the list means the rail shows the rows Chat shows, and the row keys match the list's positions with no second mapping.

### Why spans are spread inside a row by estimated height

The list knows where each row is, not where a tool call sits inside a turn. The rail splits each row between its spans by a rough rendered height (text by line count, tool rows and notices by a fixed header height), so a tool call lands near where it renders. Measuring part elements in the DOM would only work for mounted rows, and the rest of the rail would disagree with them.

### Why one pointer target with a nearest-span lookup

Per-span hit elements padded to a minimum size overlap in a long session, where many spans share a few pixels. The whole gutter is one target, as in the prompt rail: the pointer's `y` goes to the nearest span within reach, later spans win ties because they paint on top, and the gap between two spans splits at the midpoint.

### Why long empty stretches are cut instead of drawn to scale

A pure minimap left large holes wherever the transcript is tall but holds few spans: a long answer is one span of at most `maxLength` over a row that maps to far more, and the list's tail spacer adds another hole at the end. The layout cuts every empty stretch down to `gapMax`, then grows the scale until the spans fill the rail again, taking the smallest scale that does so, so dense parts keep their minimap spacing. The short gap that remains is the only sign of a cut; a line marking each one was tried and dropped as noise. The frame maps through the same piecewise anchors, so it moves slower across a cut stretch.

### Why light themes rest translucent by default

Dark ink on a light background reads heavier than light ink on a dark one, so full-strength label colors made the rail heavy on paper-like themes. A lower rest opacity on light themes also lets overlapping spans build up intensity, which shows where many calls sit tight. The default follows the theme variant, so every theme looks right without fork-specific settings, and a theme can override it. Translucency alone still left dark inks heavy on paper, so light themes also lift tool and thinking hues to a minimum OKLCH lightness, which brightens dark hues and leaves light ones alone. A per-theme rail palette was considered and rejected: it would drift from the prefix label colors.

### Why rem and not px

The interface size setting scales the root font size, and the rest of the UI is sized in rem. A rail in px kept its size while everything around it grew or shrank. CSS px already absorb the screen's pixel density, so the setting is what moved the proportions; device-pixel snapping keeps 1.5 px gaps from blurring on a 1x screen.

### Why the pointer lookup weighs the lane

Spans of different lanes often sit level with each other (a prompt beside the tool calls of the turn before it). With distance along the rail alone, the later span won the tie and pointing at a prompt picked the tool next to it. Each lane between the pointer and a span adds `lanePenalty`, so the span under the pointer wins and another lane is still reached when nothing nearer is.

### Why a non-prompt click asks the list, not the controller

The timeline controller places a message by `turnModel.messageToTurnIndex`, which maps replies through `parentID`. OpenCode v2 replies have no `parentID`, so the controller refuses every reply id, and `windowTurns.test.ts` pins that behaviour ("does not map assistant messages without a parent"). The rail's callback calls `onManualNavigation` (the controller's own follow release) and `MessageListHandle.scrollToMessageId`, whose index comes from the rendered rows and covers replies; the turn jump is the fallback. Jumping to the turn first and the message after did not work: the turn jump's settle loop pulls the viewport back to the turn for several frames.

### Why the header height is a constant

LegendList's row positions start below the list header, and `getState()` does not carry the header's size (it is only a listen signal). The header in `ChatContainer` is a fixed `h-12` slot by design (`chat/lib/scroll/DOCUMENTATION.md`), so `LIST_HEADER_REM` (3rem at the current root font size) adds it back.

### Why the rail forwards the wheel

The rail sits beside the scroller, not inside it, so a wheel over its full-height track scrolled nothing. The track re-dispatches the wheel event on the scroller first, so the timeline hook's wheel listener releases live follow as for a real wheel, then scrolls it by the event's delta.

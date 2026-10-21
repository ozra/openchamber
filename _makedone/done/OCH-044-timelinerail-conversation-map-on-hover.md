---
status: done
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
related: [OCH-001, OCH-043]
created: 2026-10-21 12:56
complexity: small
estimated_effort: "1"
ended: 2026-10-21 14:34
---
# TimelineRail conversation map on hover

## Goal
Show a compact textual map of the conversation while hovering over the rail.

## Background
Extracted from OCH-001, TimelineRail. Refined with Oscar on 2026-10-21.

## Component strategy
Additive, inside the fork-owned rail: a pure layout module beside
`layoutRailSpans.ts` (`layoutConversationMap.ts`) and a memoized map layer
(`ConversationMap.tsx`) mounted by `TimelineRail.tsx`. No new settings or
strings. The one upstream edit, the rail showing from the first prompt, is in
`ChatContainer.tsx` and recorded in `custom-dev/FORK-DIFFERENCES.md`.

## Requirements
- While the rail's hover card shows (pointer rest or keyboard navigation through
  the toggle shortcut, `mod+k n`), show a one-line box at the rail position of
  every prompt and reply. The map disappears with the card.
- The hover card works as before and is always on top; map boxes never paint
  over it. Boxes carry no titles.
- Boxes have a fixed width near the rail, cropped to the viewport, and truncate
  their text. Prompt boxes sit 2.5rem farther from the rail than reply boxes,
  both edges, so prompts and replies alternate sides like a chat, mirroring
  their lane. Prompts use a brighter grey, replies a slightly dimmer grey.
  Translucent, theme-driven fills.
- Where boxes would overlap, thin them out: prompts first, then each turn's last
  reply before the next prompt or session end, then the other replies; earlier
  wins within each group. Each left-out box leaves a small dot beside the boxes, at
  its rail position; prompt dots sit farther from the rail than reply dots.
- Boxes and dots are presentation only: hover, click, wheel and keyboard stay
  with the rail. Preserve navigation and span identities.

## Answered questions
- Full text: the hover card shows the hovered span as before; the map shows
  one-line previews only.
- Overflow at narrow widths: box width is `min(13rem, 100vw - 10.75rem)`.
- Keyboard: the map shows during keyboard navigation too.
- OCH-043 lens: not built yet; its ticket owns the interaction.
- Clickable boxes: not now, since the map closes when the pointer leaves the rail.
- The rail shows from the first prompt (Oscar, 2026-10-21); see Comments.

## Acceptance criteria
- [x] Prompts and replies form a readable one-line map at their rail positions.
- [x] The hover card stays on top of the map.
- [x] Crowded stretches thin out, with dots marking left-out prompts and replies.
- [x] Prompts and replies remain distinguishable and navigation still works.

## Out of scope
- Changing stored messages or transcript ordering.
- Clickable boxes.

## Comments

### 2026-10-21 13:52 · oscar

Refined with Oscar: the hover card stays as is and on top; map of prompts and final replies, thinned with dots for left-out boxes, presentation only, shown during keyboard navigation too. Implementing.

### 2026-10-21 13:52 · oscar

Set status=ready.

### 2026-10-21 13:52 · oscar

Set status=in-progress.

### 2026-10-21 13:58 · oscar

Oscar decided on 2026-10-21 that the rail shows from the first prompt. The two-prompt minimum came from upstream's prompt rail (#2054) and was copied in OCH-001; ChatContainer now checks > 0 (FORK-DIFFERENCES 12).

### 2026-10-21 14:02 · oscar

UAT feedback: all replies get boxes, with each turn's last reply prioritized when thinning; prompt boxes offset 2.5rem from the rail on both edges for a back-and-forth layout.

### 2026-10-21 14:23 · oscar

Rides along (Oscar, 2026-10-21): a failed tool span keeps its tool color and gets a red --status-error dot on its end side, so the failed call's kind stays readable. Monozrakai keeps its pink error color.

### 2026-10-21 14:34 · oscar

Oscar accepted after UAT on 2026-10-21 and asked to commit, mark done and push. Code review found no code defects; two ticket wording fixes applied; the failed-tool dot touching the overlay scrollbar is accepted. Validation: timelineRail tests (36 pass), bun run check:changed passed (type-check, lint, Knip, anti-slop). No browser check by the agent; UAT by Oscar on the live build.

### 2026-10-21 14:34 · oscar

Set status=done; moved to done/.

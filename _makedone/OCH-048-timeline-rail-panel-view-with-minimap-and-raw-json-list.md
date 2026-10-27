---
status: refine
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: [OCH-019]
related: [OCH-001, OCH-041, OCH-042, OCH-043, OCH-044]
created: 2026-10-22 09:12
complexity: medium
estimated_effort: "3"
---
# Timeline rail panel view with minimap and raw JSON list

## Goal
See the conversation as a horizontal rail in its own workspace view, in two
zooms, above the raw message and part records instead of the rendered chat.

## Background
Asked for by Oscar on 2026-10-22, as a later step after OCH-001 and OCH-044. The
chat's rail is vertical and shares the gutter with the messages, which caps both
its width and what can be shown beside it.

## Component strategy
A new stackable workspace view following OCH-019. It reads the transcript through
the same source the rail uses (the turn projection, or the session's messages)
rather than forking it. The horizontal layout rule belongs in
`custom-dev/DOCUMENTATION.md` once refined; the view copies the rail's span
projection, not its vertical placement.

## Requirements
- The view turns the rail horizontal: spans run along the conversation's length,
  lanes across the height, so a long transcript gets the view's full width.
- Two zooms in one view:
  - a full-history minimap, similar to the chat rail, every span visible at once;
  - a detail strip below it that keeps each span at a minimum size, so spans
    stretch past the view and scroll.
- The two stay in sync. Moving or selecting in the minimap moves the detail
  strip; scrolling the detail strip moves the minimap's viewport indicator, the
  way the chat rail's frame marks the part of the transcript Chat shows.
- Below the two strips, a list of the raw JSON records (messages and their
  parts) for the session, instead of the rendered chat.
- A tab or a switch picks between the raw list and the rendered conversation.

## Open questions
- Which stackable view owns this: a new one, or a mode of an existing view.
- Does clicking a span or a raw record jump Chat to that message, or does the
  view only read the session it sits beside.
- Does it follow the session Chat follows, or can it pin a different one.
- Raw list shape: one row per message with its parts folded out, or one row per
  part, and which fields are shown.
- Sync direction detail: does selecting in the raw list also move the strips.
- Whether OCH-044's conversation map has a place in the horizontal detail strip.
- Filter and context-menu parity with the chat rail (OCH-041, OCH-042).

## Acceptance criteria
- [ ] The view shows the whole transcript horizontally, at both zooms.
- [ ] Every span in the detail strip reaches the minimum size.
- [ ] The minimap and the detail strip agree on position in both directions.
- [ ] The raw list shows the same session's messages and parts, and switching to
      the rendered conversation and back keeps position.
- [ ] The view follows the OCH-019 stack model: toggle, widths, auto-hide.

## Out of scope
- Editing messages or parts.
- Changes to the chat's vertical rail.

## Comments

### 2026-10-22 09:12 · oscar

Extracted from the conversation that produced OCH-046. Later ticket, as Oscar
framed it.

---
status: refine
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
related: [OCH-001, OCH-043]
created: 2026-10-21 12:56
---
# TimelineRail conversation map on hover

## Goal
Show a compact textual map of the conversation while hovering over the rail.

## Background
Extracted from OCH-001, TimelineRail. This is an exploratory idea and remains in refine.

## Requirements
- While hovering, show a one-line box extending from every prompt and each
  turn's last reply before the next prompt or session end.
- Crop boxes to a fitting width so they stay near the rail.
- Keep the hovered span's box above the others and show its text in full.
- Use no titles. Prompt boxes use a brighter grey and extend about 20px farther
  than replies, mirroring their lane; reply boxes use a slightly dimmer grey.
- Give boxes a translucent appearance using theme-driven styling.
- Preserve existing navigation and span identities.

## Open questions
- Define full-text overflow behavior and bounds at narrow viewport widths.
- Define keyboard equivalents and interaction with the ordinary hover preview
  and OCH-043, TimelineRail hover magnification lens.

## Acceptance criteria
- [ ] Prompts and final replies form a readable one-line map at their rail positions.
- [ ] The hovered box stays on top and exposes its full text within usable bounds.
- [ ] Prompts and replies remain distinguishable and navigation still works.

## Out of scope
- Changing stored messages or transcript ordering.

## Comments

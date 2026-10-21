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
# TimelineRail context menu and filtering

## Goal
Choose which activity kinds stand out through a rail context menu.

## Background
Extracted from OCH-001, TimelineRail. This replaces the earlier proposal for
top-of-rail message-type toggles. Keep this ticket in refine until the filter
classes and state lifetime are settled.

## Requirements
- Right-clicking the rail opens a menu with a filter-dialog action and a hover-lens toggle.
- The dialog chooses which span kinds stand out. Other kinds remain visible at
  20% opacity and paint beneath the chosen kinds.
- Filtering changes visual emphasis without moving transcript positions or the viewport frame.
- Preserve stable span identities and decoration state.
- Provide keyboard access, accessible names, selected states, and tooltips;
  communicate filter state beyond color alone.
- The hover-lens toggle shares state with its Settings control, owned by
  OCH-043, TimelineRail hover magnification lens. Do not expose an inert toggle
  if filtering ships before the lens.

## Open questions
- Confirm filter classes and whether unchosen spans remain interactive.
- Confirm filter-state lifetime and persistence. The superseded toggle proposal
  used temporary state that survived responsive auto-hide and reset on rail close
  or conversation change; that behavior remains a proposal for this dialog.

## Acceptance criteria
- [ ] Chosen kinds stand out; other kinds remain visible at 20% beneath them.
- [ ] Filtering preserves positions, frame geometry, and decoration identities.
- [ ] Pointer and keyboard users can open and operate the controls.

## Out of scope
- Top-of-rail hide/show toggles, superseded by this proposal.
- Lens rendering, owned by OCH-043, TimelineRail hover magnification lens.

## Comments

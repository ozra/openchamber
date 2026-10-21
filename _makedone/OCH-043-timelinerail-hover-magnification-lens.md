---
status: refine
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
related: [OCH-001, OCH-041]
created: 2026-10-21 12:56
---
# TimelineRail hover magnification lens

## Goal
Make tightly packed spans easier to distinguish while hovering over the rail.

## Background
Extracted from OCH-001, TimelineRail. This is an exploratory idea and remains in
refine until the interaction and usefulness have been evaluated.

## Requirements
- While hovering, show a window resembling the viewport frame that magnifies
  spans under the pointer along the rail so tight calls separate.
- Start evaluation with a window about 25% wider than the normal rail.
- Provide a toggle in Settings and in the context menu owned by OCH-041,
  TimelineRail context menu and filtering. Both controls use the same state.
- Preserve underlying transcript geometry and message identities.

## Open questions
- Decide magnification strength, window size, default state, and persistence.
- Define hit testing and navigation while spans are magnified.
- Evaluate whether the lens helps enough to keep it, including its interaction
  with OCH-044, TimelineRail conversation map on hover.

## Acceptance criteria
- [ ] Hover separates tightly packed spans without changing transcript positions.
- [ ] Lens controls agree and disabling restores normal hover behavior.
- [ ] Hit testing, navigation, and viewport-frame interpretation remain clear.

## Out of scope
- Changing normal span sizing or transcript coordinates.

## Comments

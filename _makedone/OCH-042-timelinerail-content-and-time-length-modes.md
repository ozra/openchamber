---
status: refine
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
related: [OCH-001, OCH-023]
created: 2026-10-21 12:56
---
# TimelineRail content and time length modes

## Goal
Offer content-sized and duration-sized spans without changing navigation geometry.

## Background
Extracted from OCH-001, TimelineRail. Timing and user-span normalization follow
`custom-dev/DOCUMENTATION.md`. This ticket remains in refine.

## Requirements
- Add a two-state Content/Time control using the shared sprite Icon with
  content-size or clock imagery, translated state name, and tooltip.
- Persist the selected mode across conversations through the settings registry.
- Time mode sizes non-user spans by authoritative duration on a logarithmic
  scale with a 5-minute cutoff. Missing or invalid timing falls back to content.
- Never infer duration from neighboring records or busy events.
- Grow live timed spans at most once per second. Do no timer work while hidden
  or in Content mode.
- User-originated spans stay content-sized, anchored to the median of completed
  timed spans, or the midpoint when none exist. Recalculate the anchor only when
  the history boundary changes, per the shared technical design.
- Switching modes changes painted length only. Positions and the frame remain stable.
- Parsed question answers remain content-sized when OCH-023, User-originated
  question answers, is available; it does not block the initial mode control.

## Acceptance criteria
- [ ] Both modes size spans correctly, including invalid timing and the cutoff.
- [ ] User spans retain content sizing and the documented normalization.
- [ ] Mode persists and switching leaves positions and frame geometry unchanged.
- [ ] Hidden and Content-mode rails perform no timing work.

## Out of scope
- Approximate tokens-per-second display, dropped from the original proposal.

## Comments

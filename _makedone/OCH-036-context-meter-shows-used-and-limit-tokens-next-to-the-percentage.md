---
status: refine
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
related: [OCH-016]
created: 2026-10-20 12:58
---
# Context meter shows used and limit tokens next to the percentage

## Goal
In the session box (right side), show actual tokens used / context limit alongside
the percentage, so the real numbers are visible without clicking "Context" to open
the context panel.

## Background
The session status area's Context row (`WorkStatusPrimaryGroup`) currently shows
only the used percentage plus a meter, and clicking it opens the Context view just
to read the token counts. `ContextRailUsage.tsx` already formats used tokens and
the limit compactly (`formatTokens`, e.g. `123.0K`) but only inside the rail
tooltip. OCH-016 (Dashboard) plans the same reading — `123000/240000 (51%)` — but
only for its own new Dashboard view, as one bullet inside a still-refining epic.
This ticket applies that format to the existing Work Status readout now, so the
everyday panel gets the numbers without waiting for Dashboard. Formats should stay
aligned between the two.

## Requirements
- Show used tokens, the context limit, and the existing percentage inline in the
  Context row of the session box, e.g. `123K / 240K (51.2%)`.
- Same data source as today: `computeContextUsage` / `useContextWindowLimits`;
  do not start a second token reading or poll.
- Compact formatting (K/M) so the row fits narrow widths; full numbers in the
  tooltip/aria label. Tabular figures.
- Preserve current states: unmeasured shows the unknown placeholder, compacted
  keeps its description line; the row still opens the Context view on click.
- Follow the fork's setting-free presentation change: no new setting; direct edit
  of the shared readout is acceptable (small formatting change on the shared path
  per `custom-dev/README.md`).

## Acceptance criteria
- [ ] Session box Context row shows `used / limit (percent)` without opening the context panel.
- [ ] Numbers match the context panel's used tokens and context limit for the same session.
- [ ] Unmeasured and compacted sessions degrade gracefully.
- [ ] Row stays readable at minimum session-box width.

## Out of scope
- The Dashboard context section (owned by OCH-016).
- Token breakdown by input/output/cache (OCH-016).

## Comments

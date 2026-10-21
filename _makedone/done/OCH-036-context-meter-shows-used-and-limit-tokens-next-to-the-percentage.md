---
status: done
kind: feature
assignee:
priority: high
blocker:
parent:
depends_on: []
complexity: small
estimated_effort: 0.5 dev-days
related: [OCH-016]
created: 2026-10-20 12:58
ended: 2026-10-21 13:38
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
  Context row of the session box, e.g. `127k / 640k (20%)`.
- Same data source as today: `computeContextUsage` / `useContextWindowLimits`;
  do not start a second token reading or poll.
- Changing the session's selected model immediately updates the limit and percentage,
  before another answer. Keep the last measured token count until a new measurement.
- When used context exceeds the selected model's limit, show red numbers, a red
  meter and an explicit over-limit warning. Clear the warning when the context fits.
- Round token counts to thousands with a lowercase `k`, and percentage to a whole
  number, so the row fits narrow widths; full token numbers in the
  tooltip/aria label. Tabular figures.
- Preserve current states: unmeasured shows the unknown placeholder, compacted
  keeps its description line; the row still opens the Context view on click.
- Follow the fork's setting-free presentation change: no new setting; direct edit
  of the shared readout is acceptable (small formatting change on the shared path
  per `custom-dev/README.md`).

## Acceptance criteria
- [x] Session box Context row shows `used / limit (percent)` without opening the context panel.
- [x] Numbers match the context panel's used tokens and context limit for the same session.
- [x] Unmeasured and compacted sessions degrade gracefully.
- [x] Row stays readable at minimum session-box width.
- [x] Switching models updates the limit without sending; a lower limit than used context produces a red warning, which clears on switching back.

## Out of scope
- The Dashboard context section (owned by OCH-016).
- Token breakdown by input/output/cache (OCH-016).

## Comments

### 2026-10-21 13:10 · oscar

Set status=in-progress.

### 2026-10-21 13:30 · oscar

Implemented whole-number lowercase-k context counts and whole-number percent, with full token counts in tooltip/accessibility text. Manual model picks update before send; remote record switches and Auto follow existing reconciliation metadata. Over-limit counts, icon and meter are red with explicit alert. Focused context-row, hook and resolver tests pass. UI type-check passed before the final formatting-only changes; UI lint passed with an unrelated existing HtmlRenderFrame hook warning. Production build via bun run build:web completed, including PWA service worker. Verified running localhost:3096 serves byte-identical rebuilt index and context bundle. Inspected a 300px light/dark rendering fixture. Awaiting user acceptance after reload and model-switch check.

### 2026-10-21 13:30 · oscar

Set status=review.

### 2026-10-21 13:38 · oscar

User explicitly requested review, commit and done. Independent review found no correctness issues. Fixed the pre-commit gate's conditional-empty-object-spread finding in the hook fixture; reran its 8 tests successfully. bun run check:changed now passes type-check, lint, dead code and anti-slop. Existing HtmlRenderFrame lint warning and mobile Knip configuration hint remain unrelated. Production build and served-bundle verification completed before acceptance.

### 2026-10-21 13:38 · oscar

Set status=done; moved to done/.

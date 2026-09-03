---
id: PRD-020
title: Quota usage pace against reset windows
status: done
created: 2026-09-02
depends_on: []
complexity: medium
estimated_effort: 3-5 dev-days
related:
  - PRD-016
---

# PRD-020 - Quota usage pace against reset windows

## Goal

Show whether quota is being consumed faster or slower than time is passing in a
fixed reset window. A user should be able to tell at a glance whether current
usage is ahead of a sustainable even pace, and by how many percentage points.

Codex's 5-hour and weekly limits are the primary example, but the behavior
applies to any provider window with trustworthy percentage, duration, and reset
data.

## Background

Quota windows already expose the required data in `UsageWindow`
(`packages/ui/src/types/quota.ts:24-33`):

- `usedPercent`
- `windowSeconds`
- `resetAt`

Codex reads `limit_window_seconds`, `used_percent`, and `reset_at` for both its
primary and secondary windows (`packages/vscode/src/quotaProviders.ts:903-923`).
Claude's 5-hour and 7-day windows use the same normalized contract
(`quotaProviders.ts:1322-1358`). Other providers can participate without
provider-specific UI logic when they report equivalent data.

Current quota colors are fixed usage thresholds: 50% becomes warning and 80%
becomes error (`UsageProviderCards.tsx:9-15`, `WorkStatusUsageSection.tsx:33-39`,
`lib/quota/utils.ts:62-73`). Those thresholds ignore where the user is in the
window. Forty percent used near the start of a week is more concerning than 90%
used shortly before reset.

## Component strategy

Implement this as a direct shared modification, not copied quota components.
Pace is one provider-independent meaning that must agree in every existing and
fork-owned quota presentation. Put the pure calculation, formatting, tone, and
shared visible clock in the common quota layer; keep each surface responsible
only for its established presentation.

Cloning `UsageCard`, `UsageProviderCards`, Work Status usage, or the VS Code
dropdown would create competing quota semantics and clock ownership. PRD-016's
Dashboard consumes the same shared pace result as the original Work Status
panel.

## Pace calculation

For an eligible window at time `now`:

```text
windowStart = resetAt - windowSeconds
elapsedSeconds = clamp((now - windowStart) / 1000, 0, windowSeconds)
elapsedPercent = 100 * elapsedSeconds / windowSeconds
paceDelta = usedPercent - elapsedPercent
```

`paceDelta` is a percentage-point difference even though the compact UI uses a
`%` suffix:

- Positive: usage is ahead of elapsed time.
- Negative: usage is behind elapsed time.
- Zero: usage is exactly on an even pace.

Example: two days into a seven-day window, elapsed time is
`(2 / 7) * 100 = 28.57%`. Usage at 40% is about 11.43 percentage points ahead.

Use `resetAt` and the current clock for every calculation. Do not use the
fetch-time `resetAfterSeconds` snapshot as a live clock.

## Eligibility and stale data

Show pace only when all of these are authoritative and finite:

- `usedPercent` is available.
- `windowSeconds > 0`.
- `resetAt` is available and lies in the current inferred window.

Do not show pace for credit balances, unlimited labels, count/value-only rows,
or windows without duration/reset data.

Once `resetAt <= now`, the old window is expired. Suppress its pace delta and
pace color until refreshed provider data establishes the next window. Do not
show a growing negative delta from stale expired data.

Reject materially inconsistent timing, such as a reset farther away than the
reported window duration. A small clock-skew tolerance is acceptable, but it
must not turn malformed data into a confident pace judgment.

## Display

In Used mode, append the signed pace difference to the existing used
percentage:

```text
40% (+7%)
40% (-15%)
```

- Keep the current whole-number formatting for the main used percentage.
- Format the delta compactly as signed percentage points. Whole points are the
  normal display; retain one decimal near zero when rounding to a whole number
  would hide or reverse the real sign, for example `+0.4%` rather than `+0%`.
- Show `0%` without a plus sign when exactly on pace.
- The accessible label names the meaning, for example "40 percent used, 7
  percentage points ahead of elapsed time." Do not rely on red alone.

The pace suffix applies to Used mode. Remaining mode keeps its current value
format so a remaining percentage is not followed by a delta whose sign refers
to usage. Switching display modes must not mutate the underlying calculation.

## Tone

- If `paceDelta > 0`, render the used value in the warning/orange tone.
- If `paceDelta <= 0`, use the regular tone.
- For eligible windows, pace tone replaces the fixed 50%/80% warning thresholds.
  A high percentage near reset can be on pace, while a low percentage near the
  start can be ahead.
- Apply the same pace tone to the corresponding progress bar and compact summary
  value so one window does not show contradictory colors in different parts of
  the UI.
- Ineligible or expired windows keep their existing display and threshold tone.

## Time updates

- Calculate elapsed percentage to the second, not by day or hour buckets.
- Re-evaluate visible eligible rows as time passes so the delta and red/regular
  boundary can change without a provider refresh.
- Use one shared, visibility-gated clock for mounted quota surfaces. Do not
  create one interval per provider row.
- Pause ticking when no eligible quota UI is visible. A fresh calculation on
  mount, visibility return, and provider refresh restores the current value.
- Keep the raw calculation pure and accept `now` as an input so boundary behavior
  is deterministic in tests.

## Surfaces

Use one shared pace calculation and formatter across every quota presentation:

- The **Work Status panel** (`WorkStatusPanel`, whose accessible label is "Work
  status"), with quota rows and its collapsed quota headline rendered by
  `WorkStatusUsageSection`.
- The PRD-016 **Dashboard**, which consumes the same shared pace semantics in
  its Usage section and collapsed headline. Dashboard is the primary stackable
  location; original Work Status remains the upstream comparison surface.
- Usage settings/page cards (`UsageCard.tsx` and `UsageProgressBar.tsx`).
- Compact provider cards used by mobile session metadata
  (`UsageProviderCards.tsx`).
- VS Code's quota dropdown (`VSCodeLayout.tsx`).

Provider adapters continue to normalize source data into `UsageWindow`; they do
not calculate presentation pace or colors independently.

## Acceptance criteria

- A 5-hour, 7-day, weekly, or other fixed-duration window with valid timing
  shows `used% (signed pace delta%)` in Used mode.
- The elapsed benchmark is derived to the second from `resetAt - windowSeconds`
  through `resetAt`.
- Usage ahead of elapsed time is orange (warning); usage on or behind pace has regular tone.
- The percentage text, progress bar, compact card, Work Status summary, and VS
  Code dropdown agree.
- Remaining mode, balances, missing timing, inconsistent timing, and expired
  stale windows do not show a misleading pace suffix.
- The displayed delta never rounds a real positive/negative value into a
  contradictory signed zero.
- One shared visible clock updates all mounted eligible rows without per-row
  timers.

## Validation

- Pure calculation tests at window start, second-level intermediate points,
  exact pace, ahead, behind, just before reset, and reset/expired boundaries.
- Eligibility tests for missing, non-finite, zero/negative, future-inconsistent,
  balance, and value-label data.
- Formatting tests for positive, negative, exact zero, whole-point, and
  near-zero fractional deltas.
- Tone tests proving pace replaces fixed 50%/80% thresholds only for eligible
  windows.
- Shared-clock tests for one timer, visibility gating, cleanup, and immediate
  recalculation after resume/provider refresh.
- Surface tests proving Usage, mobile cards, Work Status, and VS Code consume the
  same derived pace semantics.

## Out of scope / future

- Forecasting nonlinear usage or predicting the exact exhaustion time.
- Combining several quota windows into one score.
- Guessing window duration from labels when providers do not report or normalize
  a trustworthy duration.

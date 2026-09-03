---
id: PRD-004
title: Diff view font size setting
status: ready
created: 2026-09-01
depends_on: []
complexity: medium
estimated_effort: 2-4 dev-days
related:
  - PRD-010
---

# PRD-004 — Diff view font size

## Goal

Give Pierre diff views their own base font-size setting. Native page zoom still
scales that size with the rest of the interface.

## Background

Diff code resolves `var(--text-code)` (`PierreDiffViewer.tsx:55-77`,
`index.css:704`), which the global interface font-size percentage scales
(`applyTypography`, `useUIStore.ts:2025-2049`). There is no independent control.
PRD-010 restores native page zoom in Electron. Browser-level zoom scales an
explicit CSS pixel size automatically, so the diff setting does not need to be
an offset from global typography.

## Requirements

- New store field `diffFontSize: number | null`, default `null`.
  - `null` (unset): diff follows `var(--text-code)` exactly — global scale,
    zoom, and mobile 14px. No default visual change.
  - set: an explicit base size in CSS pixels at 100% page zoom, clamped to
    9–32px and applied through `--oc-diff-font-size`. Native browser/Electron
    page zoom scales the rendered result with the rest of the interface.
- A setting control in Visual settings "Density & type" next to the
  editor/terminal font size. It uses 1px steps, shows "Follow theme" while
  unset, and provides a reset that restores `null`.
- Persists across sessions (web + desktop autosave).

## Scope — surfaces

Affects `PierreDiffViewer` surfaces only:

- ContextPanel diff tabs (`DiffView.tsx`)
- Walkthrough hunks (`WalkthroughHunkRun.tsx`)
- Mobile changes surface (`MobileChangesSurface.tsx`)
- Git history rows (`HistoryCommitRow.tsx`)

Explicitly out of scope: chat inline tool diffs (`PatchDiff` via
`ToolPartDiffPreview` / `ToolOutputDialog`), `PlainDiffFallback`, permission
`DiffPreview` — these already scale with `--text-code`/`typography-code`.

## Implementation anchors

- `PierreDiffViewer.tsx:55-77` base CSS pins `font-size: var(--text-code)`;
  `index.css:704` sets `--diffs-font-size: var(--text-code)`. Both become
  `var(--oc-diff-font-size, var(--text-code))`.
- Mobile `!important` overrides (`styles/mobile.css:17-25`) must be beaten only
  when an override is active, never on the default path.
- Mirror the `editorFontSize` plumbing: `useUIStore` (+ `setDiffFontSize`
  clamp), `lib/persistence.ts` (default/restore/sanitize), `lib/appearanceAutoSave.ts`,
  `lib/api/types.ts` + `lib/desktop.ts` types, `OpenChamberVisualSettings.tsx`
  control, `lib/settings/search.ts` entry (`appearance.diff-font-size`), i18n
  keys in all locales.

## Acceptance criteria

- Unset is pixel-identical to today at any global scale and on mobile.
- A set 9–32px base size changes only Pierre diff text and scales with native
  browser/Electron page zoom.
- Persists across sessions; reset restores follow-theme.

## Out of scope / future

- Changing diff view colors or layout.
- Affecting any other surface's font size.

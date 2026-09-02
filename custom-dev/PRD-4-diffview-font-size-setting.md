---
id: PRD-4
title: Diff view font size setting
status: draft
created: 2026-09-01
related:
  - PRD-10
---

# PRD-4 — Diff view font size (zoom-aware relative override)

## Goal

Make the diff view font size adjustable independently of the global
chat/typography scaling — while keeping it zoom-aware, never rigid.

## Background

Diff code resolves `var(--text-code)` (`PierreDiffViewer.tsx:55-77`,
`index.css:704`), which the global interface font-size percentage scales
(`applyTypography`, `useUIStore.ts:2025-2049`). There is no independent control.
Because the app zoom (PRD-10) scales `--text-code`, an absolute pinned font
size would stop tracking zoom; the override is therefore a **relative offset**,
so diffs keep following the scale.

## Requirements

- New store field `diffFontSize: number | null`, default `null`.
  - `null` (unset): diff follows `var(--text-code)` exactly — global scale,
    zoom, and mobile 14px. No default visual change.
  - set: a **relative px offset** over `--text-code`, clamped (e.g. −4..+8),
    applied as `calc(var(--text-code) + <offset>px)` through an
    `--oc-diff-font-size` custom property. Keeps tracking zoom/scale.
- A setting control in Visual settings "Density & type" next to the
  editor/terminal font size; reset restores "follow theme".
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
- A set offset shifts only diff text; the offset is preserved as the scale
  changes (still zoom-aware).
- Persists across sessions; reset restores follow-theme.

## Out of scope / future

- Changing diff view colors or layout.
- Affecting any other surface's font size.
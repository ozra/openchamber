---
id: PRD-010
title: Interface zoom shortcuts
status: draft
created: 2026-09-02
related:
  - PRD-004
---

# PRD-010 — Interface zoom shortcuts

## Goal

Add app-wide zoom via `Ctrl +`, `Ctrl -`, and `Ctrl 0` at a finer granularity
than the browser default, so the interface can be scaled per-screen and
per-resolution without OS-level tricks.

## Background

- Native Electron zoom is already neutralized in the shell:
  `packages/electron/main.mjs:2656-2659` pins `setZoomFactor(1)` and resets on
  `zoom-changed`, again at `:2680`. So the browser's own Ctrl+/Ctrl- cannot
  zoom the app — the correct lever is the in-app global scale.
- The global scale already exists: `fontSize` (50–200%,
  `applyTypography`, `useUIStore.ts:2025-2049`) and scales essentially all text
  everywhere — satisfying "any text is affected by zoom". Diffs follow along
  when the PRD-004 override is unset.

## Requirements

- Bindings (all configurable via the keyboard-shortcuts settings):
  - `ctrl +` → zoom in
  - `ctrl -` → zoom out
  - `ctrl 0` → reset to 100%
- Plain `+`/`-`/`0` keys only — no numpad-specific bindings (no keyboards in
  use have numpads; users can rebind anyway).
- Each zoom step changes `fontSize` by **5 percentage points** — 50% finer than
  the ~10% browser default, and identical to the existing settings stepper step
  (`OpenChamberVisualSettings.tsx:1291`).
- Clamp to the existing 50–200% range; reset returns to 100%.
- Handlers prevent the native default so they do not fight the shell.

## Implementation anchors

- Register `zoom_in` / `zoom_out` / `zoom_reset` in
  `lib/shortcuts/config.ts` (application category, customizable), wire handlers
  in `hooks/useKeyboardShortcuts.ts`, i18n labels, HelpDialog entries.
- Handlers call `setFontSize(fontSize ± 5)` / `setFontSize(100)`
  (`useUIStore.ts:1971`).

## Acceptance criteria

- `Ctrl +` / `Ctrl -` / `Ctrl 0` scale the whole interface; step is 5%, clamp
  50–200%, reset restores 100%.
- Works from composer focus and most surfaces.
- All three are listed and configurable in Keyboard Shortcuts settings.

## Out of scope / future

- Per-surface zoom.
- Numpad-specific bindings.
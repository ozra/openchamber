---
id: PRD-021
title: Sharp anarchy app icon
status: draft
created: 2026-09-02
---

# PRD-021 — Sharp anarchy app icon

## Goal

Replace the current window/app icon with a custom mark: a circle-A (anarchy
symbol) in **pitch black** with **yellow outlines**. Flat, high-contrast, very
sharp — instantly identifiable in the alt-tab overview, where the current icon
reads as mushy.

## Background

The desktop icon is a white-stroked isometric cube on a dark rounded square.
It looks soft at OS small sizes: the macOS variant uses a background `linearGradient`
plus an `feDropShadow` (`packages/electron/resources/icons/app-icon.svg`), and the
Windows/Linux variant is a thin-stroked cube on a near-transparent field with a
thin black hexagon outline (`resources/icons/icon-win.svg`). Both depend on fine
anti-aliased white strokes and gradients that smear in alt-tab/taskbar rendering.

Icon assets live in `packages/electron/resources/icons/`:

- `app-icon.svg` — macOS dock source (Apple-standard 100px padding).
- `icon-win.svg` — Windows/Linux source (transparent field).
- `icon.ico` / `icon.png` — packaged window icon, used by Windows/Linux
  `getWindowIconPath` (`main.mjs:2422-2429`) and staged to `icons/` via
  `extraResources` in `package.json`. Also used by NSIS installer/uninstaller
  icons and the Linux AppImage desktop icon.
- `icon.icns` + `AppIcon.icon/` asset catalog → compiled `Assets.car` (staged
  by the `afterPack` hook). The macOS catalog is regenerated with
  `bun run generate:macos-icon` (`scripts/generate-macos-icon-assets.cjs`).
- `dev-icon.icns` / `dev-icon.png` — development variants.

The natural direction is unambiguous and small.

## Component strategy

This is a direct shared modification of the app's visual identity, not a
variant: an app must have exactly one icon. There is no fork-owned component
parallel to it. The mark is a one-off design task, not a code change; it does
not alter module ownership, contracts, or shared UI.

## Design requirements

- **Mark**: circle-A (anarchy symbol). A vertical bar-letter A with the
  crossbar inside the counter, enclosed by a circle whose top edge crosses
  behind the letter's apex.
- **Field**: flat **pitch black** (`#000000`) fill, full-bleed square. No
  gradient, no drop shadow, no vignette.
- **Outline**: one vivid yellow (`#FFD600`-family, tuned during iteration)
  outline around the circle-A. Uniform, crisp stroke weight. No inner detail,
  no texture — the silhouette is what must read at small sizes.
- **Sharpness**: strokes must survive 16×16/32×32 rendering (alt-tab, taskbar)
  without morphing into blobs. Prefer fewer, thicker contours over thin
  anti-aliased hairlines; render from a clean SVG at each target size rather
  than one downscaled 1024 source when that preserves crispness.
- Keep Apple-standard padding in the macOS asset and a full-bleed field for
  Windows/Linux, matching how `app-icon.svg` and `icon-win.svg` are already
  split.
- Reuse the same mark geometry in the tray glyphs only if it does not disturb
  their status semantics — this is out of scope unless trivial.

## Surfaces

- **Windows**: `icon.ico` — window + taskbar + alt-tab, NSIS installer and
  uninstaller icons.
- **Linux**: `icon.png` — window, AppImage desktop icon.
- **macOS**: `icon.icns` + compiled `Assets.car` — dock, app switcher.
- **Dev**: `dev-icon.icns` / `dev-icon.png` match the new mark so dev and
  packaged builds look the same.

## Acceptance criteria

- A window with this icon is identifiable at a glance in the Windows alt-tab
  overview (user's primary complaint) and in the macOS app switcher.
- The icon reads at 16×16, 32×32, 48×48, and 256×256 without the mark thinning
  or clumping.
- The mark is pitch black with a yellow outline, flat, with no gradients or
  shadows visible at any size.
- Windows, Linux, and macOS packaged builds and dev builds all show the new
  mark.
- Commit only intent-relevant binary asset changes; tray status glyphs are
  unchanged unless uniquely byte-identical to the new source.

## Validation

- Render each target size from the SVG and view alt-tab/taskbar/dock over a
  busy desktop; iterate on stroke weight and yellow tone with the user, as with
  PRD-012's visual feedback loop.
- Verify packaging picks the regenerated `icon.ico` / `icon.png` / `icon.icns`
  (rebuild web assets not needed for a pure icon change) via the existing
  `electron:build` flow; confirm alt-tab in the installed NSIS app, not only
  dev mode.

## Out of scope / future

- Web/PWA favicons and the in-app brand logo scenes (apple-touch, logo-*-*.svg)
  stay as-is unless the result is jarringly different.
- Changing tray status indicator semantics.
- Animated icons, macOS `alternate`/other dock behaviors.
---
id: PRD-021
title: Sharp anarchy app icon
status: draft
created: 2026-09-02
---

# PRD-021 — Sharp anarchy app icon

## Goal

Replace the current identifying marks with a custom circle-A (anarchy symbol)
in **pitch black** with **yellow outlines**. Flat, high-contrast, very sharp —
instantly identifiable in the alt-tab overview, where the current icon reads as
mushy. Apply the same mark and presentation everywhere the app identifies
itself: window/app icons, system tray, and web icons (favicon, PWA, and logo
variants).

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
- `resources/icons/tray/` — macOS tray glyph source (`tray-glyph.svg`),
  `trayTemplate-*` idle/breath frames, and per-status overlay glyphs
  (`status/blank|busy|error|retry|unseen`, all with `@2x`).

Web identity icons live in `packages/web/public` (staged into
`@openchamber/web/dist`): `favicon-*`, `apple-touch-icon*`, `pwa-*` / `pwa-maskable-*`,
and the `logo-dark-*` / `logo-light-*` variants.

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
- The tray and web identity marks use the same circle-A geometry. macOS tray
  template images stay monochrome silhouettes (Platform rules), so their
  "same style" is the same shape, not the yellow field; where color is allowed,
  keep the pitch-black / yellow-outline presentation.

## Surfaces

- **Windows**: `icon.ico` — window + taskbar + alt-tab, NSIS installer and
  uninstaller icons.
- **Linux**: `icon.png` — window, AppImage desktop icon.
- **macOS**: `icon.icns` + compiled `Assets.car` — dock, app switcher.
- **Dev**: `dev-icon.icns` / `dev-icon.png` match the new mark so dev and
  packaged builds look the same, and `trayTemplate-*` / breath frames share the
  mark silhouette.

### Tray

- **macOS**: `resources/icons/tray/` — `trayTemplate-idle` / `trayTemplate-unseen`
  and the `trayTemplate-breath-00..15` animation frames (with `@2x`). These are
  Apple template images: they are monochrome shapes, so the "same style" means
  the same silhouette, not the yellow-on-black field. The `tray-glyph.svg`
  source is the canonical shape to replace.
- **Windows/Linux**: the tray falls back to the window icon
  (`main.mjs:5226-5235`), so it updates automatically with `icon.ico` / `icon.png`.
- **Status overlay glyphs** (`status/blank|busy|error|retry|unseen`): keep their
  single-micro-state semantics, but redraw them with the same marker geometry
  style so the tray's identifying read stays consistent.

### Web

All web identity icons under `packages/web/public` (staged into
`@openchamber/web/dist`):

- `favicon-16.png`, `favicon-32.png`, `favicon.png`, `favicon.svg` — the 16px
  favicon is the sharpness stress test of the whole icon set.
- `apple-touch-icon*.png` / `apple-touch-icon.svg`.
- `pwa-192.png`, `pwa-512.png`, `pwa-maskable-192.png`, `pwa-maskable-512.png`.
- `logo-dark-192x192.png` / `logo-dark-512x512.svg` and
  `logo-light-192x192.png` / `logo-light-512x512.svg` — light variants need a
  field that keeps the pitch-black mark readable (the var titlebar/variant
  context); keep the yellow outline so the identity is the same.

Keep one SVG source of truth for the mark geometry and render every raster
target size (tray, favicon, PWA, app icons) from it, so no context drifts.

## Acceptance criteria

- A window with this icon is identifiable at a glance in the Windows alt-tab
  overview (user's primary complaint) and in the macOS app switcher.
- The icon reads at 16×16, 32×32, 48×48, and 256×256 without the mark thinning
  or clumping.
- The mark is pitch black with a yellow outline, flat, with no gradients or
  shadows visible at any size.
- Windows, Linux, and macOS packaged builds and dev builds all show the new
  mark.
- The system tray idle/unseen/breath states and status overlay glyphs use the
  same mark geometry, and status micro-states remain distinguishable.
- `favicon-16.png` is still a recognizable circle-A, and the browser tab, apple
  touch, PWA, and logo-dark/light variants all carry the same identity.
- Commit only intent-relevant binary asset changes; unrelated generated noise
  stays out of the diff.

## Validation

- Render each target size from the single SVG source and view alt-tab/taskbar/
  dock, tray (idle + breath + status), and a browser tab at 16px over a busy
  desktop; iterate on stroke weight and yellow tone with the user, as with
  PRD-012's visual feedback loop.
- Verify packaging picks the regenerated `icon.ico` / `icon.png` / `icon.icns`
  (rebuild web assets needed for the web icon changes, not for a pure app-icon
  change) via the existing `electron:build` flow; confirm alt-tab in the
  installed NSIS app, not only dev mode.
- Verify `bun run generate:macos-icon` recompiles the macOS asset catalog and
  that regenerated web icons are staged into `@openchamber/web/dist` by the web
  build.

## Out of scope / future

- In-app rendered brand scenes (the cube in the loading screen and any UI that
  renders the 3D logo) stay as-is unless the maintainer decides to adopt the new
  mark there; the single SVG source makes that a later, cheap swap.
- Animated icons, macOS `alternate`/other dock behaviors.
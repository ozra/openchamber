---
id: PRD-012
title: Monozrakai theme
status: ready
created: 2026-09-02
depends_on: []
deliver_with:
  - PRD-011
complexity: small
estimated_effort: 1-2 dev-days
related:
  - PRD-011
---

# PRD-012 — Monozrakai theme

## Goal

Add a "Monozrakai" theme derived from Monokai — one dark and one light variant
available under that name — with the dark background colors just slightly
warmer/browner than stock Monokai. The warm-up is iterative: adjusted step by
step from the user's visual feedback. The theme also carries the PRD-011
tool-prefix palette on the dark variant.

## Background

Themes are JSON files in `lib/theme/themes/` (`metadata` id/name/variant +
`colors`), registered in `presets.ts`. `monokai-dark.json` /
`monokai-light.json` are the source themes.

## Requirements

- New `monozrakai-dark.json` / `monozrakai-light.json`:
  - ids `monozrakai-dark` / `monozrakai-light`
  - name "Monozrakai" (both variants share the name, matching how Monokai's
    variants do)
  - variant `dark` / `light`
- Register both in `lib/theme/themes/presets.ts` so they appear in the theme
  picker (the `themes` index in `lib/theme/themes/index.ts` picks up presets).
- **Light**: direct clone of `monokai-light.json` for now.
- **Dark**: clone of `monokai-dark.json`, then nudge the background colors
  slightly warmer/browner. Small, deliberate steps; the user inspects visually
  and we iterate until it feels right.
- **Dark** also defines tool-specific `tools.labels.<normalized-tool-name>`
  values per PRD-011 and `tools.labels.thinking`. Tools may begin with shared
  group colors, but each value remains independently editable in theme JSON.

## Iteration process

The engineering estimate covers the initial theme files and registration. Final
color acceptance requires this feedback loop and is not included in dev-days:

1. Adjust a few hex values (background, muted, elevated, subtle, tool
   backgrounds, syntax background).
2. User inspects on screen.
3. Adjust again. Repeat.

The PRD-011 token system keeps tool-color tweaks JSON-only, so iteration never
needs code changes.

## Acceptance criteria

- Both variants list under "Monozrakai" in the theme picker.
- Dark backgrounds are slightly warmer/browner than Monokai (subject to
  iteration).
- Tool prefix colors render on Monozrakai dark. PRD-011 and PRD-012 are
  implemented and visually validated in the same delivery.

## Out of scope / future

- Changing the stock Monokai themes.
- Layout or non-background changes.

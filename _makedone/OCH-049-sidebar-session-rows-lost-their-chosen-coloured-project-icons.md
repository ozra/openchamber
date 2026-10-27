---
status: refine
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
related: [OCH-015, OCH-040]
created: 2026-10-22 12:54
---
# Sidebar session rows lost their chosen coloured project icons

## Goal

Session rows in the left sidebar show the project's chosen icon in its chosen
colour before the directory/project name again, and a Settings choice decides
whether rows use that coloured look or a dryer one without per-project colour.

## Background

Reported by the maintainer on 2026-10-22 after an upstream update: the session
list stopped showing the chosen coloured icon. The preferred look is colours in
dark mode and the dryer look in light mode, if a per-theme separation exists or
can be added cleanly.

The rendering path exists in fork code: `SessionTimelineRowBody.tsx` paints
`TimelineProjectIcon` (project icon via `PROJECT_ICON_MAP`, colour via
`resolveProjectColor`, image via `ProjectIconImage`), and
`SessionProjectIcon.tsx` does the same for the tab strip. So this is either a
regression in which rows pass a project to that renderer, or a view/mode where
the icon was dropped during a merge. A previous upstream merge silently turned
a sidebar icon setting into hard-coded behaviour (OCH-015 as resolved through
OCH-040, merge commit 94306b36c), so the same class of loss is plausible here.

The theme already exposes its variant (`currentTheme.metadata.variant`, used by
`SessionProjectIcon` for image tinting), which makes a theme-aware tri-state a
realistic option without new theme-conditional setting infrastructure.

## Requirements

- Session rows render the project's chosen icon and colour again wherever they
  did before the upstream update; diagnose which view(s) lost it and when
  against the merge history.
- One persisted setting chooses the row look:
  - dry: no per-project colour, plain muted icon (or none, see open questions);
  - colour: icon + colour before the directory/project name;
  - auto (wanted, decide in refine): colour on dark theme variants, dry on
    light ones, following the theme live.
- Registry entry per "Adding persisted settings" in `custom-dev/README.md`;
  sidebar display toggles are usually `scope: 'profile'` with
  `perSurface: true` like `sidebarViewMode`.
- Record the fork path decision (additive variant vs direct shared change)
  before implementation; a narrow setting on the shared renderer is the
  expected shape.
- Keep the OCH-015 outcome untouched: action icons stay always-visible, this
  setting is about the project identity icon only.

## Open questions

- Exactly which rows lost the icon: tree rows, the flat recent list, Pinned /
  In work, or one display mode? Reproduce before scoping.
- Is the whole icon gone or only its colour (fallback to muted folder)?
- Dry look: no glyph at all, or a neutral folder?
- Tri-state setting vs per-theme override; is `auto` the default?
- Do `iconImage` projects follow the setting too, or always show their image?

## Acceptance criteria
- [ ] Coloured chosen icons are visible again on the affected session rows.
- [ ] The setting switches between dry and coloured on every surface kind, persists, and survives reload.
- [ ] `auto`, if kept, follows the active theme variant without a reload.
- [ ] Per-surface persistence behaves like the other sidebar display toggles.

## Out of scope

- Changing which icons or colours a project can choose (Project settings).
- The always-visible action-icon behaviour settled in OCH-015.
- Per-theme colour overrides beyond the dry/colour auto choice.

## Comments

### 2026-10-22 12:54 · agent

Created from the maintainer's report. Code pointers: `TimelineProjectIcon` in
`packages/ui/src/components/session/sidebar/sessions/SessionTimelineRowBody.tsx`
(lines 80-97, used at 158 and 177), `resolveProjectColor` in
`packages/ui/src/lib/projectMeta.ts`, `SessionProjectIcon.tsx` for the tab
strip. Regression window unknown; start at the upstream merge after the v2.5.0
merge acceptance (OCH-035/OCH-040) and check newer merges.

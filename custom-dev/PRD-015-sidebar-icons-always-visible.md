---
id: PRD-015
title: Sidebar project icons always visible
status: draft
created: 2026-09-02
related:
  - PRD-012
---

# PRD-015 — Sidebar project icons always visible

## Goal

Project (and group) icons in the left sidebar should be visible all the time in
a slightly muted tone, instead of only being revealed on hover.

## Background (current state)

This is **not** a theme concern — it is a layout/class behavior. The
hover-reveal is code-driven:

- `alwaysShowActions` gates the reveal and is currently `mobileVariant ||
  isTablet` (`SessionSidebar.tsx:329`) — desktop non-tablet hover-reveals.
- The reveal itself is Tailwind classes `opacity-0 group-hover:opacity-100`
  (`sidebar/projects/sortableItems.tsx:355,411`,
  `sidebar/projects/SessionGroupSection.tsx:1202-1249`,
  `sidebar/recent/SidebarActivitySections.tsx:273`).
- The muted color already exists (`text-muted-foreground`); icons are only
  hidden, not missing a color.

So this is its own PRD. If a dedicated "muted at rest" token is wanted, that
specific bit belongs in the theme (PRD-012), but the visibility behavior is here.

## Requirements

- Project rows (and group headers) show their icons at rest, muted
  (`text-muted-foreground` or a theme token), full emphasis on hover/focus.
- Opt-in setting or always-on for this fork; decide scope: project rows only,
  or group headers and session rows too.

## Acceptance criteria

- Icons are visible at rest in a muted tone on the targeted rows.
- Hover/focus restores the emphasized color.
- No visual regression in the Files view or other surfaces using the same
  `alwaysShowActions` pattern.

## Out of scope / future

- Changing icon designs or which icons exist.
- Other surfaces' hover-reveal behavior.
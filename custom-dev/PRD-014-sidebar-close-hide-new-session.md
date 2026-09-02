---
id: PRD-014
title: Sidebar close-after-use and hide new-session
status: draft
created: 2026-09-02
---

# PRD-014 — Sidebar close-after-use and hide new-session

## Goal

Two left-sidebar behavior settings:

1. **Close the sidebar after acting** — once you've created a new session or
   picked a session from the sidebar, the sidebar can auto-close to reclaim the
   space.
2. **Hide the header "New session" button** — the global button is ambiguous;
   new sessions should be created from the project you mean. An opt-in setting
   hides it.

## Background (current state)

- Global "New session" lives in the sidebar header (`SidebarNav.tsx:22`,
  `SessionSwitcherDropdown.tsx:142`, `SidebarActivitySections.tsx:274`).
- Per-project creation already exists: each project has a "New Session" action
  in its menu (`sidebar/projects/sortableItems.tsx:184-188`) and folders have a
  new-session action (`SessionFolderItem.tsx:287`). So "create from the project
  heading" is a real affordance today.

## Argument against hiding the global button (for the record)

The global "New session" is the only **always-visible** creation entry point:

- When all project headings are collapsed, or the sidebar is empty (first run,
  no projects added yet), per-project creation isn't reachable.
- It is the muscle-memory / conventional location for "start something new".

Mitigation if we hide it: keep the setting opt-in, ensure per-project
new-session stays discoverable (hover action + context menu), and consider
leaving a fallback entry when zero projects are present. Default preserves
current behavior.

## Requirements

- Setting: "Close sidebar after starting a new session" (default off).
- Setting: "Close sidebar after selecting a session" (default off).
- Setting: "Hide the header New session button" (default off) — creation then
  happens from project headings/menus.

## Acceptance criteria

- Each setting works independently and persists.
- Hiding the button leaves per-project creation fully usable.
- Defaults match current behavior.

## Out of scope / future

- Redesigning the sidebar layout.
- Changing where new-session entries appear on project headings.
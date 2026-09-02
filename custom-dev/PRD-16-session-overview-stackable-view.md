---
id: PRD-16
title: Session overview as a stackable view
status: draft
created: 2026-09-02
related:
  - PRD-1
  - PRD-2
---

# PRD-16 — Session overview as a stackable view

## Goal

Turn the right-side "Session / Project / tasks" infobox into a horizontally
stackable view like any other, and gather more session context into it.

## The stackable-view vision

The right-hand area should host several views that can sit side by side when
space allows:

- chat view
- trajectory timeline rail / "miniview" (PRD-1)
- trajectory ledger (PRD-2)
- changed files
- session overview (this PRD)

Behavior:

- Right-toolbar icons **toggle** views rather than switch between them, so
  several can be open at once.
- **Double-clicking** an icon shows only that view and hides the others.
- When space runs out, views collapse in a deterministic order — **chat is
  always the last survivor**.
- Each view keeps its intended width; the session overview keeps its sleek thin
  width.

This PRD is scoped to the **session overview** view. PRD-1 (rail) and PRD-2
(ledger) are separate, but implementation must keep this horizontal-stack model
in mind so nothing is built in a way that clashes with the full vision. Do not
treat any of these views as a "mode" that excludes the others.

## Background (current state)

- The right-side overview is `ProjectContextPanel` → `ProjectNotesTodoPanel`
  (`layout/RightSidebarTabs.tsx:14-69`), shown when nothing else occupies the
  right panel; it shows the project label, actions, notes/todos.
- The "context view" opened from the right toolbar is `ContextSidebarTab.tsx`
  with the token breakdown (input/output/reasoning/cache; user/assistant/tool
  percentages) at `:330-479`.
- The header context meter is `ContextUsageDisplay` (used in `Header.tsx`,
  `VSCodeLayout.tsx`, `MiniChatLayout.tsx`).
- Right-toolbar surfaces currently open as exclusive tabs (`ContextPanel.tsx`),
  i.e. switching, not stacking.

## Requirements (session overview content)

- Keep the thin sleek width.
- Under the project name, add a row with the **directory path** (before the
  branch row).
- Context meter reads `123000/240000 (51%)` (used / limit / percent) instead
  of just the percentage.
- Show stats from the context view (input / output / reasoning tokens,
  user / assistant / tool-call / other percentages bar) in the same terse
  style as the rest of the infobox. The separate context view can then be
  disabled.

## Requirements (stacking)

- Session overview is one of the stackable right-side views, toggleable via
  its right-toolbar icon.
- Double-click isolates it; single click toggles it alongside others.
- Deterministic collapse order under pressure; chat always last survivor.
- Keeps the overview's thin width.

## Acceptance criteria

- Overview stacks with other right views; double-click isolates; single click
  toggles.
- Deterministic collapse order with chat as the final view.
- Directory path, full context meter, and context stats render in the thin
  width.
- Old context view can be disabled once its stats live in the overview.

## Out of scope / future

- Building the rail or ledger themselves (PRD-1 / PRD-2) — this only defines
  how they coexist.
- Redesigning chat.
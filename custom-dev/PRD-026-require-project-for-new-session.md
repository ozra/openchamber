---
id: PRD-026
title: Require choosing a project for new sessions
status: draft
created: 2026-09-03
depends_on: []
complexity: small
estimated_effort: 1-2 dev-days
related:
  - PRD-013
---

# PRD-026 — Require choosing a project for new sessions

> From the PRD inbox (draft 2): "REQUIRE choosing project on new session —
> don't use 'chat' by default".

## Goal

Starting a new session from a global entry point must not silently default to
the "chat" target. The draft opens with the project picker open and focused,
no project pre-selected, and sending is blocked until the user makes a choice.
The picker behaves exactly like every OpenChamber picker (PRD-013): arrow keys
move, Enter confirms.

## Background (current state)

- `openNewSessionDraft()` with no options resolves `target = "chat"`
  (`sync/session-ui-store.ts:1109-1116`) whenever no explicit project or
  directory is given. The global entry points — sidebar header button
  (`SidebarNav`), session switcher dropdown item, command palette, and the
  keyboard shortcut — all call it bare, so every one of them opens a chat
  draft.
- Projects already have explicit per-project creation paths (project heading
  `+`, group `+`, folder `+`, project menus), and those pass an explicit
  project so they are not affected by this change.
- A draft target selector already exists in the desktop composer
  (`showDraftTargetSelectors`, `ChatInput.tsx:2587`) shown while a draft is
  open and not in VS Code. Work needed is about *initial state, focus, and
  send gating* of that selector, not building a new picker.

## Requirements

- Bare new-session entry points (header button, switcher dropdown, command
  palette, keyboard shortcut) open the draft with **project** target and **no
  project pre-selected** — never `chat` by default.
- The project picker is **open and focused** so it is immediately obvious what
  the user must do: arrow up/down moves through choices, Enter confirms
  (PRD-013 invoke-consistency).
- Sending the draft is **blocked until a choice is made** (either a project,
  or an explicit selection of the chat target).
- Per-project entry points keep their explicit target and shortcut the picker.

## Acceptance criteria

- New session from any global entry point opens with the project picker
  focused, no chat default, and sending disabled until a choice.
- Arrow keys navigate, Enter confirms; behavior identical regardless of where
  the draft was opened from.
- Selecting a project sends to that project; explicitly choosing "chat" still
  works.
- Per-project `+` actions open directly in that project without the picker.

## Out of scope / future

- Redesigning the picker itself (PRD-013 owns picker behavior).
- VS Code compact layout, which already forces a project target.
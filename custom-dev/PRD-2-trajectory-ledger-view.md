---
id: PRD-2
title: Trajectory ledger view
status: draft
created: 2026-09-01
related:
  - PRD-1
---

# PRD-2 — Trajectory ledger view

## Goal

Provide a richer, compact, flow-overview view of a session's activity, one line
per entry, showing user, agent, tool, system, and question records. It is a
**new view** — not a rework of the existing "Raw Messages" pane.

## Background

The "Raw Messages" context pane
(`packages/ui/src/components/layout/ContextSidebarTab.tsx:531`) lists raw
messages but puts too little information on each line to be a useful trajectory.
This feature is a separate, purpose-built view.

## Requirements

- One line per entry (user, agent, tool, system, question), giving a compact
  flow overview.
- Each line carries more useful information than the Raw Messages pane (kind,
  short text/summary, and where available tool/agent/timing/token detail).
- A new view, not a rework of Raw Messages (which stays as-is).

### Navigation sync (later)

- Clicking or selecting a range in the trajectory timeline scrollbar (PRD-1)
  must reflect in both the trajectory ledger and the chat.
- Selecting a line in the ledger reflects in the chat (and rail).
- This is a later phase; the initial version may be read-only.

## Acceptance criteria

- All entry kinds render as one-line rows with kind-appropriate detail.
- Lines are identifiable by the same kind/lane conventions as the rail (PRD-1).
- The view does not modify the existing Raw Messages pane.

## Out of scope / future

- Bidirectional navigation sync (rail ⇄ ledger ⇄ chat) — later phase.
- Live streaming detail.
- Any change to the Raw Messages pane.
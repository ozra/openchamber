---
id: PRD-002
title: Trajectory ledger view
status: draft
created: 2026-09-01
related:
  - PRD-001
  - PRD-019
  - PRD-022
  - PRD-023
---

# PRD-002 — Trajectory ledger view

## Goal

Provide a richer, compact, flow-overview view of a session's activity, one line
per entry, showing user, agent, tool, system, and question records. It is a
**new view** — not a rework of the existing "Raw Messages" pane.

## Background

The "Raw Messages" context pane
(`packages/ui/src/components/layout/ContextSidebarTab.tsx:531`) lists raw
messages but puts too little information on each line to be a useful trajectory.
This feature is a separate, purpose-built view.

## Component strategy

Create a fork-owned ledger component beside Raw Messages, following the additive
variant rule in `custom-dev/README.md`. Keep Raw Messages independently
available. Share the turn projection and chat-navigation contracts from
`DOCUMENTATION.md`; do not fork session/message synchronization or reshape Raw
Messages to serve the ledger.

## Requirements

- The ledger is a normal stackable workspace view governed by PRD-019. Its
  position, width bounds, priority, auto-hide, and restoration are not
  hardcoded locally.
- One line per entry (user, agent, tool, system, question), giving a compact
  flow overview.
- Follow PRD-023: treat completed question-tool answers as user-originated input
  rows while retaining a visible question-tool source marker and the owning
  message/part identity. The answer is user input even though its protocol
  container is a tool result.
- Each line carries more useful information than the Raw Messages pane (kind,
  short text/summary, and where available tool/agent/timing/token detail).
- A new view, not a rework of Raw Messages (which stays as-is).

### Navigation sync (later)

- Clicking or selecting a range in TimelineRail (PRD-001)
  must reflect in both the trajectory ledger and the chat.
- Selecting a line in the ledger reflects in the chat (and rail).
- This is a later phase; the initial version may be read-only.

### Conversation decorations

- Consume PRD-022 `entryStates` for row-level dimmed, highlighted, selected, and
  focused states.
- Consume `textMatches` only for text actually rendered in visible rows. Do not
  expand truncated detail or materialize off-screen rows to decorate matches.
- Keep intrinsic entry-kind styling separate from temporary decorations.

## Acceptance criteria

- All entry kinds render as one-line rows with kind-appropriate detail.
- Lines are identifiable by the same kind/lane conventions as the rail (PRD-001).
- Question-tool answers read as user-originated while remaining identifiable as
  question-tool feedback.
- Supported PRD-022 decoration channels agree with TimelineRail and Chat for the
  same scoped layer and lifecycle phase.
- The view does not modify the existing Raw Messages pane.

## Out of scope / future

- Bidirectional navigation sync (rail ⇄ ledger ⇄ chat) — later phase.
- Live streaming detail.
- Any change to the Raw Messages pane.

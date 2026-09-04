---
id: PRD-006
title: Agent modes: read / write / full
status: closed
created: 2026-09-01
---

# PRD-006 — Agent modes: read / write / full

## Closed

Closed because this has be accomplished through regular opencode confs

## Goal

Replace the "Build" / "Plan" mode framing with "read" / "write" / "full" modes.
The agent is used for all kinds of work, not only coding, so the mode vocabulary
and behavior should match that.

## Background

This may span the OpenChamber UI and the opencode agent itself. This is a
fork-local requirement; whether the mode change belongs in OpenChamber, opencode,
or both is open and part of the work.

## Requirements

- Mode vocabulary becomes **read** / **write** / **full**, replacing
  Build / Plan.
- Modes reflect what the agent is allowed to do (read-only, read+write, full),
  not a build/plan framing.
- The change is consistent wherever modes appear (UI controls, labels, agent
  behavior, any opencode-level mode handling).

## Acceptance criteria

- Mode labels read as read / write / full everywhere.
- Behavior matches the vocabulary: read-only does not write, write/full can.

## Out of scope / future

- Adding entirely new mode semantics beyond the rename/reframe.
- Unless this proves to require opencode changes, keep it UI-only.

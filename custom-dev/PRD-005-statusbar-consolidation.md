---
id: PRD-005
title: Statusbar consolidation
status: deferred
created: 2026-09-01
---

# PRD-005 — Statusbar consolidation

## Goal

There is too much information crammed under the input area (composer status
bar). Consolidate some of it into the title bar and other surfaces, reducing
visual noise under the composer.

## Background

The composer status bar
(`packages/ui/src/components/chat/ComposerStatusBar.tsx`) currently shows a lot
of status/usage info. Some of this can move to the title bar (which already
shows the used-tokens indicator — see PRD-001 for adding tps there).

## Requirements (captured for later)

- Inventory what the composer status bar currently shows.
- Decide which items belong under the input area vs the title bar vs elsewhere.
- Move/consolidate items so the status bar under the input is noticeably less
  cluttered.

## Acceptance criteria (when built)

- The composer status bar shows meaningfully less junk.
- No information is lost — it moves, it does not disappear.

## Out of scope

- Not built now; recorded so the requirement is not lost. Revisit after
  PRD-001/PRD-002 settle.
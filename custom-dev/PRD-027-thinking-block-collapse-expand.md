---
id: PRD-027
title: Thinking-block collapse preview lines and full expand
status: draft
created: 2026-09-03
depends_on: []
complexity: small
estimated_effort: 1-2 dev-days
related:
  - PRD-009
---

# PRD-027 — Thinking-block collapse preview lines and full expand

> From the PRD inbox (drafts 3-5): configurable number of visible lines for
> collapsed thinking entries (default 5), fully expanded content instead of an
> internal scrollbar, and clarifying what the "enable collapsible reasoning
> blocks" setting actually does.

## Goal

Give collapsed (completed) thinking entries a configurable preview height
instead of always one line, expand fully instead of scrolling inside a small
box, and resolve how the existing "collapsible reasoning blocks" setting
relates to the new behavior.

## Background (current state)

- `ReasoningPart.tsx` collapses a completed thinking block to a **single
  truncated line** (`getReasoningSummary`, `SUMMARY_MAX_CHARS = 80`, `truncate`
  class, lines 354-361).
- Once finished, expanded content renders inside a `ScrollableOverlay` with
  `max-h-80` — the internal scrollbar in a small box the user dislikes. While
  streaming it already grows inline with no scroll box (lines 392-413).
- `collapsibleThinkingBlocks` is a UI store setting
  (`useUIStore.collapsibleThinkingBlocks`) that gates reasoning collapse
  behavior in `MessageBody.tsx`. PRD-009 (reasoning visibility, status
  `discover`) already flags uncertainty about what this setting does on/off.
- Clamp rule intent: when the text has fewer lines than the configured preview,
  no added empty lines should appear.

## Requirements

- New user setting: **how many lines are visible for a collapsed thinking
  entry** (default 5). Completed entries show up to that many lines; if the
  text is shorter, show exactly what exists with no padding/empty lines.
- Expanding a completed thinking block shows its content **fully expanded,
  inline** — no `max-h-80` internal scrollbox. The chat's own scroll handles
  long content, matching the existing streaming treatment.
- Discovery item (folds in the inbox's draft 5): determine and document what
  `collapsibleThinkingBlocks` does on/off and how it interacts with the new
  preview-lines setting. Decide together whether the new setting refines the
  existing one or sits alongside it; update PRD-009 with the finding.

## Acceptance criteria

- Collapsed thinking shows up to the configured line count (default 5); short
  texts show no empty space.
- Expanding shows the full content without an internal scrollbar.
- The setting persists via the standard settings path.
- The relationship to `collapsibleThinkingBlocks` is documented and coherent.

## Out of scope / future

- Changing which text is shown in reasoning, its coloring, or other reasoning
  surfaces (those stay with PRD-009).
- Scrollbar treatment while streaming (already inline today).
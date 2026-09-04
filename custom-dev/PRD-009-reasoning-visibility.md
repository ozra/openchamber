---
id: PRD-009
title: Reasoning visibility in chat
status: discover
created: 2026-09-01
related:
  - PRD-027
---

# PRD-009 — Reasoning visibility in chat

## Goal

Show the model's reasoning in chat as one line of grayed text (summary) with an
ellipsis, expandable/collapsible.

## Requirements (rough)

- One line in chat showing reasoning in grayed text (e.g. prefixed by
  "Thinking …"), collapsed by default.
- Expandable/collapsible to read the full reasoning.
- Should not clutter the normal message stream when collapsed.

## Note — functionality likely already exists

`components/chat/message/parts/ReasoningPart.tsx` already renders a
reasoning/justification block with:

- A collapsed header ("Thinking"/"Justification") with a grayed, truncated
  summary and an ellipsis (`getReasoningSummary`, `SUMMARY_MAX_CHARS = 80`).
- Expand/collapse with animated height.
- While streaming, the header shows `BusyDots`.

This sounds very close to the ask. We should verify current behavior first
(why it may not appear for the user), then refine rather than rebuild. Possibly
it is gated by a setting (`collapsibleThinkingBlocks` in
`components/chat/message/MessageBody.tsx:1323`) or only shows when there is a
reasoning part.

## Acceptance criteria (when built)

- Reasoning is visible as one grayed summary line, expandable/collapsible,
  across models that emit reasoning.
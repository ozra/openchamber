---
id: PRD-1
title: Trajectory timeline scrollbar
status: draft
created: 2026-09-01
related:
  - PRD-2
---

# PRD-1 — Trajectory timeline scrollbar

## Goal

Turn the existing prompt-navigator rail on the chat's right edge into a slim,
full-height "trajectory" timeline that shows, for every turn, the flow of user,
agent, and tool activity in miniature. It is the always-present overview of a
session, usable for quick navigation and for reading the shape of a turn.

## Background

The repo already has a vertical gutter of ticks on the chat's right edge, one
tick per user prompt, with hover preview, click-to-jump, keyboard navigation,
and a load-earlier boundary:

- `packages/ui/src/components/chat/components/PromptNavigatorRail.tsx`
- mounted at `packages/ui/src/components/chat/ChatContainer.tsx:517`

This feature builds on that pattern: each single user tick becomes a small
three-lane strip showing the full turn flow.

## Requirements

### Placement and shape

- The rail spans the chat's right edge, over the full chat height, and is as
  slim as possible (it already is roughly 12–28px; keep it thin).
- One strip per turn, positioned along the rail like the existing ticks.

### Three lanes — offset, not columns

- User message spans are **left-aligned**.
- Agent message spans are **centered**.
- Tool message spans are **right-aligned**.
- This must **not** be three rigid columns. A few pixels of left/center/right
  difference is enough to convey the lane, because spans also have distinct
  colors. Lane is conveyed by color first, offset second.
- A turn with many tool calls still reads as a clear right-side cluster.

### Real user messages vs system/scope/control

- Real user messages must be visually distinct from system/scope/control
  messages (plan-mode hidden user messages, `role === 'system'` messages,
  header/control messages).
- **Approach (initial):** give the different kinds distinct tonal variants of
  styling/color first, then evaluate whether some groups feel better styled the
  same and unify where it reads better. Not fixed in advance.

### User span size by prompt length

- Spans for **real** user messages vary slightly in size by prompt length, in
  three size tiers by character count:

  | Prompt length | Size designation |
  |---|---|
  | < 1k chars | smallest |
  | < 10k chars | medium |
  | > 10k chars | largest |

- The difference is only a few pixels per tier — enough to hint at scale without
  dominating the rail.

### Question tool

- A question tool should read more like a user message than a tool call.
- **Initial default:** rendered right-aligned like a tool, but with
  user-message styling/color. This is an open decision — refine once it is seen
  in practice.

### Tokens per second in the title bar

- Approximate input and output tokens-per-second for the current session appear
  in the title bar, next to the used-tokens indicator
  (`ContextUsageDisplay`, `packages/ui/src/components/layout/Header.tsx:1650`).
- Values are derived from creation deltas and are **always labeled
  approximate**; hidden when token data is unavailable.
- See `DOCUMENTATION.md` for the derivation model.

### Navigation

- Clicking a span scrolls the chat to that message (reusing the existing
  on-select-turn jump).
- Later: clicking/selecting a range in the rail reflects in both the trajectory
  ledger (PRD-2) and the chat.

## Acceptance criteria

- Each turn's user/agent/tool activity is distinguishable at a glance by
  color + offset.
- Real user spans scale by the three prompt-length tiers.
- System/scope/control messages read differently from real user prompts.
- Question tools read as user-like, not tool-like.
- Approx tps shows beside the tokens indicator when data exists, and is hidden
  when it does not.
- Clicking a span navigates the chat to that message.

## Out of scope / future

- The full trajectory ledger view (PRD-2).
- Bidirectional navigation sync across rail/ledger/chat (PRD-2, later).
- Live streaming tps (measured client-side from part deltas) — a separate
  feature, also latency-inclusive.
- Any change to the prompt navigator's existing hover preview or keyboard
  navigation unless it conflicts with the lane layout.
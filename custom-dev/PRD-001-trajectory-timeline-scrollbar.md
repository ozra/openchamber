---
id: PRD-001
title: Trajectory timeline scrollbar
status: draft
created: 2026-09-01
related:
  - PRD-002
  - PRD-018
  - PRD-019
---

# PRD-001 — Trajectory timeline scrollbar

## Goal

Turn the existing prompt-navigator rail into a slim, full-height "trajectory"
timeline view that shows, for every turn, the flow of user, agent, and tool
activity in miniature. When enabled, it is the compact overview of a session,
usable for quick navigation and for reading the shape of a turn.

## Background

The repo already has a vertical gutter of ticks on the chat's right edge, one
tick per user prompt, with hover preview, click-to-jump, keyboard navigation,
and a load-earlier boundary:

- `packages/ui/src/components/chat/components/PromptNavigatorRail.tsx`
- mounted at `packages/ui/src/components/chat/ChatContainer.tsx:517`

This feature builds on that pattern: each single user tick becomes a small
three-lane strip showing the full turn flow.

## Component strategy

Build a fully independent fork-owned `TrajectoryTimelineRail` component beside
`PromptNavigatorRail`. It is not a mode, conditional rendering branch, or
expanded prop set inside the original rail.
Start from a direct copy where that best preserves hover, keyboard, load-earlier,
and jump behavior. Keep the original prompt navigator available as an
independently selectable legacy view so both can be compared and upstream rail
improvements can be ported deliberately.

Share the authoritative turn projection, scroll/navigation controller, and
history-loading contracts. Do not duplicate message synchronization or create a
second source of turn truth. Core changes should be limited to PRD-019 view
registration/layout and the narrow preview/navigation contracts both rails use.

## Requirements

### Placement and shape

- The trajectory rail is a normal stackable view governed by PRD-019. Its side
  and position follow user view order rather than a hardcoded Chat edge.
- Default order may place it immediately beside Chat, preserving the current
  rail relationship until the user reorders it.
- The rail spans the full stack height and is as slim as possible (it already is
  roughly 12–28px; keep minimum, normal, and maximum-normal widths close).
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
- Hover/selection previews published by Conversation Find (PRD-018) highlight
  the corresponding turn/span without navigating Chat.
- Later: clicking/selecting a range in the rail reflects in both the trajectory
  ledger (PRD-002) and the chat.

## Acceptance criteria

- Each turn's user/agent/tool activity is distinguishable at a glance by
  color + offset.
- Real user spans scale by the three prompt-length tiers.
- System/scope/control messages read differently from real user prompts.
- Question tools read as user-like, not tool-like.
- Approx tps shows beside the tokens indicator when data exists, and is hidden
  when it does not.
- Clicking a span navigates the chat to that message.
- The rail follows PRD-019 ordering and width rules, and previews PRD-018 Find
  results at the matching turn/span.
- The implementation is a separate component from `PromptNavigatorRail`; the
  original rail remains independently usable.

## Out of scope / future

- The full trajectory ledger view (PRD-002).
- Bidirectional navigation sync across rail/ledger/chat (PRD-002, later).
- Live streaming tps (measured client-side from part deltas) — a separate
  feature, also latency-inclusive.
- Any change to the prompt navigator's existing hover preview or keyboard
  navigation unless it conflicts with the lane layout.

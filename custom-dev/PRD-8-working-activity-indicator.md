---
id: PRD-8
title: Working / activity indicator animation
status: discover
created: 2026-09-01
---

# PRD-8 — Working / activity indicator animation

## Goal

When the agent is working ("Foobar is thinking …"), there should be something
visibly moving that signals work is happening. Right now it can feel static, as
if nothing is happening.

## Requirements (rough)

- A moving/animated indicator whenever the agent is active (thinking,
  streaming, running tools).
- Subtle, not distracting; size/placement in the existing status row is fine.

## Note — functionality may already exist

There is already some busy/animation machinery in the repo that we should
review before building:

- `BusyDots` (`components/chat/message/parts/BusyDots.tsx`) — animated dots
  using `animate-busy-pulse` (`index.css:1726-1736`).
- `WorkingPlaceholder` / `StatusRow`
  (`components/chat/StatusRow.tsx`, `message/parts/WorkingPlaceholder.tsx`)
  render "… is working …" with `BusyDots` while streaming.
- `ReasoningTimelineBlock` shows a busy header while `isStreaming`.

So the "thinking …" state may already animate; the gap may be in generic/idle
or non-streaming busy states, or in how subtle the animation is. We'll evaluate
what already moves before adding anything.

## Acceptance criteria (when built)

- Any active working state has an obvious moving indicator.
- Idle/settled states are still.
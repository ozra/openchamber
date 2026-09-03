---
id: PRD-007
title: Chat history scroll shortcut
status: ready
created: 2026-09-01
depends_on: []
complexity: small
estimated_effort: 1-2 dev-days
related:
  - PRD-013
---

# PRD-007 — Chat history scroll shortcut

> A constituent of the PRD-013 keyboard epic; implemented under that
> coordination.

## Goal

Allow Ctrl+PageUp / Ctrl+PageDown to always scroll the chat history, even when
the prompt area (composer) is focused.

## Background

When focus is in the composer, page-up/page-down is often captured by the input.
This shortcut provides a reliable way to scroll chat history regardless of
focus.

## Requirements

- The configurable defaults are `mod+PageUp` and `mod+PageDown`: Ctrl on
  Windows/Linux and Command on macOS.
- PageUp scrolls toward older messages by 85% of the visible chat viewport.
- PageDown scrolls toward newer messages by 85% of the visible chat viewport.
- The 15% overlap preserves enough context to follow the boundary between pages.
- Works while the composer/prompt area is focused.
- Scrolling upward releases live-edge auto-follow. PageDown remains manual until
  the viewport reaches the live edge, then normal auto-follow resumes.
- Reaching the earliest materialized history requests the next older page
  through the timeline's existing history loader. Keep the viewport anchored
  when that page is prepended.
- Route both commands through the chat timeline controller. Do not add a second
  document-level scrolling owner.
- Plain PageUp/PageDown behavior remains unchanged.

## Acceptance criteria

- The shortcuts scroll 85% of the visible chat viewport when the composer is
  focused, with 15% visual overlap between positions.
- Upward scrolling releases auto-follow; reaching the live edge by PageDown
  resumes it.
- Repeated PageUp can load and enter older history without a jump after prepend.
- Existing plain PageUp/PageDown and chat/input scrolling remain unchanged.

## Out of scope / future

- Changing plain PageUp/PageDown behavior.
- Adding other history-scroll shortcuts.

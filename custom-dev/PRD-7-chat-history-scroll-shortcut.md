---
id: PRD-7
title: Chat history scroll shortcut
status: draft
created: 2026-09-01
related:
  - PRD-13
---

# PRD-7 — Chat history scroll shortcut

> A constituent of the PRD-13 keyboard epic; implemented under that
> coordination.

## Goal

Allow Ctrl+Shift+PageUp / Ctrl+Shift+PageDown to always scroll the chat history,
even when the prompt area (composer) is focused.

## Background

When focus is in the composer, page-up/page-down is often captured by the input.
This shortcut provides a reliable way to scroll chat history regardless of
focus.

## Requirements

- Ctrl+Shift+PageUp scrolls chat history up (toward older messages).
- Ctrl+Shift+PageDown scrolls chat history down (toward newer messages).
- Works while the composer/prompt area is focused.
- Should not conflict with existing shortcuts.

## Acceptance criteria

- The shortcut scrolls chat history when the prompt area is focused.
- Existing chat/input scrolling behavior is unaffected.

## Out of scope / future

- Changing page-up/page-down behavior when the input is not focused.
- Adding other history-scroll shortcuts.
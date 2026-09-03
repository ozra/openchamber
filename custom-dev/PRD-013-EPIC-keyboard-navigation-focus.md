---
id: PRD-013
title: Keyboard navigation and focus
kind: epic
status: draft
created: 2026-09-02
related:
  - PRD-007
  - PRD-010
  - PRD-018
---

# PRD-013 — Keyboard navigation and focus

> **Epic.** This PRD coordinates keyboard and navigation work across several
> requirement docs. Before implementing or adding any keyboard/navigation
> feature (shortcut, focus handling, picker entry point), read this PRD and
> check the related list below so the change follows the shared patterns
> instead of becoming a special case. Feature-level details live in their own
> PRDs; this one holds the cross-cutting rules.

## Related PRDs

| PRD | Scope |
|---|---|
| PRD-007 | Chat history scroll shortcut (Ctrl+PageUp/Down on Windows/Linux) — a constituent of this epic |
| PRD-010 | Electron page zoom shortcuts (Ctrl + / Ctrl - / Ctrl 0 on Windows/Linux) |
| PRD-018 | Separate stackable Conversation Find view, including configurable contextual Ctrl+F |
| (future) | New keyboard features should register here before being built |

## Goal

Make keyboard the first-class way to drive OpenChamber: let the user choose how
sending works, make the question tool fully keyboard-operable, and give every
picker a consistent entry point from the command palette.

## Core principle — invoke consistency

Whether a function is opened from an icon click, a keyboard shortcut, or the
command palette, it opens the **same** regular picker. Picker-specific
improvements are made on the picker itself, never per entry point, so behavior
is identical no matter how the picker is reached.

## Background (current state)

- **Send key** is a hardcoded heuristic, not a setting:
  `ChatInput.tsx:1727` sets `requiresModifierToSend = isMobile ||
  isDesktopExpanded`. On desktop, Enter still sends unless the composer is
  expanded; there is no user-facing control.
- **Question tool** (`QuestionCard.tsx`): the custom-answer textarea has
  `autoFocus` (`:86`) and Enter submits (`:271`), but option rows are plain
  `<button>`s (`:443-490`) — Tab-reachable, no arrow-key roving focus, and no
  "card has focus when it pops up" behavior beyond the textarea.
- **Model selector** is already wired to a shortcut: `open_model_selector`
  (default `mod+shift+m`) toggles `isModelSelectorOpen`
  (`useKeyboardShortcuts.ts:260-267`, `useMiniChatKeyboardShortcuts.ts:66-68`),
  which opens the same dropdown as the model icon. There is **no** command
  palette entry for it.
- **Agent selection**: only `cycle_agent` (`tab`, `config.ts:146-150`) cycles.
  The palette entry titled "Agents" (`id: settings:agents`, title "Agents",
  `lib/settings/metadata.ts:100-104`) opens Settings → OpenCode → Agents — it
  reads like a picker but is settings navigation.
- **Chat history scroll**: `Ctrl+PageUp/Down` from composer focus is
  PRD-007 (a constituent of this epic).

## Requirements

1. **Send key setting**
   - Add a user setting: "Enter to send" (current desktop behavior) vs
     "require Ctrl+Enter to send".
   - The setting replaces the `requiresModifierToSend` heuristic and applies in
     all states (mobile, expanded composer).

2. **Question tool keyboard operation**
   - The card takes focus when it appears.
   - Arrow up/down move through options; Tab moves between controls; Enter
     confirms/submits.
   - Works for multiple questions and tabs.

3. **Model selector via command palette**
   - Palette command "Model" opens the same model picker as the icon and
     `mod+shift+m` (`setModelSelectorOpen(true)`), with the existing fuzzy
     filter and arrow navigation.

4. **Agent selector via command palette**
   - Palette command "Agents" opens the current-agent picker (the composer's
     agent selector).
   - The settings-navigation entry is relabelled to read as settings — e.g.
     prefixed "Settings: Agents", searchable via "settings opencode agents" —
     so the picker and the settings page are unambiguous.

5. **Chat history scroll from composer focus**
   - `Ctrl+PageUp` / `Ctrl+PageDown` scroll chat history even when
     the composer is focused (PRD-007).

6. **Invoke consistency (cross-cutting)**
   - Every picker reachable from an icon, a shortcut, and the palette opens the
     same UI; future picker improvements are done on the picker, not per entry
     point.

## Acceptance criteria

- Enter vs Ctrl+Enter send behavior is settable and matches the setting in all
  states.
- A popped-up question card takes focus; arrows/tab/enter navigate and submit.
- Palette "Model" and "Agents" open the same pickers as the icon and shortcut.
- The "Agents" settings entry reads clearly as settings navigation.
- Ctrl+PageUp/Down scrolls chat history while the composer is focused.
- No existing shortcut conflicts are introduced.

## Out of scope / future

- Redesigning individual pickers (only wiring them to consistent entry points;
  picker changes are separate work done on the picker).
- Non-keyboard navigation improvements.

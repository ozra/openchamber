---
id: PRD-028
title: Auto-hiding header with top-edge reveal
status: draft
created: 2026-09-04
depends_on: []
complexity: medium
estimated_effort: 2-3 dev-days
related:
  - PRD-029
  - PRD-030
---

# PRD-028 — Auto-hiding header with top-edge reveal

> **Blocked on open questions.** See "Open questions" below; they are unanswered
> and must be resolved before this leaves `draft`.

> From the PRD inbox: "It should be possible to 'autohide' the top-bar with the
> tabs — moving the mouse to the top (near few pixels) should reveal it. it's a
> setting if it autohides."

## Goal

Reclaim the header's vertical space for the conversation. When auto-hide is on,
the header row collapses out of the layout and comes back as an overlay when the
pointer touches the top edge of the window, then hides again once the pointer
leaves.

## Background (current state)

- The header is an inline `h-12` row inside the content column
  (`MainLayout.tsx:129`), rendered by `Header.tsx:1383-1394`. It is always
  present on the desktop surface; nothing hides or overlays it today. A grep for
  `autoHide` / `zenMode` across `packages/ui/src` finds no existing
  chrome-hiding concept to extend.
- The header row carries the frameless-window drag region (`app-region-drag`),
  the window-controls overlay style, and the macOS traffic-light inset spacers
  (`Header.tsx:1385-1401`). Hiding it naively removes the only window drag
  surface on frameless chrome.
- `TitlebarLeftControls` is a separate absolutely-positioned overlay that sits
  above both sidebar and header, holds the sidebar toggle and app menu, and
  tracks `--oc-header-height` (`TitlebarLeftControls.tsx:15-25`). It is already
  independent of the header row and would keep rendering while the header hides.
- Session tabs live inside the header (`SessionTabsStrip` via
  `Header.tsx:1585`), rendered only when `sessionTabsEnabled` is on
  (`useUIStore.ts:1229`, default `false`) and the runtime is not VS Code. So the
  "top-bar with the tabs" from the inbox is the same header row, tabs or not.
- The sidebar already animates width with a 200ms
  `cubic-bezier(0.22, 1, 0.36, 1)` transition (`Sidebar.tsx:140-142`); the same
  motion vocabulary applies to the header slide.

## Implementation path

Direct shared modification. This is a layout rule plus one persisted setting on
the single header everyone uses, not a new header variant — per the fork
strategy, small settings and shared layout infrastructure belong on the shared
path. The reveal state itself is new code (a hook plus a trigger-zone element),
and `Header.tsx` gains only the wrapper and the revealed/hidden styling.

## Requirements

1. **Setting** — "Auto-hide the header" (default off, preserving today's
   behavior). Persist it through the full round trip described in
   `README.md` → "Adding persisted settings": client type, store default and
   setter, hydration/apply, write path, the server allowlist in
   `packages/web/server/lib/opencode/settings-helpers.js`, and a focused
   sanitizer test.
2. **Hidden state** — the header contributes no height; the content column
   starts at the top of the window. Auto-hide never removes header
   *functionality*, only its resting visibility.
3. **Reveal trigger** — a pointer inside a thin zone along the top edge of the
   app window (a few pixels; a module constant, not a setting) reveals the
   header. Reveal is animated with the existing 200ms easing.
4. **Overlay, not reflow** — the revealed header floats above the content. It
   must not push the conversation down and back on every reveal.
5. **Dismissal** — the header hides again after the pointer leaves it, with a
   short grace delay so a slightly imprecise mouse path does not flicker it
   away. It stays revealed while:
   - the pointer is over the header,
   - a menu, dropdown, tooltip, or rename input the header owns is open,
   - a session tab drag is in progress,
   - focus is inside the header.
6. **Keyboard reachability** — moving focus into the header (Tab, or any
   shortcut that focuses a header control) reveals it; the hidden header must
   never be a focus trap or a focusable-but-invisible region. Blur or Escape
   returns it to hidden.
7. **Programmatic reveal** — expose a way for other features to hold the header
   revealed for the duration of an interaction and release it afterwards.
   PRD-029 uses this to show the tab strip while the cycling modifier is held.
   Overlapping holds must nest safely rather than the last release winning.
8. **Frameless desktop chrome** — with the header hidden, the window must remain
   draggable and its window controls reachable. See the open question below.
9. **Runtime scope** — desktop surface only. The VS Code runtime has no
   OpenChamber header row to hide and the mobile shell has its own header
   (`MobileHeader.tsx`); the setting is not offered there.

## Open questions

**Unresolved.** Each item below needs a maintainer decision before this PRD can
move from `draft` to `ready`. The "proposed default" is a suggestion, not a
resolution — do not implement one as if it were settled.

- **Frameless chrome fallback.** Proposed default: while the header is hidden,
  keep a slim always-present drag strip along the top edge that doubles as the
  reveal trigger zone, and keep the OS window controls visible on frameless
  chrome. The alternative — hiding the controls with the header — makes the
  window undraggable and unclosable by mouse until the user finds the trigger
  zone. Confirm the proposed default before implementation.
- Should auto-hide also apply when a full-page surface (archive, worktrees,
  multi-run launcher) replaces the chat, where the header carries that surface's
  title (`Header.tsx:1414-1424`)? Proposed default: yes, uniform behavior.

## Acceptance criteria

- With the setting off, the header behaves exactly as it does today.
- With the setting on, the header is not visible at rest and the conversation
  occupies its space.
- Touching the top edge reveals the header within the animation duration;
  moving away hides it after the grace delay.
- Revealing and hiding never reflows the conversation.
- Header menus, tooltips, tab drags, and focus keep the header revealed for the
  whole interaction.
- On frameless desktop chrome, the window stays draggable and its window
  controls stay reachable while the header is hidden.
- The setting survives a restart (server allowlist entry present).

## Out of scope / future

- Auto-hiding the sidebar (PRD-030) or the context panel rail.
- A combined "zen mode" that hides several chrome elements at once.
- Changing what the header contains.

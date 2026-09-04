---
id: PRD-030
title: Sidebar edge-reveal open mode and unpinned dismissal
status: draft
created: 2026-09-04
depends_on: []
complexity: medium
estimated_effort: 2-3 dev-days
related:
  - PRD-014
  - PRD-015
  - PRD-028
---

# PRD-030 — Sidebar edge-reveal open mode and unpinned dismissal

> **Blocked on open questions.** See "Open questions" below; they are unanswered
> and must be resolved before this leaves `draft`.

> From the PRD inbox: "It should be possible to open the session sidebar by
> moving the mouse to the absolute left (few pixels trigger zone). it should be
> a setting whether this is enabled. this will not open it 'persistently until
> item chosen', but rather if mouse moves away from sidebar it should then
> close. So it's its' own 'openmode' so to speak." … "As long as the side bar is
> not pinned, it should also close in all cases if one clicks outside of the
> sidebar (not only on new session or existing session)"

## Goal

Give the left sidebar a third way to be on screen: a transient peek triggered by
the left screen edge that goes away when the pointer leaves. And make an
unpinned sidebar behave like an unpinned panel everywhere — any click outside
dismisses it, not only the two actions PRD-014 covered.

## Background (current state)

- The sidebar is an inline flex child of the layout row
  (`MainLayout.tsx:120-127`) and animates its own width between `0` and the
  stored width (`Sidebar.tsx:64-68`, `134-143`). Opening it therefore *pushes*
  the content column. A transient peek that reflows the conversation on every
  mouse graze would be unusable, so the peek needs to overlay instead.
- Visibility is a single boolean, `isSidebarOpen` (`useUIStore.ts:698`, default
  `true`), toggled by `toggleSidebar` / `setSidebarOpen` (`:1275-1307`) from the
  `toggle_sidebar` shortcut and the `TitlebarLeftControls` button. There is no
  notion of *why* it is open.
- The pin already exists. PRD-014 shipped as `sidebarKeepOpen` (`useUIStore.ts:881`,
  default `true`), and the sidebar header renders it as a pushpin toggle
  (`SidebarHeader.tsx:87-190`, `pushpin-2-fill` / `unpin` icons). When it is
  off, selecting a session or starting a new one closes the sidebar
  (`SessionSidebar.tsx:177`, `:597`, `:753`,
  `sidebar/sessions/useSessionActions.ts:113`). So "pinned" in the inbox entry
  maps onto the control the user already sees; this PRD extends what unpinned
  means rather than adding a second pin.
- Nothing closes the sidebar on an outside click today, and no edge-hover
  trigger zone exists anywhere in the app.

## Implementation path

Direct shared modification. The sidebar's open state is authoritative shared
state and its layout role is basic layout infrastructure — a copied sidebar
variant would fork `isSidebarOpen` and the session list ownership with it. The
change adds an open-*reason* to the existing state plus an overlay presentation
mode, and reuses the pin that PRD-014 already established.

## Requirements

1. **Setting** — "Reveal the sidebar from the left screen edge" (default off).
   Persist it through the full round trip described in `README.md` → "Adding
   persisted settings", including the server allowlist entry in
   `packages/web/server/lib/opencode/settings-helpers.js` and a focused
   sanitizer test.
2. **Open modes** — the sidebar's open state gains a reason: *pinned/toggled*
   (today's behavior) or *peeked* (edge reveal). Consumers that only ask "is it
   open" keep working; dismissal rules read the reason.
3. **Edge trigger** — with the setting on, a pointer inside a thin zone along
   the left edge of the window (a few pixels; a module constant, not a setting)
   opens the sidebar in peek mode. A short dwell before opening keeps a mouse
   crossing the edge on its way elsewhere from triggering it.
4. **Peek presentation** — a peeked sidebar overlays the content column and does
   not reflow it. It uses the same width and the same 200ms
   `cubic-bezier(0.22, 1, 0.36, 1)` motion as the pinned sidebar, with a shadow
   or scrim edge making the overlay obvious.
5. **Peek dismissal** — the peek closes when the pointer leaves the sidebar,
   after a short grace delay so brushing past the edge of the panel does not
   snatch it away. It stays open while:
   - the pointer is over the sidebar,
   - a menu, dropdown, tooltip, rename input, or drag the sidebar owns is
     active,
   - keyboard focus is inside the sidebar.
6. **Promotion** — a peeked sidebar becomes a normal open sidebar (no longer
   pointer-dependent) when the user toggles it deliberately, via the
   `toggle_sidebar` shortcut or the titlebar toggle button, or when they pin it
   from the sidebar header. Promotion reflows the layout the way a normal open
   does.
7. **Selecting from a peek** — picking a session or starting a new one from a
   peeked sidebar closes the peek regardless of `sidebarKeepOpen`. Peek is by
   definition transient.
8. **Unpinned dismissal (independent of the edge-reveal setting)** — while
   `sidebarKeepOpen` is off, a click anywhere outside the sidebar closes it,
   not only the new-session and select-session actions PRD-014 covered.
   Excluded from "outside": the titlebar sidebar toggle (it must keep toggling,
   not close-then-reopen), and any popup, menu, dialog, or drag surface the
   sidebar itself owns, including portaled content rendered outside the sidebar
   element.
9. **Keyboard** — Escape closes a peeked sidebar and returns focus to where it
   was. Tabbing into a peeked sidebar keeps it open (requirement 5); tabbing out
   closes it.
10. **Runtime scope** — desktop surface only. The mobile shell renders no
    `Sidebar` at all (`Sidebar.tsx:60-62` returns `null` on mobile) and uses its
    own drawer; the VS Code runtime already opts out of the PRD-014 close
    behavior (`isVSCode` guards in `SessionSidebar.tsx`) and opts out here too.
11. **Tests** — cover the dismissal rules directly: peek opens on edge dwell,
    survives pointer-over and owned popups, closes on pointer-away, promotes on
    deliberate toggle; unpinned outside-click closes while pinned does not; the
    toggle button is not treated as an outside click.

## Open questions

**Unresolved.** Each item below needs a maintainer decision before this PRD can
move from `draft` to `ready`. The "proposed default" is a suggestion, not a
resolution — do not implement one as if it were settled.

- **Drag suppression.** Should the edge trigger zone be suppressed while a
  full-screen drag is in progress (dragging a file or a session across the
  window)? Proposed default: yes — a drag toward the left edge should not spring
  the sidebar open mid-drag, unless dropping into the sidebar is a supported
  gesture.
- **Scope of this PRD.** The inbox entry held two wishes: the edge-reveal open
  mode, and "an unpinned sidebar closes on any outside click" (requirement 8).
  They are grouped here because both hang off the same pin state
  (`sidebarKeepOpen`), but the outside-click rule is independent of the
  edge-reveal setting and could ship on its own. Confirm the grouping, or split
  requirement 8 into its own PRD.

## Acceptance criteria

- With the edge-reveal setting off, the sidebar behaves exactly as today.
- With it on, moving the pointer to the left edge peeks the sidebar without
  reflowing the conversation; moving away closes it after the grace delay.
- A peek stays open while the pointer is over it, while its menus are open, and
  while focus is inside it.
- Toggling or pinning during a peek promotes it to a normal open sidebar.
- Selecting a session from a peek closes the peek.
- With the pin off, clicking anywhere outside the sidebar closes it; the
  titlebar toggle still toggles rather than double-firing.
- With the pin on, outside clicks change nothing.
- Both settings survive a restart.

## Out of scope / future

- Auto-hiding the header (PRD-028) or any other chrome.
- An edge-reveal mode for the context panel or right-hand surfaces.
- Changing the sidebar's contents, width rules, or resize behavior.
- Replacing the PRD-014 close-after-acting settings; this PRD adds to them.

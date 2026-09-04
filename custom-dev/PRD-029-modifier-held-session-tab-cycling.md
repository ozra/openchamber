---
id: PRD-029
title: Modifier-held session tab cycling
status: draft
created: 2026-09-04
depends_on: []
deliver_with:
  - PRD-028
complexity: large
estimated_effort: 3-5 dev-days
related:
  - PRD-013
  - PRD-028
---

# PRD-029 — Modifier-held session tab cycling

> **Blocked on open questions.** See "Open questions" below; they are unanswered
> and must be resolved before this leaves `draft`.

> From the PRD inbox: "ctrl-tab, ctrl-shift-tab should switch between open
> sessions (tabs) (default keybindings, sould ofcourse be changable) - if the
> topbar is autohidden then it should be revealed during this action as long as
> ctrl is still held. When switching, only the tab should be highlighted and the
> view should be placeholder-loader-style-faked during tabbing, until releasing
> control (or whichever control-char one has chosen), to not make it sluggish by
> rerendering each view while cycling through. when selection is done the
> selected session is rendered."

> Part of the PRD-013 keyboard navigation epic. Follow its invoke-consistency
> rule: cycling must land on the same session activation path as clicking a tab.

## Goal

Alt-Tab-style switching between open session tabs. Holding the modifier and
tapping the cycle key moves a *pending* selection along the tab strip without
loading anything; releasing the modifier commits the selection and renders that
session once.

## Background (current state)

- Two session-switch commands exist: `switch_session_previous` and
  `switch_session_next`, defaulting to `mod+alt+arrowleft` / `mod+alt+arrowright`
  and customizable (`lib/shortcuts/config.ts:70-83`). Their handlers call
  `activateAdjacentSessionTab(∓1)` and fall back to `navigateSessionHistory`
  when tabs are off (`useKeyboardShortcuts.ts:175-182`). Every step switches the
  session for real and renders the view — exactly the sluggish behavior the
  inbox entry objects to.
- `activateAdjacentSessionTab` and `activateSessionTabByIndex` both operate on
  *renderable* tab ids — tab ids filtered against the loaded session list, the
  same rule the strip renders by — and commit through
  `useSessionUIStore.setCurrentSession` (`lib/sessionTabs.ts:17-49`).
- The "modifier is still held" primitive already exists. `switch_session_tab`
  declares a bare `mod` **prefix** binding (`config.ts:210-217`), and the
  keydown route matches it with `eventMatchesShortcutPrefix` against a
  `heldKeysRef` set maintained by capture-phase keydown/keyup handlers and
  cleared on window blur (`useKeyboardShortcuts.ts:525-560`,
  `bindings.ts:355-373`). What is missing is a pending selection that survives
  between taps and commits on modifier *release* — nothing today listens for
  the release edge.
- The binding grammar supports a literal `ctrl` modifier distinct from the
  platform-neutral `mod` (`bindings.ts:5`, `70-77`), so `ctrl+tab` and
  `ctrl+shift+tab` are expressible defaults on every platform.
- Session tabs render only when `sessionTabsEnabled` is on
  (`useUIStore.ts:1229`, default `false`) and the runtime is not VS Code.
- A `Skeleton` primitive exists at `components/ui/skeleton.tsx` for the
  placeholder view.
- `isRiskyBrowserShortcut` (`bindings.ts:236-250`) already models chords the
  browser owns. `Ctrl+Tab` is one of them in a hosted browser tab — see the
  runtime constraint below.

## Implementation path

Direct shared modification. The behavior belongs to the existing shortcut
dispatcher, the existing tab strip, and the existing session activation path;
forking a second tab strip would duplicate authoritative session state. The new
code is a cycling state machine plus a placeholder render mode on the chat area.

## Requirements

1. **Commands** — add `cycle_session_tab_next` and `cycle_session_tab_previous`
   to `SHORTCUT_SCHEMA`, `customizable: true`, with `settingsLabelKey`s and
   English text in every locale (`TRANSLATE ME` elsewhere, per the
   localization note in `README.md`). Defaults `ctrl+tab` and `ctrl+shift+tab`.
2. **Cycling session** — the first press starts a cycling session: a pending
   index initialized to the current session's position in the rendered strip
   order. Each further press while the modifier stays held moves the pending
   index by ±1 with wraparound. Nothing is activated during this phase.
3. **Commit on release** — releasing the modifier commits: the pending session
   is activated through the same `setCurrentSession` path a tab click uses, and
   the placeholder is replaced by the real view. Committing the session that was
   already current is a no-op, not a reload.
4. **Cancel** — Escape during cycling cancels without switching. Window blur
   cancels (the held-key set is already cleared on blur); a cancelled cycle
   leaves the original session current and rendered.
5. **Visual feedback while cycling**
   - Only the pending tab is highlighted in the strip; the committed session
     keeps its normal "current" styling underneath so the user can see where
     they started.
   - The chat area shows a placeholder/skeleton for the pending session rather
     than the real conversation. No session data is fetched, no messages are
     rendered, and the current session's view is not torn down.
   - The pending tab scrolls into view in the strip if it is out of sight.
6. **Header reveal while cycling** — when the header is auto-hidden (PRD-028),
   a cycling session holds the header revealed for as long as the modifier is
   held, using PRD-028's programmatic reveal hold. The hold is released on
   commit or cancel.
7. **Works with a custom binding** — the modifier-held behavior must derive from
   the *effective* binding, not a hardcoded Ctrl. A rebound chord's modifier set
   is what the release edge watches. A binding with no modifier cannot support
   hold-to-cycle; in that case each press commits immediately (plain step
   switching) rather than silently doing nothing.
8. **Relationship to the existing commands** — `switch_session_previous` /
   `switch_session_next` keep their current immediate-switch behavior and
   bindings. Cycling is an additional way to switch, not a replacement.
9. **Runtime scope** — desktop surface with session tabs enabled. Return `false`
   from the handlers in the VS Code runtime and when `sessionTabsEnabled` is
   off, matching how the existing tab shortcuts yield
   (`useKeyboardShortcuts.ts:176-184`).
10. **Tests** — cover the state machine directly: start, step, wrap, commit,
    cancel-on-Escape, cancel-on-blur, single-tab no-op, and commit-to-current
    no-op. Add schema/conflict tests for the new bindings.

## Runtime constraint — Ctrl+Tab in a browser tab

In Electron and other standalone shells the renderer sees `Ctrl+Tab` and can
prevent its default. In a hosted browser tab, `Ctrl+Tab` is reserved by the
browser for switching browser tabs and generally cannot be intercepted. The
feature is therefore reliable on desktop and best-effort on the hosted web
surface. This does not block the work — the binding is customizable, so a web
user can rebind to a chord the browser does not own — but the Settings entry
should not promise browser behavior it cannot deliver.

## Open questions

**Unresolved.** Each item below needs a maintainer decision before this PRD can
move from `draft` to `ready`. The "proposed default" is a suggestion, not a
resolution — do not implement one as if it were settled. The cycle-order
question in particular changes what gets built, not just how.

- **Cycle order: strip order or most-recently-used?** Proposed default: strip
  order, matching `activateAdjacentSessionTab` and matching what the highlighted
  tab shows the user. MRU (VS Code's Ctrl+Tab) is the alternative and is a
  meaningfully different feature — it needs a per-tab access-time list and its
  ordering is invisible in the strip. Confirm before implementation.
- **Placeholder fidelity.** Proposed default: a skeleton keyed to the pending
  session showing its title and directory (both already in the loaded session
  list) over a generic message-shaped skeleton, so the placeholder is
  informative without loading anything.

## Acceptance criteria

- Holding the modifier and tapping the cycle key moves the highlight one tab per
  tap, wrapping at both ends, without switching sessions.
- The chat area shows a placeholder during cycling; the real session renders
  exactly once, on release.
- Cycling through many tabs stays responsive — no per-step session render.
- Escape and window blur cancel cleanly, leaving the original session current.
- Rebinding both commands in Settings works, and the hold behavior follows the
  new modifier.
- With PRD-028 auto-hide on, the header is visible for the whole cycle and hides
  again afterwards.
- The existing `switch_session_previous` / `switch_session_next` shortcuts are
  unchanged.
- No new shortcut conflicts are reported by the settings recorder.

## Out of scope / future

- A visual switcher overlay listing sessions (this feature highlights the
  existing strip).
- MRU ordering, unless the open question resolves that way.
- Cycling anything other than session tabs.
- Changing the session tabs feature flag or its default.

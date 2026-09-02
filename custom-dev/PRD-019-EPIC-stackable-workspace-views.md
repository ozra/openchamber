---
id: PRD-019
title: Stackable workspace views
kind: epic
status: draft
created: 2026-09-02
related:
  - PRD-001
  - PRD-002
  - PRD-016
  - PRD-017
  - PRD-018
---

# PRD-019 - Stackable workspace views

> **Epic.** This PRD owns the shared layout contract for workspace views.
> Individual view PRDs define their content and local width modes, not their own
> ordering, priority, or responsive-collapse rules.

## Goal

Let each screen size support a different working arrangement without turning
views into mutually exclusive tabs. Open views form one horizontal stack. The
user controls their order, width bounds, and survival priority; the layout
compresses and temporarily hides views when space becomes tight.

On a large screen, several views can remain open. On a smaller screen, the same
chosen arrangement adapts predictably while protecting the view being used.

## Related views

| PRD | View |
|---|---|
| PRD-001 | Trajectory timeline rail / miniview |
| PRD-002 | Trajectory ledger |
| PRD-016 | Dashboard information view |
| PRD-017 | Rich changed-files and diff view |
| PRD-018 | Conversation Find |

Chat participates in this layout even though it is an existing core view rather
than a separate PRD.

## Core integration boundary

The shared stack allocator, view registry, toolbar order, and responsive
visibility state necessarily change core layout infrastructure. Keep that core
layer generic: it knows view identities and layout contracts, not fork-specific
content rules.

Register fork-owned views additively. Preserve existing context-panel tabs,
legacy components, and their routes while stackable variants are evaluated.
Individual PRDs decide whether a view is a copied variant or an intentional
shared modification under `custom-dev/README.md`; this epic does not authorize
rewriting every registered component in place.

## State model

Keep these states distinct:

- **Enabled:** the user has toggled the view on and intends it to participate in
  the workspace.
- **Visible:** the layout currently has enough room to render the enabled view.
- **Auto-hidden:** the view remains enabled but is temporarily absent because of
  space pressure.
- **Closed:** the user toggled the view off. A closed view does not restore just
  because more space becomes available.
- **Active:** focus or an in-view action shows that the user is currently using
  the view. Activity grants temporary acute priority.

Auto-hiding must not overwrite user intent. When room returns, auto-hidden views
restore automatically as their width requirements fit. Manual close remains
closed.

## View order and toolbar icons

- Every stackable view, including Chat, has a toolbar icon in one reorderable
  list.
- Dragging an icon changes both toolbar order and horizontal view order. Earlier
  icons map to views farther left; later icons map to views farther right.
- For example, moving Find before Chat places Find to the left of Chat. No view
  owns a hardcoded left-side or right-side position.
- Icon order persists as a user preference.
- A single click toggles a view without closing the other enabled views.
- A double-click isolates that view by closing the other views. Auto-hidden
  state is not used for explicit isolation.
- An enabled but auto-hidden view has a distinct icon state so the user can tell
  it is waiting for space rather than manually closed.
- Reordering must work with mouse, touch, and keyboard and must not make toolbar
  icons unreachable when the list is longer than the available edge.

## Width contract

Every view declares and exposes user-adjustable layout values:

- **Minimum width:** the narrowest usable form before the view becomes a
  candidate for auto-hide.
- **Normal width:** the preferred working width used while several views fit.
- **Maximum normal width:** the widest automatic expansion. Extra space beyond
  this limit does not make a sparse view excessively wide.

The values satisfy `minimum <= normal <= maximum normal`. Defaults belong to
the view; user overrides persist. Reset restores that view's defaults.

Width allocation follows this order:

1. Lay out enabled views in user order at normal width where possible.
2. Distribute spare width without taking any view beyond its maximum normal
   width.
3. Under pressure, compress views toward their minimum widths before hiding
   anything.
4. If the sum of minimum widths still does not fit, auto-hide one view according
   to effective priority, then recompute. Repeat until the visible stack fits.
5. When space returns, restore auto-hidden views in effective-priority order as
   soon as their minimum widths fit, then expand the stack toward normal widths.

The algorithm must be deterministic. Equal-priority ties use persisted view
order, with the later view yielding first unless one has acute priority.

## Base and acute priority

- Every view has a user-adjustable **base priority** used for responsive
  auto-hide. Lower priority yields first.
- Chat has the highest base priority by default, but this is a default rather
  than an absolute rule. The user can change it.
- A view gains **acute priority** while focus is inside it or an action in that
  view is actively changing its working state. Acute priority protects the view
  from being the next auto-hidden candidate.
- When an otherwise low-priority view is acute, auto-hide chooses the next
  lowest-priority non-acute view. This lets an interaction finish instead of
  making its own view disappear.
- Acute priority is ephemeral. It does not persist, rewrite base priority, or
  reorder views. It ends when focus/activity moves elsewhere, the view closes,
  or the interaction completes.
- If space can fit only one view, the acute view survives. With no acute view,
  the highest base-priority enabled view survives.

Toolbar focus alone does not make a view acute. Focus or activity must belong to
the view's content or an action that is changing that view.

## Dynamic view modes

A view may change its width needs as part of normal use. It reports the active
mode's minimum, normal, and maximum-normal widths to the same allocator rather
than resizing outside the stack model.

PRD-017 is the first concrete case:

- With no changed file selected, the view needs only its file-list width.
- Selecting a file opens the side-by-side diff and requests the wider two-pane
  width mode.
- That click also makes the view acute while the layout responds, so another
  lower-effective-priority view yields first if the expanded mode does not fit.
- Deselecting the file returns to list-only width and allows auto-hidden views
  to restore.

## Persistence and runtime behavior

- Persist enabled/closed state, icon/view order, base priorities, and width
  overrides.
- Keep auto-hidden state, acute priority, and transient active width mode out of
  persisted preferences.
- Shared contracts define intentional behavior for web, desktop, VS Code,
  hosted mobile, and Capacitor mobile. Narrow surfaces may show only one view,
  but they use the same enabled versus auto-hidden distinction.
- Runtime or directory switching must not let stale focus or a stale dynamic
  width request protect the wrong view.

## Acceptance criteria

- Several enabled views render side by side when their width contracts fit.
- Reordering toolbar icons changes horizontal view order and persists.
- Each view has valid minimum, normal, and maximum-normal widths and never
  expands automatically beyond its maximum.
- Views compress to minimum before any view auto-hides.
- Lower base priority auto-hides first; Chat starts with the highest default.
- The focused/active view receives temporary acute priority, so the next
  eligible view yields instead.
- Auto-hidden views remain enabled and restore automatically when room returns.
- Manually closed views do not restore automatically.
- Dynamic compact/expanded view modes use the same allocator and priority
  rules.
- Single-click toggle and double-click isolation remain consistent for every
  view.

## Validation

- Pure allocator tests for spare space, compression, repeated auto-hide,
  restoration, equal-priority ties, and one-view survival.
- State tests distinguishing enabled, visible, auto-hidden, closed, and acute.
- Persistence tests proving only user intent and preferences survive reload.
- Reorder tests covering pointer, touch, keyboard, and order-to-position mapping.
- Transition tests for focus changes and dynamic width-mode changes while the
  window is shrinking or expanding.
- Representative desktop, tablet, VS Code, hosted-mobile, and Capacitor checks.

## Out of scope / future

- Detaching views into separate native windows.
- Saving named workspace-layout presets. The persisted current arrangement is
  sufficient for the first version.

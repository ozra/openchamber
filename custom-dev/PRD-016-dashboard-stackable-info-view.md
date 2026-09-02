---
id: PRD-016
title: Dashboard stackable information view
status: draft
created: 2026-09-02
related:
  - PRD-019
  - PRD-020
---

# PRD-016 - Dashboard stackable information view

## Name

Use **Dashboard** as the product name and `SessionDashboardView` as the tentative
top-level code name. Dashboard is a new fork-owned view inspired by the current
Work Status panel, not a renamed or replacement `WorkStatusPanel`.

**Work Status panel** continues to mean the original component with accessible
label "Work status" at `components/chat/work-status/WorkStatusPanel.tsx`.

## Goal

Create the main sleek information view for the current chat/session. Dashboard
uses the best content and visual ideas from Work Status while participating as a
regular PRD-019 stackable view. The original Work Status remains available for
comparison and for reviewing useful upstream changes.

## Background

Work Status is the source design and already provides most useful information:

- Session and context usage/cost
- Project branch, changes, pull request, and checks
- Provider usage, subagents, tasks, MCP, pinned messages, and context sources
- Compact labelled rows grouped into collapsible sections
- A rounded border, faint fill, restrained shadow, inset margins, and an
  internal scroller

It currently renders as a fixed-width sibling of Chat, has no regular view icon
or width contract, and hides when context-panel content opens or fixed width no
longer fits. Those lifecycle/layout rules remain with the original component.
Dashboard uses PRD-019 instead.

## Component strategy

Create a new module such as `components/views/dashboard/` with
`SessionDashboardView` as its composition root. Do not turn `WorkStatusPanel`
into Dashboard through props, modes, or conditional branches.

Build Dashboard sections by this rule:

1. Reference an existing Work Status section directly while its content,
   behavior, and layout contract fit Dashboard without special cases.
2. Extract a narrow shared hook, pure helper, or primitive when both components
   need the same non-presentation behavior.
3. When Dashboard needs substantial section-specific changes, copy that section
   into the Dashboard module and let it diverge independently.
4. Give copied sections purpose-owned names such as
   `DashboardContextSourcesSection` or `DashboardUsageSection`. Avoid temporal
   names such as `Mk2`, `V2`, `New`, or `Legacy`, which stop explaining the
   component once both versions have existed for a while.

Do not distort original Work Status sections with Dashboard-only flags merely to
avoid a copy. Conversely, do not duplicate authoritative stores, quota refresh,
Git warming, session synchronization, or other data ownership. The old and new
presentations should read the same sources without starting parallel loaders.

Keep original Work Status independently reachable. During development and while
evaluating Dashboard, allow both to be enabled side by side when layout permits.
This preserves a live reference for upstream comparison rather than relying on
memory or screenshots.

## Shared stack behavior

- Dashboard is a normal stackable workspace view governed by PRD-019.
- It has the same reorderable toolbar icon, single-click toggle, double-click
  isolation, user order, base priority, acute priority, and persisted
  minimum/normal/maximum-normal width settings as other views.
- Its position comes from toolbar/view order, not a hardcoded side of Chat.
- Opening another view does not automatically close Dashboard. Width pressure
  follows shared compression, priority, auto-hide, and restoration.
- Dashboard enabled state and responsive auto-hidden state remain distinct.
- Preserve Dashboard section expansion and per-session scroll position through
  stack hide/show and reordering.

## Rounded dashboard card

Keep the rounded-card visualization that works well in Work Status:

- Rounded outer border
- Subtle interactive-border color
- Faint muted fill
- Light restrained shadow
- Inset space around the card
- Internal hidden scrollbar with top/bottom scroll shadows

The stack slot owns width, order, resizing, and auto-hide. The Dashboard card is
inset inside that slot rather than becoming a flush, square, edge-to-edge pane.
Its width contract includes enough room for margins and shadow so compression
does not clip its visual boundary.

Overlay/compact modes may use a glass treatment where appropriate, but the
normal stacked Dashboard keeps the lighter non-blurred card. Width changes must
not flatten section spacing or reduce labelled rows to unexplained values.

## Width contract

- Keep Dashboard relatively narrow by default. Its minimum, normal, and
  maximum-normal widths should remain close enough that it reads as an infobox,
  not a broad analytics page.
- Normal width fits current Work Status labels and trailing values at least as
  well as the source component.
- Compression uses truncation/tooltips and internal scrolling. It does not drop
  whole sections merely to fit width.
- Maximum-normal width prevents Dashboard from becoming excessively wide when
  few other views are enabled.

## Information content

Start with Work Status's durable section order and information set, then make
Dashboard-specific refinements in its own section components where needed:

- Show current directory path in Project before the branch row.
- Show Context as `123000/240000 (51%)` (used / limit / percentage), retaining
  cost where available.
- Add a compact, collapsible context breakdown: input, output, reasoning, and
  cache tokens plus user/assistant/tool/other shares.
- Show provider quota pace from PRD-020 in Usage and its collapsed headline.
- Preserve useful rows for goal, Git status/changes, PR/checks, subagents, tasks,
  MCP, pins, and context sources.

The separate context overview and original Work Status remain available. Their
retirement is not part of Dashboard's first implementation.

## Actions and focus

- Preserve useful Work Status destinations: Context, Changes, Branch,
  PR/checks, subagents, goal, MCP, and pinned-message navigation.
- Focus or an active row action grants Dashboard PRD-019 acute priority. If an
  action opens or expands another view, the shared allocator handles both.
- Dashboard section settings remain reachable when every section is hidden. An
  empty rounded card without a recovery action is invalid.

## Runtime behavior

- Desktop/web use the normal stackable Dashboard.
- PRD-019 defines intentional compact/single-view behavior before Dashboard is
  enabled in VS Code or mobile. Do not mount desktop layout there unchanged.
- Hidden/auto-hidden Dashboard performs no presentation-only ongoing work.
  Shared authoritative refresh owners keep their normal lifecycle.

## Acceptance criteria

- `SessionDashboardView` is independent from `WorkStatusPanel` and both remain
  independently usable.
- Dashboard is a regular PRD-019 view with reorderable placement, configurable
  priority, width bounds, auto-hide, and restoration.
- The rounded border, faint fill, shadow, inset spacing, internal scroll shadows,
  labelled rows, and grouped-section visual language remain recognizable.
- Unchanged sections can be composed from Work Status without Dashboard flags;
  divergent sections live under semantic Dashboard-specific names.
- No duplicated polling, synchronization, Git warming, quota refresh, or other
  authoritative data ownership is introduced.
- Directory path, full context meter, compact context breakdown, and PRD-020
  quota pace render in the appropriate Dashboard sections.
- Dashboard section visibility, expansion, scroll restoration, empty-state
  recovery, and row actions work independently from original Work Status state.
- Old and new views can be compared side by side when the layout has room.

## Validation

- Tests proving Dashboard and Work Status mount independently and do not share
  presentation state accidentally.
- PRD-019 integration tests for order, width compression, priority, auto-hide,
  restoration, toggle, and isolation.
- Tests proving both views consume shared authoritative stores/loaders without
  duplicate request ownership.
- Visual checks at minimum, normal, and maximum-normal widths for card shape,
  margins, shadow, truncation, section spacing, and internal scrolling.
- Regression checks for reused Work Status sections and focused checks for every
  Dashboard-specific copied section.
- Side-by-side comparison against original Work Status after relevant upstream
  changes.

## Out of scope / future

- Replacing or renaming `WorkStatusPanel`.
- Removing original Work Status during Dashboard's first implementation.
- Naming copied sections `Mk2`, `V2`, `New`, or `Legacy`.
- Turning Dashboard into a generic flush context-panel tab.
- Retiring the separate context overview before Dashboard has been evaluated.

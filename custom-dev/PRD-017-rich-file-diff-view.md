---
id: PRD-017
title: Rich file-diff view
status: draft
created: 2026-09-02
related:
  - PRD-004
  - PRD-019
---

# PRD-017 — Rich file-diff view

## Goal

A new, separate stackable view/module that is compact when it shows only the
changed-files list and expands to a two-pane list plus side-by-side diff when a
file is selected. It is deliberately **not** a rework of the existing diff UI -
a lot of code can be lifted from it as a basis, but the two stay distinct. The
old diff view remains available; sometimes the terser variant is preferred for
certain sessions/edits.

## Background (current state / reuse basis)

- The existing context-panel diff (`components/views/DiffView.tsx`) renders via
  `PierreDiffViewer` (side-by-side when `renderSideBySide`), scoped to a
  directory/branch range, with file diffs from `fileDiffFromPatch`
  (`lib/diff/patchFileDiff`) and first-change jumping via
  `getFirstChangedModifiedLineFromPatch` (`diffPatchUtils`).
- Changed-file lists already exist as compact chip/popover widgets
  (`components/chat/ChangedFilesList.tsx`, `TurnChangedFilesDropdown.tsx`,
  `PendingChangesBar.tsx`) but not as a navigable two-pane layout.
- The new module lives under its own path (e.g. `components/views/fileDiff/`)
  and lifts the working pieces — Pierre diff rendering, patch parsing, scroll
  anchoring — rather than reusing the old component directly.

## Component strategy

This is an additive fork-owned variant under `custom-dev/README.md`. Start from
a copy of the existing diff presentation where that gives the clearest baseline,
then let the new module diverge. Keep the old diff independently available for
side-by-side comparison and deliberate uptake of later upstream improvements.

Reuse authoritative Git/diff data and focused parsing/rendering utilities. Do
not duplicate Git refresh ownership or change the old diff component to carry
the new view's list-only/diff-open state machine.

## Requirements

### File list (left pane)

- Changed files grouped by directory:
  ```
  the/path
     [M] some-file.md
     [C] other-file.cypher
  other/path
     [D] a-deleted-file-for-example.c
     [M] yet-a-file
  ```
- Status markers: `[A]` added, `[M]` modified, `[D]` deleted, `[R]` renamed,
  `[C]` copied/conflicted as applicable.
- With no file selected, render only this list. Do not reserve empty width for a
  diff pane.
- Clicking an unselected file selects it and opens its side-by-side diff.
- Clicking the selected file again deselects it and returns to list-only mode.

### Side-by-side diff (right pane)

- Clicking a file always **jumps to the first difference** in the side-by-side
  view.
- New and deleted files show their content too, marked all-`new` /
  all-`deleted` respectively (a file with no counterpart renders as a single
  side marked accordingly).

### Stack width modes

- Follow PRD-019 for ordering, width allocation, priority, auto-hide, and
  restoration.
- **List-only mode:** minimum/normal/maximum-normal widths describe the changed
  file list alone.
- **Diff-open mode:** selecting a file requests a wider width contract that can
  fit the list and side-by-side diff.
- File selection is an active in-view action. The view receives acute priority
  while it enters Diff-open mode, so a different lower-effective-priority view
  auto-hides first if the wider mode does not fit.
- Deselecting the active file returns to List-only mode. The stack recomputes
  widths and restores eligible auto-hidden views when room becomes available.
- Preserve selected-file state if this view is auto-hidden for space. Manual
  deselection, session/scope change, or closing the view clears it according to
  the view's normal lifecycle.

### Top toolbar toggles

- **Context vs full**: toggle between showing only the changed part with *x*
  lines of context, or showing the full file (default = full).
- **Trailing whitespace**: toggle whether trailing-whitespace differences are
  considered.
- **Leading whitespace**: toggle whether initial-whitespace differences are
  considered (if that is not doable with the diff engine, suggest a simple
  similar solution — e.g. normalize leading whitespace before diffing, or
  ignore-whitespace-as-an-option).
- **Line wrap**: on/off (off default).

## Acceptance criteria

- With no selection, the view occupies only its list width and renders no empty
  diff pane.
- Clicking a file expands to the two-pane layout and jumps to its first
  difference; clicking it again returns to list-only mode.
- Expansion receives acute priority and participates in PRD-019 auto-hide;
  contraction allows eligible views to restore.
- New/deleted files render with all-new / all-deleted marking.
- The four toolbar toggles behave and persist (session-level at least).
- The old diff view is untouched and still available.

## Out of scope / future

- Modifying the existing diff view (it stays as-is).
- Annotations/comments on the new view (later if wanted).
- Beyond-session persistence of toolbar toggles unless cheap.

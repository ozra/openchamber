---
id: PRD-017
title: Rich file-diff view
status: draft
created: 2026-09-02
related:
  - PRD-004
---

# PRD-017 — Rich file-diff view

## Goal

A new, separate file-diff view/module with a changed-files list on the left and
a side-by-side diff on the right. It is deliberately **not** a rework of the
existing diff UI — a lot of code can be lifted from it as a basis, but the two
stay distinct. The old diff view remains available; sometimes the terser
variant is preferred for certain sessions/edits.

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
- Clicking a file shows its side-by-side diff in the right pane.

### Side-by-side diff (right pane)

- Clicking a file always **jumps to the first difference** in the side-by-side
  view.
- New and deleted files show their content too, marked all-`new` /
  all-`deleted` respectively (a file with no counterpart renders as a single
  side marked accordingly).

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

- The two-pane layout renders the grouped file list and side-by-side diff.
- Clicking a file jumps to its first difference.
- New/deleted files render with all-new / all-deleted marking.
- The four toolbar toggles behave and persist (session-level at least).
- The old diff view is untouched and still available.

## Out of scope / future

- Modifying the existing diff view (it stays as-is).
- Annotations/comments on the new view (later if wanted).
- Beyond-session persistence of toolbar toggles unless cheap.
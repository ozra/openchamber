# custom-dev — Personal OpenChamber customization docs

This directory holds the personal requirement (PRD) and technical design documents
for customizations I am building on top of OpenChamber. It is **fork-owned** work:
these features are mainly for myself and live here so they are easy to reference,
track, and (where feasible) later turn into upstreamable modules.

> It is not upstream documentation. Upstream docs live in `docs/` and per-module
> `DOCUMENTATION.md`. Anything in here is a fork-local plan.

## How to use this directory

- `PRD-*.md` — one requirement document per feature. Numbered for easy
  reference, with the kind in the name when coordinating: `PRD-001-foo-bar.md`,
  `PRD-013-EPIC-keyboard-navigation-focus.md`. The files themselves are the live
  index — there is no PRD list in this README; find them by `glob custom-dev/*.md`.
- `done/` — PRDs that reached a terminal state (`done` / `closed`)
  move here when they reach that state, keeping the working set clean.
- `DOCUMENTATION.md` — the shared technical design: data model, projection
  algorithms, layout rules. PRDs describe *what*; this describes *how*.
- `README.md` — this file: the ways of working, not an index.

## PRD format and status

Every PRD starts with YAML frontmatter:

```yaml
---
id: PRD-013
title: Keyboard navigation and focus
kind: epic            # optional: coordinating doc for several related PRDs
status: draft
created: 2026-09-02
related:
  - PRD-007
---
```

Status lives in frontmatter only (not in the body). Lifecycle:

| Status | Meaning |
|---|---|
| `draft` | Idea captured; requirements may still be rough, direction is clear. |
| `discover` | Needs codebase research before requirements can be concrete (e.g. "functionality may already exist" — verify first). |
| `ready` | Researched, requirements concrete, approved for implementation. |
| `in-progress` | Being implemented. |
| `done` | Shipped; acceptance criteria met. |
| `closed` | Won't build / superseded / parked. Record the reason; use `superseded-by` when another PRD absorbed it. |
| `deferred` | Captured but deliberately not scheduled now (recorded so the requirement is not lost). |

Normal flow: `draft` → `discover` (when needed) → `ready` → `in-progress` →
`done`. `closed` and `deferred` are end/park states; superseded work points at
the PRD that replaced it. On reaching a terminal state, move the file into
`done/`.

## Epics

When several PRDs share one theme, mark the coordinating PRD `kind: epic` and
put `-EPIC-` in its filename after the id-number. The epic holds the cross-
cutting rules and a "Related PRDs" list; the individual PRDs carry their own
detail and a `related` back-reference. Before implementing a feature in an
epic's theme, read the epic so the change follows the shared pattern instead
of becoming a special case.

Find epics by scanning frontmatter (`grep -l "kind: epic" custom-dev/*.md`) —
there is no maintained list to go stale.

## Cross-cutting note on data reality

Several PRDs depend on timing and token data. The governing constraint
(`packages/ui/src/sync/DOCUMENTATION.md`) is that the protocol does **not** mark
where a turn begins, only where one ends. Any timing-derived value (e.g. tokens
per second) is therefore always approximate and must be labeled as such, never
presented as measured throughput. See `DOCUMENTATION.md` in this directory for
the full model.

## Cross-cutting note on pickers

PRD-013 sets the rule: a function opened from an icon, a shortcut, or the command
palette always opens the same picker. Picker-specific improvements are done on
the picker itself, so the behavior is identical regardless of entry point.

## Cross-cutting note on right-side views

PRD-016 defines the horizontal-stack model for right-side views: they toggle
(not switch), double-click isolates, space pressure collapses in a
deterministic order with chat as the last survivor. PRD-001 (trajectory rail),
PRD-002 (ledger), and any future right-side view must fit this model.

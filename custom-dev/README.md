# custom-dev — Personal OpenChamber customization docs

This directory holds the personal requirement (PRD) and technical design documents
for customizations I am building on top of OpenChamber. It is **fork-owned** work:
these features are mainly for myself and live here so they are easy to reference,
track, and (where feasible) later turn into upstreamable modules.

> It is not upstream documentation. Upstream docs live in `docs/` and per-module
> `DOCUMENTATION.md`. Anything in here is a fork-local plan.

## How to use this directory

- `PRD-*.md` — one requirement document per feature. Numbered for easy reference:
  `PRD-1-foo-bar.md`, `PRD-2-baz.md`, ...
- `DOCUMENTATION.md` — the shared technical design: data model, projection
  algorithms, layout rules. PRDs describe *what*; this describes *how*.
- `README.md` — this index.

## PRD format and status

Every PRD starts with YAML frontmatter:

```yaml
---
id: PRD-13
title: Keyboard navigation and focus
status: draft
created: 2026-09-02
related:
  - PRD-7
superseded-by: PRD-13   # only on closed PRDs
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
the PRD that replaced it.

## PRD index

| ID | Title | Status |
|---|---|---|
| PRD-1 | Trajectory timeline scrollbar | Draft |
| PRD-2 | Trajectory ledger view | Draft |
| PRD-3 | Chat user messages always shown in full | Done |
| PRD-4 | Diff view font size setting | Draft |
| PRD-5 | Statusbar consolidation | Deferred |
| PRD-6 | Agent modes: read / write / full | Draft |
| PRD-7 | Chat history scroll shortcut (Ctrl+Shift+PageUp/Down) | Closed — superseded by PRD-13 |
| PRD-8 | Working / activity indicator animation | Discover |
| PRD-9 | Reasoning visibility in chat | Discover |
| PRD-10 | Interface zoom shortcuts (Ctrl + / Ctrl - / Ctrl 0) | Draft |
| PRD-11 | Tool prefix tag colors | Draft |
| PRD-12 | Monozrakai theme | Draft |
| PRD-13 | Keyboard navigation and focus | Draft |

## Cross-cutting note on data reality

Several PRDs depend on timing and token data. The governing constraint
(`packages/ui/src/sync/DOCUMENTATION.md`) is that the protocol does **not** mark
where a turn begins, only where one ends. Any timing-derived value (e.g. tokens
per second) is therefore always approximate and must be labeled as such, never
presented as measured throughput. See `DOCUMENTATION.md` in this directory for
the full model.

## Cross-cutting note on pickers

PRD-13 sets the rule: a function opened from an icon, a shortcut, or the command
palette always opens the same picker. Picker-specific improvements are done on
the picker itself, so the behavior is identical regardless of entry point.
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

## Fork customization strategy

Prefer an **additive variant** when a fork feature changes an existing
component's purpose, interaction model, layout role, or visual identity:

1. Create a fork-owned component beside the upstream component, often starting
   from a direct copy when that preserves useful behavior most clearly.
2. Keep the original component available and independently reachable. During
   development, allow old and new variants to be compared side by side when the
   layout permits.
3. Keep authoritative data, transport, state, security checks, and domain logic
   shared. Copy presentation orchestration; do not fork the source of truth or
   start duplicate polling/fetch ownership.
4. Limit edits to existing/core code to generic integration points the variant
   genuinely needs: registration, shared layout, routing, stable contracts, and
   narrowly extracted helpers.
5. When upstream changes the original, compare it with the fork variant and
   deliberately port useful improvements. Do not make routine upstream merges
   resolve broad fork-specific edits inside the original component.

Modify the existing component directly when the requirement intentionally
changes that component for everyone, is a shared bug/invariant fix, or cannot be
implemented as a variant without duplicating authoritative behavior or changing
basic layout infrastructure anyway. Small settings, shortcuts, tokens, and
cross-cutting formatting usually belong on the shared path rather than in copied
components.

Before implementation, each substantial UI PRD records which path it takes:
additive variant or direct shared modification, why, what remains shared, and
the smallest required core integration. This is a decision rule, not a demand
to copy every component.

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

## Cross-cutting note on stackable workspace views

PRD-019 owns the horizontal workspace-stack model: reorderable icons determine
view position; views toggle rather than switch; minimum/normal/maximum widths
compress before auto-hide; base priority determines which view yields; active
focus grants temporary acute priority. Auto-hidden views remain enabled and
restore when room returns. Every stackable view must follow this model rather
than add local placement or collapse rules.

## Cross-cutting note on conversation decorations

PRD-022 owns temporary cross-view decoration state. Producers publish scoped,
source-owned layers to the Conversation Decoration Registry; TimelineRail,
Chat, the trajectory ledger, and future capable views consume only the channels
they support. Keep intrinsic message/tool styling outside the registry, and do
not replace retained layers with one-shot component events.

## Cross-cutting note on Question answers

When projecting completed Question tool output, follow PRD-023. Parsed answers
are user-originated presentation records with visible question-tool provenance.
Keep their owning message and part identity; do not create synthetic SDK user
messages.

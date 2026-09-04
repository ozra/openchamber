# custom-dev: Personal OpenChamber customization docs

This directory holds the personal requirement (PRD) and technical design documents
for customizations I am building on top of OpenChamber. It is **fork-owned** work:
these features are mainly for myself and live here so they are easy to reference,
track, and (where feasible) later turn into upstreamable modules.

> It is not upstream documentation. Upstream docs live in `docs/` and per-module
> `DOCUMENTATION.md`. Anything in here is a fork-local plan.

## How to use this directory

- `PRD-*.md`: one requirement document per feature. Numbered for easy
  reference, with the kind in the name when coordinating: `PRD-001-foo-bar.md`,
  `PRD-013-EPIC-keyboard-navigation-focus.md`. The files themselves are the live
  index. There is no PRD list in this README; use a targeted glob or search to
  locate a requested PRD.
- `PRD-inbox.md`: the raw-idea inbox. The maintainer drops rough, unformatted
  wishes here; converting them into formal PRD files is a dedicated workflow
  (see "PRD inbox" below), not something done inside the inbox itself.
- `done/`: PRDs that reached a terminal state (`done` / `closed`)
  move here when they reach that state, keeping the working set clean.
- `DOCUMENTATION.md`: the shared technical design for data models, projection
  algorithms, layout rules. PRDs describe *what*; this describes *how*.
- `README.md`: this file. It defines the ways of working, not the PRD index.

Load PRD context on demand. Start with the PRDs named in the request and follow
every PRD reference recursively, whether it appears in frontmatter or the body.
If no PRD is named, search filenames and frontmatter for likely matches. Read
only those candidates and their reference chains. A file listing is a discovery
tool, not a reading list. Never read the full backlog without a specific reason.

When listing or mentioning a PRD to the user, include its full filename or title
alongside the PRD number. For example, use
`PRD-020-quota-usage-pace-indicator.md` or "PRD-020 - Quota usage pace against
reset windows", rather than `PRD-020` alone. The number is useful for reference,
but the filename or title tells the user which PRD it is.

## PRD inbox

`PRD-inbox.md` is the maintainer's scratch pad for raw feature ideas. It is
deliberately unstructured: ideas get added as they come, possibly as fragments,
in whatever language, without frontmatter or formatting.

When the maintainer says something like "handle prd inbox" (or "process the
inbox", "turn the inbox into PRDs"), perform this workflow:

1. Read every entry in `PRD-inbox.md`.
2. Group entries that are clearly one feature into a single PRD; split entries
   that are clearly several features. When grouping or splitting is ambiguous,
   ask before deciding.
3. For each resulting feature, create a new `PRD-*.md` in this directory with
   proper frontmatter (`status: draft`, next free PRD number). The inbox entry
   is the seed — expand it into a real requirement document: goal, background
   on current state, requirements, acceptance criteria, out of scope. Verify
   current state in the codebase so the background is accurate, and ask the
   maintainer about anything unclear before finalizing requirements.
4. Link related PRDs (frontmatter `related:` lists and epic "Related PRDs"
   tables) when the new PRD touches an existing epic or requirement's scope.
5. Move each processed entry under a "→ PRD-0xx" pointer in the inbox as it is
   converted, so the inbox stays as a history of what was captured. Leave the
   unwritten remainder as the active backlog.
6. Report the created PRDs (full filename with title) and any open questions.

The inbox is for capture only: do not implement directly from inbox entries,
and do not let an entry linger there once it has a PRD.

## PRD format and status

Every PRD starts with YAML frontmatter:

```yaml
---
id: PRD-013
title: Keyboard navigation and focus
kind: epic            # optional: coordinating doc for several related PRDs
status: draft
created: 2026-09-02
depends_on: []
deliver_with: []          # optional: PRDs implemented and validated together
complexity: medium        # trivial | small | medium | large | epic
estimated_effort: 2-4 dev-days
related:
  - PRD-007
---
```

Status lives in frontmatter only (not in the body). Lifecycle:

| Status | Meaning |
|---|---|
| `draft` | Idea captured; requirements may still be rough, direction is clear. |
| `discover` | Needs codebase research before requirements can be concrete. For example, verify whether the functionality already exists. |
| `ready` | Researched, requirements concrete, and approved. Start when every `depends_on` PRD is done. |
| `in-progress` | Being implemented. |
| `done` | Implemented, validated, tested by the user, and explicitly accepted by the user. |
| `closed` | Won't build, superseded, or parked. Only the user may choose this status. Record the reason and use `superseded-by` when another PRD absorbed it. |
| `deferred` | Captured but deliberately not scheduled now (recorded so the requirement is not lost). |

Normal flow: `draft` → `discover` (when needed) → `ready` → `in-progress` →
`done`. A `deferred` PRD stays in the main directory until work resumes or the
user closes it. Move only `done` and `closed` PRDs into `done/`. Superseded work
points to the PRD that replaced it.

Never mark a PRD `done` based on implementation or automated checks alone. The
user must test the behavior and explicitly accept it first. Never mark a PRD
`closed` unless the user does so or directly instructs you to do so.

Commit messages for PRD implementation work include the PRD number for every
PRD implemented in that commit. For example, a commit implementing both
PRD-011 and PRD-012 includes both numbers.

Planning metadata is required before a PRD becomes `ready`:

- `depends_on` lists hard blockers only. Use an explicit empty list when the
  dependency check is complete and the PRD can start independently.
- `deliver_with` is optional. It groups PRDs that should be implemented and
  validated in one batch without inventing a circular dependency.
- `complexity` records implementation difficulty, not product value. Use one of
  `trivial`, `small`, `medium`, `large`, or `epic`.
- `estimated_effort` is an engineering estimate that includes implementation
  and automated validation. Record visual or user-feedback iteration separately
  in the PRD when it cannot be estimated in dev-days.
- `related` remains informational. A related PRD neither blocks nor joins the
  delivery unless frontmatter says so explicitly.

## Epics

When several PRDs share one theme, mark the coordinating PRD `kind: epic` and
put `-EPIC-` in its filename after the id-number. The epic holds the cross-
cutting rules and a "Related PRDs" list; the individual PRDs carry their own
detail and a `related` back-reference. Epics are descriptive, not a separate
discovery step. A related PRD must reference its epic so the normal recursive
lookup reaches it. Never scan the backlog just to look for epics.

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

## Cross-cutting note on localization

English is the only supported language for this fork. Give every new or changed
i18n key proper English text. Keep the key present in every other locale file but use the exact value `TRANSLATE ME` instead of spending
time on unsupported translations. Proper translations can be done as a separate
effort later.

## Adding persisted settings

A shared setting must survive the full round trip. Add its client type, store
default and setter, hydration/apply logic, and write path. Then add it to the
server allowlist in `packages/web/server/lib/opencode/settings-helpers.js`; that
allowlist controls both writes to `settings.json` and fields returned by the
settings API. Add a focused sanitizer/response test in
`settings-helpers.test.js`. Without the server entry, the UI appears to save the
setting but resets it to the client default after a restart.

## Validation and user acceptance

Run the tightest automated validation that directly exercises the change. Start
with focused tests and checks for the files or package changed. Run broader
checks only when the change crosses package contracts, changes root tooling or
generated assets, or focused validation cannot establish correctness. A broad
command is not justified only because repository guidance mentions it. Checks
whose documented trigger matches the change remain part of the minimum set.

For runnable behavior changes, use this order:

1. Run enough focused validation to be confident the change is ready to try.
2. Ask the user to perform user acceptance testing and provide concrete steps.
3. After user acceptance testing passes, list any additional recommended checks
   as numbered choices. Include each exact command and what it would verify,
   plus a choice to skip them. Ask which choices to run instead of running every
   optional check automatically.
4. Run the selected checks. Mark the PRD `done` only after the user explicitly
   accepts the result and every selected check passes.

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

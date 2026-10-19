# custom-dev: fork engineering guidance for OpenChamber customizations

Personal customizations built on top of OpenChamber are **fork-owned** work. They are tracked
as makedone tickets in `../_makedone/` (key **OCH**). Read `../_makedone/MAKEDONE.md` (ways of
working) before ticket work. Ideas become `refine` tickets (`mdo new "..."`); no implementation
while a ticket is in `refine`.

> Migrated 2026-10-01: the former `PRD-NNN` files became `OCH-NNN` (same numbers; old ids are
> aliases, so `mdo show PRD-031` still works). The PRD files themselves were removed (git history
> has them).

This directory keeps the cross-cutting engineering guidance below, plus:

- `DOCUMENTATION.md`: the shared technical design (data models, projection algorithms, layout
  rules). Tickets describe *what*; this describes *how*.
- `FORK-DIFFERENCES.md`: what this fork changes compared with upstream.

It is not upstream documentation. Upstream docs live in `docs/` and per-module
`DOCUMENTATION.md`.

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

Before implementation, each substantial UI ticket records which path it takes:
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
4. Run the selected checks. Mark the ticket `done` only after the user explicitly
   accepts the result and every selected check passes.

## Cross-cutting note on data reality

Several tickets depend on timing and token data. The governing constraint
(`packages/ui/src/sync/DOCUMENTATION.md`) is that the protocol does **not** mark
where a turn begins, only where one ends. Any timing-derived value (e.g. tokens
per second) is therefore always approximate and must be labeled as such, never
presented as measured throughput. See `DOCUMENTATION.md` in this directory for
the full model.

## Cross-cutting note on pickers

OCH-013 sets the rule: a function opened from an icon, a shortcut, or the command
palette always opens the same picker. Picker-specific improvements are done on
the picker itself, so the behavior is identical regardless of entry point.

## Cross-cutting note on stackable workspace views

OCH-019 owns the horizontal workspace-stack model: reorderable icons determine
view position; views toggle rather than switch; minimum/normal/maximum widths
compress before auto-hide; base priority determines which view yields; active
focus grants temporary acute priority. Auto-hidden views remain enabled and
restore when room returns. Every stackable view must follow this model rather
than add local placement or collapse rules.

## Cross-cutting note on conversation decorations

OCH-022 owns temporary cross-view decoration state. Producers publish scoped,
source-owned layers to the Conversation Decoration Registry; TimelineRail,
Chat, the trajectory ledger, and future capable views consume only the channels
they support. Keep intrinsic message/tool styling outside the registry, and do
not replace retained layers with one-shot component events.

## Cross-cutting note on Question answers

When projecting completed Question tool output, follow OCH-023. Parsed answers
are user-originated presentation records with visible question-tool provenance.
Keep their owning message and part identity; do not create synthetic SDK user
messages.

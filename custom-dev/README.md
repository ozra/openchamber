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

English is the only supported language for this fork. Add new or changed i18n keys
to the English dictionary only — `packages/ui/src/lib/i18n/messages/en.ts`, or its
settings sub-dictionary `en.settings.ts` for anything under `settings.*` (en.ts
spreads it) — and leave the other locale files alone. Every locale dictionary
spreads the English dictionary first (`...enDict`, OCH-039) and `formatMessage`
falls back to English for any key a locale lacks, so an untranslated string reads
as English rather than as a placeholder.

Do not write `TRANSLATE ME` values: the UI still has a language switcher, so a
visitor who picks another language would read the placeholder verbatim, and
touching 14 upstream locale files per ticket is merge-conflict surface for nothing.

`messages.test.ts` keeps enforcing key parity with English. Adding a key to `en.ts`
alone satisfies it. What fails it is a *stale* key: when you rename or remove a key
from `en.ts`, delete it from the locale (or `*.settings.ts`) files too.

Where this conflicts with `.agents/skills/locale-ui-patterns` ("every key you add to
a non-English dictionary MUST contain a real translation"), that is upstream's rule
for upstream contributions and it still holds there — a real translation simply
overrides the spread. For fork work, this README governs: English only, `en.ts` only.

## Adding persisted settings

(Updated for the OpenCode 2.x settings registry; the old "server allowlist in
`settings-helpers.js`" no longer exists.) One table owns every setting:
`SETTINGS_REGISTRY` in `packages/ui/src/lib/settings/registry.ts`. A key that is
not in the registry does not persist at all. The authoritative procedure is
"Adding a setting" in `packages/ui/src/lib/settings/DOCUMENTATION.md`:

1. Add one registry entry: `scope` (`instance` | `profile` | `device`), a parser
   from `parsers.ts`, and a `ui` binding (read/write into the owning store, using
   an existing setter so side effects run). Sidebar display toggles are usually
   `scope: 'profile'` with `perSurface: true`, like `sidebarViewMode`, so a choice
   on one surface kind (web/desktop/vscode/mobile) does not flip the others.
   Defaults live in the store's initial state, not in the registry.
2. Run `bun run settings-registry:generate` and commit both generated snapshots:
   `packages/web/server/lib/opencode/settings-registry.json` (the server's
   persistable-key list) and `packages/vscode/src/settings-registry.json` (the
   extension-host bridge).
3. Only when the server must validate beyond the registry gate, add a branch to
   `sanitizeSettingsUpdate` in `packages/web/server/lib/opencode/settings-helpers.js`
   and a sample value in the drift test `settings-helpers.test.js`.
4. Add the Settings control and search entry per the `settings-ui-patterns` skill.

The client type, sanitizer, mirror, apply step and auto-save all derive from the
registry entry; there is no second list to update.

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

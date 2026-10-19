---
makedone: 3
key: OCH
project_id: "3ae7fee99a78"
name: "openchamber fork — custom-dev features"
kinds: [overview, feature]
---
# OCH — openchamber fork — custom-dev features

With `mdo` installed: run `mdo --spec` and `mdo --help` once per session and use `mdo`; do not read `SPEC.md` or `templates/`. Without it: read `SPEC.md` and copy from `templates/`.

Requirement tickets for the maintainer's personal OpenChamber customizations (fork-owned work).
Migrated from `custom-dev/PRD-NNN` on 2026-10-01: same numbers, old ids kept as aliases.
Engineering guidance (customization strategy, i18n, persisted settings, validation, cross-cutting
notes): `../custom-dev/README.md`; shared technical design: `../custom-dev/DOCUMENTATION.md`.

## Ways of working

- No implementation work while a ticket is in `refine`: refine it first (goal, requirements, acceptance criteria, open questions answered) and move it to `ready`.
- Load ticket context on demand: start with the tickets named in the request and follow every
  ticket reference recursively (frontmatter and body). If none is named, search filenames and
  frontmatter for likely matches. A file listing is a discovery tool, not a reading list; never
  read the whole backlog without a specific reason.
- When mentioning a ticket to the user, include its title or filename with the id
  (e.g. "OCH-020 - Quota usage pace against reset windows"), not the id alone.
- `done` only after focused validation, user acceptance testing and the user's explicit
  acceptance (see "Validation and user acceptance" in `../custom-dev/README.md`). `dropped` only
  by the user or on their direct instruction; set `superseded_by` when another ticket absorbed it.
- Planning metadata is required before `ready`: `depends_on` (hard blockers; explicit `[]` when
  checked), optional `deliver_with` (implemented and validated together), `complexity`
  (trivial | small | medium | large | epic) and `estimated_effort` (dev-days incl. automated
  validation). `related` is informational only.
- Commit messages for ticket work include every implemented ticket id (e.g. OCH-011, OCH-012).
- Do not run git/GitHub commands unless the user asks (repo AGENTS.md).

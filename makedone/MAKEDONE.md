---
makedone: 1
key: OCH
name: "openchamber fork — custom-dev features"
---
# OCH — openchamber fork — custom-dev features

Requirement tickets for the maintainer's personal OpenChamber customizations (fork-owned work).
Migrated from `custom-dev/PRD-NNN` on 2026-10-01: same numbers, old ids kept as aliases.
Engineering guidance (customization strategy, i18n, persisted settings, validation, cross-cutting
notes): `../custom-dev/README.md`; shared technical design: `../custom-dev/DOCUMENTATION.md`.

## Project rules

- Load ticket context on demand: start with the tickets named in the request and follow every
  ticket reference recursively (frontmatter and body). If none is named, search filenames and
  frontmatter for likely matches. A file listing is a discovery tool, not a reading list; never
  read the whole backlog without a specific reason.
- When mentioning a ticket to the user, include its title or filename with the id
  (e.g. "OCH-020 - Quota usage pace against reset windows"), not the id alone.
- `done` only after focused validation, user acceptance testing and the user's explicit
  acceptance (see "Validation and user acceptance" in `../custom-dev/README.md`). `closed` only
  by the user or on their direct instruction; set `superseded_by` when another ticket absorbed it.
- Planning metadata is required before `ready`: `depends_on` (hard blockers; explicit `[]` when
  checked), optional `deliver_with` (implemented and validated together), `complexity`
  (trivial | small | medium | large | epic) and `estimated_effort` (dev-days incl. automated
  validation). `related` is informational only.
- Epics hold cross-cutting rules and a related-tickets list; each related ticket references its
  epic so recursive lookup reaches it.
- "Handle the inbox": group/split `inbox.md` entries into tickets (`mdo new`, status draft),
  expanded into goal, background (verified in the codebase), requirements, acceptance criteria and
  out of scope; ask about anything unclear. Mark each processed entry "→ OCH-0xx". Never
  implement straight from the inbox.
- Commit messages for ticket work include every implemented ticket id (e.g. OCH-011, OCH-012).
- Do not run git/GitHub commands unless the user asks (repo AGENTS.md).

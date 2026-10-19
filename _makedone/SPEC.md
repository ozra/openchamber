<!-- makedone-spec version=3 sha256=29f3890203585a5a687f37fffdf8f36b8e275e32f0b84c04a50ccbb9a8828fb9 -->
# makedone format — version 3

A makedone project is a directory of Markdown files. Everything can be read and
edited with a text editor; tools are optional helpers. A ticket's identity is the
project key plus its number, never its path.

## Layout

<project>/_makedone/ contains only:
- MAKEDONE.md          project file: identity, kinds, ways of working
- SPEC.md              copy of this format description
- templates/<kind>.md  starting ticket per kind: copy, rename and fill in
- KEY-NNN-slug.md      open tickets
- KEY-NNN-slug.md.d/   optional attachments of that ticket (any files)
- done/                finished tickets (done, dropped) with their .md.d/

## Project file (MAKEDONE.md)

YAML frontmatter:
- makedone: format version, an integer (this is 3). Bumped only on a breaking change.
- key: project key, [A-Z][A-Z0-9]{1,5}, unique among projects.
- project_id: 12 lowercase hex characters, equal in every checkout of the project.
- name: display name.
- kinds: list of ticket kinds used here; each has templates/<kind>.md.
- number_width: optional integer 3..9 (default 3), zero padding of ticket numbers.
The body describes the project and how it is worked on; the project owns it.

## Tickets

Filename: KEY-NNN-slug.md, regex ^([A-Z][A-Z0-9]{1,5})-([0-9]{3,})-(.+)\.md$
- The id is KEY-number. Numbers compare numerically (KEY-1 = KEY-001); padding to
  number_width only sorts files, larger numbers have more digits.
- A new ticket takes the highest number used by its key + 1, counting open tickets,
  done/ and aliases.
- The title is the first "# " heading; the slug is the title as lowercase ASCII
  words joined by hyphens.

## Frontmatter

Every field is optional: a file holding only a title is a ticket in status refine.
Values are written without quotes wherever YAML reads them back unchanged.

---
status: refine
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
related: []
created: 2026-10-14 21:17
---

- status: refine, ready, in-progress, review, done or dropped (see Statuses).
- kind: one of the project's kinds; another value is a warning, not an error.
- priority: high, normal or low.
- assignee: free text; empty means unassigned.
- blocker: one line; non-empty means blocked.
- parent: id of a ticket in the same project, at any depth. A ticket with
  children is a parent.
- depends_on: ids that must be done before this ticket is unblocked.
- related: informational ids, also of other projects.
- created, ended: YYYY-MM-DD HH:mm in UTC; a date alone is accepted. created is
  set when the ticket is made, ended when it becomes done or dropped.
- aliases: former ids of this ticket (renumbered or rekeyed).
- supersedes: the former id of a ticket moved in from another project.
- superseded_by: on a dropped ticket, the id of the ticket that replaced it.
Other fields are allowed and kept as written. id, title and updated are derived
from the file and never stored.

## Statuses

refine, ready, in-progress and review are open; done and dropped are finished.
- Status records progress only: urgency is priority, blockedness is blocker and
  depends_on.
- Open tickets live in _makedone/, finished ones in done/ with ended set.
  Changing the status moves the file and its .md.d/ in either direction.
- Blocked: a non-empty blocker or an unsatisfied depends_on entry. An entry is
  satisfied by a done ticket, or by a dropped ticket whose superseded_by chain
  ends in a done ticket.

## Identity changes

- Renumbering a ticket or changing the project key keeps the old id in aliases.
- Moving a ticket to another project gives it a new id with supersedes: <old id>
  and leaves a dropped stub under the old filename in the old project's done/,
  with superseded_by: <new id> and a link to the new file.
- parent, depends_on, related and superseded_by follow identity changes.
- An id or alias held by two different tickets is ambiguous; resolve it by hand.

## Several checkouts

One project may exist in several places (git worktrees, clones, synced copies);
they share key and project_id. The same id in two checkouts is one ticket with
copies, not a duplicate. Diverged copies are reconciled with the version control
or sync tool, never by overwriting one copy with another.

## Body and comments

Free Markdown after the frontmatter, starting with the "# Title" line. The
sections of templates/<kind>.md are suggestions. Large material belongs in the
ticket's .md.d/ directory.
The last section is "## Comments". Entries are appended and never edited:

### 2026-10-14 21:17 · author

Text of the comment.

Each entry heading carries the UTC time (YYYY-MM-DD HH:mm) and a free-text author.
Because comments only grow at the end, concurrent edits merge.

## Conflicts

A file containing conflict markers (<<<<<<<, =======, >>>>>>>) or having a
sync-conflict sibling is merged by hand before any tool changes it.

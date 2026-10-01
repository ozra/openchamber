<!-- makedone-spec version=1 sha256=dd58c04da9481e4f5c6788bdd915132a70f37d2e1f66d61b8c850d0fd9f262bd -->
# makedone SPEC — v1

## Files first

A ticket is freely editable Markdown. Tools are optional helpers and must preserve
unknown metadata, author prose, existing comments and unrelated bytes. Identity is
the project key and ticket number, not the project's path.

## Layout and discovery

<project>/makedone/ contains:
- MAKEDONE.md: human-owned marker, project description and ## Project rules.
- SPEC.md: generated version/hash-stamped copy of this canonical workflow.
- inbox.md: unstructured raw capture.
- KEY-031-some-slug.md or KEY-EPIC-013-some-slug.md: tickets.
- KEY-031-some-slug/: optional sibling directory for attachments, logs and outputs.
- done/: finished tickets (status done or closed).

The marker has YAML frontmatter: makedone: <format version> (currently 1), key: KEY,
optional name and optional number_width (integer 3..9, default 3). Tools refuse format versions they do not know; a breaking format
change bumps the version. Keys match [A-Z][A-Z0-9]{1,5} and must be unique across
discovered projects. Only MAKEDONE.md is a marker; an ordinary README.md may coexist.
A directory name alone is not a marker.
Discovery scans configured roots only, with depth/entry bounds and pruning of .git,
node_modules, .stversions, _archive and /opt/staging; never scan /.

## Filename = identity

Format: <KEY>[-EPIC]-<NNN>-<slug>.md.
Regex: ^([A-Z][A-Z0-9]{1,5})(-EPIC)?-([0-9]{3,})-(.+)\.md$
The id is KEY + number, compared numerically (KEY-1 = KEY-001 = KEY-0001); EPIC is
not part of it. Numbers are unique per key across ordinary tickets, epics, done/ and
aliases. New number = highest used number + 1. Numbers are zero-padded to the
project's number_width (marker frontmatter, default 3) only for file sorting; larger
numbers simply have more digits. mdo repad KEY WIDTH changes the width. Slugs are lowercase ASCII hyphenated titles.
Title is the first # H1. Cross-project references use full ids such as FLEET-006.

## Frontmatter (all optional)

A file containing only an H1 is valid. Tools prefill defaults; humans may omit them.

---
status: draft
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
related: []
created: 2026-10-01 14:35
ended:
---

status: draft, discover, ready, in-progress, review, done, closed, deferred.
kind: feature, epic, bug, research, study, maint, chore (template suggestion only).
priority: high, normal, low. assignee: person or agent role; empty is unassigned.
parent: epic id. depends_on: hard prerequisite ids. related: informational ids.
blocker: one line, non-empty means blocked regardless of status.
created and ended use YYYY-MM-DD HH:mm in UTC (no timezone suffix).
created is stamped at creation; ended is stamped when the ticket finishes (done or
closed) and moves to done/. Date-only timestamps remain valid. Missing created uses
file ctime as a flagged estimate; missing ended in done/ uses mtime as a flagged
estimate. These estimates are unreliable after checkout, copying or sync and are
never silent facts. Only created and ended are stored event timestamps. id, title
and updated are derived, not stored. Unknown fields and extension fields are allowed
and preserved, including aliases, tags, deliver_with, complexity and estimate.
superseded_by: id of the successor; only valid with status closed.
supersedes: the old id, set on a ticket that took over a moved identity.
aliases contains old full ids; ambiguous ids/aliases fail closed.

## Statuses, blockers and assignment

draft → discover → ready → in-progress → review → done; deferred and closed are
additional states. Status describes progress, not blockedness.
- Blocked = non-empty blocker or an unsatisfied depends_on prerequisite.
- A prerequisite is satisfied by an unambiguous valid ticket with status done, or
  by a closed ticket whose superseded_by successor (chain) is done.
- Clear blocker to unblock; explain the change in a comment.
- ready plus agent-* assignee and no blockers is the agents' queue.
- Assign oscar with a question when an owner decision is needed.
- review means delivered and awaiting acceptance. Never set done without explicit
  user acceptance; closed is likewise a user decision (set superseded_by if absorbed).
- done and closed belong in done/ and carry the ended UTC timestamp.

## Identity changes

Refactors keep the old id as an alias: mv (renumber within a project), rekey (new
project key) and imports. Only migrate (moving a ticket to another project) leaves a
stub: the moved ticket gets supersedes: <old id>, and a file with the old filename
is created in the old project's done/ with status closed, superseded_by: <new id>
and a link to the new file. The tool sets this closed status itself; the user's
migrate command is the decision. All identity changes rewrite known metadata
references. mv (renumbering) is meant for repairing duplicate numbers (e.g. concurrent
creation on two synced machines), not for reordering.

## Body and comments

Free Markdown. Suggested templates, never enforced:
- feature: Goal, Background, Requirements, Acceptance criteria (- [ ]), Out of scope.
- research/study: Question, Method, Sources, Findings, Confidence.
- bug: Repro, Expected, Actual, Evidence.
- maint: Host, Evidence, Proposed fix, Risk.
- epic: plan text; children point back with parent.
Large supporting material belongs in the optional sibling directory.
The last section is ## Comments, with append-only entries headed
### YYYY-MM-DD HH:mm · <author> (UTC, person or agent role).
Record status changes, claims, moves, decisions and findings as dated comments.
Never rewrite earlier comments or another author's prose. Edit only the intended
frontmatter fields; preserve unknown fields, spelling and existing line endings.

## Working rules for agents

Read this SPEC and the Project rules in MAKEDONE.md before work.
Capture anything the user says should be done as a ticket immediately, or a line
in inbox.md for an idea; do not wait for explicit assignment.
Unplanned work completed in a session at the user's request is recorded with mdo log:
a ticket created directly in done/ with status done (the request is the acceptance).
There is no separate DONE.md log. Number 000 (KEY-000) is reserved for a project's
pre-makedone history (the former DONE.md, verbatim); new numbers start at 1.
Change plans become epic tickets; state/reference docs remain docs. Supporting
analyses go in ticket sibling directories. Root AGENTS.md may point to this SPEC
and the marker's Project rules; insertion is explicit and append-only.

## Checks, recovery and safety

Report invalid YAML, conflict markers/siblings, duplicate keys/ids/aliases, key or
naming mismatches, dangling references, dependency cycles, invalid fields,
missing timestamps and status/location mismatches. Repairs are proposals for
review, never automatic prose rewrites. Report outdated or modified SPEC copies
by version and SHA-256 hash; legacy hand-written copies are stale.
References to projects on other hosts are reported as unverified unless the tool
can reach that host.
Refresh SPEC only on explicit request with a durable byte-identical backup.
Preserve marker prose and Project rules. Never overwrite an existing destination.
New init requires a chosen explicit key; a derived suggestion is not consent.
No automatic fleet migration. Refuse symlink write paths and ambiguous identities.
Existing-file writes need durable preimages outside all ticket roots, local locks,
optimistic identity/timestamp/byte checks and flushed atomic publication.
Local locks cannot prevent distributed/synced races. Multi-file operations are not
distributed transactions; distinguish post-commit durability uncertainty from
pre-commit failure. Keep backups indefinitely. No ticket deletion commands.

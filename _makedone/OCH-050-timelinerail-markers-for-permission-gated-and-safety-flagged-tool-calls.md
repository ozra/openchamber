---
status: refine
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
related: [OCH-001, OCH-041, OCH-022]
created: 2026-10-22 12:54
---
# TimelineRail markers for permission-gated and safety-flagged tool calls

## Goal

Rail spans for tool calls that went through a permission decision carry an
extra marker, so risky bash/remote_bash and other gated calls stand out and can
be filtered like other span kinds.

## Background

Requested by the maintainer on 2026-10-22. The permission facts today:

- Session modes `ask` / `safety` / `auto` are owned by
  `packages/web/server/lib/permission-auto-accept`. In `safety`, the Jev safety
  net (`evaluatePermission`, routing runtime) accepts only on a verdict; a held
  or failed request broadcasts `openchamber:permission-auto-accept.left-for-user`,
  and routing broadcasts `openchamber:routing.permission-held`.
- Each request's outcome (`replied`, `held`, `ignored`, `failed`) is kept only
  for a bounded while, in server memory, for notification dedup. Nothing lands
  on the tool part or in message storage.
- So no, flagged calls are not currently marked with metadata a client could
  filter on. OpenCode answers a permission per call (`permission.replied`), and
  whether its records persist and carry the tool-call reference is an open
  question for the data source below.
- The rail's span model: `projectRailSpans.ts` derives spans from list rows,
  span id = part id. Failed tool calls already have a marker pattern to follow:
  a dot in `--status-error` beside the span, tool colour kept.
- OCH-041, TimelineRail context menu and filtering, owns which span kinds stand
  out; a permission marker should become one of its filter classes rather than
  a second emphasis system. OCH-022 keeps intrinsic message/tool styling outside
  the decoration registry, and a permission outcome is intrinsic to the call, so
  this belongs in the span projection.

The maintainer has not exercised Jev yet. Classification providers settings
(Settings → Providers → Classification providers) make the safety net usable
without a key while the zen promotion runs, so the held/accepted paths are
reachable for testing.

## Requirements

- Marker on a tool span whenever a permission decision touched that call.
  Minimum vocabulary, to be settled in refine: asked-and-allowed,
  asked-and-rejected/denied, safety-net-accepted, safety-net-held.
- Covers any permission-gated tool (bash, remote_bash, edit, ...), not a
  hardcoded tool list; a `deny` outcome (call blocked) should stay distinguishable
  from an allowed one.
- The marker communicates beyond colour alone, consistent with the failed-call
  dot, and does not move spans or shift the rail geometry.
- Filterable through the OCH-041 dialog: chosen kinds stand out, others dim,
  using the same span-identity rules.
- Decide the durable data source before UI work, since live events alone vanish
  on reload:
  - OpenCode persists the permission record with a usable link to the tool part
    (check the 2.x data model first; cheapest if true);
  - the OpenChamber server records `permission.replied` / held outcomes per
    session alongside existing state and the projection joins them in;
  - markers for the live session only, explicitly labelled as non-retained.
- Markers for old sessions can only appear if the data source is persistent; the
  ticket should state what happens for transcripts predating the feature
  (expected: no marker, no guess).

## Open questions

- Does OpenCode 2.x keep answered permission records, and do they carry the
  message/part id of the gated call? That single answer picks the data source.
- Does an `auto` session (no request fired at all) stay unmarked, or should Jev
  optionally score tool calls even there? Scoring in `auto` is new behaviour and
  a product decision, probably its own ticket.
- One marker per decision category, or an intensity scale from Jev confidence?
- Hover/keyboard exposure: marker in the rail hover card and accessible name?
- Interaction with the trajectory ledger and conversation map: do markers
  project there too (OCH-002)?

## Acceptance criteria
- [ ] A gated-and-allowed call, a rejected call, a safety-net accept and a
      safety-net hold each get their distinct marker, verified against a real
      `safety` session with a working classification provider.
- [ ] Markers survive reload and session switch under the chosen data source,
      or are explicitly absent when the source is live-only.
- [ ] The OCH-041 filter (or an interim affordance if OCH-041 is unimplemented)
      can isolate flagged spans without moving other spans.
- [ ] Non-visual users can perceive the marker state through the same channel
      as the failed-call dot.

## Out of scope

- Jev risk scoring of calls that never triggered a permission request.
- Permission mode controls or PolicyRow changes (composer shield, session
  policy).
- Chat-side (transcript) marker styling beyond what the rail needs.

## Comments

### 2026-10-22 12:54 · agent

Created from the maintainer's report, answering their embedded question: no,
permission outcomes are not persisted onto tool parts today; the server keeps
them briefly in memory and broadcasts live events
(`permission-auto-accept/DOCUMENTATION.md`, `routing/DOCUMENTATION.md`). The
data-source decision above is therefore the first refine task.

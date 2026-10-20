---
status: refine
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
related: [OCH-013, OCH-014]
created: 2026-10-20 12:58
---
# Drag a session row onto another project to move it there with its children

## Goal
Drag a session in the sidebar onto a different project and have that session — and
its whole subtree (child/subagent sessions) — moved to the target project's
directory in one operation.

## Background
Sessions can already be relocated across directories:

- `moveSessionToDirectory` (`packages/ui/src/sync/session-actions.ts:328`) moves
  one session through the OpenCode 2.x `session.move` SDK call and relocates its
  messages/status/permissions/forms between the directory-scoped stores.
- `moveSessionTreeToProject` (`packages/ui/src/lib/worktrees/sessionWorktreeMove.ts:315`)
  already moves a root session **plus its descendants** to a project directory:
  it collects the tree (`collectSessionMoveDescendants`), requires every session
  to be idle (`assertSessionsIdle`), moves child-first with the root last,
  re-checks idleness before each move, and rolls back partial moves on failure.
  This is what the header's "Move to project…" (chat → project) action uses.

What is missing is the drag interaction in the sidebar; the move machinery exists.

## Requirements
- Session rows become draggable; drop targets are the **project header row** and
  **any session row inside another project** — both resolve to that session's
  project directory. Clear drop-target highlighting on the accepted target.
  Follow existing sidebar drag conventions (dnd-kit, `sortableItems` precedent);
  existing reorder-drag inside a project must keep working.
- Dropping executes the existing tree-move transaction (`moveSessionTreeToProject`
  / `moveSessionTreeTransaction`), children included; do not fork a second move
  implementation. Parent/child relationships stay intact after the move.
- Running sessions: **not moved** — same rule as the existing move flows, which
  refuse while any session in the tree is active or its live status is unknown.
  The drag stays safe by reusing `assertSessionsIdle`; dropping a busy tree shows
  why (toast) instead of silently doing nothing. *If* moving a running session is
  ever wanted, that is a separate question about upstream `session.move`
  semantics mid-turn (the `delivery` parameter only covers queued prompts), not
  something this ticket may improvise.
- Moving an already-moved tree onto its current project is a no-op (the
  transaction already rejects same-directory with "Source and destination are the
  same"; show that as feedback, not an error toast).
- Dropping a child-session row moves its whole tree (or resolves to the root and
  moves the root's tree — pick one at refinement; the user's model is "drag a
  session, it and its children move").
- VS Code: **behaves the same**, no special case. VS Code mounts the shared
  `SessionSidebar`, and its projects come from workspace folders
  (`useProjectsStore.syncVSCodeWorkspaceFolders`), so a multi-root workspace shows
  several project groups and a move between them is a normal move; a single-folder
  workspace simply has one project, where every drop is the same-directory no-op.
  Chats being absent in VS Code does not matter: the user moves sessions between
  projects and directories, and this flow is not chat-specific.
- Open question for refinement (raised by the above): the session menu's
  `!isVSCode` gates stay as they are, so in VS Code a project session would have
  drag as its only cross-project move. Either accept that, or also offer
  "Move to project…" there for non-chat sessions — a separate decision from this
  ticket, since it changes an existing menu for everyone on that surface.

## Acceptance criteria
- [ ] Dragging a session row onto another project's header or onto a session in
      another project moves the tree there; it appears under the target project after the drop.
- [ ] All child sessions move with the parent and stay parented to it.
- [ ] The moved session stays open and functional (history complete, chat follows the move).
- [ ] A running session (or one with unknown live status) is not moved; feedback says why.
- [ ] Drop feedback is visible during the drag; invalid targets accept nothing and the session is unchanged.
- [ ] Existing sidebar drag-reorder behavior inside a project is unaffected.
- [ ] VS Code shows the same drag behavior as web/desktop (same sidebar component, projects from workspace folders).

## Out of scope
- Moving sessions between OpenChamber servers/runtimes.
- Batch-selecting several sessions for one drag.
- Moving a session into a worktree (owned by the header's move-to-worktree action).
- Moving busy/running sessions.

## Comments

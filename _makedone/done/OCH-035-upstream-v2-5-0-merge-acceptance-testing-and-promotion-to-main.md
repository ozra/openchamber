---
status: done
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
related: [OCH-033, OCH-034]
created: 2026-10-20 10:11
ended: 2026-10-20 18:09
---
# Upstream v2.5.0 merge: acceptance testing and promotion to main

## Goal
Merge of upstream v2.5.0 (ad73d11a6) committed on branch merge/upstream-2.5.0 @ 94306b36c; not pushed, main not advanced. Deployed live on och.campbell.nu on OpenCode 2.0.32 for testing; v1 sessions imported into v2. Remaining: user acceptance (sidebar Ctrl+§ toggle, pin/auto-close, send keys, Monozrakai + Thinking colour, quota pace), fix anything found, then push branch and fast-forward main. Full state, decisions, deployment wiring, rollback and migration notes: /opt/sysop/reports/openchamber-merge-status.md (decisions: /opt/sysop/reports/openchamber-upstream-report.md). Follow-up feature work stays separate: OCH-033, OCH-034. Related: SKYF-017.

## Background

## Requirements

## Acceptance criteria
- [ ]

## Out of scope

## Comments

### 2026-10-20 10:11 · oscar

Set status=review; related=["OCH-033","OCH-034"].

### 2026-10-20 18:09 · oscar

Closed by the maintainer after the remaining acceptance pass on the live instance. OCH-040 resolved the two sidebar settings the merge left behind (both superseded upstream, nothing to restore); the locale work landed as OCH-039 and was accepted with Dutch showing English for fork-only strings. Deployment steps in this ticket's body (push merge/upstream-2.5.0, fast-forward main) were carried out by the maintainer.

### 2026-10-20 18:09 · oscar

Set status=done; moved to done/.

### 2026-10-20 18:09 · oscar

Closed on the maintainer's instruction after the acceptance pass. The two fork behaviours the merge had orphaned (OCH-014 hide-New-session, OCH-015 always-visible actions) were checked and resolved as superseded in OCH-040, with no fork code change needed. Fork settings docs are current: README's persisted-settings section rewritten for the 2.x settings registry, locale fallback done in OCH-039. Remaining deployment step stays with the maintainer: push merge/upstream-2.5.0 and fast-forward main — closing this ticket does not mean that happened.

### 2026-10-20 18:09 · oscar

Set status=done.

### 2026-10-20 18:10 · agent

Correction to the comment above: I did not verify the push or the main fast-forward, only that the acceptance items were answered. Treat those deployment steps as unrecorded here rather than as confirmed.

### 2026-10-20 18:49 · agent

Deployment step now verified from this checkout's own refs, superseding the earlier 'unverified' caveat. main was fast-forwarded to 94306b36c at 2026-10-20 15:26:10 +0200 by 'git fetch -q . merge/upstream-2.5.0:main', and refs/remotes/origin/main logged 'update by push' in the same second, so the fork's main on GitHub (ozra/openchamber) carries the merge. main and merge/upstream-2.5.0 are the same commit today. The live service (openchamber-oscar.service, port 3096) serves packages/web/dist from this checkout, which is why the acceptance pass was looking at the merged build. What remains uncommitted since the merge is the post-merge follow-up work (locale fallback, retired sidebar-setting traces, fork docs, tickets).

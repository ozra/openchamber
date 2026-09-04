---
id: PRD-025
title: Restore last session on UI reload/restart
status: draft
created: 2026-09-03
depends_on: []
complexity: small
estimated_effort: 0.5-1 dev-days
related: []
---

# PRD-025 — Restore last session on UI reload/restart

> From the PRD inbox (draft 1): "don't automatically open a new session when
> openchamber ui reloads/restarts (just open what was last open)".

## Goal

When the UI reloads or restarts (including every dev-cycle HMR reload), do not
pop a fresh "new session" draft on top of what was already open. Restore the
last active session into the chat area; open a new chat only when there is
nothing restorable (first start ever, or the previous session is gone).

## Background (current state)

- `ChatContainer.tsx:1066-1070` auto-opens a draft with
  `openNewSessionDraft({ automatic: true })` whenever `autoOpenDraft &&
  !liveSessionId && !draftOpen`. On every full or partial UI reload during a
  dev cycle this fires before any live session exists, producing the annoying
  new-session tab the user describes.
- A last-active-session cache already exists (`sync/last-session-cache.ts`,
  per runtime + directory, keyed `oc.lastSession.v1`). Only `MobileApp.tsx`
  (`apps/MobileApp.tsx:983`) uses it for cold-launch restore. The web/desktop
  boot path never consults it before auto-opening the draft — it treats "no
  live session yet" as "start new".
- Session tabs themselves already restore on reload; the unwanted part is the
  extra new-session draft opened on top.
- The existing guard in `openNewSessionDraft`
  (`if (!options?.automatic) clearLastActiveSession(...)`) already keeps the
  automatic path from clearing the persisted pointer, so restoring must stay
  on the automatic path or use an equally non-destructive flag.

## Requirements

- On UI reload/restart (web/desktop surface): if a persisted last-active
  session exists and still resolves against the authoritative session list,
  restore that session into the chat area instead of auto-opening a draft.
- The automatic new-draft fallback remains only for the cases with nothing to
  restore: first start ever, or the persisted session no longer exists /
  belongs to a removed directory.
- Restoring must not clear or clobber the persisted last-session pointer (the
  restore is startup continuity, not a fresh user start).
- Runtimes: desktop/web. Mobile already has its own restore path and keeps it;
  VS Code keeps its own boot-draft behavior (`VSCodeLayout.tsx`).

## Acceptance criteria

- A dev-cycle reload (full or partial HMR) leaves the previously open session
  visible and opens no new-session draft.
- First start ever still opens a new chat.
- Deleting/unavailability of the last session falls back to a new chat.
- No regression in the mobile cold-launch restore or VS Code boot draft.

## Out of scope / future

- Multi-tab restore beyond what session tabs already do.
- Choosing among several candidate sessions.
- Changing VS Code's or mobile's boot behavior.
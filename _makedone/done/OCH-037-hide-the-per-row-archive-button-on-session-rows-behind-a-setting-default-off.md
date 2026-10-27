---
status: done
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
complexity: small
estimated_effort: 0.5
related: [OCH-014]
created: 2026-10-20 12:58
ended: 2026-10-27 09:01
---
# Hide the per-row archive button on session rows behind a setting (default off)

## Goal
Remove the always-visible archive button from each session row. Archiving stays
available through the row's context menu. Make the inline button a setting, off by
default.

## Background
Every session row in the sidebar (`SessionNodeItem`) renders a quick archive
button. The user considers it dangerous (one click from an accidental archive) and
a waste of row space, and archives via the context menu instead.

## Requirements
- New persisted setting, e.g. "Show archive button on session rows", default off.
- Setting off: no archive button on session rows; archive remains available from
  the row context menu and the session header menu (`HeaderSessionArchiveMenuItem`).
- Setting on: today's inline button behavior unchanged.
- Hiding the button also hides its Shift-to-delete variant and releases its reserved title padding. Other row actions stay unchanged.
- Store the preference per profile and surface. Mobile rows remain unchanged because they have no inline archive button.
- Make the control searchable in Settings.
- Follow "Adding persisted settings" in `custom-dev/README.md` for the registry-backed round trip, generated server and VS Code snapshots, and focused persistence tests.
- Proper English i18n text in `en.ts` only; other locales fall back to English.
- Direct shared modification (small setting on the shared path), not a copied
  component, per the customization strategy.

## Acceptance criteria
- [x] With the setting off (fresh default), session rows show no archive button and row layout tightens accordingly.
- [x] Archive still works from the row context menu and the header menu.
- [x] With the setting on, the inline button appears and works as before.
- [x] Setting survives a server/UI restart (settings round trip verified).

## Out of scope
- Changing the archive action itself or the context-menu entries.
- Hiding other row quick actions.

## User acceptance testing

1. Open Settings and search for "archive button". The session-row control is off by default.
2. Check a long session title. The archive button is absent and the title uses its former space. Holding Shift does not reveal a delete button there.
3. Enable the control. The inline archive button returns and holding Shift changes it to delete.
4. Turn the control off again. Confirm Archive and Delete remain available in the session row menu, and Archive remains in the session header menu.
5. Reload the UI and restart the server. Confirm the preference remains off. Repeat with it on.
6. Check another surface kind independently and confirm mobile rows are unchanged.

## Comments

### 2026-10-23 00:00 · assistant

User requested immediate implementation and confirmed using this existing ticket with the button hidden by default. Requirements are settled; no open product questions. Direct shared modification keeps archive/delete behavior shared and changes only visibility, reserved row space, and the persisted Settings control.

### 2026-10-23 12:32 · oscar

Set status=ready.

### 2026-10-23 12:32 · oscar

Set status=in-progress.

### 2026-10-23 12:39 · oscar

Set status=review.

### 2026-10-23 12:39 · oscar

Implemented sidebarShowArchiveButton as a profile-scoped, per-surface setting, default false. The Sessions > Sidebar control is searchable. Hiding the inline archive/Shift-delete button also releases its reserved title padding; menus and mobile behavior are unchanged. Focused store, registry/snapshot, search, control markup, locale, VS Code, sanitizer and server per-surface tests passed. Server JS syntax check passed. The full settings-runtime test file encountered vi.waitFor is not a function; its per-surface group passed in isolation. Workspace type-check/lint and independent review are pending. User acceptance testing remains required before done.

### 2026-10-23 12:40 · oscar

Workspace validation completed: bun run type-check and bun run lint both passed. Lint reported one warning outside this change in HtmlRenderFrame.tsx:80 about the interfaceSize useMemo dependency. No production build, visual runtime validation or user acceptance has been completed.

### 2026-10-23 12:40 · oscar

Independent static review found no concrete defects in default-hidden behavior, quick-action removal, reclaimed padding, Settings search or per-surface serialization. Runtime visual checks and explicit user acceptance remain pending.

### 2026-10-27 09:01 · oscar

Oscar accepted on 2026-10-27 and asked to mark done, commit and push.

### 2026-10-27 09:01 · oscar

Set status=done; moved to done/.

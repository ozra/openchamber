---
status: refine
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
related: [OCH-014]
created: 2026-10-20 12:58
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
- Follow "Adding persisted settings" in `custom-dev/README.md` for the full round
  trip: client type, store default and setter, hydration/apply, write path, server
  allowlist in `settings-helpers.js`, plus a focused sanitizer/response test.
- Proper English i18n text in `en.ts` only; other locales fall back to English.
- Direct shared modification (small setting on the shared path), not a copied
  component, per the customization strategy.

## Acceptance criteria
- [ ] With the setting off (fresh default), session rows show no archive button and row layout tightens accordingly.
- [ ] Archive still works from the row context menu and the header menu.
- [ ] With the setting on, the inline button appears and works as before.
- [ ] Setting survives a server/UI restart (settings round trip verified).

## Out of scope
- Changing the archive action itself or the context-menu entries.
- Hiding other row quick actions.

## Comments

---
status: "done"
created: 2026-09-02
related: ["OCH-012"]
kind: "feature"
aliases: ["PRD-015"]
ended: "2026-09-04 07:40"
---

# Sidebar project icons always visible

## Goal

Project (and group) icons in the left sidebar should be visible all the time in
a slightly muted tone, instead of only being revealed on hover.

## Background (current state)

This is **not** a theme concern — it is a layout/class behavior. The
hover-reveal is code-driven:

- `alwaysShowActions` gates the reveal and is currently `mobileVariant ||
  isTablet` (`SessionSidebar.tsx:329`) — desktop non-tablet hover-reveals.
- The reveal itself is Tailwind classes `opacity-0 group-hover:opacity-100`
  (`sidebar/projects/sortableItems.tsx:355,411`,
  `sidebar/projects/SessionGroupSection.tsx:1202-1249`,
  `sidebar/recent/SidebarActivitySections.tsx:273`).
- The muted color already exists (`text-muted-foreground`); icons are only
  hidden, not missing a color.

So this is its own PRD. If a dedicated "muted at rest" token is wanted, that
specific bit belongs in the theme (PRD-012), but the visibility behavior is here.

## Requirements

- Project rows (and group headers) show their icons at rest, muted
  (`text-muted-foreground` or a theme token), full emphasis on hover/focus.
- Opt-in setting or always-on for this fork; decide scope: project rows only,
  or group headers and session rows too.

## Acceptance criteria

- Icons are visible at rest in a muted tone on the targeted rows.
- Hover/focus restores the emphasized color.
- No visual regression in the Files view or other surfaces using the same
  `alwaysShowActions` pattern.

## Out of scope / future

- Changing icon designs or which icons exist.
- Other surfaces' hover-reveal behavior.

## Comments

### 2026-10-01 18:15 · agent-coder

Set ended=2026-09-04 07:40.

### 2026-10-01 18:15 · agent-coder

ended backfilled from git history: commit that moved PRD-015 into custom-dev/done/.

### 2026-10-20 18:07 · oscar

Resolved against merge/upstream-2.5.0 (OCH-040): the behaviour is unconditional, not a setting — SessionSidebar.tsx:346 pins alwaysShowSidebarActions = true, so web and desktop show the icons in their muted tone at rest. The settings.openchamber.sidebar.field.actionsAlwaysVisible* strings are upstream leftovers (translated in 12 locales, no registry field, no control) and are deliberately left alone.

### 2026-10-20 18:20 · agent

Ownership correction, superseding the previous comment: the actionsAlwaysVisible strings are the fork's own, not upstream leftovers. git log -S shows exactly one commit ever touching them — a5992eaf8 (2026-09-04, 'feat: sidebar keep-open, hide header new-session, always-visible icons'), which added them to en.settings.ts plus eight locale sub-dicts. Upstream never had the key: per this ticket's own Background, upstream's alwaysShowActions was mobileVariant || isTablet. The setting (sidebarActionsAlwaysVisible: lib/api/types.ts + settings-helpers.js allowlist + SidebarSettings.tsx UI) was removed by today's merge commit 94306b36c, which deleted SidebarSettings.tsx and replaced the choice with the uncommented 'const alwaysShowSidebarActions = true' in SessionSidebar.tsx:346. Whether always-on is the accepted outcome or the toggle should return via SETTINGS_REGISTRY is an open product question.

### 2026-10-20 18:27 · oscar

Decided: always-on stays, the setting is gone for good. Removed the actionsAlwaysVisible{,Aria,Hint} strings from the twelve dictionary files that still carried them (36 lines), and commented the 'const alwaysShowSidebarActions = true' in SessionSidebar.tsx so nobody searches for a setting again. The one remaining mention is the server test that asserts retired sidebar keys are dropped from updates and responses (settings-helpers.test.js:252) — kept on purpose, because settings.json on existing installs still holds the old key from September and that test proves it stays inert. Validation: bun test packages/ui/src/lib/i18n/ (40 pass, key parity intact), type-check:ui clean, lint:ui clean.

### 2026-10-20 19:02 · agent

Correction to the count in the comment above: the actionsAlwaysVisible{,Aria,Hint} strings lived in fifteen dictionary files, not twelve, and the deletion is 45 lines, not 36. Besides the twelve settings sub-dicts, ar, he and nl carried the three keys inline in their main dictionaries, the same three files that held all 54 TRANSLATE ME placeholders. Fork-DIFFERENCES section 6 now says fifteen.

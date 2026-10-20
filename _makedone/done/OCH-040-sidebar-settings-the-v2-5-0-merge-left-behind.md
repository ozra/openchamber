---
status: done
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
related: [OCH-014, OCH-015, OCH-035]
created: 2026-10-20 14:20
ended: 2026-10-20 18:09
---
# Sidebar settings the v2.5.0 merge left behind

## Goal
Decide, per case, whether two fork sidebar settings regressed in the upstream
v2.5.0 merge or were superseded by upstream, and clean up what each leaves behind.

## Background
Found while checking where fork settings expose their wording. Both tickets are
`done`, but their controls are no longer reachable in the app:

- **OCH-015 — "Always show sidebar action icons".** Three strings are still in the
  dictionary (`en.settings.ts:2535-2537`: `settings.openchamber.sidebar.field.actionsAlwaysVisible{,Aria,Hint}`),
  but nothing renders them: no `SETTINGS_REGISTRY` key and no component reference.
  The only remaining `alwaysShowActions` in the sidebar is upstream's internal
  "touch layout has no hover" flag (`SessionFolderItem.tsx:68` defaults it to
  `mobileVariant`; the sidebar header Display-mode menu has no such item).
- **OCH-014 — "Hide the header New session button".** No registry key, no strings
  anywhere. There is also no global New-session button in the sidebar header on this
  branch, so the setting has nothing to hide. The ticket's other half survived:
  `sidebarKeepOpen` is in the registry (`registry.ts:374`) and toggled from the
  sidebar header (`SidebarHeader.tsx:156`).

Stale copies of the OCH-014 keys in `tr.settings.ts` were deleted on 2026-10-20
(they were failing the i18n key-parity test; see OCH-039).

## Requirements
- For each case, establish which happened by comparing the fork variant with the
  merged upstream component:
  - regressed → restore the control (and its registry key) on the shared path;
  - superseded → record it on the original ticket, and remove only what the fork
    itself added; upstream's own leftovers stay for upstream to remove.
- OCH-015's behaviour is a real preference (muted-at-rest vs hover-reveal); if it
  is superseded, confirm upstream actually shows the icons at rest rather than
  having dropped the option.
- No new product surface beyond restoring what the fork already accepted.

## Acceptance criteria
- [x] Each of the two settings is resolved as restored, or as superseded with a note on its ticket.
- [x] No **fork-added** dictionary key exists without a registry entry and a control using it. Upstream's own orphans are left alone (see comment): deleting them is 12-file churn that conflicts if upstream restores the setting.
- [x] No string removal was needed, so the i18n suite needed no re-run; `FORK-DIFFERENCES.md` section 6 was rewritten to match the code.

## Out of scope
- New sidebar settings unrelated to these two.

## Comments

### 2026-10-20 18:09 · oscar

Both cases are superseded, not regressions. OCH-014's New-session hide: upstream no longer renders a global New-session button in the sidebar header, and the fork keeps no trace (no registry field, no strings, no control). OCH-015's always-visible icons: SessionSidebar.tsx:346 pins alwaysShowSidebarActions = true, so web and desktop get the behaviour unconditionally with no setting. The actionsAlwaysVisible strings survive in twelve locales as upstream leftovers — translated, unread, and left for upstream to remove rather than carrying a twelve-file fork deletion. FORK-DIFFERENCES section 6 rewritten against the code. Resolution also recorded on OCH-014 and OCH-015.

### 2026-10-20 18:09 · oscar

Set status=done; moved to done/.

### 2026-10-20 18:09 · oscar

Both cases are superseded by upstream, not regressions, and neither needs a fork change. OCH-014: upstream removed the global New-session button from the sidebar header, so the hide setting has nothing to hide, and the fork already carries no trace of it. OCH-015: the muted-at-rest behaviour is now unconditional in fork code (SessionSidebar.tsx:346 pins alwaysShowSidebarActions = true), so no setting is needed. The actionsAlwaysVisible* strings turned out to be upstream leftovers rather than fork ones (fully translated in twelve locales, no registry field, no control), so they stay: deleting them would be a twelve-file fork divergence that conflicts if upstream restores the setting. Only FORK-DIFFERENCES section 6 changed, and it now matches the code.

### 2026-10-20 18:09 · oscar

Set status=done.

### 2026-10-20 18:10 · agent

Count correction to the comment below: each of the three actionsAlwaysVisible keys sits in nine dictionary files — English plus eight translated locales — not twelve. The decision is unchanged.

### 2026-10-20 18:20 · agent

Ownership correction to both comments above: git log -S actionsAlwaysVisible returns a single commit, a5992eaf8 — ours. So the strings are fork-owned, upstream never carried the setting, and deleting them is legitimate cleanup, not upstream interference. The merge commit 94306b36c deleted SidebarSettings.tsx and hardcoded alwaysShowSidebarActions = true, silently turning a user setting into permanent behaviour; OCH-015's acceptance of 'always-on' makes that defensible but it was not decided in the open. Pending the maintainer's call: keep always-on and delete the nine orphan string files, or restore a registry field.

### 2026-10-20 18:27 · oscar

Closed out: the maintainer chose always-on with no setting, so the orphan strings were deleted (12 dictionary files) and the hardcode in SessionSidebar.tsx is now commented as a deliberate fork decision. Fork-DIFFERENCES section 6 records the removal.

### 2026-10-20 19:02 · agent

Same correction as on OCH-015: fifteen dictionary files and 45 lines, because ar, he and nl keep their settings.* keys in the main dict rather than the settings sub-dict.

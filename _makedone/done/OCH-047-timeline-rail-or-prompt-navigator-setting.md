---
status: done
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: [OCH-001]
related: [OCH-001, OCH-041, OCH-042, OCH-043, OCH-044, OCH-046]
created: 2026-10-22 09:12
complexity: small
estimated_effort: "0.5"
deliver_with: [OCH-046]
ended: 2026-10-27 09:01
---
# Timeline rail or prompt navigator setting

## Goal
The user picks which rail shows on the chat's end edge: the timeline rail, the
upstream prompt navigator, or none.

## Background
Asked for by Oscar on 2026-10-22. OCH-001 replaced the upstream
`PromptNavigatorRail` with the fork's `TimelineRail` at its one mount point; the
upstream file stayed unmounted as a Knip entry. Oscar decided on 2026-10-27 that
only one rail shows at a time, which also settles what the `mod+k n` toggle
drives.

## Component strategy
Additive variant: both components mounted from the one place they are mounted
today, never together. No new rail logic. Upstream's `promptNavigatorEnabled`
stays the on/off switch, so its shortcut gate and the `[data-prompt-rail]`
composer room work unchanged; a fork setting picks the kind.

## Requirements
- A "Chat rail" choice in Chat settings, Reading section: Timeline (default),
  Prompt navigator, Off. It replaces the Prompt navigator checkbox.
- Off is `promptNavigatorEnabled: false`. The kind is a new setting,
  `chatRailKind` (`timeline` | `prompt`), persisted through `SETTINGS_REGISTRY`,
  `scope: 'profile'`, `perSurface: true`, like `promptNavigatorEnabled`.
- Exactly one rail, or none, shows. The toggle shortcut drives the one that
  shows.
- The prompt navigator keeps upstream's behavior, including its two-prompt
  minimum; the timeline rail keeps showing from the first prompt (OCH-044).
- The conversation map control (OCH-046) stays indented under the choice and
  applies to the timeline rail only.
- English strings only (`en.settings.ts`); the Settings search entry
  `chat.prompt-navigator` takes the new title.

## Answered questions
- Both rails at once: no, one or none (Oscar, 2026-10-27).
- Shortcut: drives the rail that shows; nothing to decide with one rail.
- Per surface: yes, like `promptNavigatorEnabled`.

## Acceptance criteria
- [x] Each choice shows only its rail, or none for Off.
- [x] `mod+k n` opens keyboard navigation on whichever rail shows, and does
      nothing with Off.
- [x] Off leaves the composer and the chat column at their normal widths.
- [x] The choice persists per surface kind.

## Out of scope
- Any change to what either rail draws.
- A merged rail that draws both kinds of span.

## Comments

### 2026-10-22 09:12 · oscar

Extracted from the conversation that produced OCH-046.

### 2026-10-22 13:21 · oscar

Set deliver_with=[].

### 2026-10-27 08:52 · oscar

Oscar decided on 2026-10-27: either the timeline rail or the prompt navigator, or none, never both; that settles the shortcut. Refined and implemented together with OCH-046: chatRailKind (profile, perSurface, default timeline) beside upstream's promptNavigatorEnabled as the off switch; Chat rail chip row (Timeline, Prompt navigator, Off) replaces the checkbox; PromptNavigatorRail mounted again unmodified with its two-prompt minimum, Knip entry removed. Validation: timelineRail, settings and i18n tests (116 pass), settings-helpers 64 pass with the pre-existing npm-pack tarball test failing, UI type-check, lint and Knip clean. UAT by Oscar pending.

### 2026-10-27 09:01 · oscar

Oscar accepted on 2026-10-27 and asked to mark done, commit and push.

### 2026-10-27 09:01 · oscar

Set status=done; moved to done/.

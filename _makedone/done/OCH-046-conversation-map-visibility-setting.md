---
status: done
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: [OCH-044]
related: [OCH-001, OCH-043, OCH-047]
created: 2026-10-21 16:59
complexity: small
estimated_effort: "0.5"
ended: 2026-10-27 09:01
---
# Conversation map visibility setting

## Goal
Let the user choose when the TimelineRail conversation map (OCH-044) shows its
one-line boxes beside the hover card.

## Background
Asked for by Oscar on 2026-10-21. OCH-044 shows the map whenever the hover card
shows, and the boxes paint over the chat's messages when the message column
reaches near the rail.

## Component strategy
Direct shared modification of the fork-owned rail: one registry setting, a
Chat settings control and a check in `TimelineRail.tsx` before it mounts
`ConversationMap`. No upstream component changes.

## Requirements
- A setting, "Conversation map", with three choices:
  - Always (default): the map shows with the hover card, as OCH-044 built it,
    without waiting for any measurement.
  - When there is room: the boxes show only when they fit between the
    message column's end edge and the rail without covering the column.
    All or nothing; no shrinking.
  - Off: only the hover card shows.
- The hover card shows on every hover in every mode.
- With the map hidden, its dots go too.
- One dimming blanket, `--surface-background` at 50 percent, sits under the
  boxes, spanning the rail's height and out to the farthest box, then 4rem
  farther, fading to transparent over those 4rem so it has no hard edge. It goes
  with the boxes: shown only while they show and reach over the message column,
  never for the hover card alone.
- Persisted through `SETTINGS_REGISTRY`, `scope: 'profile'`, `perSurface: true`,
  like `promptNavigatorEnabled`. A stored value the store does not know reads
  as Always on load.
- English strings only (`en.settings.ts`), with a Settings search entry.
- The control sits in Chat settings, Reading section, indented under the chat
  rail choice (OCH-047), always visible whatever rail shows.

## Answered questions
- Name: "Conversation map", matching OCH-044 (Oscar, 2026-10-22).
- Default: Always, with a dimming blanket over the covered chat (Oscar).
- The dimming is one blanket behind the boxes, not a heavier fill on each box
  (Oscar, 2026-10-22). It does not extend to the card, which reads clearly by
  itself, and is not shown without boxes (Oscar, 2026-10-27).
- The blanket fades out at its far edge (Oscar, 2026-10-27).
- Partial room: all or nothing, boxes never shrink; the card always shows on
  hover (Oscar).
- Dots: gone whenever the boxes are (Oscar).
- Placement: always visible, indented under the rail choice; it applies to the
  timeline rail only (Oscar, 2026-10-22; OCH-047).
- Room: measured from the rail track's start edge to the message column's end
  edge in the rail's narrow-gutter pass, observing the container, the scroller
  and the track, so resizes and the wide chat layout toggle re-measure it.

## Acceptance criteria
- [x] Each mode behaves as described, during pointer hover and keyboard navigation.
- [x] The hover card shows on every hover in every mode.
- [x] Where the boxes cover messages, the faded blanket makes them readable over
      dense chat text; with no boxes, or boxes beside the messages, nothing is
      dimmed.
- [x] "When there is room" follows window resizes and the wide chat layout toggle.
- [x] The choice persists per surface kind.

## Out of scope
- Changing the map's layout or thinning rules.

## Comments

### 2026-10-22 09:20 · oscar

Oscar answered the refinement questions: the name stays "Conversation map"; default Always, with a dimming haze behind the boxes so the covered chat text stops competing with them; "When there's room" is all or nothing with no shrinking; the card shows on every hover; dots go with the boxes; the control stays always visible. Implementing as OCH-046 together with OCH-047.

### 2026-10-22 13:21 · oscar

Set status=review.

### 2026-10-22 13:21 · oscar

Oscar settled the dimming on 2026-10-22: one 50% background-colored blanket under the map and the card at their maximum width, skipped where nothing covers the messages. Implemented: new conversationMapVisibility.ts owning the three widths (box, prompt offset, card) in CSS and px plus the two show decisions; TimelineRail measures the room beside .chat-message-column from the track's own start edge and mounts the blanket (z-10) and the boxes; ConversationMap and the card read their widths from the same module. Setting conversationMapVisibility (profile, perSurface, default always) in the registry, chips indented under the rail checkbox in Chat settings, search item chat.conversation-map, English strings only, server sanitizer branch plus drift sample, both generated snapshots regenerated. Validation: timelineRail tests 46 pass, bun run check:changed passed (type-check, lint, Knip, anti-slop). No browser check by the agent; UAT by Oscar.

### 2026-10-27 08:52 · oscar

Gap review with Oscar on 2026-10-27: the blanket covers the boxes only, never the card, and goes with the boxes; it fades out over 4rem past the farthest box; Always shows the boxes without waiting for the room measurement; the store resets an unknown stored value to Always on load. Card width back to its original class. Ticket requirements and answered questions brought up to date.

### 2026-10-27 09:01 · oscar

Oscar accepted on 2026-10-27 and asked to mark done, commit and push.

### 2026-10-27 09:01 · oscar

Set status=done; moved to done/.

---
status: refine
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
related: [OCH-001]
type: bug
created: 2026-10-21 12:56
---
# Keep explicitly loaded timeline history available

## Goal
Keep history explicitly expanded by the user available while they inspect the timeline.

## Background
OCH-001, TimelineRail, UAT on 2026-10-21 found that the load-earlier up-arrow's
history is evicted about 3 seconds later when Chat stays pinned at the end.
The suspected cause is ChatContainer's HISTORY_TRIM_DELAY_MS trimming after
loading without moving the view. Confirm the cause before implementing.

The user accepted the initial TimelineRail MVP with this known limitation and
authorized tracking the fix separately on 2026-10-21. This ticket remains in refine.

## Requirements
- History the user expanded stays available while they work with the timeline.
- Resume normal trimming once they return to prompting or leave the timeline
  idle for an agreed period.
- Reuse the authoritative history loader and cache lifecycle. Preserve the Chat
  anchor and avoid duplicate history storage or unbounded retention.

## Open questions
- Define timeline activity, idle duration, and what returning to prompting means.
- Define cleanup on rail close, conversation change, and runtime or directory change.

## Acceptance criteria
- [ ] Loading earlier while Chat is pinned at the end does not evict that page
      after 3 seconds during active timeline inspection.
- [ ] History prepend preserves the Chat anchor and updates the frame correctly.
- [ ] Trimming resumes under the agreed lifecycle without stale retention.

## Validation
- Add a focused regression test for load-earlier at the live edge and delayed trimming.
- Test active use, idle expiry, prompting, and scope-change cleanup.
- Manually inspect the rail through history expansion and eventual trimming.

## Out of scope
- A second transcript store or permanently disabling history trimming.

## Comments

---
id: PRD-023
title: User-originated question answers
status: draft
created: 2026-09-03
related:
  - PRD-001
  - PRD-002
  - PRD-011
  - PRD-018
  - PRD-022
---

# PRD-023 - User-originated question answers

## Goal

Present answers submitted through the Question tool as user-originated input in
conversation views. The user supplied the content, so that fact should drive
its visual class even though the protocol stores it inside a tool result.

Keep question-tool provenance visible. User-originated does not mean fabricating
an SDK user message or hiding how the answer entered the conversation.

## Background

A completed Question tool serializes answers into its tool output. `ToolPart.tsx`
parses that output into question/answer pairs with `parseQuestionOutput`; no
separate SDK message with `role === "user"` exists for the response.

Today this makes an actual user response inherit generic tool-result treatment
unless each view knows how to recover its meaning.

## Shared projection

- Derive question-answer presentation records from successfully parsed
  completed Question tool output.
- Each record retains the owning `turnId`, `messageId`, question `partId`, and
  question/answer index. Derive a deterministic presentation ID from those
  values.
- Mark the record `origin: "user"` and `sourceKind: "question-tool"` or an
  equivalent precise contract. Do not change the SDK record, role, sync state,
  or reply routing.
- Preserve multiple selected answers and custom free-text answers as the user
  submitted them.
- If old or malformed persisted output cannot be parsed confidently, keep the
  ordinary question-tool presentation. Do not guess user content.

## Surface behavior

### Chat

- In the completed Question tool presentation, render each answer with the
  intrinsic user-input color and appropriate user-message visual weight.
- Keep the associated question and a compact Question-tool marker visible so
  the answer retains context and provenance.
- This is a presentation change inside the existing completed tool record, not
  a second chat message and not a change to message ordering.

### TimelineRail

- Render each answer as a user-originated subspan under PRD-001.
- User-input lane, PRD-001 user-content length rule, type filtering, preview,
  and intrinsic color apply to the answer subspan. The answer remains
  content-sized in both TimelineRail length modes.
- The Question request remains tool activity. The answer remains addressable
  through its owning message and part identity.

### Trajectory ledger

- Give each answer a user-originated row or subrow with a visible Question-tool
  source marker.
- Use the same stable presentation identity as TimelineRail so navigation and
  PRD-022 decorations agree.

### Conversation Find

- Include parsed answers in the User filter, not the Tool filter.
- Do not duplicate the same answer as generic tool output.
- Label the result as user-originated Question feedback and keep its owning
  message/part target for navigation and decoration.

## Intrinsic styling and decorations

User-originated classification is intrinsic presentation. It exists with no
active PRD-022 layer and uses the normal user-input theme source.

Temporary dimmed, highlighted, selected, or focused decorations sit above that
style. A theme may render `dimmed` as a duller version of the same user-input hue
or use a dedicated muted treatment.

## Acceptance criteria

- Completed, parseable Question answers read as user input in Chat,
  TimelineRail, the trajectory ledger, and Conversation Find.
- Every answer remains visibly attributable to the Question tool.
- TimelineRail's user-input toggle includes answers; its tool/activity toggle
  controls the request rather than the answer.
- Find classifies an answer once under User and does not duplicate it under
  Tool.
- Stable owning message/part identity supports navigation and conversation
  decorations without synthetic SDK messages.
- Malformed or legacy-unparseable output safely retains ordinary tool
  presentation.

## Validation

- Projection tests for one answer, multiple questions, multi-select answers,
  custom text, stable IDs, and malformed output fallback.
- Surface tests for Chat styling and provenance, TimelineRail lane/filtering,
  ledger rows, Find scope and deduplication, navigation, and PRD-022 targets.
- Regression tests proving question reply routing, persisted tool records,
  message ordering, and the Question request presentation remain unchanged.

## Out of scope / future

- Changing the OpenCode Question tool protocol.
- Creating synthetic user messages for answers.
- Reclassifying arbitrary tool output that happens to contain user-sounding
  text.

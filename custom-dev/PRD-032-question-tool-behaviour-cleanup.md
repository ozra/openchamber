---
id: PRD-032
title: Question tool behaviour cleanup
status: draft
created: 2026-09-05
depends_on: []
complexity: medium
estimated_effort: unknown — needs discovery first
related:
  - PRD-013
  - PRD-023
---

# PRD-032 — Question tool behaviour cleanup

> **Draft, deliberately unrefined.** Captured so it is not forgotten. The
> requirements below are provisional; run the discovery list before treating
> any of them as decided.

## Goal

Make the question tool behave predictably when the user does something other
than answer it in the card — above all, never silently discard what the user
typed.

## Trigger (observed 2026-09-05)

A question card was showing. Instead of answering in the card, the maintainer
wrote a normal message in the composer and submitted it. The calling agent
received **"The user dismissed this question"** and never received the typed
message. The prompt appears to have been dropped: the question was settled as a
rejection, and the text the user actually wrote went nowhere.

Losing typed input is the headline defect. Whether the composer submit *should*
dismiss the question is a separate design question — but if it does, the message
must still be delivered.

## Background (current state — partially verified)

Verified:

- Dismissal is a real first-class action. `QuestionCard.handleDismiss`
  (`QuestionCard.tsx:283-300`) calls `sessionActions.rejectQuestion`, which
  routes to `client.rejectQuestion` (`client.ts:1424`) and
  `session-actions.ts:1878`.
- Replies and rejections must be addressed to the session's own
  server-confirmed directory, or the server answers `QuestionNotFoundError` and
  the session hangs on the running question tool
  (`sync/DOCUMENTATION.md:306`). Not-found replies remove the stale request
  locally and enqueue a `settled-running-tool` tail materialization.
- A pending question drives assistant status (`useAssistantStatus.ts:437-443`)
  and sidebar status copy (`sessions.sidebar.session.status.questionPending*`).
- Recovery machinery exists for pending questions
  (`sync/question-recovery.ts`, `recoverPendingQuestionWithRetry`).

**Not yet verified — this is the core of the discovery work:** which code path
turned a composer submit into a rejection, and where the typed message was
dropped. It could be in the UI composer path, in the OpenChamber server, or in
the question tool's own harness contract. Do not write requirements before this
is traced.

## Discovery list

1. Trace what happens on composer submit while a question request is pending
   for that session. Which of these is true: the message is sent and the
   question separately rejected; the message is swallowed and only a rejection
   sent; or the send is refused outright?
2. Is the dismissal explicit anywhere in the UI, or is it inferred from the
   submit? Does the user get any feedback that their message was discarded?
3. Does the same thing happen for the multi-question and tabbed cases
   (PRD-013 requirement 2 mentions both)?
4. What does the calling agent actually receive — is "dismissed" distinguishable
   from "answered with nothing" and from "user replied out of band"?
5. Does this interact with queue/steer? A submit during a busy session may be
   queued rather than sent, which could be where the text is stranded.
6. Behaviour on all runtimes: web, desktop, VS Code, hosted mobile, Capacitor.

## Provisional requirements

- A composer submit while a question is pending must **never** discard the typed
  message. Whatever else happens, the message reaches the session.
- If a composer submit settles the question, that must be deliberate, visible to
  the user, and reported to the agent as "the user answered outside the card"
  with the message text — not as a bare dismissal.
- Explicit dismissal from the card keeps its current meaning and stays the only
  silent path.
- Any settle path (answer, dismiss, out-of-band reply) keeps the existing
  directory-ownership rule and the not-found recovery from
  `sync/DOCUMENTATION.md:306`.

## Relationship to other PRDs

- **PRD-013 requirement 2** ("Question tool keyboard operation": card takes
  focus, arrow/tab/enter navigation) is the keyboard half of the same surface.
  Decide during refinement whether these merge or stay separate.
- **PRD-023** governs how completed question output is projected as
  user-originated records. Any new "answered out of band" outcome needs a
  defined projection there.

## Out of scope (provisional)

- Redesigning the question card's visual layout.
- Changing the question tool's schema or option format.

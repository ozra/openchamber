# custom-dev — Technical design (shared)

This is the shared implementation detail for the PRDs in this directory. It
focuses on the data model and algorithms that PRD-001 (timeline scrollbar) and
PRD-002 (ledger view) both build on, plus general design rules.

## Data model

The source of truth is the existing turn projection
(`packages/ui/src/components/chat/lib/turns/projectTurnRecords.ts` →
`TurnProjectionResult`), which produces stable `TurnRecord[]`.

Per turn, the lanes map to:

| Lane | Source |
|---|---|
| User messages | `turn.userMessage` (`lib/turns/types.ts:66`) |
| Agent messages | `turn.assistantMessages` (`lib/turns/types.ts:71`) |
| Tool calls | `turn.activityParts` where `kind === 'tool'` (`lib/turns/types.ts:27-29`) |

System/scope/control entries come from:

- `role === 'system'` messages (`resolveMessageRole`, `projectTurnRecords.ts:13`)
- plan-mode hidden user messages (`isHiddenUserMessage`, `message/hiddenUserMessage.ts`)
- header/control messages

## Lane layout

Lanes are conveyed by **color first, offset second** — not three rigid columns.

- User spans: nudged left.
- Agent spans: centered.
- Tool spans: nudged right.
- A few pixels of offset is enough; distinct colors do the heavy lifting.

For a single turn with many tool calls, the right-side cluster must still read
clearly.

## User span size tiers

Real user spans vary by prompt length in three tiers (few pixels each):

| Prompt length | Tier |
|---|---|
| < 1k chars | smallest |
| < 10k chars | medium |
| > 10k chars | largest |

## Timing and tokens-per-second

Governing constraint (`packages/ui/src/sync/DOCUMENTATION.md`): the protocol does
**not** mark where a turn begins, only where it ends. Repeated `busy` events mean
"still running", not "just started".

Consequences:

- Tokens are server-reported and real (`message.info.tokens` breakdown,
  `stores/utils/tokenUtils.ts:54-78`).
- The only available time denominator is creation deltas, which include network
  and server latency.
- Approx tps = tokens ÷ creation-delta window. **Always label approximate**.
- Hide tps when token data is unavailable.

Do not fabricate turn-start/first-token times or present derived values as
measured throughput.

## Interaction model

Clicking a span/line scrolls the chat to that message, reusing the existing
on-select-turn jump from `PromptNavigatorRail`. Bidirectional rail ⇄ ledger ⇄
chat sync is a later phase (see PRD-002).

## Styling

Rewrite any ported DeepSeek Harness component using OpenChamber primitives and
theme tokens — not `--dsw-*` CSS modules, and not imported DeepSeek packages
(they depend on a different runtime/event model). See
`packages/ui/src/index.css` for tokens and `components/ui` for primitives.
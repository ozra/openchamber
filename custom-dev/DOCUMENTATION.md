# custom-dev — Technical design (shared)

This is the shared implementation detail for the PRDs in this directory. It
focuses on the shared projection, geometry, and decoration contracts used by
PRD-001 (TimelineRail), PRD-002 (ledger view), PRD-022 (conversation
decorations), and PRD-023 (user-originated question answers).

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

Per PRD-023, completed question-tool output contains serialized question/answer
pairs rather than a separate SDK user message (`parseQuestionOutput` in
`ToolPart.tsx`). Project each answer as a user-originated presentation record
while retaining its owning `messageId`, question `partId`, and question/answer
index. This lets the rail and ledger treat actual user input consistently
without inventing protocol entities or losing the fact that it came through the
question tool.

## TimelineRail span identity

Project TimelineRail spans from the existing turn projection. Do not create a
second transcript model. Each span carries:

| Field | Meaning |
|---|---|
| `spanId` | Stable rail-render identity. |
| `turnId` | Owning turn from `TurnRecord`. |
| `messageId` | Owning SDK message and the normal Find target. |
| `partId` | Optional tool, reasoning, or text-part identity for precise targets. |
| semantic kind | User, assistant, thinking, or shared PRD-011 tool-label kind. |

Use existing authoritative IDs where available. Any fallback span ID must be
derived deterministically from message identity, part position, and part type,
matching the turn projection's existing fallback convention.

## Lane layout

Lanes are conveyed by **color first, offset second** — not three rigid columns.

- User spans: nudged left.
- Agent spans: centered.
- Tool spans: nudged right.
- System/control spans: centered with a distinct neutral treatment, separate
  from the agent class.
- A few pixels of offset is enough; distinct colors do the heavy lifting.

For a single turn with many tool calls, the right-side cluster must still read
clearly.

## Span-length modes

TimelineRail has Content and Time length modes. Content is the default. The
rail's compact mode control changes painted lengths without changing span
identity, transcript position, hit-target ownership, or viewport geometry.

### Content mode

Let `contentChars` be the character count of user-visible source content
represented by the span. Count visible tool input and output, but exclude hidden
fields, credentials, and presentation-only labels.

```text
cutoff = 10,000
ratio = log1p(min(contentChars, cutoff)) / log1p(cutoff)
length = minLength + ratio * (maxLength - minLength)
```

Clamp empty or non-text entries to `minLength`. Treat `minLength` as a hard
visual floor so every span remains visible at supported rail sizes and zoom
levels. Clamp entries at or above the cutoff to `maxLength`, and add a vertical
overflow marker only when `contentChars > cutoff`. User prompts and parsed
question answers use this same function.

Paint and hit geometry are separate. A short span keeps its calculated painted
length but receives invisible padding up to `minHitLength` across the usable
rail width. If padded targets meet, partition the space at the midpoint between
their transcript positions. This keeps every span clickable without changing
its visual size, transcript position, or the viewport map.

This length is visual metadata. Transcript coordinates still determine the
span's position and the viewport frame, so content sizing never changes the
rail's mapping to Chat.

### Time mode

User prompts and parsed question answers remain content-sized. Other spans use
the same visual `minLength` and `maxLength` with a logarithmic duration curve:

```text
durationSeconds = durationMs / 1,000
durationCutoffSeconds = 300
ratio = log1p(min(durationSeconds, durationCutoffSeconds))
  / log1p(durationCutoffSeconds)
length = minLength + ratio * (maxLength - minLength)
```

Use a part's valid authoritative start/end pair when it exists. Use message
created/completed only for a span representing that whole message. Missing,
one-sided, reversed, or otherwise invalid timing falls back to the Content-mode
formula. Repeated `busy` events and neighboring timestamps never supply a
duration. A live span with an authoritative start may use current elapsed time
at most once per second until its end arrives. Skip elapsed-time updates while
the rail is closed, auto-hidden, or in Content mode.

Keep user spans in scale with timed spans. Compute `userBaseLength` as the median
painted length of valid, completed timed spans in the materialized conversation.
If there are none, use the midpoint of `minLength` and `maxLength`. Reuse the
Content-mode `ratio` as `contentRatio`, then map it around that base:

```text
userLength = clamp(
  minLength,
  maxLength,
  userBaseLength + (contentRatio - 0.5) * (maxLength - minLength)
)
```

Refresh the median when the materialized-history boundary changes, not for each
streamed part. Derive it once for the rail projection and reuse it across user
spans. A live one-second tick updates only spans with an authoritative active
start. If mode or anchor changes need a visual transition, use transform or
opacity; do not animate layout geometry.

## Timing and tokens-per-second

Governing constraint (`packages/ui/src/sync/DOCUMENTATION.md`): the protocol does
**not** mark where a turn begins, only where it ends. Repeated `busy` events mean
"still running", not "just started".

This does not invalidate the Time length mode. That mode accepts only complete
part start/end pairs or whole-message created/completed pairs. It does not use
the approximate turn timing described below.

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

## Conversation decoration registry

PRD-022 owns the shared contract. Implement it as retained UI-only state keyed
by normalized runtime, directory, session, layer ID, and channel. Keep it out of
the authoritative sync stores.

Normalize each published `entryStates.items` list into direct target indexes at
the registry boundary. Preserve references for unchanged scopes, channels, and
targets so replacing one Find selection does not notify every mounted message.
Consumers subscribe to their exact target and to only the channel they support.

For each channel, sort layers by descending priority and stable layer ID. Keep
additive layers through the first exclusive layer, then ignore lower layers.
An explicit item state overrides that layer's `unlistedState`. For overlapping
surviving instructions, priority and stable instruction order choose one state.
No applicable state means intrinsic rendering.

The registry records absolute change, hold-end, transition-end, and generation
values. `replace` changes the desired dataset without starting a hold.
`withdraw` freezes the last dataset, schedules one hold deadline and one removal
deadline for the layer, and rejects callbacks from older generations. Consumers
use the timestamps to join an in-progress transition after virtualized remount;
they do not create per-item timers or drive store updates every animation frame.

Text consumers evaluate only visible rendered content through the shared
bounded matcher. Keep transient ranges outside detached Markdown cache content.
The renderer may use browser custom highlights or temporary DOM marks, but it
must remove or reapply them at the renderer/cache ownership boundary.

## TimelineRail geometry

The rail and its viewport frame consume one normalized transcript-coordinate
snapshot from the chat timeline or virtualizer controller. The snapshot maps
materialized span positions and the visible Chat top/bottom into the same
extent. It updates on scroll, resize, history prepend, and measurement changes.

The timeline controller remains the scroll and anchoring authority. The rail
must not reconstruct geometry from whichever virtualized message nodes happen
to be mounted. When earlier history is incomplete, preserve an explicit load
boundary rather than presenting the materialized extent as the complete
session.

## Styling

Rewrite any ported DeepSeek Harness component using OpenChamber primitives and
theme tokens — not `--dsw-*` CSS modules, and not imported DeepSeek packages
(they depend on a different runtime/event model). See
`packages/ui/src/index.css` for tokens and `components/ui` for primitives.

Tool and thinking span hues come from the same PRD-011 semantic classifier and
theme tokens as their message-prefix labels. User prompts and parsed question
answers share the user-originated visual class. Decorations sit above these
intrinsic styles; `dimmed` may reduce their intensity or use a dedicated muted
treatment according to the active theme.

---
id: PRD-022
title: Conversation decorations
kind: epic
status: draft
created: 2026-09-03
related:
  - PRD-001
  - PRD-002
  - PRD-011
  - PRD-018
  - PRD-023
---

# PRD-022 - Conversation decorations

> **Epic.** This PRD owns the shared contract for temporary visual states across
> conversation views. Producers define what is decorated. Each view decides how
> that state is rendered in its own visual language.

## Goal

Let Find and future functions decorate the same conversation in TimelineRail,
Chat, the trajectory ledger, and other capable views without sending commands
to those views or knowing their DOM and styling.

A decoration remains available to hidden and virtualized consumers, can be
updated atomically, and can hold and transition away after its producer
withdraws it.

## Vocabulary

- **Registry:** the in-memory owner of current conversation decoration layers.
- **Layer:** one source-owned decoration dataset, such as Conversation Find or a
  future words-of-interest function.
- **Channel:** one kind of projection a consumer may support. Initial channels
  are `entryStates` and `textMatches`.
- **State:** one predefined visual meaning assigned to an item by one layer:
  `dimmed`, `highlighted`, `selected`, or `focused`.
- **Intrinsic style:** ordinary theme-driven presentation when no decoration
  applies. It is not a decoration layer.
- **Publish / replace / withdraw:** add a layer, atomically change its dataset,
  or begin its configured withdrawal lifecycle.

The state names do not impose interaction rules. A layer may assign `selected`
or `focused` to any number of items. The producer decides which one state best
describes each item in that layer.

## Component strategy

Implement one UI-only Conversation Decoration Registry. A retained in-memory
store fits because producers and consumers are distant, views may unmount, and
several producers may be active. Do not use one-shot events: a remounted
consumer must read the current layer and its withdrawal progress.

Keep the registry outside session synchronization, persisted transcript state,
and `TimelineRailView`. It stores no message content and starts no history load.
Scope every layer by runtime, normalized directory, and session ID.

Consumers subscribe only to the scope, channel, and target they render. Hidden
views and unmounted virtualized rows do no decoration work.

## Layer contract

Conceptually, a layer has this shape:

```ts
type ConversationDecorationLayer = {
  id: string
  scope: {
    runtimeKey: string
    directory: string
    sessionId: string
  }
  priority: number
  composition: "additive" | "exclusive"
  lifecycle: {
    changed: { transitionMs: number }
    withdrawn: { holdMs: number; transitionMs: number }
  }
  channels: {
    entryStates?: EntryStateChannel
    textMatches?: TextMatchInstruction[]
  }
}
```

The public payload may use lists for convenient publication. The registry
normalizes entry targets into keyed indexes once per replacement so each
consumer does not scan every layer item during render.

Producers publish semantic state only. They do not publish CSS classes, colors,
opacity values, outlines, or animation properties.

## Entry states

`entryStates` decorates stable conversation identities used by TimelineRail,
Chat message containers, and ledger rows:

```ts
type EntryStateChannel = {
  unlistedState?: "dimmed" | "highlighted" | "selected" | "focused"
  items: Array<{
    target: EntryTarget
    state: "dimmed" | "highlighted" | "selected" | "focused"
  }>
}

type EntryTarget =
  | { kind: "turn"; turnId: string }
  | { kind: "message"; messageId: string }
  | { kind: "part"; messageId: string; partId: string }
  | { kind: "span"; spanId: string }
```

- Targets may address `turnId`, `messageId`, `partId`, or the projected
  `spanId` where that precision exists.
- Each target appears at most once in one layer's entry channel. Reject a
  malformed replacement with duplicate targets and preserve the prior valid
  layer rather than choosing a state by accidental list order.
- An explicit item state overrides that same layer's `unlistedState`.
- A missing `unlistedState` means the layer has no opinion about unlisted
  entries.
- If no surviving layer applies, the consumer uses its intrinsic style.
- When several targets in one layer apply to the same rendered entry, the most
  specific target wins: span, then part, then message, then turn.
- `dimmed` may be a duller version of the intrinsic hue or a distinct muted
  treatment. The theme and consumer decide; the contract specifies meaning,
  not paint.

## Text matches

`textMatches` contains literal or regular-expression instructions plus one
state per matched occurrence. A rule may include target-specific state
overrides, so Find can highlight every visible occurrence while rendering the
current result as selected or focused.

- Consumers match only text they actually render. They do not expand collapsed
  tools, untruncate ellipsized content, or mount virtualized messages to find
  hidden occurrences.
- A message that scrolls into view reads the retained layer and applies its
  current lifecycle phase.
- Match only user-visible content owned by the entry, not labels, controls,
  hidden fields, credentials, or arbitrary serialized SDK data.
- Reuse the bounded literal/regex matcher from PRD-018. A pathological regular
  expression must not freeze a visible message containing large tool output.
- Renderer adapters own source-to-rendered-text mapping. Temporary marks must
  not leak into cached Markdown DOM.

## Composition and priority

Resolve layers independently per channel:

1. Sort applicable layers by descending numeric priority, then stable layer ID
   for deterministic ties.
2. Keep additive layers until the first exclusive layer is reached.
3. Include that exclusive layer and ignore lower-priority layers for the
   channel.
4. For the same entry or overlapping text, the highest-priority surviving
   instruction wins. Within one layer, entry target specificity applies before
   stable instruction order. Equal-priority cross-layer conflicts use stable
   layer ID.

An exclusive Find layer can therefore isolate its results. Independent future
markers can coexist through additive layers, and an intentionally
higher-priority additive layer can remain visible over an exclusive layer.

Priority resolves decoration conflicts only. Decorations do not replace the
intrinsic semantic hue of a Read tool, question answer, user prompt, or other
entry unless a predefined decoration treatment explicitly changes that visual
property.

## Lifecycle and transitions

- `publish` adds a layer at full strength.
- `replace` atomically changes that source's dataset. Items moving between
  states, entering the item list, or leaving it transition to their new resolved
  state over `changed.transitionMs`. No withdrawal hold applies to replacement.
- `withdraw` freezes the layer's last dataset for `withdrawn.holdMs`, then
  transitions it to the next applicable layer or intrinsic style over
  `withdrawn.transitionMs`. The registry removes it after that transition.
- Republishing or replacing a withdrawing layer cancels withdrawal and
  transitions from the currently displayed state to the new dataset.
- Record absolute lifecycle timestamps. A consumer mounted halfway through a
  hold or transition joins at the correct phase instead of restarting it.
- One registry owner schedules hold and removal deadlines. Do not create timers
  per item, message, span, or consumer.
- Prefer opacity crossfades for visual state transitions. Any continuously
  animated property beyond opacity or transform requires measurement under the
  repository animation contract.
- Reduced-motion behavior may make the visual transition immediate, but the
  hold and final removal deadlines remain the same.

The default changed transition is 100 ms. Individual producers choose their
withdrawal policy. Conversation Find uses a configurable 5,000 ms hold followed
by a 2,000 ms transition.

## Intrinsic styling boundary

Intrinsic message and part classification stays on the ordinary render path:

- User, assistant, system, and control presentation.
- Tool-specific and Thinking prefix colors from PRD-011.
- User-originated question-tool answers.
- Theme tokens and normal hover/focus behavior local to a component.

The registry stores temporary overrides only. This keeps ordinary rendering
independent from global transient state and preserves semantic colors beneath
dimmed, highlighted, selected, and focused treatments.

## Acceptance criteria

- A producer can publish, replace, and withdraw one scoped layer without direct
  references to TimelineRail, Chat, or ledger components.
- Each item has at most one state per layer; the contract imposes no count limit
  on items sharing `selected` or `focused`.
- Additive and exclusive composition follows priority deterministically.
- Replacing a dataset uses only `changed.transitionMs`; withdrawal holds and
  transitions the frozen last dataset before removal.
- Remounted consumers join a withdrawal at its current phase.
- With no applicable decoration, intrinsic theme-driven styling is unchanged.
- Visible text matching does not expand or mount hidden content and never
  decorates hidden or sensitive fields.
- Consumers can subscribe narrowly without rescanning all targets on every
  render or streaming update.

## Validation

- Pure resolver tests for priority, deterministic ties, additive layers,
  exclusive cutoff, unlisted state, explicit item override, target specificity,
  and overlapping text instructions.
- Lifecycle tests for publish, atomic replacement, changed transition,
  withdrawal hold, withdrawal transition, final removal, republish
  cancellation, stale timer rejection, and mid-transition remount.
- Scope tests for runtime, normalized directory, and session changes.
- Subscription tests proving an unrelated target or channel does not notify a
  mounted message or rail span.
- Renderer tests for intrinsic-style fallback, Markdown cache isolation,
  collapsed and ellipsized text, virtualization remount, and reduced motion.
- Production profiling with representative 300k-token conversation data and
  several simultaneous layers. Record replacement latency, mounted-row render
  counts, long tasks, and retained memory.

## Out of scope / future

- Persisting decorations across application restart.
- Making the registry a message search engine or history loader.
- Allowing producers to inject arbitrary CSS.
- Requiring every view to support every channel.

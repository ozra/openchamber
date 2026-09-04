---
id: PRD-009
title: Configurable reasoning-block previews and expanded height
status: ready
created: 2026-09-01
depends_on: []
complexity: small
estimated_effort: 2-3 dev-days
---

# PRD-009 - Configurable reasoning-block previews and expanded height

## Goal

Let the user control how much of a collapsed reasoning block is visible and
whether an expanded block has its own height limit. Apply the same behavior to
thinking and justification blocks without changing the rest of their current
interaction model.

## Background

The current reasoning presentation already has two settings:

- "Show reasoning traces" controls whether reasoning parts appear.
- "Enable collapsible reasoning blocks" chooses between always-visible inline
  reasoning and the collapsible `ReasoningTimelineBlock` presentation.

Neither switch governs justification. Justification is projected from assistant
text and always uses `ReasoningTimelineBlock`. The new controls therefore affect
justification even when either existing reasoning switch is off.

In collapsible mode, live reasoning starts expanded and shows the busy state.
Completed blocks start collapsed. Their header contains a plain-text summary
limited to 80 characters. Opening a completed block mounts the full Markdown
body inside a `ScrollableOverlay` capped by `max-h-80`; live reasoning grows
inline without that internal scrollbar.

`ReasoningPart.tsx` owns the shared `ReasoningTimelineBlock` used by both
thinking and justification, so these controls belong on that shared path.

## Requirements

### Existing behavior stays intact

- Keep "Show reasoning traces" as the master visibility setting.
- Keep "Enable collapsible reasoning blocks". When disabled, reasoning stays
  always visible inline as it is today.
- Keep justification visible and collapsible independently of those switches,
  matching current behavior.
- Keep live reasoning auto-expanded, including its busy label and current
  streaming behavior.
- Keep completed collapsible blocks collapsed by default and accessible through
  the existing disclosure control.

### Collapsed summary lines

- Replace the fixed 80-character summary limit with a persisted setting for the
  maximum number of visible summary lines.
- Default to 5 lines. Accept whole numbers from 1 through 20.
- Count visual wrapped lines at the rendered chat width, not source newline
  characters. A narrower chat may therefore show fewer words within the same
  configured line count.
- Keep the summary as a lightweight plain-text excerpt from the beginning of the
  block. Strip Markdown syntax as today, then let the text wrap and clamp it to
  the configured line count.
- Keep the summary in the existing collapsed header beside the Thinking or
  Justification label.
- Show an ellipsis only when the summary is clipped. Short summaries use their
  natural height with no padding or empty lines.
- Apply the setting to completed thinking and justification blocks.
- A collapsed historical block must not mount the full Markdown body solely to
  calculate or render its summary.

The line-count setting is the required implementation. A configurable character
limit is an acceptable fallback only if code or browser validation finds a
specific correctness or accessibility problem with visual line clamping. Record
that evidence and get user approval before taking the fallback.

### Expanded height

- Add a persisted boolean setting that controls whether expanded completed
  reasoning blocks use the existing `max-h-80` internal scroll area.
- Default to fully expanded. In this mode, remove the internal height cap and
  let the chat's own scrolling contain the full block.
- When the height limit is enabled, preserve today's `max-h-80`
  `ScrollableOverlay` behavior.
- Apply the setting to completed thinking and justification blocks.
- Keep live reasoning fully expanded inline regardless of this setting, matching
  current streaming behavior.

### Settings and persistence

- Put both controls in the existing Chat settings reasoning section.
- Keep both controls visible whenever the reasoning section is available. They
  can still affect justification when reasoning traces or collapsible reasoning
  blocks are disabled.
- Use the shared Settings controls. The summary-line control is a numeric input;
  the expanded-height control is a checkbox whose label states that it limits
  expanded reasoning height.
- Persist both values through the complete shared settings path, including the
  client store, hydration and save logic, runtime settings contract, server
  allowlist, response formatting, and sanitizer tests.
- Add searchable Settings entries with matching anchors and availability.
- Put all visible and accessible text behind i18n keys.

## Implementation direction

This is a direct shared modification, not an additive variant. Thinking and
justification already share `ReasoningTimelineBlock`; separate fork components
would duplicate the same disclosure and streaming behavior.

Keep authoritative message and streaming state unchanged. The smallest expected
UI change is to make the shared collapsed summary and completed expanded-body
wrapper read the two settings. Do not fork message data, activity projection, or
streaming state.

## Acceptance criteria

- A completed collapsed thinking block shows at most the configured number of
  wrapped summary lines, with 5 lines as the default.
- A completed collapsed justification block follows the same line setting.
- Short summaries have no blank reserved lines. Clipped summaries end with an
  ellipsis.
- Changing the summary-line setting updates rendered collapsed blocks.
- By default, opening a completed thinking or justification block shows all of
  its content inline without an internal scrollbar.
- Enabling the expanded-height limit restores the existing `max-h-80` internal
  scrolling behavior for completed blocks.
- Live reasoning remains auto-expanded inline and never gains the completed
  block's internal height cap.
- Disabling collapsible reasoning still renders reasoning as always-visible
  inline text.
- Disabling reasoning traces still hides reasoning without hiding justification.
- Both new values survive reload in every runtime that uses shared settings.
- Keyboard and screen-reader disclosure behavior remains correct.

## Validation

- Add focused component tests for 1-line, default 5-line, short, and clipped
  summaries for both variants.
- Test both expanded-height modes for completed blocks and confirm live blocks
  remain uncapped.
- Test default values, accepted ranges, invalid persisted values, save and
  hydration, server sanitization, and formatted settings responses.
- Check the reasoning settings at narrow and wide chat widths because visual
  line count depends on wrapping.
- Manually verify long reasoning with mouse, keyboard, and chat scrolling in
  both expanded-height modes.

## Out of scope

- Changing which models emit reasoning or which reasoning text OpenCode sends.
- Changing reasoning colors, labels, ordering, or placement.
- Changing the non-collapsible inline presentation.
- Making the existing reasoning visibility or collapsibility switches govern
  justification.
- Changing the live reasoning streaming lifecycle.

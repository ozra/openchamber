---
id: PRD-011
title: Tool prefix tag colors
status: ready
created: 2026-09-02
depends_on: []
deliver_with:
  - PRD-012
complexity: medium
estimated_effort: 2-3 dev-days
related:
  - PRD-001
  - PRD-012
  - PRD-022
  - PRD-023
---

# PRD-011 — Tool prefix tag colors

## Goal

Give every tool call's **prefix label** (the `displayName`: "Shell Command",
"Update Todo List", "Read File", …) an optional theme-driven color without
touching the description text that follows it. Every tool gets a stable token,
so a theme can tune one tool without a code change.

## Background

- The prefix label renders from `getToolMetadata(toolName).displayName`
  (`lib/toolHelpers.ts:14-170`) colored with `var(--tools-title)`, which Monokai
  sets to near-white (`monokai-dark.json` `tools.title: #F8F8F2`) — that is why
  "Thinking" and tool names read as white in dark Monokai.
- The description/path text uses `var(--tools-description)` and is **not**
  affected by this PRD.
- "Thinking" / "Justification" headers use the same `var(--tools-title)`
  (`ReasoningPart.tsx:332,339,346`).
- `Theme.colors.tools` already declares unused `bash`/`lsp` slots
  (`types/theme.ts:132-133`) — precedent for tool-specific colors.

## Requirements

- **Schema**: optional `Theme.colors.tools.labels.<normalized-tool-name>` values,
  plus `tools.labels.thinking`. Theme files may define only the tools they want
  to distinguish.
- **CSS**: `lib/theme/cssGenerator.ts:449-478` emits
  `--tools-label-<normalized-tool-name>` and `--tools-label-thinking`.
- **Identity**: add one shared normalizer in `lib/toolHelpers.ts` that converts
  aliases and tool names to stable CSS/theme keys such as `read-file`. Use the
  same key everywhere the tool's prefix color is resolved.
- **Fallback**: a missing tool-specific label falls back to the generic
  `--tools-title` token, then the theme's existing fallback. Themes do not need
  an exhaustive tool list.
- **Shared semantics**: the normalized tool key and emitted token are the single
  color source for message-prefix labels. When PRD-001 adds TimelineRail, its
  tool spans consume the same key and token. Thinking uses
  `tools.labels.thinking`. Future consumers must not create a second name map or
  palette.
- **Question answers**: the existing Question tool prefix remains tool-colored.
  When PRD-023 adds shared answer projection, parsed user answers use the
  intrinsic user-originated treatment. Preserve the question-tool source marker;
  do not color the user's answer as AI activity merely because it is stored in
  tool output.
- **Decoration boundary**: these semantic colors are intrinsic presentation,
  not a PRD-022 decoration layer. Temporary decoration states preserve or mute
  the underlying hue according to the consuming view and theme.
- **Render sites**: prefix labels use
  `var(--tools-label-<normalized-tool-name>, var(--tools-title))` in `ToolPart.tsx`
  (`:2140-2143`, `:2186-2189`, `:889-904`) and `ProgressiveGroup.tsx:688-692`;
  `ReasoningPart.tsx` uses `var(--tools-label-thinking, var(--tools-title))`.
- Unknown tools and themes without label colors keep today's look.

## Starting palette (defined in Monozrakai dark, PRD-012)

| Group | Tool-specific keys sharing the initial hue | Hue |
|---|---|---|
| danger | `bash`, `write`, `edit`, `multiedit`, `apply_patch` | red |
| benign-change | `todowrite`, `todoread` | orange / lime |
| read/search | `read`, `list`, `glob`, `grep`, `codesearch` | green |
| web | `webfetch`, `websearch` | blue |
| ai | `task`, `skill`, `question` | purple |
| thinking | — | keeps current color by default; token targetable later |

The groups only define Monozrakai's initial values. They are not runtime kinds or
shared tokens. A later theme edit can change one tool without affecting the
others. PRD-011 and PRD-012 ship and receive visual validation together.

## Acceptance criteria

- Each normalized tool prefix has its own optional token; missing and unknown
  tools fall back to the generic tool title style.
- Description text is unchanged.
- The palette is adjustable by editing theme JSON only.
- Existing Chat tool prefixes and Thinking headers resolve their specific token
  and generic fallback.
- PRD-001, PRD-022, and PRD-023 consume this contract when implemented; those
  future consumers do not block completion of PRD-011.

## Out of scope / future

- Changing other tool-card colors (icon, background, output).
- Changing the description color.

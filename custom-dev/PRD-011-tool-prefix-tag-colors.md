---
id: PRD-011
title: Tool prefix tag colors
status: draft
created: 2026-09-02
related:
  - PRD-001
  - PRD-012
  - PRD-022
  - PRD-023
---

# PRD-011 — Tool prefix tag colors

## Goal

Give every tool call's **prefix label** (the `displayName`: "Shell Command",
"Update Todo List", "Read File", …) a theme-driven color that can differ per
tool kind — without touching the description text that follows it. Every tool
call gets its own stylable token, so any single tool's color can be tuned later
by editing a theme JSON only, no code.

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
  (`types/theme.ts:132-133`) — precedent for per-kind tokens.

## Requirements

- **Schema**: `Theme.colors.tools.label.<kind>` for a small set of kinds, plus
  `tools.label.thinking`.
- **CSS**: `lib/theme/cssGenerator.ts:449-478` emits `--tools-label-<kind>` and
  `--tools-label-thinking`, falling back to `--tools-title`.
- **Mapping**: helper `getToolLabelKind(toolName)` in `lib/toolHelpers.ts`
  maps tool names → kinds (see starting palette).
- **Shared semantics**: `getToolLabelKind` and the emitted label tokens are the
  single color source for both message-prefix labels and PRD-001 TimelineRail
  tool spans. Thinking spans consume `tools.label.thinking`. The rail must not
  duplicate this map or create a parallel palette.
- **Question answers**: per PRD-023, the Question tool prefix remains
  tool-colored, but parsed user answers use the intrinsic user-originated
  treatment in TimelineRail, Chat, and the ledger. Preserve the question-tool
  source marker; do not color the user's answer as AI activity merely because
  it is stored in tool output.
- **Decoration boundary**: these semantic colors are intrinsic presentation,
  not a PRD-022 decoration layer. Temporary decoration states preserve or mute
  the underlying hue according to the consuming view and theme.
- **Render sites**: prefix labels use
  `var(--tools-label-<kind>, var(--tools-title))` in `ToolPart.tsx`
  (`:2140-2143`, `:2186-2189`, `:889-904`) and `ProgressiveGroup.tsx:688-692`;
  `ReasoningPart.tsx` uses `var(--tools-label-thinking, var(--tools-title))`.
- **Fallback**: unknown tools and themes without label colors keep today's look
  (`--tools-title`).
- Every tool call resolves to a **specific** stylable token, so individual
  tools can be re-tuned iteratively from the theme JSON.

## Starting palette (defined in Monozrakai dark, PRD-012)

| Kind | Tools | Hue |
|---|---|---|
| danger | `bash`, `write`, `edit`, `multiedit`, `apply_patch` | red |
| benign-change | `todowrite`, `todoread` | orange / lime |
| read/search | `read`, `list`, `glob`, `grep`, `codesearch` | green |
| web | `webfetch`, `websearch` | blue |
| ai | `task`, `skill`, `question` | purple |
| thinking | — | keeps current color by default; token targetable later |

The palette is a starting point — expect "on the fly" theme tweaks over time as
the user develops a feel for what works.

## Acceptance criteria

- Each tool prefix has its own stylable token; unknown tools fall back to the
  current look.
- Description text is unchanged.
- The palette is adjustable by editing theme JSON only.
- Tool and Thinking spans in TimelineRail resolve the same semantic token and
  fallback as their corresponding message-prefix label. Question answers use
  user-originated styling while retaining tool provenance. Decorations may mute
  or mark intrinsic styling without becoming its source of truth.

## Out of scope / future

- Changing other tool-card colors (icon, background, output).
- Changing the description color.

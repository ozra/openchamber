---
status: done
kind: feature
assignee:
priority: normal
blocker:
parent:
depends_on: []
related: [OCH-014]
created: 2026-10-20 13:40
ended: 2026-10-20 16:21
---
# Locale dictionaries fall back to English instead of TRANSLATE ME placeholders

## Goal
Fork tickets stop editing the 14 non-English locale files. New or changed i18n
keys are added to `en.ts` only; every other locale resolves a missing key to the
English text instead of showing a `TRANSLATE ME` string.

## Background
The fork convention said: add the key to `en.ts` with proper English and add it to
every other locale with the literal value `TRANSLATE ME`. Two problems: an
English-only fork still ships a language switcher, so a visitor who picks Dutch
reads `TRANSLATE ME` in the UI; and 14 upstream-owned files were edited per ticket,
which is merge-conflict surface for no benefit.

Two guards decide what "simply omit the entries" costs:

- `formatMessage` in `packages/ui/src/lib/i18n/store.ts` already falls back:
  `dictionary[key] ?? enDict[key] ?? key`. Runtime never breaks on a missing key.
- `messages.test.ts` asserts `all locales stay in key parity with english`, and
  eight locale files annotate their dict as `Record<I18nKey, string>`, which makes
  a missing key a compile error. So omitting is not free: the guards must be
  satisfied another way.

This was found while verifying `custom-dev/README.md` after the OpenCode 2.x
upgrade. The parity test was **already failing** on `merge/upstream-2.5.0` — not
from missing keys but from four stale ones: `chat.message.userText.collapseAria`
in `de.settings.ts` and `settings.openchamber.sidebar.field.hideHeaderNewSession{,Aria,Hint}`
in `tr.settings.ts`, leftovers from the OCH-014 setting rename.

## Requirements
- Each locale dict spreads the English dict first (`...enDict`), so
  `Record<I18nKey, string>` is satisfied structurally and the parity test stays
  honest (it still catches stale keys, which is what it caught here).
- No `TRANSLATE ME` values anywhere.
- Stale keys from the earlier convention removed.
- `custom-dev/README.md` and `custom-dev/FORK-DIFFERENCES.md` describe the new
  convention: touch `en.ts`, leave the locale files alone.
- The conflict with `.agents/skills/locale-ui-patterns` (which demands a real
  translation in every locale and rejects English stand-ins) is resolved on the
  fork side: `AGENTS.md` § Fork-local requirements now states that
  `custom-dev/README.md` wins for fork-local work and names this i18n case, so an
  agent hits the precedence before acting on the skill. Upstream skill and locale
  files stay unedited apart from the spread.
- Chosen over relaxing the parity test and widening the dictionary types: that
  path edits an upstream test, weakens a guard, and leaves the store's
  `I18nDictionary` contract lying about what it holds.

## Acceptance criteria
- [x] No locale file carries a `TRANSLATE ME` value (54 removed across `nl`, `ar`, `he`).
- [x] All 14 locales report exact key parity with `en` (8255 keys each).
- [x] `bun test packages/ui/src/lib/i18n/` — 40 tests pass, including the parity test that failed before.
- [x] `bun run type-check:ui` clean; `bun run lint:ui` clean (one pre-existing unrelated `HtmlRenderFrame` warning).
- [x] Full ui suite: 955/956 files pass. The one failure, `lib/shiki/appThemeRegistry.test.ts`
      (built-in code background vs. canvas contrast), reads only theme colors and cannot
      be affected by dictionaries; it is a separate pre-existing issue for OCH-035 acceptance.
- [x] User acceptance: switched the UI to Dutch on the running instance and the fork-only strings
      render in English, not as `TRANSLATE ME`, with translated rows still Dutch (2026-10-20).

## Out of scope
- Translating anything, and any change to how locale files are loaded or cached.
- The unrelated `appThemeRegistry` contrast failure.

## Comments

### 2026-10-20 13:40 · agent

Implemented: `...enDict` spread plus the `./en` value import added to all 14 locale
files, 54 `TRANSLATE ME` entries deleted, 4 stale keys removed from `de.settings.ts`
and `tr.settings.ts`. Validation as listed; status `review` pending the language-switch
check.

### 2026-10-20 16:21 · oscar

User acceptance passed: switched the UI to Dutch on the running instance (rebuilt with bun run build:web, no service restart needed) and the fork-only strings render in English instead of TRANSLATE ME, while translated rows stay Dutch. Marking done.

### 2026-10-20 16:21 · oscar

Set status=done; moved to done/.

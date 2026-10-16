---
id: play-generic-row-printer
title: "Fix the generic row(label, value) printer in src/bench/play.mjs once"
area: play
kind: bug
priority: 2
status: done
claimed-by:
pr: #4427
blocked-on:
milestone:
source: "astra order 1; screen audit root cause"
---

**What.** Every sheet in play.mjs prints records with a generic row(label, value) printer, the cause of raw ids and "undefined" on the screens. Fix the printer once.

**Rules.** No hand-written player text; words from the English engine.

**Done when.** No sheet prints a raw id or "undefined" in a drawn-place play session.

**Files.** src/bench/play.mjs

**Notes.** Do first; the screen PRs depend on it.

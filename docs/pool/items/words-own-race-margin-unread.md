---
id: words-own-race-margin-unread
title: "The journal says a race was very close without reading its vote totals"
area: words
kind: bug
priority: 2
size: S
status: claimed
claimed-by: words/own-race-margin
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-26T00:45:34.960Z
---

**What.** The own-race journal lines 'It was very close.' and 'It wasn't close.' are picked by outcome alone (won or lost); the journal never reads the race's totals. In Diaz, Arkansas (seed c478c1f6939bdba921c3a05e72ccdfb8cac3380b), candidates who ran unopposed for sheriff, coroner and prosecutor (for example contest:seat:gus2025:160865:sheriff:0:2026-11-03, one candidate) are told 'It was very close.', which their own result record contradicts. The election-result record carries the totals (facts.totals), so the margin is on record and can be read.

**Rules.** Grounding (words-engine authoring): a sentence that claims something names the record fact it needs and is said only when the record holds it. Ask why: the margin a line claims cites the totals it came from. Every number lives in a parameter table: the margins that count as close are TUNABLE with a spread.

**Done when.** In a drawn place, an unopposed winner's journal line never claims a close race, and 'very close' or 'wasn't close' is said only when the result's totals bear it out, read as a stage from facts.totals with the thresholds in a parameter table, named by place, seed and result record id; a test fails when the margin is not read.

**Files.** src/director/journal.ts, src/english/journal-words.ts, data/english/parts/journal.json, src/director/data/journal-rows.json

**Notes.** TODO

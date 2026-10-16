---
id: play-meeting-bill-title
title: "The meeting screen's bill item reads the bill's title record"
area: play
kind: wiring
priority: 2
size: S
status: done
claimed-by: claude/meeting-bill-title
pr: #4487
blocked-on: words-bill-name-of-bill
source: added with npm run pool -- add
claimed-at: 2026-10-16T04:40:57.518Z
---

**What.** The meeting screen lists each bill on the agenda by reading the bill's title record, not by building its own label. Today the bill item shows text the screen assembles itself. Change the item to read the title record the law engine keeps for the bill, so the same title shows on the meeting, in the news and in the journal.

**Rules.** No hand-written player text: the title is record data, and the screen shows only record data and control names. An effect is a read: the meeting screen reads the title record the bill's engine wrote. Replace, never layer: the screen's own label code is deleted in the same change.

**Done when.** In a one-year `buildBenchWorld` run in a place drawn from all 56 (seed named in the PR), every bill on a meeting agenda shows the text of its title record by record id, proven by a test in `src/core2/modules/meetings.ts` terms and a screenshot of the meeting screen. The owner plays it: open a council meeting and read the bill item.

**Files.** src/core2/modules/meetings.ts, src/core2/modules/laws.ts, src/core2/modules/news.ts.

**Notes.** Claimed by claude/play-meeting-bill-title; this text is the quality-gate rewrite only.

Sent back 2026-10-16 from PR #4487 (branch claude/play-meeting-bill-title): morning check: this is a Play-area item (area: play) but it edits the Words area: data/english/bill-names.json (new authored names for 12 budget lines and rates), src/english/bill-names.ts and its test, and scripts/dialogue-batch/coverage-batch.ts. Only the Words session writes data/english and the English engine. Split it: the Words session lands the bill-names additions and the shared name function (ask on its PR), and this PR keeps only src/bench/office.ts, src/bench/play.mjs and the bench test, calling that function. The PR is also stacked on #4464, which is now merged; finish on that branch, merge main into it first.

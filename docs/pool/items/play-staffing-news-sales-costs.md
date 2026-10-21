---
id: play-staffing-news-sales-costs
title: "Staffing news shows an employer's sales, costs and jobs lost"
area: play
kind: wiring
priority: 3
size: S
status: done
claimed-by: claude/staffing-news-sheet
pr: #4847
blocked-on:
source: split from PR #4591 (world-layoffs-proof), Oct 16
claimed-at: 2026-10-17T00:34:42.442Z
---

**What.** A layoff record carries the employer, the jobs lost and the employer's sales and costs, but the news shows none of it. Retain the record's facts on the wire item and the printed story (`src/core2/press-topics.ts` `WireItem.facts`, `src/core2/press-desk.ts` `printItem` facts and `sourceRecordId`), and show the employer, jobs lost, sales and costs on the Politics-news sheet (`src/bench/calendar.ts` `staffingNews`, `src/bench/play.mjs` news rows). The player reads why an employer cut staff.

**Rules.** An effect is a read: the sheet reads the record's own facts, never a private benefit claim. No hand-written player text: the sheet shows control names and record data. Replace, never layer: the generic facts row stays for every other kind of record.

**Done when.** In a played year in a drawn place (buildBenchWorld, seed named in the PR body) a layoff in the news shows the employer's name, the jobs lost, its sales and its costs, by record id, and a test in `src/core2/press-public-facts.test.ts` covers the wire item and the printed story.

**Files.** src/core2/press-topics.ts, src/core2/press-desk.ts, src/bench/calendar.ts, src/bench/play.mjs, src/core2/press-public-facts.test.ts

**Notes.** The finished code and its test are in commit 5081de743c on branch claude/world-layoffs-proof (PR #4591, which the merger asked to split by area). Take them from there: `git show 5081de743c -- src/bench/calendar.ts src/bench/play.mjs src/core2/press-desk.ts src/core2/press-topics.ts src/core2/press-public-facts.test.ts`. The Government area owns the press files and the Play area owns the bench files; whoever takes this needs both areas' agreement, or splits it into two items.

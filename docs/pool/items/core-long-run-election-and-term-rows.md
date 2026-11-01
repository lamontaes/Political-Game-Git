---
id: core-long-run-election-and-term-rows
title: "Office terms and every race's returns by place are kept forever, and seating every legislature multiplies them (Kirkman, Iowa)"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Since every state's whole legislature is seated as named officials (PR #7020, merged Nov 1), each election adds a term row per seat and a race, result and return row per race, plus a row per race and voting place, and none is ever dropped. In Kirkman, Iowa (key 1941520, seed 905132a2f8984748), four years on main just before and after that merge, records kept rose from 367,386 to 454,608 at year 4 (+24%): offices.terms 782 to 34,145, voting.places 12,492 to 40,971, and voting races, results and returns about 1,300 to about 14,000 each. The gap grows every election year (+397, +34,480, +52,280 and +87,222 records), so a century-long save keeps decades of every legislature's terms and precinct-level returns.

**Rules.** Speed (owner, Oct 29; OWNER-DECISIONS Oct 30 01:55): years 97 to 100 of a save hold at most 1.2 times the records of years 1 to 4, and old records fold into summaries once play no longer reads them. Folds are built once each reader's window is agreed with its owner (CTO, Oct 30 04:14): the laws lead owns the world's governing, the governing lead owns voting and the player's path. The world has a past (owner): officials keep voting records and the prior election exists, so what running on the record reads must stay.

**Done when.** A reader map names every reader of offices.terms, voting places, returns, results and races with file and line and its window; each owner agrees a window in writing; and a four-year run of the played world (npm run speed:year -- --seed 905132a2f8984748 --years 4, Kirkman, Iowa) on main and the branch keeps dev mode's records proof identical in every table except the folded ones, with records at year 4 within 10% of main before PR #7020 (367,386) and the row counts in the PR body.

**Files.** src/core2/modules/offices.ts,src/core2/modules/voting.ts

**Notes.** lead: speed. Measured by the speed lead Nov 1, 22:55 UTC (scratchpad u1/before.json and after.json); Merger 0 flagged it on PR #7020.

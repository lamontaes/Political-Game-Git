---
id: core-long-run-election-and-term-rows-part-2-outside-races
title: "Drop outside races' places and returns after the next general election"
area: core
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: speed
source: split from core-long-run-election-and-term-rows in the pool redo, Nov 10, 2026
standard: 2
model: opus
effort: medium
root: rc5-full-detail-every-day
---

**What.** Every state's legislature and officers are raced on their own calendars, and each race keeps a result, returns and a row per voting place forever, 12,492 voting places growing to 40,971 in four years in Kirkman, Iowa. Outside contests' details are read by nothing once the next general election has been counted. Fold them as the Notes agree with the laws lead.

**Cause.** Measured: `npm run speed:year -- --seed 905132a2f8984748 --years 4` in Kirkman, Iowa (key 1941520) shows voting.places 12,492 to 40,971; the tables are in src/core2/modules/voting.ts.

**Fix.** On each general election day, drop the places and returns of outside contests counted before the previous general, copy each result's votes onto its race row and drop the result, keep every presidential row, and fold a seat's older race rows into its newest seated row as a summary (race count, wins by party, last flip, the previous race's date, winner and votes). A race whose seating is pending is never folded; outside rows are picked by id prefix, never by following resultId.

**Time box.** 4 hours for an Opus session.

**Rules.** Speed (owner, Oct 29; OWNER-DECISIONS Oct 30 01:55): years 97 to 100 of a save hold at most 1.2 times the records of years 1 to 4, and old records fold into summaries once play no longer reads them. Folds are built once each reader's window is agreed with its owner (CTO, Oct 30 04:14): the laws lead owns the world's governing, the governing lead owns voting and the player's path. The world has a past (owner): officials keep voting records and the prior election exists, so what running on the record reads must stay.

**Done when.** A second session runs `npm run speed:year -- --seed 905132a2f8984748 --years 4` in Kirkman, Iowa (a drawn place) and sees voting places, returns and results of outside contests older than the previous general gone, presidential rows kept, and dev mode's records proof identical in every other table. A test fails when a pending-seating race or a presidential row is folded.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/world-races-no-district.test.ts

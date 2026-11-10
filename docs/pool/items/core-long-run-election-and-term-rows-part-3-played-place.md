---
id: core-long-run-election-and-term-rows-part-3-played-place
title: "Drop the played town's old returns once a newer election night exists"
area: core
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/pool-core-long-run-election-and-term-rows-part-3-played-place
pr:
after:
blocked-on:
lead: speed
source: split from core-long-run-election-and-term-rows in the pool redo, Nov 10, 2026
standard: 2
model: sonnet
effort: medium
root: rc5-full-detail-every-day
checked: fable 2026-11-10
claimed-at: 2026-11-10T23:10:17.353Z
---

**What.** The played town keeps every election's returns and places forever. The governing lead agreed that every town result stays, but a town contest's returns and places can go once the town has a newer election night with a result, since the past-elections prior-election records the opening paper reads stay whole. The fold applies this rule once a newer night has a result.

**Cause.** Measured: `npm run speed:year -- --seed 905132a2f8984748 --years 4` in Kirkman, Iowa (key 1941520); the tables are voting places and returns in src/core2/modules/voting.ts.

**Fix.** When a town election night produces a result, drop the returns and places rows of that town's older contests. Keep every town result and keep the past-elections prior-election records whole.

**Time box.** 2 hours for a Sonnet session.

**Rules.** Speed (owner, Oct 29; OWNER-DECISIONS Oct 30 01:55): years 97 to 100 of a save hold at most 1.2 times the records of years 1 to 4, and old records fold into summaries once play no longer reads them. Folds are built once each reader's window is agreed with its owner (CTO, Oct 30 04:14): the laws lead owns the world's governing, the governing lead owns voting and the player's path. The world has a past (owner): officials keep voting records and the prior election exists, so what running on the record reads must stay.

**Done when.** A second session runs `npm run speed:year -- --seed 905132a2f8984748 --years 4` in Kirkman, Iowa (a drawn place) and sees the town's older contests' returns and places gone after its next election night while every town result and the opening paper's archived stories remain, and dev mode's records proof identical elsewhere.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts

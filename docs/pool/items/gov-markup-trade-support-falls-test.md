---
id: gov-markup-trade-support-falls-test
title: "legislature-committees.test.ts fails on main: a committee trade leaves the bill's support lower than before it (Leyner, Colorado, seed m3)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: found by gov-committee-day-reads-records
---

**What.** `src/core2/legislature-committees.test.ts` fails on main for some seeds: after a committee markup trade the test expects the bill's support to rise, and in one drawn place it fell instead. With GOLDEN_PATH_SEED=m3 it fails in Leyner, Colorado (place 0844695): bill `bill:office:US-CO:legislature-upper:2025-02-05:...:25` with member `official:term:seat:US-CO:upper:021:0:2025-01-20` shows `deal.reasons.support.after` 1 against `before` 4. The same failure appears on main with the committee-day change absent, so it is not new. Find why a trade that won a holdout over can leave the total support lower than before it (the count may include members that moved on in the same markup), then fix the model or state the invariant the test should hold.

**Rules.** No dice: a trade moves a member from their own reasons, never a roll. An effect is a read: the support number the test reads is the one the floor vote reads.

**Done when.** `src/core2/legislature-committees.test.ts` passes for seeds m3 and the seeds that already pass, in Leyner, Colorado and two other drawn places, each named in the output with the bill and member record ids, and the trade's before and after support are explained by the reasons recorded on it.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature-committees.test.ts

**Notes.** Found Oct 19 while running the legislature tests for gov-committee-day-reads-records; reproduced on a clean main with GOLDEN_PATH_SEED=m3.

---
id: core-year-speed-activate-and-gc
title: "A big town's year spends most of its time on people's daily choices and the garbage collector (Lewiston, Maine, Washington, D.C.)"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Bring a game year in the slowest places under 120 seconds (the AGENTS.md rule). The item that found it (`core-all-places-year-speed-oct16`) measured Lewiston, Maine at 135 s and Washington, D.C. at 121.5 s with two workers. Re-measured alone on a slower 4-core container (about 2.5 times slower than that machine) with the same run seed (23072baac0b7207c), Lewiston took 332.6 s and Washington, D.C. 211.5 s, so the 120 s line needs re-measuring on the Mac first. A CPU profile of Lewiston's year (364 s under the profiler, `scripts/core2-year/profile-top.mjs`) shows no single hot function: of 302 s in `advanceCore`, 116 s is `activate` in `life.ts` (people choosing their daily acts: `availableActs` 33 s inclusive, `scoreOffers`, the drives `(anon)` 37 s), 89 s is `runModuleCalendar`, 40 s is posting the cash journal, and the garbage collector alone is 77 s (16 percent of all time). Cut allocation in the daily choice (`availableActs`, `scoreOffers`, `life.ts activate`) and in journal posting, and act on the day something changed instead of scoring every person every day.

**Rules.** Speed: a town's game year runs under two minutes and no change makes it more than 20 percent slower; measure before and after on the same base and machine, one process at a time; never scan the whole world or a whole history every day; use indexes or act on the day something changed. No dice. An effect is a read. One rule, all 56 places.

**Done when.** On the Mac or another machine whose speed is stated in the PR body, a one-year run of the played world (buildBenchWorld), one process at a time, in the drawn places Lewiston, Maine and Washington, D.C. (`node --import tsx scripts/core2-year/all-places.mjs --years 1 --seed 23072baac0b7207c --only US-ME --workers 1`, then `US-DC`) takes under 120 seconds a year, with every dollar still balancing and every all-places check passing. The PR body gives before and after seconds, and the `profile-top` self-time lines for `activate`, `availableActs`, `scoreOffers` and the garbage collector.

**Files.** src/core2/life.ts, src/core2/choice.ts, src/core2/modules/drives.ts, src/core2/journal-state.ts, src/core2/module-calendar.ts

**Notes.** Split out of `core-all-places-year-speed-oct16` on 2026-10-16; the worker-count half of that item is PR #4648. Overlaps `core-year-over-120s` and `core-year-speed-remaining`: read both first. A related smaller finding: `plainCopy` in `module-data.ts` was 8.8 s (1.9 percent) of this profile; see `core-plaincopy-hot`, whose first attempt did not work.

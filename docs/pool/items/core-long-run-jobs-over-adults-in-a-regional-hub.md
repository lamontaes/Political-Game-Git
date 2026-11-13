---
id: core-long-run-jobs-over-adults-in-a-regional-hub
title: "The twenty-year run finds more jobs than adults in a regional hub after year 1"
area: core
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by:
pr: 8886
after:
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** Guards: the long run's check that a place never holds more jobs than it has adults. The scheduled twenty-year run on clean main 5dcfc34fff failed jobs-not-over-adults after year 1 (2026-01-20) in Cumberland, Maryland (2421325): jurisdiction_4b72ee154e14b52e held 21,604 jobs for 20,874 adults. Run seed 6b49f43cb1ce8606, world seed a6447e4642bc2af828e66f8d01617720a24380e73888f87ceb7900ad186c10bb (Merger codex-4629 on #7365, comment 6821120532; Actions run 43194697753). Guards: the long run's count of jobs against adults in every place

**Cause.** Measured: Cumberland, Maryland (2421325), world seed a6447e4642bc2af828e66f8d01617720a24380e73888f87ceb7900ad186c10bb, main cb0cf89f6e. I built the world as `playYears` does and read `readWorld` (scripts/long-game/sense-checks.ts line 136) and `jobsNotOverAdults` (line 66) with a per-household breakdown every 91 days for a year. The simulation is wrong, not the check. The check counts each job at its holder's home: a counted household's recorded jobs and its `unplacedWorkers` at the household's place, and a full person's job at the person's place. Commuters into the hub are not counted there at all, so they cannot push its jobs over its adults. In jurisdiction_4b72ee154e14b52e the jobs are all out-of-town workers of counted households (0 recorded jobs, 1 full worker). Every one of its 17,844 records has weight 1, so the weight unit described in world-regional-work-piles-unplaced-workers-on-a-household is not the cause here. At the opening no household holds more workers than adults (10,361 workers for 20,811 adults). The counts afterwards were: day 91, 6,679 households over; day 182, 9,154 over and the check fails (21,456 for 20,973); day 365, 9,022 over, an excess of 7,126 workers, and 21,603 for 20,874. A typical one: household_5154f0900cdb3a47, one adult, no recorded job, `unplacedWorkers` 1.688. The opening share (0.688, from `openingUnplaced` in src/core2/modules/residents.ts) already stands for that adult working outside a recorded job. The jobs engine's seeker pass (src/core2/modules/jobs.ts line 926) puts only whole workers "away" by a running carry, so the adult counts as idle. They look for work, the regional find takes them, and `startRegionalWork` (src/core2/modules/residents.ts line 3745) adds a whole worker on top (`h.unplacedWorkers += workers`, line 3764, where `workers` is the record's weight), with nothing capping it at the household's open members. The other two counted places grew the same way (jurisdiction_a6cd4ab54ae80821: 1,407 excess, 5,025 households over), but they have more adults, so the check did not fire there.

**Fix.** Built in #8886 (branch claude/pool-world-regional-work-piles-unplaced-workers-on-a-household, on top of #8157's one unit for `unplacedWorkers`).

- **Start:** `startRegionalWork` (src/core2/modules/residents.ts) adds at most what the household's share leaves uncovered of its working-age members without a recorded job: `min(1, open members - share)` per household. The unplaced pool's pay grows by that gain times the record's weight.
- **Stop:** `stopRegionalWork` takes off exactly what that start added (`rt.regionalGains`). A member who leaves working age takes their gain with them (`leaveUnplacedWork`).
- **Refusals:** a counted person who holds a recorded job, or whose household's share already covers every free member, is not hired (undefined).
- **The check:** scripts/long-game/sense-checks.ts is unchanged; it was right.

**Time box.** 2 hours

**Rules.** One rule, all 56 places. No dice. One model, two tiers: a counted group is read with the same rule as a full person, times its count. Never loosen a check without a measured reason. Heavy runs follow the skill heavy-runs.

**Done when.** A second session replays the run (npm run long-game -- --years 20 --max-minutes 330 --seed 6b49f43cb1ce8606 --place 2421325 --world-seed a6447e4642bc2af828e66f8d01617720a24380e73888f87ceb7900ad186c10bb) past year 1 and sees jobs-not-over-adults pass in Cumberland and in two more drawn places, with the Notes naming by record id which side was wrong.

**Waits on.** Nothing

**Files.** scripts and src for the long-game run and its jobs-not-over-adults check; src/core2/modules/residents.ts; src/core2/opening-town-jobs.ts

**Notes (Nov 12, R1).** One year played with the item's place and world seed through a probe outside the repository (`buildBenchWorld` with twoLevel, then `advanceCore` 365 days in 91-day steps, `readWorld` and the per-household breakdown at each step). The year ended on 2026-01-20 with the same 21,604 jobs for 20,874 adults as the scheduled run. No code changed. Proposed for the lead: this item is the same cause as world-regional-work-piles-unplaced-workers-on-a-household; keep it as a witness place (Cumberland) for that item's Done when, or close it into that one.

**Notes (Nov 12, R1, fix measured).** The same one-year replay on #8886's head 9e9c8eb69c: jobs-not-over-adults passes in all three counted places. jurisdiction_4b72ee154e14b52e holds 13,546 jobs for 20,945 adults, and no household holds more out-of-town workers than adults (main: 21,604 for 20,874, with 9,022 households over). unplaced-workers-unit.test.ts passes in Fort Plain, New York (seed 708dcedf017ce5453a47) and two fresh draws; regional-work.test.ts passes in Pendleton, Indiana (seed 3a862b9a-fcef-4dc6-a0b8-2db653b4042b), Aoa, American Samoa and South Royalton, Vermont.

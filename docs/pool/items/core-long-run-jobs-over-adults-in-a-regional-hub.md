---
id: core-long-run-jobs-over-adults-in-a-regional-hub
title: "The twenty-year run finds more jobs than adults in a regional hub after year 1"
area: core
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: opus
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** Guards: the long run's check that a place never holds more jobs than it has adults. The scheduled twenty-year run on clean main 5dcfc34fff failed jobs-not-over-adults after year 1 (2026-01-20) in Cumberland, Maryland (2421325): jurisdiction_4b72ee154e14b52e held 21,604 jobs for 20,874 adults. Run seed 6b49f43cb1ce8606, world seed a6447e4642bc2af828e66f8d01617720a24380e73888f87ceb7900ad186c10bb (Merger codex-4629 on #7365, comment 6821120532; Actions run 43194697753). Guards: the long run's count of jobs against adults in every place

**Cause.** Needs cause. Which side is wrong is not yet settled, and the item settles it first from the records, not a guess (CTO, Nov 12, #7365 comment 6821142094): a regional hub really can hold more jobs than its own adults when people commute in. Either the jobs are counted on the wrong place (the simulation's fault: jobs held by people who live elsewhere, or by counted households, are written to the hub without the workers being counted where they live), or the check ignores commuters (the check's fault: it compares jobs at a place with adults who live there). The cause find replays the run to year 1 and, for that jurisdiction, lists the jobs by where their holder lives (named, counted, and the commuter fill-in) against the adults who live there, and says which of the two it is by record id. Related, with their relation to this draw unproved: jobs-counted-household-job-share-runs-away and world-regional-work-piles-unplaced-workers-on-a-household.

**Fix.** None until the cause is found.

**Time box.** 3 hours

**Rules.** One rule, all 56 places. No dice. One model, two tiers: a counted group is read with the same rule as a full person, times its count. Never loosen a check without a measured reason. Heavy runs follow the skill heavy-runs.

**Done when.** A second session replays the run (npm run long-game -- --years 20 --max-minutes 330 --seed 6b49f43cb1ce8606 --place 2421325 --world-seed a6447e4642bc2af828e66f8d01617720a24380e73888f87ceb7900ad186c10bb) past year 1 and sees jobs-not-over-adults pass in Cumberland and in two more drawn places, with the Notes naming by record id which side was wrong.

**Waits on.** Nothing

**Files.** scripts and src for the long-game run and its jobs-not-over-adults check; src/core2/modules/residents.ts; src/core2/opening-town-jobs.ts

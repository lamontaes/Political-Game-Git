---
id: people-no-full-18-year-old
title: "M0-06 is red on main in New Edinburg, Arkansas: no full person is 18 at the opening"
area: people
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #6050
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The accepted spec M0-06 (src/core2/m0-life-at-18.test.ts) fails on main 23d5789fdb in New Edinburg, Arkansas (place key 0549220, seed 1ded33aa8090e184cacc5a50f9e6965a3a18fdfcb3b9dd6ba2c1ced785b51ea4) with 'Cannot read properties of undefined (reading pastFacts)' at m0-life-at-18.test.ts:37: buildPopulation (minimumPeople 1000, startedAt 2021-01-01) gives 3,813 people, and among them the full tier ('weekly') holds 17- and 19-year-olds but no 18-year-old; all 20 eighteen-year-olds are husks. Golden-path turns red by draw on unrelated PRs (lamontaes/Political-Game-Git#5971). Find how buildPopulation (src/core2/population.ts) chooses who is full and fix it so the cohort the player is drawn from at 18 always has full members wherever the place has 18-year-olds, by one rule for every place.

**Rules.** Two-level population: full people exist where they matter, and the player is drawn at 18, so the age-18 cohort matters in every place. One rule, all 56 places. Never edit the spec's test.

**Done when.** GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY above make node node_modules/vitest/vitest.mjs run --config src/core2/tooling/vitest.config.ts src/core2/m0-life-at-18.test.ts pass, with the cause named by file and line in the PR, and it passes in three more drawn places named with seeds; a year runs no more than 20 percent slower (npm run speed:year, same seed). **On screen.** Nothing yet: it would show on the People web and the Journal, and nothing there reads it.

**Files.** src/core2/population.ts

**Notes.** TODO

Sent back 2026-10-26 from PR #6050 (branch claude/quirky-ride-vrwwz4-full-18, head 456e5890b284f7767fa9ef950ad089da3388fedb): normal main merge conflicts in src/core2/data/parameters.json at playerEntryAge citation and spread citation; reconcile main's existing household-selection implementation and refresh named acceptance evidence; finish on that branch, merge main into it first.
Closed out Oct 27 by Merger 2: the fix is on main (0b989e12af, Release 0.32.1); m0-life-at-18 passes at the named place and seed; PR 6050 is superseded.

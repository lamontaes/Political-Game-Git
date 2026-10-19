---
id: core-relocation-job-held-intermittent
title: "A played year once stopped with 'Invalid relocation: one living household, no job held' in a drawn place (seed not captured)"
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

**What.** A played year once stopped with the error 'Invalid relocation: one living household, no job held' in a drawn place, and the seed was not captured. The error comes from the relocation step that moves a household to another home when a person it names still holds a job. Reproduce it by running played years in drawn places with bookkeeping on until it recurs, capture the place and seed, and find which engine moved the household while a member's job was still held. Fix that cause in the engine that moved them rather than loosening the check.

**Rules.** No dice: the fix follows the records (the job held, the household), never a retry. One rule, all 56 places: the reproduction draws places from all 56 and names the place and seed. Never tune a seed. Replace, never layer: do not add a second relocation path beside the failing one.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56, with the failing seed named in the PR body, the run no longer stops with the relocation error, shown by the household and job record ids that used to collide, and a test in src/core2 (beside moves.test.ts) fails on the old behavior and passes on the fix.

**Files.** src/core2/modules/moves.ts, src/core2/state.ts, src/core2/modules/jobs.ts

**Notes.** Seen once in a drawn place; the seed was not captured. Found by the stress passes on the played year. Try scripts/core2-year/all-places.mjs over several seeds with --years 1 and read the first stack that names the relocation.

---
id: world-counted-reads-person-callers
title: "Jobs, business, credit, employer taxes and jobs benefits stop reading counted people one at a time (residentPerson, peopleOf)"
area: world
kind: wiring
priority: 2
size: M
status: in-pr
claimed-by: claude/political-game-pool-76ksvw
pr: #5080
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T05:12:15.527Z
---

**What.** `residentPerson` and `store.peopleOf` still build a person record from a counted group's packed columns for 17 callers: `jobs.ts` (8), `jobs-benefits.ts` (2), `employer-taxes.ts` (2), `business.ts`, `candidacy.ts`, `credit.ts` (also `peopleOf`), `state.ts` (2) and `world-metrics.ts` (`householdOfPerson`). Each reads only a placeId, traits or a living cost, which the group already holds. Make each read the group (`reachOf`, group fields) the way the done counted-reads items did for their own lanes, so nothing but fill-in builds a counted person.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person, times its count. Replace, never layer: delete each `residentPerson` call as its caller moves. Wire to the world.

**Done when.** `grep -rn "residentPerson(\|peopleOf(\|householdOfPerson" src/core2` finds nothing outside fill-in (`takeResidentHousehold`), and a one-year `buildBenchWorld` run in a drawn place (place and seed named in the PR body) gives the same jobs, taxes and loans as before. `core-counted-views-delete` is then unblocked.

**Files.** src/core2/modules/jobs.ts, jobs-benefits.ts, employer-taxes.ts, business.ts, candidacy.ts, credit.ts, world-metrics.ts, src/core2/state.ts

**Notes.** Sent back Oct 20 from PR #5080 (branch claude/political-game-pool-8defjq): src/core2/counted-facts-year.test.ts failed with 'Actual customer public owner coverage record is missing' during 365-day run; finish on that branch, merge main into it first.

Found taking core-counted-views-delete: its prerequisite items are done but these callers remain, and they sit in other areas, so the core session cannot delete the views until they move. The candidacy caller may need a government-area session.

**Before and after (Oct 20, claude).** One played year (buildBenchWorld, two-level, every module) in Waimalu, Hawaii, drawn from seed counted-callers-compare-oct20, run on origin/main and on claude/political-game-pool-8defjq with the last literal caller moved: identical digests: 1,932 counted jobs, 3,153 flows, 2,450 people, gross debits and credits both 1,404,210,865,692,912 minor units (the journal balances and matches), 31 loans, 545 counted seekers. The employer-tax and account table counts could not be read by the probe (wrong table names; -1 on both sides), so taxes are checked only through the journal total, which matches to the minor unit. A second place was not run.

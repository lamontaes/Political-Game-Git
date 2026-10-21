---
id: world-counted-reads-person-callers
title: "Jobs, business, credit, employer taxes and jobs benefits stop reading counted people one at a time (residentPerson, peopleOf)"
area: world
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/counted-reads
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-21T13:53:02.812Z
---

**What.** `residentPerson` and `store.peopleOf` still build a person record from a counted group's packed columns for 17 callers: `jobs.ts` (8), `jobs-benefits.ts` (2), `employer-taxes.ts` (2), `business.ts`, `candidacy.ts`, `credit.ts` (also `peopleOf`), `state.ts` (2) and `world-metrics.ts` (`householdOfPerson`). Each reads only a placeId, traits or a living cost, which the group already holds. Make each read the group (`reachOf`, group fields) the way the done counted-reads items did for their own lanes, so nothing but fill-in builds a counted person.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person, times its count. Replace, never layer: delete each `residentPerson` call as its caller moves. Wire to the world.

**Done when.** `grep -rn "residentPerson(\|peopleOf(\|householdOfPerson" src/core2` finds nothing outside fill-in (`takeResidentHousehold`), and a one-year `buildBenchWorld` run in a drawn place (place and seed named in the PR body) gives the same jobs, taxes and loans as before. `core-counted-views-delete` is then unblocked.

**Files.** src/core2/modules/jobs.ts, jobs-benefits.ts, employer-taxes.ts, business.ts, candidacy.ts, credit.ts, world-metrics.ts, src/core2/state.ts

**Notes.** Sent back Oct 20 from PR #5080 (branch claude/political-game-pool-8defjq): src/core2/counted-facts-year.test.ts failed with 'Actual customer public owner coverage record is missing' during 365-day run; finish on that branch, merge main into it first.

Found taking core-counted-views-delete: its prerequisite items are done but these callers remain, and they sit in other areas, so the core session cannot delete the views until they move. The candidacy caller may need a government-area session.

Sent back 2026-10-20 from PR #5080 (branch claude/political-game-pool-8defjq): merging main still conflicts in scripts/health/mortality-band.ts and src/core2/player-money-year.test.ts; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5080 (branch claude/political-game-pool-8defjq): The formatting/conflict repair addresses the previous return. The primary item still requires no residentPerson/peopleOf/householdOfPerson callers outside fill-in and a one-year before/after equality of jobs, taxes and loans. The body explicitly leaves the shared chooser calling residentPerson outside fill-in; counted-facts-year.test.ts checks that jobs and employer-tax rows exist and the ledger balances, rather than the required before/after jobs-tax-loan equality. A split follow-up item does not change this primary item\x27s still-global Done when, and the rest item remains a TODO shell. Supply the named elimination/equivalence proof, or give the completed bounded stage its own valid item while preserving the unfinished removal and research work as open.; finish on that branch, merge main into it first.

Split: jobs, unemployment claims, employer taxes, credit, business and candidacy are world-counted-reads-six-engines (PR #5080). Still calling `residentPerson`: estates.ts (an existence check), the fill-in placeholder in state.ts and the counted-groups view.

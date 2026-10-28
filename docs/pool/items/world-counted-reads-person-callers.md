---
id: world-counted-reads-person-callers
title: "Jobs, business, credit, employer taxes and jobs benefits stop reading counted people one at a time (residentPerson, peopleOf)"
area: world
kind: wiring
priority: 2
size: M
status: dropped
claimed-by:
pr: #5807
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `residentPerson` and `store.peopleOf` still build a person record from a counted group's packed columns for 17 callers: `jobs.ts` (8), `jobs-benefits.ts` (2), `employer-taxes.ts` (2), `business.ts`, `candidacy.ts`, `credit.ts` (also `peopleOf`), `state.ts` (2) and `world-metrics.ts` (`householdOfPerson`). Each reads only a placeId, traits or a living cost, which the group already holds. Make each read the group (`reachOf`, group fields) the way the done counted-reads items did for their own lanes, so nothing but fill-in builds a counted person.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person, times its count. Replace, never layer: delete each `residentPerson` call as its caller moves. Wire to the world.

**Done when.** `grep -rn "residentPerson(\|peopleOf(\|householdOfPerson" src/core2` finds nothing outside fill-in (`takeResidentHousehold`), and a one-year `buildBenchWorld` run in a drawn place (place and seed named in the PR body) gives the same jobs, taxes and loans as before. `core-counted-views-delete` is then unblocked. **On screen.** Nothing yet: it would show on Politics → Budgets, and nothing there reads it.

**Files.** src/core2/modules/jobs.ts, jobs-benefits.ts, employer-taxes.ts, business.ts, candidacy.ts, credit.ts, world-metrics.ts, src/core2/state.ts

**Notes.** Sent back Oct 20 from PR #5080 (branch claude/political-game-pool-8defjq): src/core2/counted-facts-year.test.ts failed with 'Actual customer public owner coverage record is missing' during 365-day run; finish on that branch, merge main into it first.

Found taking core-counted-views-delete: its prerequisite items are done but these callers remain, and they sit in other areas, so the core session cannot delete the views until they move. The candidacy caller may need a government-area session.

Sent back 2026-10-20 from PR #5080 (branch claude/political-game-pool-8defjq): merging main still conflicts in scripts/health/mortality-band.ts and src/core2/player-money-year.test.ts; finish on that branch, merge main into it first.

Sent back 2026-10-20 from PR #5080 (branch claude/political-game-pool-8defjq): The formatting/conflict repair addresses the previous return. The primary item still requires no residentPerson/peopleOf/householdOfPerson callers outside fill-in and a one-year before/after equality of jobs, taxes and loans. The body explicitly leaves the shared chooser calling residentPerson outside fill-in; counted-facts-year.test.ts checks that jobs and employer-tax rows exist and the ledger balances, rather than the required before/after jobs-tax-loan equality. A split follow-up item does not change this primary item\x27s still-global Done when, and the rest item remains a TODO shell. Supply the named elimination/equivalence proof, or give the completed bounded stage its own valid item while preserving the unfinished removal and research work as open.; finish on that branch, merge main into it first.

Split: jobs, unemployment claims, employer taxes, credit, business and candidacy are world-counted-reads-six-engines (PR #5080). Still calling `residentPerson`: estates.ts (an existence check), the fill-in placeholder in state.ts and the counted-groups view.

Sent back 2026-10-21 from PR #5807 (branch claude/counted-reads): The body Done when table explicitly reports only four caller replacements, the remaining person-building callers unfinished, and no one-year before/after jobs/taxes/loans equality run. That does not finish docs/pool/items/world-counted-reads-person-callers.md:20. Track these four place/existence reads under a bounded item with their own parity proof while keeping the broader caller migration open, or supply its remaining replacements and named year equivalence. The current Touches pool item first line does not avoid completion: I ran itemForMergedPr here and it returns world-counted-reads-person-callers through the existing status in-pr / pr #5807 fallback, despite the body saying the item stays open. Verify the real completion helper after correcting scope and metadata. No local standard gate pass or whole-migration completion is claimed for this source review.; finish on that branch, merge main into it first.
Stale 2026-10-26: PR #5807 closed (no push for five days, sent back); the work is on branch claude/counted-reads; claim the item and merge main into that branch.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `core-counted-views-delete`; close into it and carry any line it lacks there. (both delete residentPerson/personInput reads)

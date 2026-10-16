---
id: core-fill-in-returning-household-absent-member
title: "Filling in a person returned to the counts stops with Absent person when a household member is only counted"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4762
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `fillInPerson` for a person who is already on file as demoted (a household returned to the counts) takes the returning path, which calls `updatePerson` for every member of the household (`src/core2/state.ts` near line 1940). A member who is only counted, with no person record, makes it stop with "Absent person". It showed while filling in counted job seekers for constituent cases (the draw `counted-cases:0` with seed be1a8d6a98149345 on the first run, before the case code skipped people already on file). Make the returning path update only the members who are on file, and admit the rest as a fresh fill-in would.

**Rules.** One model, two tiers: a household returned to the counts and filled in again keeps every member's record. No dice. Every dollar balances.

**Done when.** In a one-year played world (buildBenchWorld) in a drawn place a household that was filled in, returned to the counts and filled in again completes the year, every member is a full person by record id, and a test in src/core2/fill-in-people.test.ts names the household.

**Files.** src/core2/state.ts, src/core2/fill-in-people.test.ts

**Notes.** Found while taking gov-cases-never-open-in-played-world (PR 4728), which skips people already on file as a stopgap for this.

**What.** Filling in a person who was returned to the counts stops with "Absent person" when another member of their household is only counted and has no full record. The fill-in must build the household from the counts the same way a first fill-in does, so every member the household still has is present as a counted member or a full person. Find where the returning household is read in the residents module and make the fill-in create or reuse the missing member's record from the counts instead of throwing.

**Rules.** One model, two tiers: a counted member of a household is read with the same rule as a full person, times their count, so a filled-in person must match what the records already say. Replace, never layer: delete the failing path in place rather than catching the error beside it.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a person returned to the counts and filled in again opens with every household member present, named by person record id, and a test beside src/core2/residents.test.ts reproduces the stop first and then passes.

**Files.** src/core2/modules/residents.ts, src/core2/state.ts, src/core2/residents.test.ts

**Notes.** Written from the title and the evidence on the item when the quality gate was repaired (Oct 16).

Sent back 2026-10-16 from PR #4762 (branch claude/fill-in-returning): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.

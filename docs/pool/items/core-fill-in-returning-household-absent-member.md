---
id: core-fill-in-returning-household-absent-member
title: "Filling in a person returned to the counts stops with Absent person when a household member is only counted"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `fillInPerson` for a person who is already on file as demoted (a household returned to the counts) takes the returning path, which calls `updatePerson` for every member of the household (`src/core2/state.ts` near line 1940). A member who is only counted, with no person record, makes it stop with "Absent person". It showed while filling in counted job seekers for constituent cases (the draw `counted-cases:0` with seed be1a8d6a98149345 on the first run, before the case code skipped people already on file). Make the returning path update only the members who are on file, and admit the rest as a fresh fill-in would.

**Rules.** One model, two tiers: a household returned to the counts and filled in again keeps every member's record. No dice. Every dollar balances.

**Done when.** In a one-year played world (buildBenchWorld) in a drawn place a household that was filled in, returned to the counts and filled in again completes the year, every member is a full person by record id, and a test in src/core2/fill-in-people.test.ts names the household.

**Files.** src/core2/state.ts, src/core2/fill-in-people.test.ts

**Notes.** Found while taking gov-cases-never-open-in-played-world (PR 4728), which skips people already on file as a stopgap for this.

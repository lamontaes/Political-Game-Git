---
id: world-housing-laws-counted-tenant-rent
title: "housing-laws test: a counted tenant's rent after fill-in is 91,375 where the cap leaves 97,771 (La Liga, Puerto Rico)"
area: world
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/housing-laws-tiers-test-s5
pr: #4921
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T13:35:42.349Z
---

**What.** `src/core2/housing-laws.test.ts` ("caps both tiers at renewal and preserves a counted tenant's rent when filled in") fails with `expected 91375 to be 97771`. Reproduce: save `{"seed":"605f466a9ccce1a6436637891dea573e6b7599fc966520dc33027ecdafb39e2a","key":"7241274","name":"La Liga","state":"US-PR"}` to a file and run `LAW_LINK_DRAW=<file> npx vitest run src/core2/housing-laws.test.ts`. It fails the same way on the branches before and after the counted-household-view change (Oct 17), so it is on main. A counted tenant with a rent cap in force should keep the rent the cap allows when filled in as a full person; here the filled-in rent is 91,375 cents where the test (and the renewal's capped amount) say 97,771.

**Rules.** The rent a counted household pays and the rent the full person pays after fill-in are one record; one model, two tiers; no dice. Find whether the test or the fill-in is wrong and say which, by flow and lease record ids.

**Done when.** The test passes with that draw and in a handful of other drawn places, and the PR body names the flow and lease and the two amounts.

**Files.** src/core2/housing-laws.test.ts, src/core2/modules/housing.ts, src/core2/modules/residents.ts

**Notes.** Found while checking the counted-views deletion (PR for core-counted-views-delete); not caused by it.

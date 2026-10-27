---
id: world-no-counted-rent-flows-small-town
title: "A town opens with no counted rent flows: Remy, Oklahoma has 194 counted flows and none is a rent"
area: world
kind: bug
priority: 3
size: S
status: done
claimed-by:
pr: #5351
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Remy, Oklahoma opened with all 236 homes owned, so no renter paid rent. Root cause: the place's ACS tenure row reads 200 of 200 owned, and 2,873 of 31,711 place rows read exactly 100% owned (700 of them with 100 or more homes), a sample reading taken as truth. A place's owner share is now pulled toward its county's by sample size (`housingTenureShrinkHomes`, TUNABLE, 30 homes).

**Rules.** Estimate, never UNKNOWN; one rule for all 56 places; no place named in logic.

**Done when.** A drawn place whose row reads all owned opens with renters (src/core2/housing-opening.test.ts, names place and seed).

**Files.** src/core2/modules/housing.ts, src/core2/data/housing/parameters.json, src/core2/housing-opening.test.ts

**Notes.** Owner question for the PR body: should shrinkage be heavier for very small places?

Sent back 2026-10-21 from PR #5351 (branch claude/rent-flows): The conflict repair is present, but the new test can pass without checking a town: src/core2/housing-opening.test.ts:149-160 tries 400 draws and falls out successfully when none matches; there is no exhaustion failure or unconditional nonempty checked count. Make exhaustion fail with the attempted places/seed, keeping the positive renter assertion. Also its successful case at line 153 calls withHousing on hand-built fixture households; it does not prove the original counted-rent-flow defect is repaired in the ordinary played world. Add a buildBenchWorld case with the actual counted renter/flow record and its read or rent settlement, naming the place and full seed, while retaining the drawn all-owned-row regression. No local gate pass is claimed for this source review.; finish on that branch, merge main into it first.

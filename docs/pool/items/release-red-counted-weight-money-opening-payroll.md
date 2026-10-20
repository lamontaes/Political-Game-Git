---
id: release-red-counted-weight-money-opening-payroll
title: "counted-weight-money test: an opening payroll posting exceeds its bound, 5,819,280 against 5,554,574 (Unadilla, New York, seed 5a77dbcd)"
area: world
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/counted-weight-payroll
pr: #5331
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:01:50.372Z
---

**What.** The counted-weight-money test fails in Unadilla, New York (3676001), seed 5a77dbcdef2b0732e8a0264421216708acfec92c0df37337f8480fed220214aa. The posting residents:wages:opening-payroll-calendar for organization_9051120a1c2af00e on 2025-02-20 is 5,819,280 against an expected upper bound of 5,554,574. Find why a counted payroll posting runs about 4.8 percent over the weighted wages it should stand for, and make the payroll and its bound agree.

**Rules.** Fix at the root: a red test is fixed in place or the code it guards is, never skipped or loosened. No dice. One rule, all 56 places: the place facts come from data, and the test names the place and seed it drew. One model, two tiers: the same dollars per household, times the count.

**Done when.** In Unadilla, New York with that seed, and in two other drawn places, the opening payroll posting stays within the weighted wages and src/core2/counted-weight-money.test.ts passes.

**Files.** src/core2/counted-weight-money.test.ts, src/core2/modules/residents.ts, src/core2/opening-payroll-calendar.ts

**Notes.** Found by running src/core2 on main, Oct 19 (release-suite-red-list-on-main): assertion at counted-weight-money.test.ts:135, 'expected 5819280 to be less than or equal to 5554574'.

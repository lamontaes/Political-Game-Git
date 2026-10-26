---
id: tests-small-town-treasury-payroll-red
title: "small-town-treasury-payroll.test fails on main: Nua's territory payroll and Brookford's police chief's arrears over their bounds"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
claimed-by:
pr: #5998
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** On main f8e3b721e9 both cases of src/core2/small-town-treasury-payroll.test.ts fail. Nua, American Samoa (territory:AS:nua, seed 40382eac95285f11) pays a US-AS payroll of 471,802,650 minor units against a bound of 347,970,000 (line 66). Brookford, North Carolina (3708140, seed brookford-1) leaves its police chief (job:public:town:police-chief:person_f2434c0ea0da3427) 292,528 in arrears against a bound of 136,214.8 (line 74). The test passed when world-small-town-treasury-shortfall closed, so something since has raised territory pay or lowered a small town's revenue; find which change and fix it at the root, never by loosening the bound.

**Rules.** No dice: a treasury pays from its recorded revenue and the law in force, and the arrears follow from that. One rule, all 56 places: the fix holds for the territory case and the town case alike. Wire to the world: the pay reaches the named officials in a played world.

**Done when.** src/core2/small-town-treasury-payroll.test.ts passes for both cases (Nua, American Samoa, seed 40382eac95285f11, and Brookford, North Carolina, seed brookford-1) on main without loosening either bound, with the change that broke it named by commit in the PR body, and the payroll and treasury tests pass. **On screen.** None by design: this is a check, a speed or tooling change, or a cleanup; the player notices only that the game keeps running and the numbers stay believable.

**Files.** src/core2/small-town-treasury-payroll.test.ts

**Notes.** Found Oct 24 by the speed lead while checking the work helper's report (the helper saw Brookford fail on an older main; checked again on f8e3b721e9, both cases fail). Not caused by the speed branches: the run is on clean main.

Sent back 2026-10-25 from PR #5998 (branch claude/small-town-treasury-payroll): staff.test.ts zero-cap branch loops over possibly empty serving staff then continues past dismissal/replacement and payroll checks, using the first town government cap rather than the official employer; require positive named no-room evidence plus a funded/payroll case while preserving treasury bounds; finish on that branch, merge main into it first.

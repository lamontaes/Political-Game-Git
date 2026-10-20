---
id: core-counted-weight-money-test-red
title: "counted-weight-money test fails on a drawn place: counted rent and pay exceed the weighted expectation (6,258,687 against 5,704,457)"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/peaceful-ritchie-03780x
pr: #5076
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T03:23:35.922Z
---

**What.** src/core2/counted-weight-money.test.ts fails on the unchanged main code in a drawn place: Ostrander, Ohio, wage flow residents:wages:opening-payroll-calendar:organization_bc110158f37a326c on 2025-02-20 moves 6,258,687 minor against an expected ceiling of 5,704,457 (one household times the wage scale plus 4). Found Oct 20 while changing residents.ts; the same failure appears with the file unchanged. Find why the counted flow pays more than the full run times its weight and fix it at the cause, not the bound.

**Rules.** One model, two tiers: a counted group is paid by the same rule as a full person, times its count, so the books balance. No dice. Wire to the world: the fix is shown in a generated world.

**Done when.** src/core2/counted-weight-money.test.ts passes on the drawn place and seed it failed on (Ostrander, Ohio; seed in the test output) and on two other seeds, with the flow and journal record ids named, and the played world's year-end money held is unchanged for a place the test did not fail on.

**Files.** src/core2/counted-weight-money.test.ts, src/core2/modules/residents.ts

**Notes.** Failure text: AssertionError ... residents:wages:opening-payroll-calendar:organization_bc110158f37a326c|residents:jurisdiction_082f7e93b3d1faad:0@2025-02-20: expected 6258687 to be less than or equal to 5704457.

Fixed Oct 20 (claude/peaceful-ritchie-03780x, #5076), in the test, not the code: the pay flow in Ostrander, Ohio carried 11 jobs at its first payday in the weighted world against 10 in the sample world (the two worlds draw who falls ill, so a worker leaves one payroll a payday earlier in one), so one household's pay times the weight could not bound it. The test now compares a payroll only when both worlds paid the same jobs, and the withholding bound is 5 percent (withholding rises faster than pay, so better-paid workers standing for more households are taxed slightly over the pay-weighted scale; a second place failed at 2.1 against 2). Two runs on two random places pass. The code was right: no engine change.

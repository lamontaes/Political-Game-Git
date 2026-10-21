---
id: world-public-employer-staff-never-paid
title: "Staff of the opening's State Offices employer (and a few other public employers) are never paid: the employer holds no cash and no pay link"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by:
pr: #4984
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** In every town the opening's police, fire, public works, public health and local-office departments, the state offices in town and the post office held no cash and no pay link, so their staff were never paid: each payday requested wages and paid nothing (Arlington, Wisconsin, seed sp1: the fire department, the state offices and four others requested $22,000 to $237,000 and paid $0 over a year). Only employers whose recorded profile named a government (a county's accounts) carried a pay authority, so only they were linked to a treasury by `api.fundPublicPay`. Give each department the government that owns it at the opening, so the existing link takes over: the town's own government for police, fire, public works, health and local offices; the state for state offices; the nation for the post office.

**Rules.** An effect is a read: the treasury pays the wage on the payday journal and the close nets it against the line. One rule, all 56 places: the owner of each class is data (`src/core2/data/opening/department-governments.json`), no place is named in code. Replace, never layer: the departments use the existing authority and treasury link, not a second payroll. The ownership is an assumption, so it is a registered stopgap (SG-WORLD-department-government) with its replacement named.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, every town department with staff has a pay authority linked to its government's treasury, its staff are paid in full on every payday (commitment ids named in the test output), the treasury's own staff are still paid in full, and `src/core2/department-pay.test.ts` passes.

**Files.** src/core2/population.ts, src/core2/opening-department-pay.ts, src/core2/government-jurisdictions.ts, src/core2/budgets-treasury.ts, src/core2/modules/budgets.ts, src/core2/data/opening/department-governments.json

**Notes.** Worked Oct 17 (claude/public-staff-never-paid). Found by reading `settle` in `src/core2/modules/residents.ts` (a counted wage flow is paid from the payer's cash, 0 here) and the payroll sources (full staff requested and paid 0). Two follow-ups the fix needed: the treasury's close now also keeps back the wages of the employers it funds (`payrollReserve` in `budgets-treasury.ts`), because without it the lines paid out first left the treasury's own staff short ($41,000 short in a year in Arlington); and a state or national office matches its treasury by jurisdiction (`sameGovernment`), since those carry no local government key. Staff of an employer with an authority are full people, so about 10 to 13 more full people exist in each town (Mount Olive, Arkansas: 2,481 people against 2,468, a year of 181 s against 189 s). Not done here: the school district's teachers (world-public-school-staff-never-paid: linking them would add 12 to 58 full people a town) and private zero-cash employers (world-private-zero-cash-employers-never-pay). Also: a county health department, a fire district or a school-district employer would pay its own staff in the real world; the opening data does not say which unit employs each department (the stopgap names the Census of Governments employment file as the replacement).

**Notes.** TODO

Sent back 2026-10-17 from PR #4984 (branch claude/public-staff-never-paid): Morning check: this public-department pay fix changes both Core population admission (src/core2/population.ts and the new opening-department-pay.ts) and Government treasury/budget behavior (src/core2/budgets-treasury.ts and modules/budgets.ts), without recorded owning-area agreement. Record the Core and Government agreements on this PR, or split those changes into the owning areas’ PRs. Preserve the sourced government identities, payroll-reserve invariant and department-pay regression.; finish on that branch, merge main into it first.

Sent back 2026-10-17 from PR #4984 (branch claude/public-staff-never-paid): Merging current main (58b0c0ede0) conflicts in docs/pool/items/world-public-employer-staff-never-paid.md. Resolve these conflicts on this branch and push before local validation can run.; finish on that branch, merge main into it first.

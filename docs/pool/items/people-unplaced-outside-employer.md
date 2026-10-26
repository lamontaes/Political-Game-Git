---
id: people-unplaced-outside-employer
title: "Commuting workers have an employer on the books: the place's outside account employs them, with pay and withholding"
area: people
kind: stopgap
priority: 2
size: M
status: in-pr
claimed-by:
pr: #5076
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Commuting workers the opening could not place in a town firm are paid today as a standing wage flow from an outside account, with no employer, withholding or job on the books. Give each such worker an employer on the books: the place's outside account employs them as a recorded employer, with the pay they earn today and the withholding a payroll takes. The worker, the employer and the pay then read like any other job in the engines that read jobs and taxes.

**Rules.** One model, two tiers: a counted commuter is read by the same rule as a full one times their count. Replace, never layer: the standing unplaced-wages flow is deleted in the same change. Estimate, never UNKNOWN: the pay stays the place's ACS median earnings, marked ESTIMATED with its spread. An effect is a read, not a record: the withholding is paid to the treasury by the journal.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a place drawn from all 56 and a seed the builder did not choose (name both in the PR body), a named commuter has a job with the outside employer, is paid on its calendar, and has withholding paid to a treasury, shown by job and journal record ids, and the old unplaced-wages flow is gone; src/core2/residents.test.ts and the tripwire tests pass.

**Files.** src/core2/residents.ts, src/core2/modules/residents.ts, src/core2/opening-employment.ts

**Notes.** Pull request #5076 carries the build. Closes SG-CORE-unplaced-workers-income's replacement path (the row is already resolved as a labeled estimate in the Oct 19 residents slice).

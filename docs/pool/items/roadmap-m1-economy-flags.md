---
id: roadmap-m1-economy-flags
title: "Roadmap M1-02, M1-03, M1-04, M1-06 pass in a drawn place and their flags flip, with evidence"
area: world
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
milestone: M1
source: "CTO weekend leads, Oct 24 (PR cto/leads-2026-10-24)"
---

**What.** The roadmap's M1 specs below still read `passes: false` in `docs/roadmap/features.json`, so the owner cannot tell what of M1 is finished. For each spec, run its test in a place drawn from all 56, fix what fails (or file each failure as its own bounded bug item and finish it), play it in the bench, and flip `passes` with the evidence. The specs: M1-02 "The national economy and central bank"; M1-03 "State and metro economies"; M1-04 "Jobs"; M1-06 "Credit and banks". Their tests, which nobody may edit: M1-02: A one-year run keeps national figures within real historical spreads (each month's 12-month change in unemployment, prices and payroll jobs, and each quarter's output growth, inside the 5th to 95th percentile of 1990 to the latest year); a rate decision changes what loans cost in the town; every decision is traceable to the members' reasons, with no random draws. M1-03: In a year, two randomly drawn states diverge plausibly in jobs and wages (each inside the real spread of one-year state changes since 2000); a town's prices and pay follow its region; each state's and metro's starting figures match real data. M1-04: Over a year in a random place, unemployment, hiring and quitting stay within real ranges (federal job-turnover data), and every job change on record has a reason. M1-06: Every loan's money balances from lender to borrower and back; defaults follow borrowers' real circumstances, never a chance roll.

**Rules.** Wire to the world: a spec passes only in a played world in a drawn place, shown by record ids, never by a unit test that builds its own small world. One rule, all 56 places: the place and seed are drawn and named in the PR body. Never edit a spec's `test` text; sessions change only `passes`, and write a `command` where none exists.

**Done when.** For each of M1-02, M1-03, M1-04, M1-06, the spec's command passes on main in a place drawn from all 56 (place and seed named), the lead has played it in the bench and attached a screenshot, and `docs/roadmap/features.json` reads `passes: true` with the run output and record ids in the PR body; every failure found is its own pool item, done before the flag flips.

**Files.** src/core2/tooling/m1-02-check.ts, src/core2/modules/jobs.ts, src/core2/modules/credit.ts, docs/roadmap/features.json

**Notes.** Added Oct 24 by the CTO for the M0 to M2 lead (order `docs/work-orders/lead-m0-m2-2026-10-24.md`). M1-03, M1-04 and M1-06 have no command yet; write them. A PR names this item on line 1 and `Lead: m0-m2` in its body.

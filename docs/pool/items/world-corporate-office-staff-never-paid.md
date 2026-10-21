---
id: world-corporate-office-staff-never-paid
title: "A county business-services office's staff are never paid: the regional office holds no cash and has no parent firm paying it"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr: #5041
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The opening gives a county business-services office (the town's regional office of a larger firm, classification `enterprise:corporate-office`) $0 in cash and no source of revenue, so any staff it has are never paid. `src/core2/data/business-books.json` binds that classification, `enterprise:utility` and `service:hospital` to no business kind and the funding route `branch-or-institution-budget-required` (its citation: the old town business table excluded them), and `src/core2/opening-capital.ts` then opens each one as modeled-zero-funded under the stopgap SG-P8-opening-unsupported-owner-funding. A branch is paid by the firm it belongs to, whose revenue lies outside the town, so it needs a standing inflow from outside sized to its payroll, its employer taxes and a margin, the way a local paper's revenue is started by `startOutletRevenue` in `src/core2/press-money.ts`. Checked Oct 18: in Green Park, Missouri (seed `biz0`, purpose "corp") St. Louis County Business Services opens with $0 and no revenue flow, though it has no full-person job there, so the payroll case needs a place where a full person works at one.

**Rules.** Wire to the world: whoever pays the office must be a named payer on the journal, read by the engine that runs payday. Replace, never layer: use the outside-payer role the public pay link uses rather than a second one. Estimate, never UNKNOWN: any buffer starts from the real average with a spread and its source. Wire to the world: the branch's payroll draws on a standing outside inflow, and the same dollar leaves the outside account by journal record. Every dollar balances, the inflow is an ESTIMATED parameter with its spread, and the funding is a registered stopgap that names the parent-firm budget that replaces it. One model, two tiers: counted staff of the branch are paid by the same rule as full ones, times their count.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a drawn place and seed (named in the PR body), the office's wage flows are paid at their last payday from a named payer, one paycheck is followed back to that payer by record id, and `node --import tsx scripts/core2-year/wages-unpaid-check.ts <seed>` lists no corporate office. In a one-year run of `buildBenchWorld` in a drawn place, every staff member of such an office is paid on payday from the named payer's account, shown by journal record id, and `src/core2/opening-payroll-calendar.test.ts` or a new test states it.

**Files.** src/core2/opening-capital.ts, src/core2/press-money.ts, src/core2/data/opening-capital.json, src/core2/data/business-books.json

**Notes.** Body written Oct 18 (claude; the item was a placeholder). Measured the same day in three drawn places (`drawPlace("a"|"b"|"c", "corp")`, 120 days): the employers that paid nothing were Neighbors United (3 of 3 places), the public schools (3 of 3), a state office (1) and Campaign Works (1); none was a regional office, which is rare among full-person jobs. The utility, school and nonprofit cases are world-utility-staff-never-paid, world-public-school-staff-never-paid and world-private-zero-cash-employers-never-pay (#5016); a fix for the branch route should serve utilities and hospitals too if it can be generic, but a utility's customers are the households it serves, so that item keeps its own revenue line. Found 2026-10-18 with the wages-unpaid check (PR #5011) in 11 drawn towns. The simplest honest version treats the office as a branch of an outside firm funded by an outside owner with a registered stopgap; the owner may rule that regional offices should not exist as town employers at all.

Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.

Earlier counted-staff reproductions from main (kept alongside the full-person search above): West Wendover, Nevada (seed f6): Elko County Business Services, 1 counted job, 1,853 asked per payday, nothing paid after four months; Sayreville, New Jersey (seed h8): Middlesex County Business Services, 4 counted jobs.

Oct 21 (CTO merger, PR #5041): this consolidates the specification and findings only. The original one-year, all-staff, named-payer and wages-unpaid-check acceptance is preserved; the 120-day full-person search does not replace it. Payroll funding remains unfinished and this item stays open.


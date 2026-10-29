---
id: world-corporate-office-staff-never-paid
title: "A county business-services office's staff are never paid: the regional office holds no cash and has no parent firm paying it"
area: world
kind: bug
priority: 2
size: M
status: dropped
claimed-by:
pr: #5041
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** A county "Business Services" office (classification enterprise:corporate-office) opens with no cash and no business books, so its staff are never paid. West Wendover, Nevada (seed f6): Elko County Business Services, 1 counted job, 1,853 asked per payday, nothing paid after four months; Sayreville, New Jersey (seed h8): Middlesex County Business Services, 4 counted jobs. The office is a regional branch whose pay comes from a parent firm outside the town, and no parent is modeled. The business-books table gives it no kind ("branch-or-institution-budget-required"). Current business-books.json routes enterprise:corporate-office and service:hospital through branch-or-institution-budget-required with no business kind; enterprise:utility already has the utility business kind. The unsupported opening is an explicitly modeled zero pending genuine dated funding, not an observed zero balance.

**Rules.** Wire to the world: whoever pays the office must be a named payer on the journal, read by the engine that runs payday. Replace, never layer: use the outside-payer role the public pay link uses rather than a second one. Estimate, never UNKNOWN: any buffer starts from the real average with a spread and its source. One model, two tiers: counted staff and full staff are paid by the same rule times the count. Follow SG-P8-opening-unsupported-owner-funding: genuine dated funding authority and receipts must supply the unsupported owner; preserve actual supplied balances and never invent a synthetic owner contribution.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a drawn place and seed (named in the PR body), the office's wage flows are paid at their last payday from a named payer, one paycheck is followed back to that payer by record id, and `node --import tsx scripts/core2-year/wages-unpaid-check.ts <seed>` lists no corporate office. In a one-year run of `buildBenchWorld` in a drawn place, every staff member of such an office is paid on payday from the named payer's account, shown by journal record id, and `src/core2/opening-payroll-calendar.test.ts` or a new test states it.

**Files.** src/core2/opening-capital.ts, src/core2/press-money.ts, src/core2/data/opening-capital.json, src/core2/data/business-books.json

**Notes.** Body written Oct 18 (claude; the item was a placeholder). Measured the same day in three drawn places (`drawPlace("a"|"b"|"c", "corp")`, 120 days): the employers that paid nothing were Neighbors United (3 of 3 places), the public schools (3 of 3), a state office (1) and Campaign Works (1); none was a regional office, which is rare among full-person jobs. The utility, school and nonprofit cases are world-utility-staff-never-paid, world-public-school-staff-never-paid and world-private-zero-cash-employers-never-pay (#5016); a fix for the branch route should serve utilities and hospitals too if it can be generic, but a utility's customers are the households it serves, so that item keeps its own revenue line. Found 2026-10-18 with the wages-unpaid check (PR #5011) in 11 drawn towns. The simplest honest version treats the office as a branch of an outside firm funded by an outside owner with a registered stopgap; the owner may rule that regional offices should not exist as town employers at all.

Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.

Earlier counted-staff reproductions from main (kept alongside the full-person search above): West Wendover, Nevada (seed f6): Elko County Business Services, 1 counted job, 1,853 asked per payday, nothing paid after four months; Sayreville, New Jersey (seed h8): Middlesex County Business Services, 4 counted jobs.

Oct 21 (CTO merger, PR #5041): this consolidates the specification and findings only. The original one-year, all-staff, named-payer and wages-unpaid-check acceptance is preserved; the 120-day full-person search does not replace it. Payroll funding remains unfinished and this item stays open.

Author's Oct 18 investigation and proposed standing-inflow approach (historical proposal, not an approved funding source): The opening gives a county business-services office (the town's regional office of a larger firm, classification `enterprise:corporate-office`) $0 in cash and no source of revenue, so any staff it has are never paid. `src/core2/data/business-books.json` binds that classification, `enterprise:utility` and `service:hospital` to no business kind and the funding route `branch-or-institution-budget-required` (its citation: the old town business table excluded them), and `src/core2/opening-capital.ts` then opens each one as modeled-zero-funded under the stopgap SG-P8-opening-unsupported-owner-funding. A branch is paid by the firm it belongs to, whose revenue lies outside the town, so it needs a standing inflow from outside sized to its payroll, its employer taxes and a margin, the way a local paper's revenue is started by `startOutletRevenue` in `src/core2/press-money.ts`. Checked Oct 18: in Green Park, Missouri (seed `biz0`, purpose "corp") St. Louis County Business Services opens with $0 and no revenue flow, though it has no full-person job there, so the payroll case needs a place where a full person works at one.

Current-code clarification, Oct 21: business-books.json now gives enterprise:utility kindId utility and fundingRoute business. The null-kind branch-or-institution-budget-required rows are enterprise:corporate-office and service:hospital. SG-P8-opening-unsupported-owner-funding remains open and requires genuine dated funding authority and receipts, with actual supplied balances preserved; its replacement explicitly forbids a synthetic owner contribution. The historical suggestion of an inflow sized merely to cover payroll does not override that constraint. Implementation must retain the existing named-payer acceptance.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `world-worker-unpaid-four-months`; close into it and carry any line it lacks there. (verify the shared cause first)

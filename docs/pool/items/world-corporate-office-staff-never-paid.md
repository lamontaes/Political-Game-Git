---
id: world-corporate-office-staff-never-paid
title: "A county business-services office's staff are never paid: the regional office holds no cash and has no parent firm paying it"
area: world
kind: bug
priority: 2
size: M
status: in-pr
claimed-by: claude/corporate-office-staff-paid
pr: #5041
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T03:04:27.797Z
---

**What.** A county "Business Services" office (classification enterprise:corporate-office) opens with no cash and no business books, so its staff are never paid. West Wendover, Nevada (seed f6): Elko County Business Services, 1 counted job, 1,853 asked per payday, nothing paid after four months; Sayreville, New Jersey (seed h8): Middlesex County Business Services, 4 counted jobs. The office is a regional branch whose pay comes from a parent firm outside the town, and no parent is modeled. The business-books table gives it no kind ("branch-or-institution-budget-required").

**Rules.** Wire to the world: whoever pays the office must be a named payer on the journal, read by the engine that runs payday. Replace, never layer: use the outside-payer role the public pay link uses rather than a second one. Estimate, never UNKNOWN: any buffer starts from the real average with a spread and its source.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a drawn place and seed (named in the PR body), the office's wage flows are paid at their last payday from a named payer, one paycheck is followed back to that payer by record id, and `node --import tsx scripts/core2-year/wages-unpaid-check.ts <seed>` lists no corporate office.

**Files.** src/core2/data/business-books.json, src/core2/opening-capital.ts, src/core2/opening-public-pay.ts

**Notes.** Found 2026-10-18 with the wages-unpaid check (PR #5011) in 11 drawn towns. The simplest honest version treats the office as a branch of an outside firm funded by an outside owner with a registered stopgap; the owner may rule that regional offices should not exist as town employers at all.
**What.** A county business-services office's staff are never paid because the regional office holds no cash and no parent firm pays it. Give such an office a paying source from the firm structure the records already hold. Staff then draw wages from a real account.
**Rules.** Wire to the world: the fix moves real dollars from a named payer to the staff, balanced on the journal. Estimate, never UNKNOWN: the office's starting cash is an estimate from its revenue or parent, with its source and spread.
**Done when.** In a one-year run of `buildBenchWorld` in a drawn place, every staff member of such an office is paid on payday from the named payer's account, shown by journal record id, and `src/core2/opening-payroll-calendar.test.ts` or a new test states it.
**Files.** src/core2/opening-finance.ts, src/core2/modules/business.ts
**Notes.** Body filled Oct 19 (claude) from the title and the repo's engine layout; the claimant should sharpen it.

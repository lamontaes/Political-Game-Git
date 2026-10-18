---
id: world-corporate-office-staff-never-paid
title: "A county business-services office's staff are never paid: the regional office holds no cash and has no parent firm paying it"
area: world
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The opening gives a county business-services office (the town's regional office of a larger firm, classification `enterprise:corporate-office`) $0 in cash and no source of revenue, so any staff it has are never paid. `src/core2/data/business-books.json` binds that classification, `enterprise:utility` and `service:hospital` to no business kind and the funding route `branch-or-institution-budget-required` (its citation: the old town business table excluded them), and `src/core2/opening-capital.ts` then opens each one as modeled-zero-funded under the stopgap SG-P8-opening-unsupported-owner-funding. A branch is paid by the firm it belongs to, whose revenue lies outside the town, so it needs a standing inflow from outside sized to its payroll, its employer taxes and a margin, the way a local paper's revenue is started by `startOutletRevenue` in `src/core2/press-money.ts`. Checked Oct 18: in Green Park, Missouri (seed `biz0`, purpose "corp") St. Louis County Business Services opens with $0 and no revenue flow, though it has no full-person job there, so the payroll case needs a place where a full person works at one.

**Rules.** Wire to the world: the branch's payroll draws on a standing outside inflow, and the same dollar leaves the outside account by journal record. Every dollar balances, the inflow is an ESTIMATED parameter with its spread, and the funding is a registered stopgap that names the parent-firm budget that replaces it. One model, two tiers: counted staff of the branch are paid by the same rule as full ones, times their count.

**Done when.** In the played world (`buildBenchWorld`, a drawn place from all 56 whose county business-services office employs a full person, place and seed named in the PR body) the office pays its payroll on every payday of 120 days, shown by payroll posting ids, from the standing inflow shown by its outside-flow id, and a test in `src/core2/` names the place and seed.

**Files.** src/core2/opening-capital.ts, src/core2/press-money.ts, src/core2/data/opening-capital.json, src/core2/data/business-books.json

**Notes.** Body written Oct 18 (claude; the item was a placeholder). Measured the same day in three drawn places (`drawPlace("a"|"b"|"c", "corp")`, 120 days): the employers that paid nothing were Neighbors United (3 of 3 places), the public schools (3 of 3), a state office (1) and Campaign Works (1); none was a regional office, which is rare among full-person jobs. The utility, school and nonprofit cases are world-utility-staff-never-paid, world-public-school-staff-never-paid and world-private-zero-cash-employers-never-pay (#5016); a fix for the branch route should serve utilities and hospitals too if it can be generic, but a utility's customers are the households it serves, so that item keeps its own revenue line.

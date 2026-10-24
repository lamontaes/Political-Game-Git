---
id: tests-played-world-founding-means-ignores-savings
title: "M0-13's new-business loan check compares the loan to the founder's cash and ignores the savings the founder puts in as equity (St. Johnsbury 2 of 2)"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** M0-13's 'a new business's loan fits its founder' fails on both foundings in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4); the other two drawn places founded no business. organization:founded:manufacturing:person_675c0fd04c6ccee2:2025-06-01 borrowed 21,515,295 minor units (215,153 dollars) against 154,863 of the founder's cash the day before, but the founder put in 2,419,714 of equity, which is 8.9 times under the nine-times line (the SBA 10 percent equity rule, src/core2/modules/credit.ts:1360 byEquity); organization:founded:manufacturing:person_70dd768bb33f26e1:2025-11-01 borrowed 13,599,729 against 1,478,786 of cash and 1,511,081 of equity (9.0 times the equity; 9.2 times the cash). The engine does what its source says: business.ts withdraws the founder's savings into cash before funding (src/core2/modules/business.ts:1795, equityMinor at :1791 and the founding row's equityMinor at :2023), so equity is cash plus savings, while the check at tests/golden-path/played-world.node-test.ts:353 takes cash on the day before only, so any founder who funds from savings reads as over-borrowed.

**Rules.** Never weaken a test: the spec stays as strict, it must measure the founder's means as the engine underwrites them. An effect is a read: the credit application row (credit.applications, application:2025-06-01:organization:founded:manufacturing:person_675c0fd04c6ccee2) already records equityMinor and the founding row records equityMinor, so the check can read them instead of cash. Ask why: the engine's loan is traced to the founder's equity by record id.

**Done when.** In the played world (buildBenchWorld), M0-13 a new business's loan fits its founder is alive in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4) because the check measures the founder's means as cash plus the savings moved in on the founding day (the founding row's equityMinor), still fails when a loan exceeds nine times that means (shown by a one-line break in credit.ts foundingLoanLimit), and the PR names the founding and application ids; the spec change is approved by the M0-13 owner first.

**Files.** tests/golden-path/played-world.node-test.ts, src/core2/modules/credit.ts, src/core2/modules/business.ts

**Notes.** Found Oct 24 by the M0-13 lead's helper. Not changed by the helper because tests/golden-path/played-world.node-test.ts is the accepted M0-13 spec. If the owner wants the loan sized to cash alone, the alternative is an engine rule that founders keep savings out of equity, which contradicts the SBA source in credit.ts.

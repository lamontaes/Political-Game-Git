---
id: tests-played-world-founding-means-ignores-savings
title: "M0-13's new-business loan check compares the loan to the founder's cash and ignores the savings the founder puts in as equity (St. Johnsbury 2 of 2)"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: m0-m2
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** M0-13's "a new business's loan fits its founder" fails on both foundings in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4); the other two drawn places founded no business. organization:founded:manufacturing:person_675c0fd04c6ccee2:2025-06-01 borrowed 21,515,295 minor units (215,153 dollars) against 154,863 of the founder's cash the day before, but the founder put in 2,419,714 of equity, which is 8.9 times under the nine-times line (the SBA 10 percent equity rule). The engine does what its source says: business.ts withdraws the founder's savings into cash before funding, so equity is cash plus savings, while the check takes cash on the day before only, so any founder who funds from savings reads as over-borrowed.

**Cause.** Found in code: tests/golden-path/played-world.node-test.ts line 383 sets meansMinor to the founder's cash of the day before; src/core2/modules/credit.ts line 2016 (byEquity) sizes the loan on the application's equityMinor, which the founding row records (src/core2/modules/business.ts, equityMinor around lines 1791 and 2023).

**Fix.** Measure the founder's means in the check as cash plus the savings moved in on the founding day (the founding row's equityMinor), keep the nine-times test, and show that a one-line break in credit.ts foundingLoanLimit still fails it. The spec change needs the M0-13 owner's approval first.

**Time box.** 3 hours.

**Rules.** Never weaken a test: the spec stays as strict, it must measure the founder's means as the engine underwrites them. An effect is a read, not a record: the credit application row and the founding row already record equityMinor, so the check reads them instead of cash. Ask why: the engine's loan is traced to the founder's equity by record id.

**Done when.** A second session runs tests/golden-path/played-world.node-test.ts in the played world of St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4) and sees "a new business's loan fits its founder" alive and passing because it measures the founder's means as cash plus the savings moved in on the founding day. A one-line break in credit.ts foundingLoanLimit makes it fail, and the PR names the founding and application ids.

**Waits on.** Approval of the M0-13 spec change by its owner.

**Files.** tests/golden-path/played-world.node-test.ts, src/core2/modules/credit.ts, src/core2/modules/business.ts

**Notes.** Found Oct 24 by the M0-13 lead's helper. Not changed by the helper because tests/golden-path/played-world.node-test.ts is the accepted M0-13 spec. If the owner wants the loan sized to cash alone, the alternative is an engine rule that founders keep savings out of equity, which contradicts the SBA source in credit.ts.

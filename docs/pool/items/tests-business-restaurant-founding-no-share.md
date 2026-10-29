---
id: tests-business-restaurant-founding-no-share
title: "The business test's restaurant founding wins no share of the households' purchases on main"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/business.test.ts fails on clean main (Oct 28, 17:30 UTC) in the case 'an enterprising adult founds a restaurant; it wins an equal share of the households' purchases and a startup loan; money balances', with 'expected 0 to be greater than 0'. Something the founded restaurant should receive, its share of purchases or its loan, is zero. The laws session found it while checking its own change and did not change the business engine.

**Rules.** Ask why (owner, Oct 14): name the cause by record before changing the test or the engine. Never weaken a test to get green: the founded business must win its share or the test names why it cannot.

**Done when.** The cause is named by record id in the item Notes, and src/core2/business.test.ts passes on main with the restaurant case asserting a nonzero share of purchases and a startup loan by record id.

**Files.** src/core2/business.test.ts,src/core2/modules/business.ts

**Notes.** TODO

---
id: tests-business-restaurant-founding-no-share
title: "The business test's restaurant founding wins no share of the households' purchases on main"
area: world
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
lead: laws-effects
model: opus
effort: high
root: none
checked: fable 2026-11-10
---

**What.** src/core2/business.test.ts fails on clean main (Oct 28, 17:30 UTC) in the case "an enterprising adult founds a restaurant; it wins an equal share of the households' purchases and a startup loan; money balances", with "expected 0 to be greater than 0". Something the founded restaurant should receive, its share of purchases or its loan, is zero. The laws session found it while checking its own change and did not change the business engine. Nobody has said which of the two is zero or why. Guards: a new restaurant's customers and startup loan in the town's business list, which the business test keeps working.

**Cause.** Needs cause. Looked at the item only: src/core2/business.test.ts and src/core2/modules/business.ts exist, and the failing assertion is a greater-than-zero check on the founded restaurant's share of purchases or its startup loan; neither value was read at the failure.

**Fix.** None until the cause is found.

**Time box.** 3 hours to find which value is zero and why.

**Rules.** Ask why (owner, Oct 14): name the cause by record before changing the test or the engine. Never weaken a test to get green: the founded business must win its share or the test names why it cannot. One rule, all 56 places: the test draws its place and names it with the seed.

**Done when.** A second session runs src/core2/business.test.ts on main in a drawn place and sees the restaurant case assert a nonzero share of purchases and a startup loan, each by record id, and pass. The cause is named by record id in the item Notes, and the test fails when the founded restaurant wins no share.

**Waits on.** Nothing.

**Files.** src/core2/business.test.ts, src/core2/modules/business.ts

**Notes.** TODO

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/business.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=sweep-restaurant-1 (the item names no seed): 14 of 14 passed. Fresh draw GOLDEN_PATH_SEED=sweep-fresh-<random> (number not kept): 14 of 14 passed. Green on both. Proposed for the CTO: drop as fixed on main.

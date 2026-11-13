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
model: haiku
effort: low
root: none
checked: fable 2026-11-10
---

**What.** src/core2/business.test.ts fails on clean main (Oct 28, 17:30 UTC) in the case "an enterprising adult founds a restaurant; it wins an equal share of the households' purchases and a startup loan; money balances", with "expected 0 to be greater than 0". Something the founded restaurant should receive, its share of purchases or its loan, is zero. The laws session found it while checking its own change and did not change the business engine. Nobody has said which of the two is zero or why. Guards: a new restaurant's customers and startup loan in the town's business list, which the business test keeps working.

**Cause.** Measured: does not reproduce on main. `npx vitest run src/core2/business.test.ts --maxWorkers=1` passed 14 of 14 three times: on main b4422d346c with GOLDEN_PATH_SEED=sweep-restaurant-1 and with a fresh seed (Nov 10), and on main 4d33029c with GOLDEN_PATH_SEED=b0baff9250453770 (Nov 11). The restaurant case (line 367) builds its own small world and draws no place, so the seed does not change it. The Oct 28 failure was on a main that has since moved; which change fixed it was not traced.

**Fix.** Nothing to build. Proposed for the CTO: close this item as no longer reproducing, with the three runs above.

**Time box.** 1 hour for one Haiku session, only to close the item once the CTO agrees. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Ask why (owner, Oct 14): name the cause by record before changing the test or the engine. Never weaken a test to get green: the founded business must win its share or the test names why it cannot. One rule, all 56 places: the test draws its place and names it with the seed.

**Done when.** A second session runs src/core2/business.test.ts on main in a drawn place and sees the restaurant case assert a nonzero share of purchases and a startup loan, each by record id, and pass. The cause is named by record id in the item Notes, and the test fails when the founded restaurant wins no share.

**Waits on.** Nothing.

**Files.** src/core2/business.test.ts, src/core2/modules/business.ts

**Notes.** TODO

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/business.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=sweep-restaurant-1 (the item names no seed): 14 of 14 passed. Fresh draw GOLDEN_PATH_SEED=sweep-fresh-<random> (number not kept): 14 of 14 passed. Green on both. Proposed for the CTO: drop as fixed on main.

Cause finder (Nov 11, 2026, for Fable B): one more run on main 4d33029c, seed b0baff9250453770: 14 of 14 passed. With the two Nov 10 runs it does not reproduce. Proposed: close.

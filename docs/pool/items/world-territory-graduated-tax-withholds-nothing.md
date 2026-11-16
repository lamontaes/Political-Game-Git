---
id: world-territory-graduated-tax-withholds-nothing
title: "A graduated income tax act in Guam withholds nothing at the territory level in the month after it passes"
area: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "found by the Account lead's group B case check at other seeds, Nov 14"
claimed-at:
after:
lead: account-lead
model: opus
effort: medium
root: rc2-done-from-records
checked: sonnet 2026-11-14
---

**What.** In Guam, enacting `fiscal.graduated-income-tax` leaves no withholding line at the territory (state) level after a payday, while the case expects the tax to come out of paychecks. Seen: a played Guam paycheck shows the territory's graduated tax, or the screen says the federal return covers it.

**Cause.** Measured: place Inarajan, Guam (territory:GU:inarajan), seed 741e1fe731e2aef3a39de315f1d07c4368754d2d0409b3bbeacc39f43896b2b6, `npx vitest run src/core2/law-reach-group-b.test.ts -t "graduated income tax replaces"`: after the act and 30 days with a payday, `withholdingOf` has 0 lines at the state level (expected above 0). Needs cause. The territory's income tax is the federal mandate (see world-territory-income-tax-returns-after-repeal); read whether Guam's withholding is written under the federal level and not the territory's.

**Fix.** Design: read the withholding writer for a territory whose tax is the federal mandate (`withholdPay` in `src/core2/modules/budgets.ts`), find which level the paycheck line is written under, and make the case and the engine agree.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, write what was seen in the item and stop.

**Rules.** Wire to the world: the fix goes through the engines a played world uses and a case that fails for its own reason stays failing until fixed, never loosened or skipped; one rule, all 56 places: the cases keep drawing places and name each place and seed.

**Done when.** A second session, not the builder, runs `npx vitest run src/core2/law-reach-group-b.test.ts` on main at the drawn place and seed named in the item and sees the named case run and pass with its assertions unchanged, with the record ids it writes named.

**Waits on.** Nothing.

**Files.** src/core2/law-reach-group-b.test.ts; src/core2/modules/budgets.ts

**Notes.** Found while finding the cause of the pension, reserve and balanced-budget cases.

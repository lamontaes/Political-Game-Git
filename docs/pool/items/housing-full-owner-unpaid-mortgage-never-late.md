---
id: housing-full-owner-unpaid-mortgage-never-late
title: "A full household that pays nothing on its mortgage for seven months is never late, and its lender never acts"
area: core
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: long-game
model: opus
effort: medium
root: design-one-model-two-tiers
source: CTO line 7000691450 on #9747, Nov 19, 2026 (Fixer's trace of macro-mortgage-history, comment 7000687177)
checked:
---

**What.** In Hiddenite, North Carolina (3731260), world seed 92c4e60e2723a8e3e5cfbac0938441d7209ba0dc65d6017abb5cd45fb7bbd088, `mortgage:household_64f54fe1f0558a19` (bought 2024 at 6.50%, payment 175,340 cents) grows from 27,425,891 to 28,529,228 cents between Feb 6 and Sep 6, 2025, with `missedMonths` 0 every month. From October it is paid in full though nobody in the household pays. Red on main and on train/nov17b alike; `src/core2/macro-mortgage-history.test.ts` fails whenever it draws a loan like this one.
Seen: day by day on train/nov18 (0d4377b3), the household's own flow `household.mortgage` (payer `person_905fc3179e71b458`, no finance contract) asks 74,652 a month, gets 44,364 in February and 0 from March to September, and ends on Oct 1.

**Cause.** Found in code: `src/core2/modules/housing.ts` `amortize`.

1. A loan with no finance contract reads "late" only from a counted group's arrears (`countedOwnersBehind`, `countedHousingInArrears`), so a full household's unpaid month takes `paidShare` 0, lets interest build up, and writes `missedMonths: 0`, and the foreclosure engine (`housing-foreclosure.ts`) never sees a missed month.
2. `ownPayments` skips an ended flow, so once the household's flow ends the loan falls back to the residents group's `housingMonth` and is paid at the group's share, though the household paid nothing.
3. The flow asks 74,652 a month against the loan's 175,340 payment; where the asked amount comes from is not yet traced.

**Fix.**

1. Trace where the flow's asked amount is set and make it the loan's own payment (or record why it is a share).
2. In `amortize`, a full household's month whose own flow asked and was not paid in full counts toward `missedMonths` the same way a contract's arrears does; a paid month resets it.
3. A full household's loan whose flow ended reads its own payment as unpaid, not the group's month.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Ask why: each month's balance change is traced to the record that wrote it. One model, two tiers: a full household and a counted one are late by the same rule. Wire to the world: holds for every mortgage in every one of the 56 places. Never loosen `macro-mortgage-history.test.ts`.

**Done when.** At the place and seed above, the named loan either falls each month it is paid or counts each unpaid month in `missedMonths`, and its lender's patience reads them; a test beside `src/core2/modules/housing.ts` asserts it on a drawn place, named with its seed, and fails on the old code; a second session plays a year in dev mode at a drawn place and sees a household that stopped paying listed as behind on its mortgage.

**Waits on.** Nothing.

**Files.** src/core2/modules/housing.ts, src/core2/modules/residents.ts (the flow's asked amount), src/core2/housing-foreclosure.ts (reads `missedMonths`), src/core2/macro-mortgage-history.test.ts (unchanged).

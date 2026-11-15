---
id: credit-1-households-borrow-for-what-their-records-show
title: "Households borrow for a move, a medical bill in collections or a big purchase their records show, not only to cover a short month"
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
root: none
lead: jobs
model: opus
effort: medium
source: "T54's Cherry Hill loans trace, Nov 15 22:27Z; Account lead's ruling 22:28Z (file it right after the opening-balance fix B; each loan started by a record the game already writes, never a rate drawn per household)"
---

**What.** With the shortfall fix (A), a household applies for a loan only when its cash and the month's income fall short of its costs, so a town of about 10,000 households sees about 5 applications a month. Cherry Hill VA (5115176, seed promises-real-loan-1), January 20 to June 20: 19 applications, 3 storefront loans, no bank personal loan. Real borrowing also pays for moves, debts in collections and large purchases. From memory, to be sourced in the PR: about 1 in 20 adults takes a payday loan in a year, and personal loans are originated for about 1% of households a month. Those rates check the town's totals; they never decide a household's loan. Seen: dev mode's Trace of a loan naming the record that started it, and the bank's book of personal loans over a year.

**Cause.** Found in code: `householdApplications` (src/core2/modules/credit.ts) is the only place a household asks for a personal or storefront loan, and it asks only for a month's shortfall. Nothing reads a move (`reviewMove`, src/core2/modules/moves.ts:1466, and the `person.moved-away` record) or a medical debt placed for collection (`recordMedicalDebt`, credit.ts:1064) as a reason to borrow. No record of a car bought or a home repair exists: vehicle and repair spending is a living-cost share only (src/core2/reference/living-costs-data.ts).

**Fix.** Each reason is started by a record the game already writes and decided by the one borrowing chooser (`personalBorrowingDecision`) with that record's amount as the need:
1. A household that moves weighs borrowing the move's cost.
2. A household with a medical debt in collections weighs a consolidation loan from the bank.
A car or a repair gets a reason only when a record of it exists; this item names that record as missing and adds none. No rate drawn per household and no new weight; the real rates check the totals at three places.

**Time box.** 4 hours, Opus, medium.

**Rules.** No dice: a record starts each ask, and the household's traits, cash, income and the lender's answer decide it. One model, two tiers: counted households ask by the same rule, times their weight. Estimate, never unknown: the checking rates are ESTIMATED rows with spread, labeled from memory.

**Done when.** A pinned test at Cherry Hill VA (5115176, seed promises-real-loan-1) shows a year's applications and loans by reason, each naming the record that started it by id, against the from-memory rates. Year 1 and records at three places, with and without, twice a side, alternated. A second session sees at a drawn place it names with its seed a loan whose Trace names the move or the debt that started it.

**Waits on.** The opening-balance fix (B) after the shortfall fix (A), by the lead's order.

**Files.** src/core2/modules/credit.ts, src/core2/modules/moves.ts and their tests.

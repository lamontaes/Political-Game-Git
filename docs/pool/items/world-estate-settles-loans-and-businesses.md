---
id: world-estate-settles-loans-and-businesses
title: "A dead person's loans and businesses are settled by their estate"
area: core
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
lead: laws-effects
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** SG-CORE-estate-cash-only: an estate pays a dead person's cash, counted relatives now inherit, savings are on the way and the home is sold by world-estate-sells-the-home, but a loan they owed or held is not settled by probate. The Oct 21 check narrowed this item: a business whose owner dies is already handed on in src/core2/modules/business.ts ("an owner who has died, hands it on"; an heir or household takes it on, or the household closes it), and src/core2/estates.ts already pays a dead person's unpaid contract arrears from the estate before heirs (payDebts, Uniform Probate Code 3-805). What is left is the unpaid principal of a loan they owed through a credit facility, which is not a standing contract with arrears, and a loan they held. Loans should be paid from the estate before heirs.

**Cause.** Found in code: payDebts in src/core2/estates.ts (line 265) pays only standing-payment arrears; src/core2/modules/credit.ts has no handling of a borrower who dies (no match for died, deceased, dead or estate); the registered stopgap is SG-CORE-estate-cash-only in src/core2/data/stopgaps/core.json.

**Fix.** Pay a decedent's credit-facility loan principal from the estate before heirs take, end a facility whose borrower dies, handle a loan the decedent held, and mark SG-CORE-estate-cash-only resolved.

**Time box.** 5 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: heirs and what they do follow the intestate order, their money and traits. Every dollar balances. One model, two tiers: counted heirs act by the same rule. Wire to the world: the lender reads the payoff on its books.

**Done when.** A second session (not the builder) plays a one-year world (`buildBenchWorld`, a drawn place from all 56, seed named) and follows a decedent with a credit-facility loan to probate: the loan is paid from the estate by journal record id before the heirs take, the facility ends, shown in src/core2/estates.test.ts, and SG-CORE-estate-cash-only is resolved in src/core2/data/stopgaps/core.json.

**Waits on.** Nothing.

**Files.** src/core2/estates.ts, src/core2/modules/credit.ts, src/core2/estates.test.ts, src/core2/data/stopgaps/core.json

**Notes.** Claim released Oct 23: branch gone.

Checked Oct 21 (claude), not built, and the item as filed overstates the gap. A business whose owner dies is already handed on in `src/core2/modules/business.ts` (about line 359: "an owner who has died, hands it on"; an heir or household takes it on, or the household closes it and takes what is left), and `src/core2/estates.ts` already pays a dead person's unpaid contract arrears from the estate before heirs (`payDebts`, `payContractDebts`, Uniform Probate Code 3-805). What looks open is only the unpaid principal of a loan they owed through a credit facility (not a standing contract with arrears) and a loan they held; check `credit.ts` for what happens to a facility whose borrower dies before writing anything. Narrow this item to that, or close it if credit already ends them. Claim released.

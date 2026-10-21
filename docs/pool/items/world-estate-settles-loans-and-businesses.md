---
id: world-estate-settles-loans-and-businesses
title: "A dead person's loans and businesses are settled by their estate"
area: core
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** SG-CORE-estate-cash-only: an estate pays a dead person's cash, counted relatives now inherit, savings are on the way (PR 5316) and the home is sold by world-estate-sells-the-home, but a loan they owed or held and a business they owned are not settled by probate. Loans should be paid from the estate before heirs, and a business should pass to an heir, be sold or close, by the heir's own choice and the business's books.

**Rules.** No dice: heirs and what they do follow the intestate order, their money and traits. Every dollar balances. One model, two tiers: counted heirs act by the same rule.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) a decedent with a loan and a business is followed to probate: the loan is paid from the estate by journal record id and the business passes to a named heir or closes, in src/core2/estates.test.ts, and SG-CORE-estate-cash-only is resolved in stopgaps.json.

**Files.** src/core2/estates.ts,src/core2/modules/business.ts,src/core2/data/stopgaps.json

**Notes.** TODO

Checked Oct 21 (claude), not built, and the item as filed overstates the gap. A business whose owner dies is already handed on in `src/core2/modules/business.ts` (about line 359: "an owner who has died, hands it on"; an heir or household takes it on, or the household closes it and takes what is left), and `src/core2/estates.ts` already pays a dead person's unpaid contract arrears from the estate before heirs (`payDebts`, `payContractDebts`, Uniform Probate Code 3-805). What looks open is only the unpaid principal of a loan they owed through a credit facility (not a standing contract with arrears) and a loan they held; check `credit.ts` for what happens to a facility whose borrower dies before writing anything. Narrow this item to that, or close it if credit already ends them. Claim released.

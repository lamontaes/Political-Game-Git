---
id: core-finance-contracts-vs-obligations-part-2-retirement-claims
title: "A retirement claim is a recorded award plus a finance contract"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
lead: money
source: split from core-finance-contracts-vs-obligations in the pool redo, Nov 10, 2026
standard: 2
model: opus
effort: high
root: none
checked: fable 2026-11-10
---

**What.** Retirement claims still use the accounts layer's obligation. Swapping them onto a finance contract failed at the first monthly payment, because a contract whose payer is an outside-flow owner must carry a descriptor tying it to a dated award fact on the person. So a retirement claim has to be written as a recorded private-award fact on the person first, and then admitted with that descriptor, the way the counted residents flow does through addResidentFlow. This part does that for both retirement claim callers. Feeds: core-finance-contracts-vs-obligations

**Cause.** Found in code: src/core2/modules/retirement-claims.ts calls `accounts.addObligation` twice (lines 236 and 401, the full-person claim and the fill-in re-entry); `contractAuthority` in src/core2/finance-cash.ts rejects an outside-flow contract without a `FinanceRetirementExternalInflow` descriptor (incomeContractIds, sourceAwardIds).

**Fix.** Write the award fact on the person (recipientIncome and its validation), then admit the monthly payment as a finance contract with the descriptor, for both callers. Remove their `addObligation` calls. Watch the retirement-claims tests.

**Time box.** 4 hours for an Opus session.

**Rules.** Replace, never layer: the layer that loses is deleted, not kept beside the winner. Wire to the world: every household's rent and bill still posts the same dollars on the journal, shown in a played year. Speed: a year must stay within 20 percent of its base, measured on the same machine.

**Done when.** A second session, in a generated world of a drawn place (place and seed named), sees a retiree's monthly claim post from the finance layer by journal record id with the award fact it names, and src/core2/retirement-claims.test.ts passes. No `addObligation` call remains in src/core2/modules/retirement-claims.ts.

**Waits on.** Nothing.

**Files.** src/core2/modules/retirement-claims.ts, src/core2/finance-cash.ts, src/core2/retirement-claims.test.ts

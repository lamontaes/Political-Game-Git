---
id: world-housemate-cosigns-or-lends-to-jobless-borrower
title: "A person with no income of their own can borrow only through someone who has one: a housemate or relative co-signs the loan or lends the money"
area: world
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: world-loan-bill-before-first-payday-no-borrower-keeps
blocked-on:
root: none
lead: money
model: sonnet
effort: medium
source: "Promises thread, Nov 16: the Account lead's call that a personal loan is the borrower's own (approved on the borrower's own income, billed to the borrower's own cash); filed, not built, on the lead's 03:20Z order"
checked:
---

**What.** Once a personal loan is approved only on the borrower's own income, a person with no job and no pay of their own is refused by the bank. In real life that person still borrows, through someone close who has income: a housemate or relative co-signs the bank loan (and owes it if the borrower does not pay), or lends the money directly. Today the world has neither, so the jobless player and every jobless person in a household with a wage earner simply goes without.

**Cause.** Measured: at Ragland, Alabama (seed promises-real-loan-1, draw loan:16, player born 1995-03-01) on 8b5d1eac, the bank wrote `loan:household_fb80ba054925d5de:2025-07-01` on the household's income, all of it the housemate's commuter pay, and billed the jobless player, who missed every month. The Account lead ruled (Nov 16, 03:20Z) that the loan is the borrower's own and a housemate's cash does not pay it (ruling 2), so after the lenders pair the player is refused. Nothing in src/core2/modules/credit.ts lets a second person stand behind the application, and nothing in src/core2/modules (gifts or transfers between people) lets one person lend to another on terms.

**Fix.** In src/core2/modules/credit.ts, let an application refused for `no-own-income` name a co-signer from the borrower's household or close kin who has income of their own: the bank reads the co-signer's income and costs, writes the co-signer on the loan, and bills the co-signer's cash when the borrower's cash falls short. Whether the co-signer agrees comes from their tie to the borrower, their own cash and principles, never a roll. A direct loan between two people is the same ask without the bank: the lender's cash moves to the borrower, and a repayment row bills the borrower the way the bank's does. The co-signer's or lender's view of the borrower moves when a payment is missed. Size from the same `creditPersonalMonthsOfCosts` row; add no new number without a sourced or estimated row.

**Time box.** 4 hours for one Sonnet session.

**Rules.** No dice. One rule for every person in the world, the player included; the counted population reads the same rule times its count. Dev mode shows the co-signer on the Loans view (src/bench/dev-views/loans.ts) with whose income was read.

**Done when.** In a drawn place with a jobless player whose housemate works, the player is refused alone, the housemate co-signs, the loan's bill is paid from the housemate's cash in a month the player cannot pay, and the Loans view names the co-signer and the payment record.

**Waits on.** world-loan-bill-before-first-payday-no-borrower-keeps (the borrower's own loan, built in the renters thread's lenders pair).

**Files.** src/core2/modules/credit.ts, src/core2/data/credit/parameters.json, src/bench/dev-views/loans.ts, src/bench/ui/dev-view-loans.mjs

**Notes.**

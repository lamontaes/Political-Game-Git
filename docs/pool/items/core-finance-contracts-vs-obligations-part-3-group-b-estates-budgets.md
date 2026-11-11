---
id: core-finance-contracts-vs-obligations-part-3-group-b-estates-budgets
title: "Group B, estates and budgets read finance contracts, not accounts obligations"
area: core
kind: cleanup
priority: 2
size: M
status: open
claimed-by:
pr:
after: core-finance-contracts-vs-obligations-part-1-payee-account
blocked-on:
lead: money
source: split from core-finance-contracts-vs-obligations in the pool redo, Nov 10, 2026
standard: 2
model: sonnet
effort: high
root: none
checked: fable 2026-11-10
---

**What.** After the payee account exists, the remaining readers of the accounts obligation layer move to finance contracts: group B law reach (fund payees), estates (which ends a dead person's obligations) and budgets-treasury (which reads and sets obligation amounts). Each uses the finance layer's own end and set-amount calls. The law-wiring health, schools, group-B food aid and retirement tests broke before when the order of payments changed, so keep the order. Feeds: core-finance-contracts-vs-obligations

**Cause.** Found in code: src/core2/law-reach/group-b-money.ts (`addObligation`, line 420), src/core2/estates.ts (`obligationsFrom`, `endObligation`, `endObligationsTo`, lines 268 to 359) and src/core2/budgets-treasury.ts (`obligationsFrom`, lines 657 and 924) still read the accounts layer.

**Fix.** Admit group B's benefits as finance contracts with the payee account, end an estate's contracts with the finance layer's end call, and read and set the treasury's amounts through the finance layer. Keep the order of payments.

**Time box.** 4 hours for a Sonnet session.

**Rules.** Replace, never layer: the layer that loses is deleted, not kept beside the winner. Wire to the world: every household's rent and bill still posts the same dollars on the journal, shown in a played year. Speed: a year must stay within 20 percent of its base, measured on the same machine.

**Done when.** A second session, in a generated world of a drawn place (place and seed named), sees a group B benefit, an estate settling a dead person's standing payments and a budget line each post from the finance layer by journal record id, and a search of src/core2 outside src/core2/accounts.ts finds no caller of `addObligation`, `obligationsFrom`, `endObligation` or `endObligationsTo`.

**Waits on.** core-finance-contracts-vs-obligations-part-1-payee-account.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/estates.ts, src/core2/budgets-treasury.ts, src/core2/law-reach/group-b-food-aid.test.ts

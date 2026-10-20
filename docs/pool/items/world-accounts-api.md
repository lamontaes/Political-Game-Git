---
id: world-accounts-api
title: "World engines move money through the accounts API"
area: world
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr: #5176
blocked-on:
after: core-finance-contracts-vs-obligations
source: "core-needs-core-172 triage, Oct 15"
claimed-at:
---

**What.** The first half of this item is already true: business, credit and housing move every dollar through `accounts.transfer` by way of `transferCash` (src/core2/world-transfer.ts), and a played year shows thousands of their entries on the journal (see Notes). Rent is also already a standing contract with arrears: housing holds each lease as a `finance.contracts` row with `arrearsMinor`, which is the core's older twin of `accounts.addObligation`. What is left in the world area is credit: each loan's monthly payment is recomputed in `serviceLoans` from the declining balance and tracked in the loan row (late, past due, charged off), not as a standing payment. Move credit's scheduled loan payments onto the shared payment layer once the core decides which layer that is (see core-finance-contracts-vs-obligations), and have the lender read the arrears at the moment it decides.

**Rules.** Wire to the world; every dollar balances; an effect is a read.

**Done when.** After core-finance-contracts-vs-obligations is done: a one-year run of the played world (buildBenchWorld, a drawn place from all 56, a seed the builder did not choose) shows a loan payment posted from a standing payment by journal record id, one missed payment accruing arrears on it, and credit reading that arrears record when it decides on the next loan; the loan row's own late and past-due bookkeeping is deleted (replace, never layer) and the credit tests pass.

**Files.** src/core2/modules/credit.ts

**Notes.** core.md line 178; GOV already uses the API (budgets, official-pay, law-reach, retirement-claims). Checked Oct 15.

**Proof of the first half (Oct 19, claude/world-accounts-api).** `node --max-old-space-size=8192 --import tsx scripts/core2-year/world-accounts-proof.ts` (added with this change) plays a year with every module installed and counts the journal by record-id head. A drawn place (Rhode Island, one year from January 21, 2025) shows, from the three engines named here: rent 1,652 (`rent:household_04ea68cd750a09ac@2025-02-01`), bank-deposit 951, mortgage 109, loan-payment 49 (`loan-payment:loan:household_04fef0cd751b99ce:2025-01-21:2025-02-01`), loan 17, owner-draw 202, outside-sales 1,696, profit-tax 12, construction 8, arrears 2 (`arrears:lease:household_04f7eacd751570ee:2025-06-11:person_6d6e10abcb38f3cd`), counsel 3. Named non-main accounts: 1,840 at the opening, 2,152 after the year. `addObligation` is used only by retirement-claims and law-reach group B; `accounts.open` only by group B and counted-money.

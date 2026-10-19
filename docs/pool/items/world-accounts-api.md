---
id: world-accounts-api
title: "World engines move money through the accounts API"
area: world
kind: wiring
priority: 2
size: M
status: claimed
claimed-by: claude/world-accounts-api
pr:
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at: 2026-10-19T21:58:11.349Z
---

**What.** The first half of this item is already true: business, credit and housing move every dollar through `accounts.transfer` by way of `transferCash` (src/core2/world-transfer.ts), and a played year shows thousands of their entries on the journal (see Notes). What is left is scheduling: loan payments, mortgage payments and rents are still re-computed by each engine every month, not held as obligations with `accounts.addObligation`, so a missed payment is handled three different ways (credit's loan state, housing's arrears rows, none for business). Move the scheduled payments onto obligations with `accruesArrears`, and have the engines read the obligation's arrears at the moment they decide (a lender's next loan, a landlord's filing).

**Rules.** Wire to the world; every dollar balances; an effect is a read.

**Done when.** A one-year run of the played world (buildBenchWorld, a drawn place from all 56, a seed the builder did not choose) shows a loan payment, a mortgage payment and a rent payment each posted from an obligation by journal record id, one missed payment accruing arrears on the obligation, and credit or housing reading that arrears record when it decides; the old per-engine arrears bookkeeping is deleted (replace, never layer) and `src/core2/accounts.test.ts` plus the credit and housing tests pass.

**Files.** src/core2/modules/business.ts, credit.ts, housing.ts

**Notes.** core.md line 178; GOV already uses the API (budgets, official-pay, law-reach, retirement-claims). Checked Oct 15.

**Proof of the first half (Oct 19, claude/world-accounts-api).** `node --max-old-space-size=8192 --import tsx scripts/core2-year/world-accounts-proof.ts` (added with this change) plays a year with every module installed and counts the journal by record-id head. A drawn place (Rhode Island, one year from January 21, 2025) shows, from the three engines named here: rent 1,652 (`rent:household_04ea68cd750a09ac@2025-02-01`), bank-deposit 951, mortgage 109, loan-payment 49 (`loan-payment:loan:household_04fef0cd751b99ce:2025-01-21:2025-02-01`), loan 17, owner-draw 202, outside-sales 1,696, profit-tax 12, construction 8, arrears 2 (`arrears:lease:household_04f7eacd751570ee:2025-06-11:person_6d6e10abcb38f3cd`), counsel 3. Named non-main accounts: 1,840 at the opening, 2,152 after the year. `addObligation` is used only by retirement-claims and law-reach group B; `accounts.open` only by group B and counted-money.

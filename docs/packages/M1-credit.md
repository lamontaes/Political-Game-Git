# M1-credit: banks, loans and credit

**Contract:** M1-06 in `docs/roadmap/features.json`. Every loan's money balances from lender to borrower and back; defaults follow borrowers' real circumstances, never a chance roll.

**Builder:** a new Codex session, CODEX-CREDIT, at **high**: money conservation between banks, households and businesses.
**Finisher:** a new Claude session, **Sonnet at high**: conservation and circumstance checks against an agreed design.
**Branch:** `pool/M1-credit`, stacked on `pool/M1-macro`. **Starts:** when M1-macro's dated rate input is on its branch, and SOL-1258's accounts and obligations (M0 Part 3, piece 2) are on `pool/P8-part-1`.
**Owns:** `src/core2/modules/credit.ts`, `src/core2/credit-*.ts`, `src/core2/bank-*.ts`, `src/core2/data/credit/`, `data/research/credit/`, and their tests. Read `M1-common.md` first.

## What exists

- **Old core:** household loans in `src/simulation/household-loans.ts` (`openHouseholdLoan`, `serviceLoanMonth`, standing current, late, default and collections; defaults come from missed payments or a lost job with benefits run out, not a draw); town banks in `src/simulation/living-world/town-finances.ts` (`stepTownFinances`, `lends`, `honorsLine`, `lenderOf`, `openBankBooks`, `failTownBank`); rate caps by law in `consumer-loan-law.ts`; student debt in `student-debt.ts`. No credit score exists.
- **Lifted rules:** in `src/rules/economy`, the bank kernels (`bankHonorsCreditLineFromFacts`, `bankExtendsNewCreditFromFacts`, `nearestBankProfileFromFacts`, `uninsuredDepositShareFromFacts`, `loanMonthAmountsFromFacts`, `mortgageQuoteFromFacts`); in `src/rules/laws`, `loanRateFromCapFacts`, `monthlyInterestMinor`, `amortizedMonthlyPaymentMinor`, `revolvingMinimumPaymentMinor`, `cappedAnnualRateBasisPoints`.
- **New core:** business credit lines only (`addCreditFacility`, `drawCredit`, `repayCredit`), standing bills with arrears, and closure when a bill can't be paid. No bank books, deposits or household loans.
- **Data:** FDIC bank shapes and deposits, as generated TypeScript (`src/simulation/living-world/town-bank-shapes.generated.ts`, `town-deposits.generated.ts`); `data/research/money/debt-and-credit-2026.json` (its rates come through a commercial relay with unverified terms, and its notes say official fetches failed, so treat it as weak); `scf-transaction-accounts-2022.json`.

## Research first

1. Move the FDIC tables from TypeScript into data files, unchanged, with their sources.
2. Replace the weak rows in `debt-and-credit-2026.json` from the agencies: household debt by type and delinquency (New York Fed Household Debt and Credit report; check its terms), consumer credit (Federal Reserve G.19), bank balance sheets (FDIC call reports), and the Survey of Consumer Finances for who holds what.
3. Answer `docs/research/requests/town-bank-line-underwriting.json`: how banks decide on small business lines.
4. How lenders decide on households: income, existing payments, history of late payments. Use published underwriting guidance (for example, the debt-to-income limits in federal mortgage rules), not a score formula from a private company.

## Build

1. **Banks are organizations** with books: deposits (each household's and business's account), loans, capital and reserves, opened from the FDIC data for the banks that actually serve the town's county. Deposits are where people's money sits, so the opening moves cash balances into bank accounts through `postJournal` without changing anyone's total.
2. **Tables.** Register module `credit`: loans (borrower, lender, kind, terms, balance, standing), each borrower's payment history, and bank books by month. Index by borrower, lender and due date.
3. **Borrowing is a choice.** Households and businesses get offers to borrow, draw, repay or pay down, scored by the chooser from needs, money, traits and the loan's cost; the bank's yes or no comes from its own books and the borrower's recorded income, payments and history, on a sliding scale, with reasons. Rate caps come from law in force (M1-laws, once on its branch; a registered stopgap reading starting-law data until then).
4. **Servicing** on each loan's due date from the index: interest, payment, and standing. Late, default and collections follow the borrower's real circumstances (a lost job, a missed paycheck, other bills), never a roll. Every payment and charge-off posts through `postJournal`.
5. **Rates** follow M1-macro's dated rate input: variable loans reprice on its date, new loans price from it.
6. **Banks under strain** respond on a sliding scale: tighter lending as capital falls, and a failure only when the books say so. The old fixed capital lines (`capitalRatio` 0.1, `lendingCapitalRatio` 0.07, `frightCapitalRatio` 0.05 in `town-finances.ts`) don't come across as thresholds.
7. **Bench:** a person's and a business's loans with each payment, and the town bank's books.

## Placeholders to register

Any underwriting weight not yet researched; the equal spread of household defaults (a GAME ASSUMPTION in the old code) doesn't come across.

## Out of scope

Mortgages and home buying (M1-05 builds them on this module), business founding loans (M1-08 uses this module), unemployment benefits (M1-07), and courts.

## Hand-off

The finisher runs a year in a random place: lender and borrower books balance to the cent for every loan; one named household that defaulted did so after a recorded loss of income; one rate decision changed a named borrower's payment; and a bank's lending tightened as its capital fell, with the reasons recorded.

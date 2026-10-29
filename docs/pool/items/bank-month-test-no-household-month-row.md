---
id: bank-month-test-no-household-month-row
title: "The Money screen's bank-month test finds no credit month row for the borrowing household on most drawn seeds"
area: core
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/bench/bank-month.test.ts fails on clean main with 'TypeError: Cannot read properties of undefined (reading id)' at line 70 on BANK_MONTH_SEED=a2, a3 and a4 (a1 passes), and on about two in three random draws. The test queries the credit engine's households table by the borrower's household (byHousehold) and takes the newest month row; for these seeds the query returns no row, so the test crashes before it compares the Money screen's month with the credit books. Found Oct 29 by Merger 1 while merging a news-text change that touches no Money code; it reproduces identically on main at 1c5f375f08. Either the credit engine writes no household month row for a household that borrows in some places, or the test picks a borrower whose household the engine does not book yet.

**Rules.** An effect is a read, not a record: the Money screen's month must be read from the credit engine's own household month row, by record id, for every borrower it shows. One rule, all 56 places: the check must hold on a drawn place, not only on the seeds that happen to book a month.

**Done when.** With BANK_MONTH_SEED=a2, a3 and a4 and two further seeds drawn by the fixer, src/bench/bank-month.test.ts passes: either the credit engine writes a household month row for each borrowing household the Money screen shows, named by record id in the PR body, or the test passes over a borrower with no booked month for a stated reason; a test in src/bench covers the case of a borrower with no row, and the Money screen shows no month rather than a wrong one.

**Files.** src/bench/bank-month.test.ts, src/core2/modules/credit.ts, src/bench/bank.ts

**Notes.** Reproduce: BANK_MONTH_SEED=a2 npx vitest run src/bench/bank-month.test.ts. Related done item: table-unread-credit-books-households.

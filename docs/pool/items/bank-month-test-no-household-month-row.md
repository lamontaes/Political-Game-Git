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
after:
blocked-on:
source: added with npm run pool -- add
lead: money
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** src/bench/bank-month.test.ts fails on clean main with 'TypeError: Cannot read properties of undefined (reading id)' at line 70 on BANK_MONTH_SEED=a2, a3 and a4 (a1 passes), and on about two in three random draws. The test queries the credit engine's households table by the borrower's household (byHousehold) and takes the newest month row; for these seeds the query returns no row, so the test crashes before it compares the Money screen's month with the credit books. Found Oct 29 by Merger 1 while merging a news-text change that touches no Money code; it reproduces identically on main at 1c5f375f08. Either the credit engine writes no household month row for a household that borrows in some places, or the test picks a borrower whose household the engine does not book yet.

**Cause.** Measured: `BANK_MONTH_SEED=a2 npx vitest run src/bench/bank-month.test.ts` (also seeds a3 and a4; a1 passes) throws "Cannot read properties of undefined (reading id)" at line 70 on clean main at 1c5f375f08. The test asks the credit engine (src/core2/modules/credit.ts) for the borrowing household's newest month row and gets none.

**Fix.** Find in src/core2/modules/credit.ts why no household month row exists for that borrower. Either write the row, or have the Money screen (src/bench/bank.ts) show no month for a borrower with none, and make the test pick a booked borrower for a stated reason. Add a case for a borrower with no row.

**Time box.** 3 hours for a Sonnet session.

**Rules.** An effect is a read, not a record: the Money screen's month must be read from the credit engine's own household month row, by record id, for every borrower it shows. One rule, all 56 places: the check must hold on a drawn place, not only on the seeds that happen to book a month.

**Done when.** A second session runs `BANK_MONTH_SEED=a2`, `a3`, `a4` and two further seeds the builder did not choose through src/bench/bank-month.test.ts and sees it pass. In a drawn place it then opens the Money screen on a household that borrows and sees either the credit engine's month row (named by record id in the PR body) or no month at all, never a wrong one.

**Waits on.** Nothing.

**Files.** src/bench/bank-month.test.ts, src/core2/modules/credit.ts, src/bench/bank.ts

**Notes.** Reproduce: BANK_MONTH_SEED=a2 npx vitest run src/bench/bank-month.test.ts. Related done item: table-unread-credit-books-households.

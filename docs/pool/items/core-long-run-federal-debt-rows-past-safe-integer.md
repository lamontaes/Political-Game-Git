---
id: core-long-run-federal-debt-rows-past-safe-integer
title: "Federal debt holders' balances add as plain numbers, so after decades of borrowing they round silently past 2^53 cents"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/budgets-treasury.ts, where the U.S. Treasury borrows, writes each federalDebt holder row as balanceMinor + paid and borrowedMinor + paid in plain numbers. The federal debt starts near 36 trillion dollars and the Treasury borrows about 2 trillion a year, so the largest holder's balance and its lifetime borrowedMinor pass 2^53 minor units (about 90 trillion dollars) within a long save. From then on each sum rounds silently, the holder's interest and the debt figures drift, and the borrowing ids built from borrowedMinor can repeat. Found by the reviewer of core-journal-lifetime-totals-overflow (Oct 30), which fixed the same limit in the cash journal. The owner, Oct 29: a save must still run hundreds of years.

**Rules.** A save runs as fast and as exactly in year 100 as in year 1 (owner, Oct 29 22:45). Every dollar balances exactly. Estimate, never UNKNOWN: a screen that shows the debt keeps showing it.

**Done when.** A budgets-treasury test borrows past 2^53 minor units for one holder and reads the exact balance and lifetime borrowing; no borrowing id repeats; npm run speed:year -- --seed long-1 --years 30 reaches year 30 with the federal debt rows exact, shown in the PR body.

**Files.** src/core2/budgets-treasury.ts

**Notes.** TODO

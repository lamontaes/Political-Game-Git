---
id: world-official-pay-not-caught-up-us-house
title: "A U.S. representative's pay is short by about nine times the day's pay a year in (Whitefield, New Hampshire, seed 9a11da355dc8b557)"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/official-pay-catchup-s5
pr: #5008
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T23:55:27.158Z
---

**What.** `src/core2/official-salary-payroll.test.ts` fails on a fixed seed on main and on every branch: `GOLDEN_PATH_SEED=9a11da355dc8b557` (Whitefield, New Hampshire, 3384340). For `official:seat:US-TX:us-house:10` the salary paid plus the salary still owed differs from the pay earned since the opening by $14,794 (expected within $1,649, 1 percent of $164,942 earned). One representative's pay is therefore either paid twice or short by months. It fails on one of two random runs, so it is not rare. Find the payday the official's row skipped or doubled (`payMonth` in `src/core2/modules/official-pay.ts`: `paidFrom`, `owedMinor`, the partial transfer from the outside account) and fix it at the cause.

**Rules.** Every dollar balances: the days served times the salary equals what was paid plus what is owed. No dice. One rule, all 56 places.

**Done when.** The test passes on seed `9a11da355dc8b557` and on three drawn seeds, and it names the official's pay row and receipts for the one that failed.

**Files.** src/core2/modules/official-pay.ts, src/core2/official-salary-payroll.test.ts

**Notes.** Found running the staff and official-pay tests for the aides' living cost change; it fails the same way with that change stashed.

**Fixed (Oct 17, claude).** The pay row now ends with the official: `payMonth` removes the row of anyone no longer alive. Pay for the days between the last payday and the death is not paid (no estate engine reads it yet). `src/core2/official-pay-death.test.ts` pins the seed above and a random place; it fails without the change.

Oct 20: PR #5008 merged to main: an official who dies is paid no more.

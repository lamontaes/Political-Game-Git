---
id: laws-corporate-tax-arrears-by-jurisdiction
title: "Keep corporate-tax arrears owed to the treasury that incurred them"
area: gov
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #5649
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The returned corporate-tax family combines federal and state arrears into one balance and distributes later payments using current-quarter weights. With zero current profit, debts of 100 and 50 are incorrectly split as payments of 75 and 75. Keep ownership of each unpaid tax with its treasury, including after a rate change or repeal, and settle that treasury through the existing journal writer.

**Rules.** Wire to the world: each payable retains its government and its settlement credits that treasury on the cash journal. Replace, never layer: replace the combined-debt weighting instead of adding a second tax engine. No dice: debt settlement follows the recorded balances and available money.

**Done when.** A regression with positive federal and state arrears of 100 and 50 and zero current-quarter tax settles 100 and 50 to their own accounts, never 75 and 75. Rate-change and repeal cases preserve the old debt owner. A generated played world built with buildBenchWorld in a drawn place names the independent seed, tax/debt rows and settlement journal record ids, and the changed-file tests pass.

**Files.** src/core2/modules/employer-taxes.ts, src/core2/law-wiring-taxes.test.ts, src/core2/employer-taxes.test.ts

**Notes.** Sent back 2026-10-23 from PR #5649 (branch claude/law-wiring-taxes): employer-taxes.ts combines jurisdiction debts and reweights them by current tax, so zero-profit repayment loses the owner; finish on that branch, merge main into it first.

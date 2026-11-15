---
id: tests-budgets-charges-payers-draws-and-fails
title: "The charges-payers test draws its place and fails at places on the Train's own head"
area: core
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "found by the Account lead's resident-spending and shelter builds, Nov 15"
claimed-at:
after:
lead: account-lead
model: sonnet
effort: medium
root: rc9-place-facts-one-default
checked: sonnet 2026-11-15
---

**What.** `src/core2/budgets-charges-payers.test.ts` draws places and fails depending on the draw, with no change of ours. Seen: on the Train head aa927a84, Kaumakani, Hawaii, seed 30eb1ffdfb1427862fcb23da0dd2c205bf34e1cd2b673c6303b46144c8279842 fails with "expected 392604237 to be 382602147"; Buena Vista, Colorado, seed 04193751 and Washington, D.C., seed 076a27c8 failed on the shelter branch. Feeds: world-shelter-taken-out-after-the-housing-past.

**Cause.** Found in code: the test loops `drawPlace` (line 43) until a place has charges and a paying full household, then asserts the treasury's charges revenue equals the named payers' payments; at places where a payer's payment is also counted by another flow the two totals differ by the other flow's amount. The exact double count is not yet traced.

**Fix.** Design: pin the test to named places and fixed seeds (pinned-tests), then trace the failing places' difference to the flow that counts the same payment twice and fix that flow.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, write what was seen in the item and stop.

**Rules.** Pinned tests: named places, fixed seeds, never red by draw. No loosening of the assertion.

**Done when.** At Kaumakani, Hawaii, seed 30eb1ffdfb1427862fcb23da0dd2c205bf34e1cd2b673c6303b46144c8279842, the test passes with the treasury's charges revenue equal to the named payers' payments, and the test names its places and seeds in the file.

**Waits on.** None.

**Files.** src/core2/budgets-charges-payers.test.ts

**Notes.** Filed from the #9423 gate; red on clean Train head before that branch's changes.

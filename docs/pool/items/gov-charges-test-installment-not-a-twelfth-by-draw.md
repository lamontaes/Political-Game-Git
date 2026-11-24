---
id: gov-charges-test-installment-not-a-twelfth-by-draw
title: "budgets-charges-payers: a service-users installment is not a twelfth of the year at a drawn place"
area: gov
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: filed by hand on branch claude/project-thread-xy4wd4 (cluster 13, PR #9308)
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** src/core2/budgets-charges-payers.test.ts fails by draw on the clean train: the installment of a government's service-user charges row is not the twelfth the test expects, so the row the treasury shows for what other service users owe differs from what the test says it should. Guards: the charges the town's treasury page shows for what other service users pay, so the page and the engine agree.

**Cause.** Measured: on the clean train 8bb1ff9d, Mountain View, North Carolina (3744770), seed d346536e297211ab4479baa8d8128082e9b0c44dc60fc8655d9e05988f0d6385, row treasury-charges:chargesAndFees:service-users:county:37035:2025-02-01: expected 2310424296 to be 2250794127 (about 2.6 percent over). Also red on PR #9308 at Ridgefield, Connecticut (0963900), seed ec8137afc0317e6c9b1699d874e3619b50852cc49ea2cede1917b987fd15f90b, row ...:place:0963900:2025-02-01: expected 24299102 to be 23708834. Not yet traced to a line.

**Fix.** Trace which of the installment's inputs (the plan's charges line, what the town already paid, a month's rounding) the test leaves out, then either fix the engine where it double counts or correct the test's expectation with the reason, in the engine that owns the row (src/core2/budgets-charges-payers.test.ts line 103 reads it).

**Time box.** 3 hours for one opus session.

**Rules.** No dice. Pinned places and fixed seeds in the test; never loosen an assertion to get green.

**Done when.** A second session runs the test at the named places and seeds above and in a drawn place and seed it did not choose, sees it pass for the reason the fix names, and the player sees the same charges the test reads (the town's treasury page for charges).

**Waits on.** Nothing.

**Files.** src/core2/budgets-charges-payers.test.ts, src/core2/budgets-treasury.ts

**Notes.** Found while building PR #9308 (fee levels by bill). Red on the clean train head 8bb1ff9d as well as on that PR.

Evidence added Nov 14 (PR #9308 rework): clean train e24cb825897639f1a40b62751ed5290008dd3284, Redstone Arsenal, Alabama (0163912), seed 67d332190ca87c8bef39f019603429fb87cd817df67efd71d3ad8e59cb48ec93, row treasury-charges:chargesAndFees:service-users:county:01089:2025-02-01: expected 6202739794 to be 6111531429 (about 1.5 percent over). On the PR's head (train 6e304e09 merged in), Colonia, New Jersey (3414380), seed 1ec9880a95c0585e075c97ddb24a4873c2f82a524610b441730ae72ac245d0ef: expected 78971550418 to be 77065208799 (about 2.5 percent over). The same failure text on both, at different draws, so the drift is the engine's and not the fee levels.

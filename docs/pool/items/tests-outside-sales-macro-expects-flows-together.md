---
id: tests-outside-sales-macro-expects-flows-together
title: "The outside-sales test expects every seller's outside sales to move together, but sellers of a kind now split their buyers by staffing"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: none
lead: jobs
model: sonnet
effort: medium
source: "Industries thread, Nov 16 (the gate on #9627, red on its base #9579 too)"
---

**What.** `src/core2/outside-sales-macro.test.ts` asks that more than 60% of a town's outside-sales flows end a played year within 2% of the median change. Since outside buyers' spending is divided among a kind's sellers by service level, a seller short of staff loses share to its rivals, so flows of one kind no longer move together and the check fails. It also draws its place at run time. Seen: Millston, Wisconsin, seed 144ecbf1abdb046a015db75b5c6a5273d6dc8359, 0.238 near the median on #9627 (a813ba3e); 0.44 on a fresh draw on its base 7deed8ee, Nov 16.

**Cause.** Found in code: `src/core2/outside-sales-macro.test.ts` line 48 tests each flow against the median; `scaleOutsideSales` in `src/core2/residents-economy.ts` (line 501) divides a kind's outside spending among its sellers by service level, so the per-flow ratio is no longer the place's factor alone.

**Fix.** Pin the test to a named place and seed, and check what the macro step promises: each kind's total outside sales in the town follow its sector's factor over the year (the division keeps the kind's total, as `outside-sales-division.test.ts` checks), naming the flows. The player sees it on dev mode's Industries page, Outside buyers a year by industry.

**Time box.** 2 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Rules.** One rule, all 56 places: the pinned place is found by drawing from all 56 outside the test. Never weaken a test: the check moves to the kind's total, which the code promises, and stays as strict.

**Done when.** The pinned test passes, is red on a base where the macro factor is not applied, and a second session checks a drawn place nobody chose on the Industries page that a kind's outside buyers move with the economy.

**Waits on.** Nothing.

**Files.** src/core2/outside-sales-macro.test.ts

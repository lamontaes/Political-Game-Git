---
id: play-golden-path-m0-13-red-st-johnsbury-part-5-business-borrowing
title: "A new business borrows no more than its founder's means allow"
area: core
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after: play-golden-path-m0-13-red-st-johnsbury-part-1-rerun-and-split
blocked-on:
lead: play-first
model: opus
effort: high
root: rc2-done-from-records
source: split from play-golden-path-m0-13-red-st-johnsbury in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** In St. Johnsbury, Vermont, both new businesses borrowed more than nine times the founder's own cash (the largest $215,153), against the test's assertion that a new business's loan is at most nine times the founder's cash (the SBA rule the test cites). A new business's loan should be sized from the founder's cash and the lender's rule in the business and lending engines. Find where the loan is sized and why it exceeds the rule.

**Cause.** Needs cause. Looked at: measured: GOLDEN_PATH_SEED=f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4 GOLDEN_PATH_PLACE_KEY=5062125 node --max-old-space-size=8192 --expose-gc --import tsx tests/golden-path/played-world.node-test.ts in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4) failed on main 663a38fedf (Oct 28); both new businesses borrowed more than nine times the founder's cash, the largest $215,153; the sizing rule is not traced. Not yet known: where a new business's loan is sized. How to find it once part 1 has re-run the check: re-run (part 1 says whether it still fails), then find where a new business's loan is sized in the business module, and make it follow the lender's rule from the founder's cash (a parameter row tagged with its source), not a fixed multiple of the business's need.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: every check M0-13 makes must hold in every drawn place's played year, so the failure is fixed at its engine, never by loosening the check. One rule, all 56 places: the repro place is a repro, not a rule; no place is named in logic. Red main comes first (owner, Oct 15). Ask why: the PR names the cause by file and line.

**Done when.** A second session runs the M0-13 command above and in two more drawn places (names and seeds recorded) and sees every new business's loan within the founder's means, with the sizing rule and the loan record ids named.

**Waits on.** play-golden-path-m0-13-red-st-johnsbury-part-1-rerun-and-split, which re-runs the check on current main and may narrow or drop this part.

**Files.** tests/golden-path/played-world.node-test.ts, src/core2/modules/business.ts

**Notes (Fable, Nov 10).** Re-run by Fable on Nov 10 on main cb25bfa5c8 with the command in the Cause (St. Johnsbury, Vermont, 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4; the year ran in 105 seconds): 21 checks pass and 1 fails. This part's check is still broken: 10 of 11 new businesses borrowed more than 9 times the founder's cash, and the largest loan was $917,920. The first part's re-run is therefore done; a finder starts from the eleven foundings' loan records.

**Notes (Fable, Nov 10, proposed for the CTO).** Proposed: drop as a duplicate of tests-played-world-founding-means-ignores-savings, which holds the cause. Measured by Fable on Nov 10 on main cb25bfa5c8 (St. Johnsbury, Vermont, 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4, one played year): 11 businesses were founded, and every one borrowed at most 9 times the equity its founding row records (nine at exactly 9.00, one at 8.05, one at 1.15; the largest loan, $917,920, stands against $114,086 of equity). So the engine keeps the nine-times rule, and the check fails 10 of the 11 only because it compares each loan with the founder's cash of the day before (tests/golden-path/played-world.node-test.ts line 383) and not with the equity put in.

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
blocked-on: tests-played-world-founding-means-ignores-savings
lead: play-first
model: sonnet
effort: low
root: rc2-done-from-records
source: split from play-golden-path-m0-13-red-st-johnsbury in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** In St. Johnsbury, Vermont the played-world check says 10 of 11 new businesses borrowed more than nine times the founder's cash (the largest $917,920). The engine keeps the nine-times rule; the check measures the founder's means without the savings the founder puts in. Proposed: drop as a duplicate of tests-played-world-founding-means-ignores-savings, which holds the same cause and fix. Feeds: play-golden-path-m0-13-red-st-johnsbury.

**Cause.** Found in code: tests/golden-path/played-world.node-test.ts line 383 records `meansMinor` as the founder's liquid cash of the day before. The loan is sized in src/core2/modules/credit.ts `foundingLoanLimit` (line 2016, `byEquity`) at most (1 - share) / share times the plan's `equityMinor`, nine times at `creditStartupEquityShare` 0.1. That equity is set in src/core2/modules/business.ts (line 2065) as the founder's cash plus the savings withdrawn on the founding day (`withdrawSavings`, line 2058), less a living-cost reserve. So a founder with savings borrows nine times cash plus savings, and the check compares that loan against cash alone. Measured by Fable on Nov 10 (main cb25bfa5c8, the seed above): all 11 loans are at most nine times their founding row's equity (nine at exactly 9.00).

**Fix.** Nothing to build in this item. Build tests-played-world-founding-means-ignores-savings (the check reads the founding row's `equityMinor` as the founder's means, keeps the nine-times test, and a one-line break in `foundingLoanLimit` still fails it). When that merges, this item is closed with it. Proposed for the CTO: drop this item as its twin.

**Time box.** 1 hour for one Sonnet session, only to confirm once the twin merges. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: every check M0-13 makes must hold in every drawn place's played year, so the failure is fixed at its engine, never by loosening the check. One rule, all 56 places: the repro place is a repro, not a rule; no place is named in logic. Red main comes first (owner, Oct 15). Ask why: the PR names the cause by file and line.

**Done when.** A second session runs the M0-13 command above in St. Johnsbury, Vermont with the seed above and in one drawn place (place and seed named), after tests-played-world-founding-means-ignores-savings merges, and sees "a new business's loan fits its founder" pass, with each founding's loan at most nine times its founding row's equity, named by founding id.

**Waits on.** tests-played-world-founding-means-ignores-savings.

**Files.** tests/golden-path/played-world.node-test.ts, src/core2/modules/credit.ts, src/core2/modules/business.ts

**Notes (Fable, Nov 10).** Re-run by Fable on Nov 10 on main cb25bfa5c8 with the command in the Cause (St. Johnsbury, Vermont, 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4; the year ran in 105 seconds): 21 checks pass and 1 fails. This part's check is still broken: 10 of 11 new businesses borrowed more than 9 times the founder's cash, and the largest loan was $917,920. The first part's re-run is therefore done; a finder starts from the eleven foundings' loan records.

**Notes (Fable, Nov 10, proposed for the CTO).** Proposed: drop as a duplicate of tests-played-world-founding-means-ignores-savings, which holds the cause. Measured by Fable on Nov 10 on main cb25bfa5c8 (St. Johnsbury, Vermont, 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4, one played year): 11 businesses were founded, and every one borrowed at most 9 times the equity its founding row records (nine at exactly 9.00, one at 8.05, one at 1.15; the largest loan, $917,920, stands against $114,086 of equity). So the engine keeps the nine-times rule, and the check fails 10 of the 11 only because it compares each loan with the founder's cash of the day before (tests/golden-path/played-world.node-test.ts line 383) and not with the equity put in.

Cause found (Nov 11, 2026, cause finder for Fable B): checked Fable's Nov 10 proposal in code on main. The loan limit (credit.ts line 2016) and the equity (business.ts line 2065) agree with it, so the engine is right and the check is wrong. No new run was needed: Fable's run already gave every founding's loan against its equity.

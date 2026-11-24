---
id: play-golden-path-m0-13-red-st-johnsbury-part-4-homes-and-pay
title: "Every home has a value or rent and every person paid has cash at the end"
area: core
kind: bug
priority: 1
size: M
status: done
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

**What.** In St. Johnsbury, Vermont, 9 of 2,830 homes had no value or rent, and 7 of 42 people paid in the last month had no cash at the end. A home with no price or rent cannot be sold, taxed or charged, and a person paid with no cash at the end means pay or spending went somewhere the books do not show. Find both causes and fix them at the engines that write home values and cash.

**Cause.** Needs cause. Looked at: measured: GOLDEN_PATH_SEED=f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4 GOLDEN_PATH_PLACE_KEY=5062125 node --max-old-space-size=8192 --expose-gc --import tsx tests/golden-path/played-world.node-test.ts in St. Johnsbury, Vermont (place key 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4) failed on main 663a38fedf (Oct 28); 9 of 2,830 homes had no value or rent and 7 of 42 people paid in the last month had no cash at the end; neither cause is traced. Not yet known: where the value or the cash goes missing. How to find it once part 1 has re-run the check: re-run (part 1 says whether either still fails), then trace the nine homes and seven people by record id (housing and the journal) to find where the value or the cash goes missing, and fix each at its engine; a home gets its value from the housing module's own rule and a person's cash is the sum of what the journal shows.

**Fix.** None until the cause is found.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: every check M0-13 makes must hold in every drawn place's played year, so the failure is fixed at its engine, never by loosening the check. One rule, all 56 places: the repro place is a repro, not a rule; no place is named in logic. Red main comes first (owner, Oct 15). Ask why: the PR names the cause by file and line.

**Done when.** A second session runs the M0-13 command above and in two more drawn places (names and seeds recorded) and sees every home with a value or rent and every person paid in the last month with cash at the end, with the former homes and people traced by record id to their cause.

**Waits on.** play-golden-path-m0-13-red-st-johnsbury-part-1-rerun-and-split, which re-runs the check on current main and may narrow or drop this part.

**Files.** tests/golden-path/played-world.node-test.ts, src/core2/modules/housing.ts, src/core2/modules/residents.ts

**Notes (Fable, Nov 10, proposed for the CTO).** Proposed: drop, it no longer fails. Re-run by Fable on Nov 10 on main cb25bfa5c8 with the command in the Cause (St. Johnsbury, Vermont, 5062125, seed f915eb032ec8974d29313800491a231f3b0daedc594075e0adbea9c7937ef8c4; the year ran in 105 seconds): 21 checks pass and 1 fails. Both of this part's checks pass: "homes have values and rents" (3,765 homes priced, 1,497 rented) and "pay reaches a spendable account" (90 paychecks reached their workers).

**Notes (CTO, Nov 10).** Closed on Fable's proposal: it no longer fails: both its checks pass on main at cb25bfa5c8 (Fable, #8209).

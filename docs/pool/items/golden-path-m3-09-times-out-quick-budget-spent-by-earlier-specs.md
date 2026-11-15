---
id: golden-path-m3-09-times-out-quick-budget-spent-by-earlier-specs
title: "The golden-path quick job's 450 second budget runs out before M3-09, so an accepted spec times out on pull requests"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: speed
source: "Account lead F1, Nov 14, 2026, from the golden-path job on PR #9297 (run 43634491327)"
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** The golden-path check on a pull request goes red with one regression: the accepted spec M3-09 times out, and the 36 goals under it (not-reached or missing-command rows) stay unread. Nothing about the pull request's change fails. Main and every pull request stand to go red the same way whenever GitHub's runner is a little slow. Seen: the golden-path job of #9297 at head ca450a33.

**Cause.** Measured: run 43634491327, the quick job, M3-09 at Hybla Valley, Virginia (seed d02aaf41adbee30252e4a3ad4de933d511b0e49a3ec1a79b1e5234ec1feb5e46) timed out after 9.7 seconds, because the 19 accepted specs before it ran 33.6, 16.5, 23.3, 14.2, 20.1, 26.9, 1.1, 0.2, 3.1, 16.3, 81.0, 21.8, 15.7, 14.5, 50.5, 34.7, 12.6, 21.1 and 33.2 seconds, about 440 seconds of the 450 (`prMilliseconds` in scripts/core2-guard/policies.json). The policy's own `goldenBudgetReason` already says the quick job's accepted specs come to about 480 seconds against the 450 budget. The goals listed are the registry's unaccepted rows (M0-04, M0-07, M0-08, M1-03 to M1-14 except M1-11, M2-03, M2-10, M3-01 to M3-08, M3-10, M4-01 to M4-06, M5-01 to M5-04, M6-01 to M6-04, M7-01 to M7-06) and are not part of the red.

**Fix.** Make the accepted specs fit: M1-02 at 81 seconds and M2-06 at 50 seconds are the longest, so look first at what each plays in a small drawn town; if the work cannot shrink, split the quick job in two by spec id so each half has its own budget. Never skip a spec and never loosen a test.

**Time box.** 2 hours for one Sonnet session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** Checks stay light and the budget is the CTO's number (`speed-work`); no dice; one rule, all 56 places: the split or the speed-up must hold at any drawn place, not only Hybla Valley.

**Done when.** A second session, not the builder, sees the golden-path quick job on main run every accepted spec to a pass or a real failure in three runs at three drawn places nobody chose (spec ids, places, seeds and times printed), with a test in tests/golden-path covering the change, and says so with `npm run pool -- seen`.

**Waits on.** Nothing.

**Files.** scripts/core2-guard/policies.json, tests/golden-path/runner.mjs, docs/roadmap/features.json

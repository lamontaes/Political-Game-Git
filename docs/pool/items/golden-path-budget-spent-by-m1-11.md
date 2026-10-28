---
id: golden-path-budget-spent-by-m1-11
title: "The golden-path suite runs out of time again: M1-11 takes up to 193 seconds of the shared budget, so later accepted specs time out or never run"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/m111-long
pr: #6456
blocked-on:
lead: speed
source: added with npm run pool -- add
claimed-at: 2026-10-28T00:19:14.128Z
---

**What.** The golden-path check on pull requests is red on main and on unrelated pull requests because the suite runs out of its shared budget (scripts/core2-guard/policies.json, prMilliseconds), not because a spec fails. M1-11 is now the longest accepted spec, and its time depends on the place drawn: 51.9 seconds in Mount Hebron, California (PR #6421's run at dd197f09af, where M3-09 then timed out in Wiley, Colorado), and 192.9 seconds in Newington, Virginia (PR #6440's run at 6e45a87325, where M2-05 timed out in Kealakekua, Hawaii and M2-06, M2-07, M2-08, M2-04, M2-09 and M3-09 never ran). Main's own golden-path job failed the same way on the #6423 merge. Every spec that finished passed in both runs. The earlier fix (play-golden-path-budget-starved-by-played-year) moved the played year to its own job; M1-11 has grown into the same role.

**Time box.** 2 hours, the speed lead or a Sonnet worker.

**Rules.** Checks stay light; the fix is to the guard or to M1-11's own speed, never a skipped spec. The budget is the CTO's approved number, so raising it is the CTO's call. No dice. One rule, all 56 places: M1-11's time must fit in any drawn place, not only the ones above.

**Done when.** On main, the golden-path job runs every accepted spec to a pass or a real failure in three runs with different drawn places (spec ids, places and times printed), either by marking M1-11 longRunning in docs/roadmap/features.json so it runs in the long job, or by making it fit; a test in tests/golden-path covers whichever change is made.

**Files.** docs/roadmap/features.json, tests/golden-path/runner.mjs, scripts/core2-guard/policies.json

**Notes.** Filed by the director lead from two pull requests' golden-path logs, Oct 27, 23:45 UTC.

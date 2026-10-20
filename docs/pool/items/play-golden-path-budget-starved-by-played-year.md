---
id: play-golden-path-budget-starved-by-played-year
title: "The golden-path suite's 300-second budget is spent by one full played year, so four accepted specs time out or never run"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-18T19:27:25.983Z
---

**What.** The golden-path suite on a pull request has one 300-second budget (scripts/core2-guard/policies.json, prMilliseconds) shared by all its specs, run in the order of docs/roadmap/features.json with the accepted ones first. The third accepted spec, M0-13 (the played world runs one game year), takes most of it: 168 seconds on a four-core container in Granville, Ohio, and about six minutes of the whole job on GitHub's runner. The accepted specs after it then get the leftover seconds. M2-06 timed out after 20 seconds of its budget and M2-07, M2-08, M2-04, M2-09 and M3-09 never ran, so the suite reports a regression on main and on every pull request, including a pool note. The failure says nothing about the code under test.

**Rules.** Checks stay light and the golden-path suite is the bench's own guard, not a merge blocker, so the fix is to the guard. No dice: the order and the budget do not depend on a roll. The budget is the CTO's approved policy (the citation in the policies file), so changing it is the CTO's call.

**Done when.** The golden-path suite run on main in one process takes the same budget and every accepted spec other than the played-world year runs to a pass or a real failure, shown by the spec ids and times in its summary table; the played-world spec runs last among the accepted ones or in its own job, and a test in tests/golden-path covers the ordering.

**Files.** tests/golden-path/runner.mjs, scripts/core2-guard/policies.json

**Notes.** Reproduced Oct 18 on main (run seed from the commit): M0-10 1.3 s, M0-11 0.4 s, M0-13 168.7 s, M2-01 37.8 s, M2-02 36.2 s, M2-05 35.4 s, M2-06 timeout at 20.3 s, then M2-07, M2-08, M2-04, M2-09 and M3-09 not reached. The same failure showed on pull request #5055's golden-path check. Two ways out: order the accepted specs by their last measured time with the year last, or give the played-world year its own job with its own budget (the nightly mode already has 1,800 seconds).

Built Oct 18 (claude/golden-budget): a spec can carry `longRunning` in docs/roadmap/features.json, and the runner puts those last within the accepted group; M0-13, the played year, is marked. The budget in the policies file is unchanged (the CTO's number). A test in tests/golden-path/runner.node-test.mjs covers the order.

Re-run Oct 18 with the order change, same container: M0-10, M0-11, M2-01, M2-02, M2-05, M2-06, M2-07, M2-08 and M2-04 pass (eight more than before the fix reached), then M2-09 times out at 20.7 s and M3-09 and M0-13 are not reached. Their times (1.3, 0.4, 37.9, 35.4, 35.1, 34.6, 58.5, 36.3 and 39.8 seconds) already add up to 280 s, so the 300 s budget cannot hold the twelve accepted specs here even without the year (168.7 s alone). The ordering fix is kept, but the suite stays red on this machine until the CTO raises `prMilliseconds` (about 600 s covers all twelve here) or moves the year spec to its own job; this item stays open for that number.

Oct 20: PR #5061 merged the ordering fix, but the suite still runs out of its 300-second budget and the budget is not raised, so the played year gets its own job.

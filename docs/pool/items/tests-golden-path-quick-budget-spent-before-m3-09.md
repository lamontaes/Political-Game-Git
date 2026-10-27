---
id: tests-golden-path-quick-budget-spent-before-m3-09
title: "The golden-path quick run spends its 450-second budget before M3-09, which times out with about 23 seconds left"
lead: cto
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On #6375's head 44088842b9 (run 40566380843, both attempts) the eighteen accepted quick specs ahead of M3-09 took about 427 of the 450 seconds in prMilliseconds (scripts/core2-guard/policies.json), so M3-09 (src/core2/corruption.test.ts, Cascade Colony, Montana, seed f034e12d17cb23f3024faec0a35a99648e1340d1e181a9ed58b569aad37c50fd) was killed at 22.8 seconds and reported as a timeout. The specs' times in that run were M0-01 23.7, M0-02 13.1, M0-03 22.3, M0-05 9.1, M0-06 22.5, M0-09 33.1, M1-01 28.9, M1-11 63.6, M2-01 26.5, M2-02 24.1, M2-05 23.9, M2-06 23.9, M2-07 25.7, M2-08 23.6, M2-04 25.9 and M2-09 34.6 seconds. The goldenBudgetReason in the policies file measured the accepted quick specs at about 380 seconds, so the suite has outgrown its budget and the last accepted spec fails on time on any pull request, whatever it changes.

**Rules.** Ask why: name each spec's measured time on GitHub's runner before choosing a fix, by run id. Checks stay light and say something about the code under test: a spec that never got the time to run is not a regression of the pull request. The budget is the CTO's approved policy, so changing the number or splitting the job is the CTO's call; never skip or quarantine M3-09 to get green.

**Done when.** A golden-path quick run on main reports M3-09 passed or failed on its own test, not a timeout, with every accepted spec's time in its summary table, and the policies file's reason quotes the measured times of that run; a test in tests/golden-path covers whatever ordering or split the fix uses.

**Files.** scripts/core2-guard/policies.json, tests/golden-path/runner.mjs, .github/workflows/m0-guard.yml

**Notes.** Found Oct 27 by the laws-and-effects lead from #6375's golden-path summary. M1-11 at 63.6 seconds is the largest single cost.

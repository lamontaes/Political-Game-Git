---
id: golden-path-m2-02-engine-test-takes-90-seconds
title: "Golden path M2-02 takes 92 s at CI because the M2-03 engine test shares its file"
area: gov
lead: governing
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread, Nov 14, golden-path quick job out of budget at M2-08
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** At head b718411490d7 the quick golden-path job ran out of its 450 s budget at M2-08, so M2-04, M2-09 and M3-09 were not reached. M2-02 (election calendars, Leadore, Idaho, seed 5219a3b7e1b919a8d0d9e13a10dca046354a131fa0a90d20787eacd33a575953) alone took 92.0 s. Seen: the golden-path table of run 43633208622 and the timings below.

**Cause.** Measured: with `GOLDEN_PATH_PLACE_KEY=1645910 GOLDEN_PATH_SEED=5219a3b7e1b919a8d0d9e13a10dca046354a131fa0a90d20787eacd33a575953 npx vitest run src/core2/elections-filing.test.ts --reporter=verbose` the M2-02 test took 1.6 s and the M2-03 filing-engine test in the same file took 89.1 s (103 s for the file with load). The row runs the whole file. The 89 s is `advanceToFilingOpen` (src/core2/gov-test-clock.ts): Leadore's first filing window opens months after the game start, and the wait plays those days under the test's debug bookkeeping, the same wait that took 157 s of M2-06 at Palma Sola. The test's own steps after the wait are about a second.

**Fix.** The wait runs with the debug bookkeeping off and it is back on when the wait ends, in the one helper every test uses (`advanceToFilingOpen` and `advanceToRaceFiling` in src/core2/gov-test-clock.ts), and campaigns.test.ts drops its own copy of that wait. With it the M2-03 test takes 14.2 s at Leadore and the whole file 29.7 s. M2-02 stays in the quick job, unsplit, asserting what it asserted, and the M2-03 test is still run by it. A test asserts bookkeeping is on after the wait.

**Time box.** 2 hours for one sonnet session.

**Rules.** Speed: a spec's own limit is not loosened to get green; no test is skipped. The spec stays in the quick job.

**Done when.** In a drawn place (Leadore, Idaho, the seed above) `npx vitest run src/core2/elections-filing.test.ts` runs in under 40 s on GitHub's runner, M2-02 stays in the quick job, and a second session sees the golden-path table pass with M2-04, M2-09 and M3-09 reached.

**Waits on.** Nothing.

**Files.** src/core2/elections-filing.test.ts, docs/roadmap/features.json

**Notes.** M2-03's golden-path row is a goal with its own check (src/bench/m2-03-check.ts); the engine test runs through this file. Filed by hand.

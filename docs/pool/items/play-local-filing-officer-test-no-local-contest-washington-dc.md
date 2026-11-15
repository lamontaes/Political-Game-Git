---
id: play-local-filing-officer-test-no-local-contest-washington-dc
title: "The 'every local filing counter has someone at it' test finds no local contest in Washington, D.C. at one drawn seed and fails there"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
after:
blocked-on:
model: sonnet
effort: low
root: none
source: found by the #9153 carry thread, Nov 14
lead: wire-elections
---

**What.** `src/bench/local-filing-officer.test.ts` ("every local filing counter has someone at it, a county board of elections too") fails with `no local contest: expected 0 to be greater than 0` at Washington, District of Columbia (1150000) for run seed `bb83b91bbe339e955bb33a98b185a62cf4cc1e925ed060d19c4437b98b15e1d4` (place seed `9dc64f386725e980a43066f6dd85fb3c78ca922877d0dfdaf3b6374ecaa3de12`). The same failure happens on the clean train b7ed6337, so it is not from any change on top. The test draws its seed when `GOLDEN_PATH_SEED` is not set, so it is red only when a draw lands on a place with no local contest open in the window it looks at. Seen: the filing counters of a drawn place whose local races are not open.

**Cause.** Needs cause. The test loops a drawn place's contests for a local one and asserts at least one; at this seed the list is empty. Whether the district really has no local race open at that date (the council seats are not up), or the contest builder skipped it, is not yet found.

**Fix.** None until the cause is found.

**Time box.** 1 hour to find the cause.

**Rules.** No dice. One rule, all 56 places: the test finds a place with a local race by drawing and waiting, and names what it passed over (skill `drawn-place-tests`), never a loosened assertion.

**Done when.** A second session runs the test at that seed on main and it passes or the test names the places it passed over; names the place and seed.

**Waits on.** Nothing.

**Files.** src/bench/local-filing-officer.test.ts

**Notes.** Reproduce: `GOLDEN_PATH_SEED=bb83b91bbe339e955bb33a98b185a62cf4cc1e925ed060d19c4437b98b15e1d4 npx vitest run --dir . src/bench/local-filing-officer.test.ts`.

The test draws its seed at run time (`GOLDEN_PATH_SEED` or a random one), so once the cause is found it needs pinning to named places and fixed seeds with an explicit timeout (skill `pinned-tests`), Washington, D.C. at the seed above among them. No assertion is loosened.

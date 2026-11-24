---
id: elections-ties-test-finds-no-statewide-race-on-the-ballot
title: "election-ties.test.ts fails on the Train: no drawn state has a statewide race with two filers on the ballot"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: sonnet
effort: medium
root: none
source: Account lead gate, Nov 15, 2026 (red on the bare Train, found while gating #9528)
---

**What.** `src/core2/election-ties.test.ts` ("a tie decided by the legislature is voted by members who are persons with recorded views") fails with "no drawn state had a statewide race on the ballot" on the bare Train head b22cd35098, with and without #9528. The test goes red on every run, so the tie-by-legislature path has no check. Seen: the console line the test prints on a pass is missing from the Train's test output.

**Cause.** Measured: `GOLDEN_PATH_SEED=ties-red-1 npx vitest run src/core2/election-ties.test.ts` on b22cd35098 and on 91c9e2aa (#9528), and two runs with no seed each side, all fail the same way after the test's 30 draws: none of the drawn states has a `statewideExecutive` contest after the start date (`2026-10-20`) with two filers on its ballot. Needs cause: why a world opened at 2026-10-20 has no such ballot (the test opens the engines by hand, and filings are made by the candidacy module's play, which the test does not run; a world that opens already running, day-one-in-motion, should have them).

**Fix.** Needs cause. Read the test's opening against `buildBenchWorld` and the candidacy module first; the fix is to open the race the way the game does, not to hand-insert filings.

**Time box.** 2 hours for one session. When it runs out, push what passes and set the item honestly.

**Rules.** Day one is in motion, at every level (`day-one-in-motion`): a statewide race on the ballot at the start comes from the engine that makes the filings, never a hand-filled list. No dice: who is on the ballot follows the people's own choices.

**Done when.** A second session runs `GOLDEN_PATH_SEED=ties-red-1 npx vitest run src/core2/election-ties.test.ts` on main and sees it pass at a named drawn state, and the console line names the state, the seed and the contest id.

**Waits on.** Nothing.

**Files.** src/core2/election-ties.test.ts

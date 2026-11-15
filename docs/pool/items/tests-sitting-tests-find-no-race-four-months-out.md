---
id: tests-sitting-tests-find-no-race-four-months-out
title: "The interview and debate sitting tests find no race to file for in any drawn place"
area: play
kind: bug
priority: 3
size: S
status: in-pr
claimed-by:
pr: 9206
after:
blocked-on:
source: found while checking PR 9152, Nov 14
lead: elections
standard: 2
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** `src/director/interview-sitting.test.ts` fails in all 8 draws with "no race four months out the player could enter" on the train head (af211faa), on #9140's head and on #9152's head, for every seed tried (a random seed, `pin-a`, `pin-b`, `pin-c`, `pin-d`). `debate-sitting.test.ts` fails the same way for most seeds and passes for some (`pin-b` passes on #9140's head and #9152's head). The failure is thrown before any sitting is played, so the sittings are not tested. Seen: the two tests' output in a run on the train head.

**Cause.** Found in code: both tests pick a contest from `openContests` at the game's start date with `electionDate` at least 120 days out (interview-sitting.test.ts line 95; debate-sitting.test.ts the same), and `openContests` returns only contests whose filing window is open that day. At the start date few drawn places have one. The newer filing tests (src/bench/filing-platform-from-views.test.ts) advance a week at a time up to a year until a race the player may file for is open.

**Fix.** In both tests, advance the world a week at a time (up to 52) until a contest at least 120 days out that the player can enter is open, as filing-platform-from-views.test.ts does; keep the 8 pinned draws and name every place passed over.

**Time box.** 2 hours.

**Rules.** Tests pinned to named places and fixed seeds; never loosen what a test asserts.

**Done when.** A second session runs both files at a pinned seed on the train head in a drawn place (named with its seed), sees them reach the sitting and pass in the running game's own conversation, and the report names the places passed over.

**Waits on.** Nothing.

**Files.** src/director/interview-sitting.test.ts, src/director/debate-sitting.test.ts

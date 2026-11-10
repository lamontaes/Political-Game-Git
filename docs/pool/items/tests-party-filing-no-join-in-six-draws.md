---
id: tests-party-filing-no-join-in-six-draws
title: "The party filing test finds no one who joined a party as an act in six drawn places, red on clean main"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: wire-elections
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** src/core2/party-filing.test.ts fails on clean main with GOLDEN_PATH_SEED=pet-run-1 after its six draws, because in none of the played years did anyone join a party as an act. The places it passed over were Monomoscoy Island, Massachusetts; Deepstep, Georgia; Carter, Oklahoma; McCalla, Alabama; Lehr, North Dakota; and Bethany, Oregon. Before the vacant-seat special race fix, the same seed stopped earlier with "No national party on side 0", which hid this red. The join act may have become rarer since the test was written on Oct 27, or the test's window may be too short.

**Cause.** Needs cause. Looked at src/core2/party-filing.test.ts and src/core2/modules/parties.ts: why no one joins a party as an act in these six played years was not traced. Measured: GOLDEN_PATH_SEED=pet-run-1 passes over the six places above with no join act.

**Fix.** None until the cause is found.

**Time box.** 3 hours.

**Rules.** Never weaken a test to get green: find why no one joins a party as an act before changing the number of draws or the window. One rule, all 56 places: the test keeps drawing places from all 56 and names the places it passes over. Ask why: the PR names the cause by file and line.

**Done when.** A second session runs the party filing test on ten fresh GOLDEN_PATH_SEED draws in the played world (buildBenchWorld) and sees every run pass, each naming the drawn place, its seed and the record id of a join written as an act. The PR names the cause of the red by file and line.

**Waits on.** Nothing.

**Files.** src/core2/party-filing.test.ts, src/core2/modules/parties.ts

**Notes.** lead: elections. Found by the elections wire session on Oct 28 while running the tests for the petition line; the party engine is in the elections family, so it is this session's red under the Oct 28 14:40 ruling.

---
id: world-state-leaks-between-worlds-built-in-one-process
title: "A world built after another in one process differs from the same world built alone"
area: core
kind: bug
priority: 1
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: coordinator
model: opus
effort: medium
root: rc2-done-from-records
source: Account lead thread S2, Nov 14, 2026, while carrying PR 8941
checked: cause-finder 2026-11-14
---

**What.** The same place and seed gives a different world when another world was built and run first in the same process. Measured: `node --import tsx scripts/words/told-talk-proof.ts --kind job-lost --seed 82014698-5dac-429d-81fe-2e23cf47f44c --draws 2 --days 730 --talks 2` shows, in draw 1 (Kingston, Rhode Island, place seed 09819e83f34022bdd1f57377d7fccc95ce3cabc47a58b6318c5787868bcd0434), Foster Inn closing on 2026-09-20 (`employer-closed:2026-09-20:organization_73d4d7ce2f5f1de7`, Samir Schwartz person_67571f9da80fb933). The same draw run alone with `--from 1 --draws 1 --days 600` shows no job loss in 600 days. Run twice in one process with draw 0 (Bay Shore, Michigan) first: the closure was there both times. Seen: a played world is the same world whatever ran before it.

**Cause.** Measured: does not reproduce. On the train head (3076c608), Kingston, Rhode Island (seed 82014698-5dac-429d-81fe-2e23cf47f44c, draw 1, place seed 09819e83...) built alone and built after Bay Shore, Michigan (draw 0) played 730 days in the same process give the same record proof (`recordProof`, all 600 tables) every 10 days from 2025-01-20 to 2026-10-02, with and without the household and relatives watched by the director. On this item's branch (f8b7bf28), `told-talk-proof.ts --kind job-lost --seed 82014698-5dac-429d-81fe-2e23cf47f44c --from 1 --draws 1 --days 620 --talks 2` (Kingston alone) shows Foster Inn closing on 2026-09-20 and Samir Schwartz's talk, line for line the same as the two-draw run `--draws 2 --days 730`. The earlier lone run that showed no closure was made on different code (c05371d7 plus a debug print, with `--from` being added); it is not a leak. Logs: /mnt/project-files/leak-check/.

**Fix.** None needed. Foster Inn does not close on the train head because the train holds about 680 commits this branch lacks (134 files in src/core2), not because of the order worlds run in.

**Time box.** 2 hours to find the cause.

**Rules.** One run, one number; no dice (a world is a function of its place and seed).

**Done when.** In three drawn places, building the world alone and building it after another world in the same process give the same date-by-date record of the first 400 days (people, jobs, closures), and a test pins that at named places and seeds. A second session sees Kingston, Rhode Island (seed 82014698-5dac-429d-81fe-2e23cf47f44c, draw 1) give the same Foster Inn closure on 2026-09-20 whether it runs alone or second.

**Waits on.** Nothing.

**Files.** scripts/words/told-talk-proof.ts

**Notes.** Filed by S2 on the PR 9122 branch. Dropped by the cause-finder on Nov 14 after the measurement above. A guard that builds world A, plays it, then builds B and compares B's proof to B alone is proposed to the lead separately; it is not this item.

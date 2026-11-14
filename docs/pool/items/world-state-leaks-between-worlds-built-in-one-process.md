---
id: world-state-leaks-between-worlds-built-in-one-process
title: "A world built after another in one process differs from the same world built alone"
area: core
kind: bug
priority: 1
size: M
status: open
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
checked: S2 2026-11-14
---

**What.** The same place and seed gives a different world when another world was built and run first in the same process. Measured: `node --import tsx scripts/words/told-talk-proof.ts --kind job-lost --seed 82014698-5dac-429d-81fe-2e23cf47f44c --draws 2 --days 730 --talks 2` shows, in draw 1 (Kingston, Rhode Island, place seed 09819e83f34022bdd1f57377d7fccc95ce3cabc47a58b6318c5787868bcd0434), Foster Inn closing on 2026-09-20 (`employer-closed:2026-09-20:organization_73d4d7ce2f5f1de7`, Samir Schwartz person_67571f9da80fb933). The same draw run alone with `--from 1 --draws 1 --days 600` shows no job loss in 600 days. Run twice in one process with draw 0 (Bay Shore, Michigan) first: the closure was there both times. Seen: a played world is the same world whatever ran before it.

**Cause.** Needs cause. Something that survives one `buildBenchWorld` and changes the next is suspected; where is not known.

**Fix.** None until the cause is found.

**Time box.** 2 hours to find the cause.

**Rules.** One run, one number; no dice (a world is a function of its place and seed).

**Done when.** In three drawn places, building the world alone and building it after another world in the same process give the same date-by-date record of the first 400 days (people, jobs, closures), and a test pins that at named places and seeds. A second session sees Kingston, Rhode Island (seed 82014698-5dac-429d-81fe-2e23cf47f44c, draw 1) give the same Foster Inn closure on 2026-09-20 whether it runs alone or second.

**Waits on.** Nothing.

**Files.** scripts/words/told-talk-proof.ts

**Notes.** Filed by S2 on the PR 9122 branch. A cause-finder thread ("Find why one world changes another") is already reading the repro.

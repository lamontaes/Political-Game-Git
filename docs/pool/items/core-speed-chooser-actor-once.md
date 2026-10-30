---
id: core-speed-chooser-actor-once
title: "Every counted resident's decision builds a temporary person twice, once only to read its id (Grand Haven, Michigan: about 6 s of the year)"
area: core
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: speed/cut-chooser
pr: #6927
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T08:01:37.418Z
---

**What.** When a counted resident decides something (the monthly job review asks every counted adult without a job to wait or look), chooseAct in src/core2/choice.ts scores the offers and then decisionFromScores builds the same temporary person again with decisionActor, only to read its id. A Grand Haven, Michigan profile (seed spd-d, a 223 s profiled year) put decisionActor at 5.9 s and initialPersonState at 4.7 s under the jobs review alone. scoreOffers, initialPersonState and restingStress also create a parameter-reading closure on every call, which tsx names at run time.

**Rules.** Speed: a country's year runs under 120 seconds, and no change makes it more than 20 percent slower. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** decisionFromScores checks the actor exists without building it, and scoreOffers, initialPersonState and restingStress read the parameter table directly instead of through a per-call closure; npm run speed:year -- --seed long-1 --years 2 on main and on the branch, one process at a time, keeps dev mode's records proof identical in every table of the played world at year 2, with both runs' times in the PR body.

**Files.** src/core2/choice.ts, src/core2/person-state.ts, src/core2/resting-stress.ts

**Notes.** TODO

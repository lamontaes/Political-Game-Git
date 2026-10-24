---
id: roadmap-m1-12-officials-command
title: "Roadmap M1-12 has no command: a check that opens every official's card in the played world"
area: gov
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Roadmap M1-12, important people everywhere, reads passes: false with command null on main. Its test says to click any official in any state and see a full record with personality, history, relationships and the positions behind their votes. The officials module seats every member of Congress, governor, statewide executive and legislator as a person, and the play screen opens a person with personCard (src/bench/card.ts), so a check can open every serving official's card.

**Rules.** Wire to the world: the check builds buildBenchWorld with every module in a place drawn from all 56 and opens cards as the screen does. One rule, all 56 places: every state's officials are checked, never a named one. Never edit a spec's test text.

**Done when.** docs/roadmap/features.json has a command for M1-12 that opens every serving official's card in the runner's drawn place, fails naming each clause and the offices short of it, was run on main with place and seed in the PR body, and fails when officials get no colleague ties.

**Files.** src/bench/m1-12-check.ts, docs/roadmap/features.json

**Notes.** Split by the M0-M2 lead from roadmap-m1-people-politics-flags (CTO branch).

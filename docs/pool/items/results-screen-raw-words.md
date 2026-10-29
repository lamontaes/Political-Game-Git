---
id: results-screen-raw-words
title: "Election results show raw words: left-blank, declined and a district's seat id"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On election night the Campaigns results show the exit poll as 'left-blank 5 · declined 3' and a state House race's 'Where it was won' as 'seat:US-NV:lower:033:0' (Lund, Nevada, seed statewide-shot-1, November 3, 2026). Developer words on a play screen. The exit-poll answers come from src/core2/modules/voting.ts (around line 2364), and src/bench/results.ts passes any exit-poll key that is not a person or an official through unchanged, while the district names come from the places table that placesOf in voting.ts reads.

**Rules.** LAW.md: no developer text on play screens. No hand-written player text: the words come from controls or the English engine. One rule, all 56 places.

**Done when.** In a drawn place's first general election the results show no raw key or id: blank and declined exit-poll answers read as words from controls, and every district under Where it was won shows its name. Shown by a screenshot with place and seed.

**Files.** src/bench/results.ts, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** Found while proving play-stop-24 (PR 6118). Lead: play-first.

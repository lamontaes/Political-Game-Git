---
id: words-budget-cut-head-turnover
title: "The budget-cut scene test reads the department head on the day of the cut, since the post can change hands during the year"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: story/budget-cut-head-turnover
pr: #8105
blocked-on:
lead: words
source: CI red on #8097 and on clean main, seed 394907bded87e789979eb7c8e9de22236b4bf5bb (Enigma, Georgia)
claimed-at: 2026-11-10T03:55:00.000Z
merged-at: 2026-11-10T18:49:31.601Z
seen-by: second-session-2
seen-at: 2026-11-11T00:43:29.683Z
---

**What.** src/director/budget-cut-scene.test.ts picks a department head at game start, plays a year and then expects the budget-cut scene to cast that same person. On seed 394907bded87e789979eb7c8e9de22236b4bf5bb (Enigma, Georgia) the fire chief's appointment, appointment:town:fire-chief, changed hands during the year (person_389165228263e140 to person_ea881e5352de3cf8), and the director rightly cast the new chief; the test failed on clean main.

**Rules.** The test follows the engine: the head is whoever holds the appointment on the day of the cut. Nothing in the director changes; no dice.

**Done when.** src/director/budget-cut-scene.test.ts passes in the played world drawn for seed 394907bded87e789979eb7c8e9de22236b4bf5bb (Enigma, Georgia), where the fire chief changed during the year and the scene casts the new holder of appointment:town:fire-chief, and on a second drawn seed; the test reads the holder from the appointment record on the day of the cut.

**Files.** src/director/budget-cut-scene.test.ts

**Notes.** Found while checking #8097's unit run.

Seen in the game (2026-11-11, second-session-2): Enigma GA seed 394907bd...; fresh seed acfa89438972, seed 394907bded87e789979eb7c8e9de22236b4bf5bb, acfa89438972, main c330c7fe: budget-cut-scene.test.ts passed in the Enigma Georgia world and on a second fresh seed

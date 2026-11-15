---
id: world-race-lost-day-after-keeps-night-narration
title: "A race-lost scene staged the day after the count still says it is election night"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Words lead's read of #9446 (Nov 15): the day-after play of race-lost opened with the night narration
---

**What.** When the race-lost (concession call) scene is staged the day after the count, the director sets the `day-after` fact, but the narration and lines are the night's ("It's past eleven. The numbers on the screen stopped moving an hour ago."), so a morning scene reads as election night. Seen: in the race-lost scene staged on the day after a count, at Bountiful, Utah (draw probe:3), seed 616264a0c7f08ad24b15ac0e0ddd007381977b57ddfc987335abbc0f3fcda803, 2027-11-03.

**Cause.** Found in code: src/director/purpose-scene.ts sets `day-after` (`facts["day-after"]`, near the `same-day` branch) but the concession-call narrate and state parts in data/english/parts/scene-talk.json (purpose concession-call, key loss) carry no `same-day` or `day-after` requirement, so the night narration plays on either day. It is not known whether the game itself ever stages race-lost the day after (the scene's entry stays open some days, `openUntil` on the binding); the played test staged it by advancing a day.

**Fix.** Find whether a player can reach the scene the day after through the schedule's `openUntil`; if so, gate the night narration on `same-day` and give the morning narration its own parts (Words lead writes them), in the same purpose.

**Time box.** 2 hours.

**Rules.** Replace, never layer: the morning narration replaces the night's on the day after and none is kept beside it. One scene engine, and the builder writes no line.

**Done when.** A second session plays the day-after concession call at a drawn place and seed it names and sees narration that reads as a morning, by part key.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json

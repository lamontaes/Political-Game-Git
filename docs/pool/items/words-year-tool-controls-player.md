---
id: words-year-tool-controls-player
title: "The scene-year proof tool plays the player on the player's own clock, so scenes from circumstance run"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: story/director-unfired-types
pr: pending
blocked-on:
lead: words
milestone: play-first
source: "a played-year count of scenes per situation type listed morning-after, race-told, constituent-stop and news-arrives as never firing; the director only runs scenes from circumstance for the explicitly controlled person, and scene-year.ts advanced the core without registering one"
claimed-at: 2026-11-10T06:00:00.000Z
---

**What.** `scripts/dialogue-batch/scene-year.ts` advanced the world a day at a time with `advanceCore`, which never registers the player as the controlled person. The director's circumstance producer (`produceCircumstances`, ledger.ts) skips anyone who is not controlled, so every row in circumstances.json (the morning after, a stop in the street, news told, a story read at home) read as "did not fire" in the tool the scene-producers skill points to for proof. The tool now plays each day on the player's clock (`advancePlayerV1`, resuming a choice as the character's own and acknowledging a stop), the way the client does. Seed 2c31960e5cb2 (Des Lacs, North Dakota): 13 scenes in 7 types before, 43 scenes in 11 types after (news-arrives 19, story-read 9, hallway 1, last-day 1, no-diploma-home 1 are new).

**Found along the way.** A played candidate year (player files for the first open race, on the player clock) in Newfields, New Hampshire (seed a7f31c:4) and Phillips, Wisconsin (seed 5e90b2:4), and a sitting member's year in Rutledge, Missouri (seed c41d09:0), with the skill's own checks, left these still at zero, none from a missing producer: donor-ask for a gift to an NPC candidate (a fix is in review as story/director-donor-ask-fires), campaign-stop, speech-afterward, door-ask, vote-sought and vote-confirmed (the player's own acts), concession-taken (the player's reply), race-told (the morning-after row takes the same day's one scene), rival-filed (told only to candidates already on the ballot), polling-place (a ledger visit, not a schedule entry), swearing-in and race-won (both players lost), budget-cut (the budgets engine does not name the executive; pool item world-budget-cut-names-the-executive).

**Done when.** `node --import tsx scripts/dialogue-batch/scene-year.ts --seed <seed>` lists circumstance-staged types as fired in a played year; the skill's proof line is accurate.

**Files.** scripts/dialogue-batch/scene-year.ts

**Time box.** 1 hour.

**You will see.** Nothing changes in play.

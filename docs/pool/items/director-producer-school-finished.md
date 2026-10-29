---
id: director-producer-school-finished
title: "The end of the player's school year is a scene: the last day with a classmate, and the household's celebration after a diploma"
area: director
kind: feature
priority: 1
size: M
status: done
claimed-by: claude/director-producer-school-finished
pr: #6373
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T18:17:19.931Z
---

**What.** The scene web counts two rows waiting on a school-finished producer: last-day, a farewell with a classmate, and celebration, the household marking a diploma. The school engine already writes every senior's graduation result on the last school day, and the new adult who opens the game is a senior in most draws. No director row reads that result, so the player's last day of high school passes with nothing. The scene should come from the result record and cast someone from the player's own school that year, or from their household.

**Rules.** Wire to the world: the scene reads the school engine's own graduation result and attended records, and casts a classmate who attended the same school that year, never a drawn person. No dice: whether the player graduated is the school engine's decision, and the celebration plays only when it says they did. One rule, all 56 places: the school year's last day comes from each place's own calendar data.

**Done when.** In a buildBenchWorld drawn place with the seed named, a played year through the player clock in src/director/circumstance.test.ts stages last-day at the player's school on the result's day, citing the graduation result's record id and a classmate cast, and celebration at home the next day when the result says passed; the scene web report shows two fewer rows waiting on a producer.

**Files.** src/director/school.ts, src/director/data/circumstances.json, src/director/data/situation-types.json, src/director/scheduling.ts

**Notes.** TODO

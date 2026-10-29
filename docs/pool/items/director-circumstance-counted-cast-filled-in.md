---
id: director-circumstance-counted-cast-filled-in
title: "A scene from circumstance can cast a counted person at the player's place, filled in from the records when the scene opens"
area: director
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: director
source: added with npm run pool -- add
---

**What.** Scenes from circumstance (director-scenes-from-circumstance) cast only full people, so most circumstances in a two-level town never find their person. A new hire at the player's employer is a counted worker (the jobs engine's hire change names a counted seeker), so the new-coworker row fires only for the rare full-person hire. The readers of a story are full people only, so a street scene draws from the player's circle and officials. The producer should cast a counted person from the place's counts by the same score (reason, tie, sociability read off the group) and the bench fills them in (personOrFillIn) the moment the scene opens, matching what the records already say (owner, Oct 11: the one you click is one of those 12, with that job and pay).

**Time box.** 4 hours, Opus (director lead), no helpers.

**Rules.** Keep it simple (owner, Oct 11): two-level population, filled in when met, seeded from the world. One model, two tiers (Oct 14): a counted group is read by the same rule times its count. No dice. The director stays read-only; the fill-in happens where play opens the scene.

**Done when.** src/director/circumstance.test.ts in a drawn place (place and seed printed) stages a new-coworker scene whose cast was a counted worker before the scene opened and is a full person after, with the same employer and pay as the jobs engine's hire change (record id named); a test fails if the filled-in person contradicts the counts.

**Files.** src/director/circumstance.ts, src/bench/story.ts, src/core2/state.ts (personOrFillIn, read only), src/director/circumstance.test.ts

**Notes.** TODO

---
id: people-home-plated-room-first
title: "A home's living room is one people are drawn in, while the other rooms wait for their plates"
area: people
kind: feature
priority: 1
size: S
status: done
claimed-by: claude/people-home-plated-room-first
pr: #6856
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-30T01:45:03.144Z
---

**What.** On the opening evening a house's living room is picked from its dwelling's list by household (suburban-house or house-suburban-living, large-house for the top third, a regional house in its states), and only house-suburban-living has a mannequin plate, so in about a third of places the player's family is in the room but nobody is drawn or talkable (people-home-plates; panels.browser.mjs red, Albany, Vermont). Until the art session paints the other plates, the pick should come from the rooms of that list that have a plate, so the household is drawn on the first screen; a dwelling with no plated room keeps its own pictures.

**Rules.** One rule, all 56 places: the preference reads the plates as data, names no room or place; Placeholders: the preference is a registered stopgap that does nothing once every listed room has its plate, then is deleted; One picture per room for each household: the pick does not depend on the hour, so a home's living room is the same morning and night.

**Done when.** In three drawn places from all 56 whose household lives in a house (name each place and seed), homeOf picks a plated living room and stagePeople draws the household there at the opening evening with no member unplaced as no-plate; a test fails if a house household is given an unplated living room while its list has a plated one; the stopgap is in src/core2/data/stopgaps.json.

**Files.** src/bench/scene.ts, src/bench/people-pack.test.ts, src/core2/data/stopgaps.json

**Notes.** TODO

---
id: core-later-years-slower-drive-holders-offers
title: "A town's second and third years run 1.5 and 2.3 times slower than its first because activists are offered more acts each year (Bedford, Wyoming)"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A town's year takes longer each year it is played. Bedford, Wyoming (seed 9a4dd331ace7, place 5606045, run seed audit-oct17, one process, four-core container) ran 36.8, 54.5 and 81.9 seconds for years one to three; American Samoa 146, 220 and 342; the Northern Mariana Islands 180, 231 and 760. A profile of years one and three in Bedford puts the growth in people's daily choices: the daily choice code (`activate`) goes from 5.2 s to 58 s, with `availableActs` and `scoreOffers` the biggest parts. The count of people choosing is roughly flat, but the acts offered per choice grow: 11 offers a call in year one, 31 in year two and 66 in year three, with 1.36 million offers in year three against 117,000 in year one.

**Rules.** Speed: a town's game year runs in under two minutes, no change makes a year more than 20 percent slower than its base, and nothing scans the whole world each day: use indexes or act on the day something changed. No dice: who is offered what follows drives, groups and relationships. One model, two tiers.

**Done when.** On the same machine, one process, Bedford's third year runs within 20 percent of its first, with the offers per call and the profile lines for `activate`, `availableActs` and `scoreOffers` in the PR body; the activism acts people take stay the same in number for the same causes, shown by drive record ids.

**Files.** src/core2/modules/drives.ts, src/core2/life.ts, src/core2/choice.ts

**Notes.** Found running three years in six places (nothing crashed and every check passed). The growth tracks drive holders, not the whole town: 45 people hold 211 drives by year three (11 in year one), 30 cause groups (4 in year one) and 1,173 memberships (138). The providers in drives.ts offer, for each drive a person holds, an act per cause group, per known public figure and per volunteering place, so offers per person grow with drives times those lists; the logged acts of the player's circle (`person.acted`) also rise from 10,800 to 46,000 a year and the durable log from 12,000 to 79,000 records. Bedford's year-three profile has 28 s of garbage collection against 5.7 s in year one. One cheap cut is to stop offering an act a person's drive would only repeat the same day (one offer per kind of act and drive, not per target); a larger one is to rank targets once a week instead of scoring every one daily. Not built.

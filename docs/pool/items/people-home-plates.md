---
id: people-home-plates
title: "Mannequin plates for every home living room the opening evening can show"
area: people
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On the opening evening at home the player's household is cast into the living room but nobody is drawn and nobody can be talked to when the home picture has no mannequin plate: every member is unplaced with reason no-plate (Red main report: Albany, Vermont, seed d25a6da2-6418-4903-aa38-7114f4ae08ac, home picture suburban-house, three housemates unplaced; panels.browser.mjs fails there). People are drawn only on a plate (owner, Oct 28 and 29), and of the home living rooms the opening shows only house-suburban-living at night has one. The owner's first screen is that evening, so every home living room the dwelling records can pick needs its plate, in the light the opening uses (night) and then the others: suburban-house, large-house, house-suburban-living (midday, morning, rain, lived-in), rowhouse, rural-farmhouse, mobile-home, trailer-home-living, small-apartment and the apartment rooms (basement studio, nice living, older walkup, public housing, rundown living, starter living, student shared, suburban garden).

**Rules.** One rule, all 56 places: home plates are art data read by the one staging engine, stagePeople, with no place or dwelling named in code; Placeholders: a home picture without a plate draws nobody and stays a registered stopgap (SG-PLAY-people-pack-six) until its plate lands; An effect is a read, not a record: each plate is proven by the household drawn and talkable in a played opening evening.

**Done when.** In three drawn places from all 56 whose homes use different living rooms (name each place and seed), the opening evening draws the player and their household on the home plate, at least one housemate is talkable, and no household member is unplaced as no-plate; panels.browser.mjs passes in each; a screenshot of each is in the PR body.

**Files.** art/people-rooms/mannequin-plates/, art/backdrops/manifest.json, src/bench/people-pack.test.ts

**Notes.** TODO

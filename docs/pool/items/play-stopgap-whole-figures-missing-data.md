---
id: play-stopgap-whole-figures-missing-data
title: "Stopgaps in whole-figures (missing-data): 1 open"
area: play
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/bench/whole-figures.ts, kind missing-data"
after: art-figure-set
claimed-at: 
---

**What.** Each approved whole-figure look is painted doing one thing, so a person whose look does not fit where they are (a teen boy's skateboard indoors, a laptop off work) is drawn in their next look, indoors a teen boy is drawn in the youngest adult hoodie look, and the player's teen and adult looks are tied by two hand-paired families (family-066, family-009). The art item art-figure-set replaces the v1 cut-out figures with a layered set (age, skin, hair, outfit and hands as layers, with 8 poses by 6 bodies and `figures.json` anchors), which removes the cause: one person is composed from layers, so any activity or age fits and one person keeps one identity for life. When that set lands, make `pickLook` in src/bench/whole-figures.ts and the scene renderer compose a person from their record (sex, age, skin, hair, outfit for the place, pose for the act) instead of picking a pre-painted look, delete the v1 manifest, `lineageOf`, the nearest-age window and the hand-paired families, and resolve the row.

**Rules.** Replace, never layer: the v1 whole-figure pictures, their manifest and the look-picking code are deleted in the same change that the layered figures are drawn, as art-figure-set says. No hand-written player text: the picture shows record data only, and what a person is doing comes from the simulation's act, not from the picture (owner, Oct 13: the simulation decides what they are doing). One rule, all 56 places: skin, hair and outfit come from the person's record and the place's dress, never a place name. Wire to the world: the figure reads the person's age, sex and current act records, so a teen drawn indoors is a teen and a person ages on their birthday.

**Done when.** In a one-year run of buildBenchWorld in a drawn place from all 56 (place and seed named in the PR body, a seed the builder did not choose), the player's household is drawn at home each season with the same person recognizably the same at 15 and at 18, a teen indoors is drawn as a teen, and the people in a scene are named by person record id, and src/bench/whole-figures.test.ts asserts no figure falls back to another age band's look and that the manifest of v1 looks no longer exists; the row is resolved in stopgaps.json.

**Files.** src/bench/whole-figures.ts, src/bench/data/whole-figures.json, art/people-whole/manifest.json, art/people-engine/v2/, src/bench/whole-figures.test.ts, src/core2/data/stopgaps.json

**Notes.** First row: Each approved look is painted doing one thing, so a person whose look doesn't fit where they are (a teen boy's skateboard or basketball indoors, a laptop off work) is drawn in their next look, or the nearest-age look tha

Oct 20 (pool feeder): spec written; the stopgap's own replacement (activity variants of every look) is superseded by the layered figure set in art-figure-set; this item is the code that switches the renderer and deletes v1, so it waits on that item.

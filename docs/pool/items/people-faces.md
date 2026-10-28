---
id: people-faces
title: "People have their own faces, and hair painted from every angle"
area: play
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/people-faces
pr: #6435
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T22:51:00.318Z
---

**What.** The owner asked for facial expressions and different faces for men and women. Every v2 figure shares one painted face today, so every person looks alike. The art session painted faces onto the figures' own heads (faces-on-figures: front and both three-quarter views, with expressions) and hair pieces at every angle, including three-quarter turned right, painted rather than mirrored. This item puts a face on each person's record, lays the face on before the skin recolor so it takes their skin, colors a gray beard with their hair, uses the painted right-turned hair, and adds a Face row to the creator.

**Rules.** Every person drawn is the filled-in person: their face, like their hair and clothes, comes from their own record or the player's choice, set once from the record's seed. Replace, never layer: the mirrored right-turned hair is replaced by the painted pieces where they exist, and the back-view hair stopgap is deleted now that every style is painted from behind.

**Done when.** In a drawn place with a seed, a screenshot of a home and the Oval Office shows people with different faces and hair; a test in src/bench/figure-hair.test.ts checks every face changes only pixels around the head of a random figure and takes the person's skin color, and the creator test finds a Face row.

**Files.** src/bench/figure-hair.ts, src/bench/appearance.ts, src/bench/whole-figures.ts, art/people-engine/v2/faces-on-figures, art/people-engine/v2/hair-on-figures

**Notes.** TODO

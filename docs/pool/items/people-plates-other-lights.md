---
id: people-plates-other-lights
title: "A mannequin plate serves every light of its own painting"
area: people
kind: feature
priority: 1
size: S
status: in-pr
claimed-by: claude/people-home-plates
pr: #6848
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-29T23:41:42.457Z
---

**What.** A plate names one backdrop file, so a room painted with mannequins at night drew nobody at midday, morning or in rain, though those pictures are the same painting re-lit with every piece of furniture in the same place. The home living room's plate covered only its night picture. A plate now lists the other lights of its painting in a backdrops field and serves them too; condition pictures (lived-in, rundown) add clutter on the seats and keep their own plates. This cuts the plates the art session must paint for people-home-plates and people-chamber-plates to one per room.

**Rules.** One rule, all 56 places: the lights a plate serves are data in the plate file, read by the one plate loader, with no room named in code; An effect is a read, not a record: stagePeople draws the household on the other lights through the same plate in a played world; Replace, never layer: no second plate file is copied per light.

**Done when.** people-pack.test.ts passes, including a test that a plate's other lights are the same place, the same size and a light (never a condition), which fails with a lived-in picture added; in a drawn place (name it and the seed) a daytime home scene in the plated living room draws the household, with a screenshot in the PR body.

**Files.** src/bench/mannequin-plates.ts, art/people-rooms/mannequin-plates/home.mannequins.json, src/bench/people-pack.test.ts

**Notes.** TODO

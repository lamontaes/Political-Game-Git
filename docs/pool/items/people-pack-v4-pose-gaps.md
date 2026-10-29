---
id: people-pack-v4-pose-gaps
title: "Draw the standard poses pack v4 lacks: stand, couch and gesture for every person"
area: art
kind: feature
lead: cto
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: CTO, Oct 29 (people-pack-v4 review)
---

**What.** Pack v4 paints the standard Oval Office poses for some people and not others. The medium and slim men and the heavy woman have no `stand` figure, the heavy man has no `couch` figure, and the three women and the heavy man have no `gesture` figure. A person without the pose a spot needs is not drawn there, so a President drawn as the medium man sits at the desk but cannot stand behind it, and the heavy man never sits on the Oval Office couches. This is stopgap SG-PLAY-people-pack-v4-pose-gaps.

**Do.** The art session draws each missing pose at the five angles (front, three-quarter left and right, back three-quarter left and right) in the person's existing looks, and adds them as rows to `art/people-engine/v4/manifest.json` in the same shape as the other v4 rows. No code changes: the loader and staging read new rows as they are (the `people-pack` skill).

**Rules.** Placeholders: the stopgap SG-PLAY-people-pack-v4-pose-gaps is closed in the same PR that adds the rows, with its status set; Replace, never layer: the new rows join the v4 manifest and no second pack or folder is made; One rule, all 56 places: the poses are pack rows read by the one staging engine for every room and place.

**Done when.** `people-pack.test.ts` passes, and a test lists every pack person with a `stand`, `couch` and `gesture` figure at the five angles. A screenshot of the Oval Office plate from a drawn place (name the place and seed) shows each of the six people placed on a couch cushion and on a standing spot, and the medium man standing behind the desk as President.

**Files.** `art/people-engine/v4/manifest.json`, `art/people-engine/v4/people/`, `src/core2/data/stopgaps.json`, `src/bench/people-pack.test.ts`.

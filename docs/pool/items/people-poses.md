---
id: people-poses
title: "Poses at furniture: lectern, podium, desk, counter, visitor chair"
area: people
kind: feature
priority: 2
size: M
status: in-pr
claimed-by: claude/people-poses
pr: #6589
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T06:59:38.193Z
---

**What.** The art session painted 21 poses at furniture already in the game (art/people-rooms/poses on claude/people-rooms-art: lectern and podium gestures, desks, counter, visitor chairs from behind) and hair for heads turned away (prof, tqb). Draw a person in the pose at the spot where it was painted, through the figure reader and recolor by map.

**Rules.** Through the figure reader, staging and recolor that exist; every person in their own colors and hair; registered stopgap for the pose's body; owner's visual check before merge.

**Done when.** poses.test.ts: a person of the pose's sex at its spot is drawn in it and the other sex is not given it; every pose draws in the person's colors with hair on its own view; scene-shots in three drawn towns show the posed rooms.

**Files.** src/bench/whole-figures.ts, src/bench/figure-hair.ts, src/bench/figure-colors.ts, art/people-rooms/poses, src/bench/data/figure-heads.json

**Notes.** TODO

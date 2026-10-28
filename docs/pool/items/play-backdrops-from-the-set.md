---
id: play-backdrops-from-the-set
title: "Every scene draws its picture from all the paintings of that kind of place, chosen by town"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/backdrops-from-the-set
pr: #6438
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T23:19:20.480Z
---

**What.** The owner, Oct 27, on a street scene in Berry, Kentucky at midnight: why is this the only storefront scene used? A scene's place lists take the first painted picture, and a business's workplace takes the first painting with its tag, so every town draws the same Main Street, store and cafe. This item groups the paintings of one kind of place into families, draws a scene's picture from the whole family chosen by the town and the business or situation so the same place looks the same every visit and towns differ, and at night prefers a member painted at night.

**Rules.** One rule, all 56 places: one picker for every scene, business and town, no town named in logic. Replace, never layer: the first-painted choice for these places is replaced by the family pick.

**Done when.** In three drawn towns with seeds, a screenshot grid of the street scene at morning, midday and night and a played-world proof list each town's businesses by organization record id and the backdrop chosen; src/bench/backdrop-families.test.ts checks a town keeps its picture, towns differ across the whole family, and night picks a night painting.

**Files.** src/bench/scene.ts, src/bench/story.ts, src/bench/data/scene-places.json, src/bench/backdrop-families.test.ts

**Notes.** TODO

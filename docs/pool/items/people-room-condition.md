---
id: people-room-condition
title: "Home rooms drawn lived-in or rundown from the household's records"
area: people
kind: feature
priority: 2
size: S
status: done
claimed-by: claude/backdrop-conditions
pr: #6471
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T01:23:12.354Z
---

**What.** The art session painted lived-in and rundown versions of seventeen home rooms (WANTED rows cto-1 to cto-17, art/backdrops-variants on claude/people-rooms-art). Put them in art/backdrops and the backdrop manifest, and draw each home in its household's condition, read from its records, in every scene at home.

**Rules.** One rule for all 56 places; no dice: the condition comes from the household's rent or value, tenure and size; every number in a data table with a stopgap; replace, never layer.

**Done when.** In a buildBenchWorld world from a drawn place, advanced one day, households read lived-in, rundown and as painted, and the home scene's backdrop is the condition painting where painted (src/bench/room-condition.test.ts names the place and seed); before and after screenshots in two drawn places; the WANTED rows struck.

**Files.** src/bench/scene.ts, src/bench/opening.ts, src/bench/story.ts, src/bench/data/scene-places.json, art/backdrops/manifest.json, docs/art/WANTED.md

**Notes.** TODO

---
id: play-territory-map-geometry
title: "Map geometry for the five territories"
area: play
kind: feature
priority: 3
status: done
claimed-by: claude/territory-map-packs
pr: #4874
blocked-on:
milestone:
source: 'docs/coordination/play.md "Needs from other sessions" (line 147); triage in play-needs-play-147'
claimed-at: 2026-10-17T05:18:23.703Z
---

**What.** The map packs in src/maps/geometry/states cover the 50 states and D.C. only. Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa and the Northern Mariana Islands have no geometry, so a player in one of those places sees no map. Generate their packs from the same public boundary source, with the same lineage record as the others.

**Rules.** One rule, all 56 places: no place is named in code, and the loader reads the pack for any drawn place. Preserve source-to-derivative lineage: record the source and hash for each pack. Research before building: cite the boundary source.

**Done when.** In a drawn place from the five territories and a seed the builder did not choose (name both in the PR body), the map screen loads a pack with its lineage record, and a test in src/maps loads a pack for every one of the 56 places. The owner plays it: starts in a territory and sees its map.

**Files.** src/maps/geometry/states, src/maps/

**Notes.** Found while triaging play-needs-play-147.

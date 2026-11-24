---
id: backdrop-light-region
title: "Morning and night paintings for 58 places; Main Street, the square and doorsteps in each region's character"
area: people
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/backdrop-light-region
pr: #6578
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T06:38:58.770Z
---

**What.** The art session painted morning and night versions of 58 places and regional rebuilds of main-street, rally-town-square and the doorsteps for 8 regions (art/backdrops-variants on claude/people-rooms-art). Put them in art/backdrops and the manifest; the existing hour rule reads the light; a region list in data picks the rebuild from the town's state, through one picker every scene with a world uses.

**Rules.** Through the backdrop picker that exists; one rule for all 56 places (states in data); rain waits for a weather record; owner's visual check before merge.

**Done when.** backdrop-regions.test.ts: every region's rebuild is drawn by day in every state it names and the plain place elsewhere, the night painting at night; proof sheets of Main Street and a doorstep in every region and three places at three hours.

**Files.** art/backdrops, src/bench/scene.ts, src/bench/data/scene-places.json

**Notes.** TODO

Oct 29 (CTO): set done; PR #6578 merged (the done flip failed while branch protection refused the flip job's push).

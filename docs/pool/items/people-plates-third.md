---
id: people-plates-third
title: "Plates for ten more rooms: clerk counter, council, kitchen, mayor, coffee shop, three doorsteps, polling place, election night"
area: people
kind: feature
priority: 1
size: M
status: done
claimed-by: claude/people-plates-third
pr: #6566
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T06:19:03.307Z
---

**What.** The art session's mannequin plates for ten golden-path rooms (WANTED pr-01 to pr-08, art/people-rooms/spots on claude/people-rooms-art) go into art/backdrops/staging.json through scripts/people/room-spots.ts with front-line masks; rooms that hold more people than painted keep their old spots after the plate's own.

**Rules.** Through the staging data and the importer that exists; one rule for every room; registered stopgap for kept spots; owner's visual check before merge.

**Done when.** plate-spots, occluders, scene-places, seated, framing and scene-staging tests pass for the ten rooms; proof sheets from scene-shots in three drawn towns show each room with different people; the WANTED rows struck.

**Files.** art/backdrops/staging.json, art/backdrops/occluders, scripts/people/room-spots.ts, art/people-rooms

**Notes.** TODO

Oct 29 (CTO): set done; PR #6566 merged (the done flip failed while branch protection refused the flip job's push).

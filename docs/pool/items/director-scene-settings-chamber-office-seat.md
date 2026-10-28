---
id: director-scene-settings-chamber-office-seat
title: "A scene set at the chamber, an office or the member's seat shows the player's home"
area: director
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: director
source: added with npm run pool -- add
claimed-at:
---

**What.** The story screen pictures a scene's setting through sceneSettings in src/bench/data/scene-places.json, which lists home, other-home, workplace, school, public, venue, phone and letter. The director also stages scenes at chamber, office and seat: vote-asked, vote-confirmed, vote-sought, desk-visit, bill-carry, section-bargain, staff-news, budget-cut, bribe-offer, office-hours, hallway, press-interview and address. Those have no entry, so the steps fall back to the player's home. A colleague asking for a vote at the capitol is drawn standing in the player's kitchen. The chambers are painted (state-house-chamber, council-chamber and others, read by bodyPlaces), and so is capitol-hallway. A member's own office has no painting (docs/art/WANTED.md dir-068 and dir-069).

**Rules.** One rule, all 56 places: the chamber is the body's own from bodyPlaces, by the office the setting's record names, never a named state. Replace, never layer: the setting maps to existing pictures through the same step list, with no second picture picker. Until the office paintings exist, the office setting uses the capitol hallway or town hall hallway the body's level has, as a registered stopgap.

**Done when.** In a played world (buildBenchWorld) in a drawn place with the seed named, a test stages vote-asked at the chamber and desk-visit at the office through storyScene, and the place each pictures is the body's chamber or hallway, not a dwelling, named by backdrop file; a bench screenshot at 1440x900 shows one.

**Files.** src/bench/data/scene-places.json, src/bench/story.ts, src/bench/scene.ts

**Notes.** TODO

Stopped Oct 28, 02:15 UTC (owner, by the CTO), director lead: built and pushed on `claude/director-scene-settings-chamber-office` (head 60ce511094), not proven: the chamber setting maps to the body's own room (`bodyPlace` in src/bench/legislature.ts, shared with the meeting screen), the office setting to its post's workplace or the body's room (stopgap SG-PLAY-office-setting-shows-chamber), and src/bench/scene-settings-chamber-office.test.ts is written but collected no tests in its first run. No PR.

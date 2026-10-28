---
id: people-plates-second
title: "The second plate delivery: every opening and main-menu room places people from its mannequin plate"
area: play
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/people-plates-second
pr: #6431
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T22:40:24.724Z
---

**What.** The owner's art session delivered tagged mannequin plates for twelve more rooms (the governor's office, the living room, the bedroom and the workforce office of the opening; the Senate floor, White House and Capitol grounds, convention floor and stage, rally stage, courthouse rally and debate stage of the main menu) and redid the Oval Office with the couch sitters apart. It also painted standing figures seen from behind, which crowds facing away need. This item imports every plate's spots in place of the hand-typed ones, adds the back figures to the set, and seats the governor at the desk the plate tags for the governor.

**Rules.** Replace, never layer: each plated room's hand-typed spots are replaced, not kept beside the plate's. One rule, all 56 places: one importer and one placement rule for every room, no room named in logic. Every person drawn is the filled-in person, seen from the angle the plate tags.

**Done when.** In a drawn place with a seed, a screenshot of each plated room shows people at the plate's spots and size, the workforce clerk behind the counter and the governor at the desk; src/bench/plate-spots.test.ts passes on every plated place and src/bench/whole-figures.test.ts draws the back view on standing spots facing away.

**Files.** scripts/people/room-spots.ts, art/backdrops/staging.json, art/people-rooms, art/people-engine/v2/figures-back.json, src/bench/whole-figures.ts

**Notes.** TODO

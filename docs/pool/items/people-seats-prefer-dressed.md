---
id: people-seats-prefer-dressed
title: "When a room has fewer seats than people, the seats go to those drawn as they are dressed there, and never to a second copy of a face"
area: people
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/people-seats-prefer-dressed
pr: #6960
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-01T13:26:00.803Z
---

**What.** The opening home plate has two seats and every household in ten drawn places had more members (dress-0 to dress-9 on main 72682fb7c7). Seats go in cast order, so the second seat often goes to someone the pack cannot paint in everyday clothes there (the slim woman and the medium man have no seated everyday figure), who then sits at home in a work blazer; and two such people sharing one pack person come out as identical twins (Bellefonte, Delaware; Sa'ilele, American Samoa). 6 of 10 opening evenings showed someone at home in work clothes, 2 showed twins. The player's own clothes wait on the art (people-pack-v4-pose-gaps); the other seats can go to housemates the pack paints in their everyday clothes, and to faces not already in the room.

**Rules.** One rule, all 56 places: the choice reads the plate's spots, the pack's rows and the place's dress order, naming no room, person or place; Placeholders: it softens stopgap SG-PLAY-people-everyday-falls-back-to-work and closes with it when the art lands; Replace, never layer: the one staging engine (stagePeople) chooses, no second placement path; the player, the person an act is about, the speaker and office holders keep their places first.

**Done when.** In ten drawn places from all 56 (name the tags and seeds), the opening evening draws no housemate in work clothes while another housemate who can be drawn in everyday clothes is left without a seat, and no two people in the room share one pack person while another housemate could take the seat; a test in people-pack.test.ts checks both over every household of a played world and fails on main; a screenshot from a place that showed twins on main shows two different people.

**Files.** src/bench/scene.ts, src/bench/whole-figures.ts, src/bench/people-pack.test.ts

**Notes.** TODO

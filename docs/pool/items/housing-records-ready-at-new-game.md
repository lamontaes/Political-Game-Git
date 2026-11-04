---
id: housing-records-ready-at-new-game
title: "Homes exist before New Game first reads the room and person card"
area: world
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
after: housing-dwelling-records-cover-few-households
source: added with npm run pool -- add
---

**What.** New Game can show a home scene while the player has no dwelling record. Burnet, Texas, replay 6e32d4b3c4eb3d6e returned dwelling:null before any advance on source 00cb393a73. The existing housing initializer runs only onDay; expose that same idempotent producer and run it after opening households exist, before the first room or card reads them.

**Rules.** Wire to the world: the first room and person card must read the same actual dwelling and contract records as the housing engine. One rule, all 56 places; no default home, time advance or duplicate initializer. Lane 4 owns the bench call and must accept the written agreement before that shared edit.

**Done when.** Before the first advance, a drawn New Game and the Burnet regression show the player household dwelling on its normal card and the matching room in the browser. A buildBenchWorld regression records all full household dwelling IDs, idempotent initialization and unchanged date; existing one-day coverage tests pass and four-year timing stays within 20 percent of base.

**Files.** src/core2/modules/housing.ts; src/core2/housing-ready-at-opening.test.ts; src/bench/world.ts only under accepted docs/lanes/agreements/2-4.md

**Notes.** Lane 2 owns the producer; Lane 4 agreement proposed at dc32db4438, not yet accepted. Evidence and request: PR 7100 comment 6619091510. Separate from the one-day coverage item. Current lane state holds the card and ownership boundary. Reading: lane-2 First minutes finish line; prior-rulings/economy R9; searched docs/pool for opening, housing, dwelling and home; no duplicate opening-time item.

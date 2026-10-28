---
id: scene-vote-asks-one-sponsor-one-evening
title: "A sponsor's asks about several bills on one evening play as one scene, not the first of seven"
lead: director
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/director-one-sponsor-one-evening
pr: #6480
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T00:55:10.865Z
---

**What.** In Fort Pierce South, Florida (Advanced, seed f40b8d6c2e7193a5, the member Adam Williamson), the evening of March 31, 2025 the sponsor Heather Willard asked the player about seven bills on the next day's floor (HB 9, 10, 14, 17, 18, 19 and 20), seven vote-ahead records from legislature-ask-before-the-roll-moves-the-vote. The director plays only the first as a stop, so the player answers HB 9 and never hears about the other six, whose asks stay unanswered. A sponsor with several close bills would make one call about all of them, and each answer should still be kept on its own bill.

**Rules.** Ask why: each bill's answer must name its own vote-ahead record id, so the roll call on each bill reads the answer given about it. Wire to the world: the scene's answers write the same replies the single ask writes, read by the same roll call.

**Done when.** In a drawn place where one sponsor asks the player about two or more bills on one evening, one scene names each bill and the player's answer about each is a reply its roll call cites, shown by a test that names the place, seed and each vote-ahead record id, with a screenshot of the scene.

**Files.** src/director/data/situation-types.json, src/director/ledger.ts, src/core2/modules/legislature.ts

**Notes.** Found Oct 27 23:45 by the laws-and-effects lead while proving the ask in the bench.

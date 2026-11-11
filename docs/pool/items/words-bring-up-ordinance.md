---
id: words-bring-up-ordinance
title: "After the player's ordinance passes, a neighbor who read about it names it and its result; never 'your ordinance' for someone else's bill"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: story/bring-up-ordinance
pr: #8140
blocked-on:
lead: words
source: golden path "pass an ordinance, the town visibly changes, people bring it up" played in Bear Valley, California
claimed-at: 2026-11-10T12:00:00.000Z
merged-at: 2026-11-10T20:03:56.824Z
seen-by: second-session-2
seen-at: 2026-11-11T02:00:06.754Z
---

**What.** In a played year with the player on the county board and a sales-tax ordinance of theirs enacted 4 to 1, the one reader the director picked said "KEXX-TV says your ordinance didn't pass. I'm sorry.": the newest story that listed the player was a failed 2 to 3 vote on another member's housing bill, which the player had voted in, and `ownBillVote` told any vote story that listed the listener as theirs. Now `ownBillVote` returns the vote only when the listener sponsored the bill, and a vote on the listener's own bill is raised before a vote they merely cast. The same reader says "I read in KEXX-TV that your ordinance on the local sales tax rate passed.", citing the story, the outlet and the vote record.

**Done when.** src/director/bring-up-ordinance.test.ts plays the player's ordinance through the county board in a drawn place (trying a sales-tax cut, a property-tax cut, a wage raise, a sales-tax raise until one passes), prints what each reader says with record ids, and fails on any "your ordinance" line whose bill the player did not sponsor or whose result is not the vote record's.

**Files.** src/director/bring-it-up.ts, src/director/bring-up-ordinance.test.ts

**Notes.** Seen in the game (2026-11-11, second-session-2): drawn seed 03f336b4a1ea (test world), seed 03f336b4a1ea, main 32a6683b: bring-up-ordinance.test.ts passed on a fresh seed, playing the player's ordinance through the county board

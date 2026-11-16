---
id: journal-own-unopposed-win-silent
title: "The journal says nothing when the player wins a race nobody ran against them in"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #6123
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** On the bench in Kelly, Wyoming (new life seed 4e1bb0a5-4d3f-42e9-bc9b-fc5d88a29251), a player who filed for U.S. Senator ran unopposed and won on November 3, 2026 (108,692 votes). Election night showed the win, but two days later the journal read only 'I ran for U.S. Senator.' with no line about winning. A journal test with an unopposed own win (src/director/journal.test.ts, 'tells the player's own race when nobody ran against them', on the play-stop-22 branch) passes, so the likely cause is that the story director stored no moment for the player from that election-result event (its measured impact for an unopposed win under the floor). Confirm in a played world by record id and fix the cause.

**Rules.** This is a game, not a spreadsheet: winning office is a turn in the player's life and the journal tells it. An effect is a read: the journal reads the director's stored moment, so the fix belongs where the moment is or is not stored, by the same rule for everyone.

**Done when.** In a drawn place where the player wins a race nobody else entered, the journal the next day has a line sourced by that election-result record id, named with place, seed and record id, and the losing and contested cases still tell theirs.

**Files.** src/director/director.ts, src/director/journal.ts

**Notes.** TODO

Sent back 2026-10-26 from PR #6123 (branch words/journal-own-unopposed-win): Own Kelly replay and fresh drawn journal-player-race case both fail before result at main press.ts2108 ReferenceError countedResidents; this is the separately claimed red-main repair, not a new journal defect. Merge repaired main and rerun both required played cases; no successful local replay or merge claimed.; finish on that branch, merge main into it first.

Account lead, Nov 15: the pinned test `src/director/journal-player-race.test.ts` now reads Woodruff UT (loss, one rival), Fenwick Island DE (loss, three rivals) and Duryea PA (an at-large win, seed `jpr-pin:37`, elected to the third of three seats by 173 votes to 124 and 76). The unopposed win this item names is not shown by any of them: in 12 fixed draws (seeds `jpr-pin:0` to `jpr-pin:11`, `drawPlace(seed, "journal-player-race:0")`) every race the player reached had at least one rival, and the player never campaigned. New Llano, Louisiana (seed 82ce8614c331dfa1d5d091fc12a36f7c87b18dc44240fc34f68d76b75a79b5c4) once looked like a silent Journal and is not one: the player filed under `council:0` of a three-seat at-large race and was elected to the seat counted as `council:4`, and the Journal does tell it ("So, I was elected to Council member.", citing `election-result:contest:seat:gus2025:208196:council:4:2026-04-07`); the old test looked only at the filed contest's record. The unopposed case is still open and is looked for by a script outside the test.

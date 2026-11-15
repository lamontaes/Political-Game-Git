---
id: legislature-vote-asks-never-written-in-drawn-places
title: "The evening-before vote ask is never written or staged in drawn places, so three ask tests are red on the clean train"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: Found by the second-chamber thread (#9207) and the bargaining thread (#9167), Nov 14 2026
lead: laws-effects
standard: 2
model: opus
effort: medium
root: none
---

**What.** The sponsor's ask the evening before a floor vote (`askBeforeTheRoll`, src/core2/modules/legislature.ts, the `vote-ahead` record) is not written, or is not staged as a scene, in any of 16 drawn places, so the player is never asked for a vote and never asks one. Three tests are red on the clean train 942bea34b12bf925c86eddfc8bada86fc4a10c03 with the same seeds:

- src/director/ask-before-the-roll.test.ts, GOLDEN_PATH_SEED=2fbac58e4f032a6b: "0 asks in 240 days" in Langley, Oklahoma (4041500); Jay, Oklahoma (4037650); Stanford, Kentucky (2173110); Atmautluak, Alaska (0204430); Pottsville, Arkansas (0556990); Mount Pleasant, South Carolina (4548535).
- src/core2/legislature-ask-reaches-roll.test.ts, GOLDEN_PATH_SEED=a4283ecd1ef6d55c: "no ask in 365 days" with the player in the state's lower chamber in East Valley, Nevada (3221520); Chautauqua, New York (3614058); Adams, Oregon (4100350); Ogilvie, Minnesota (2748166).
- src/director/ask-vote-variants.test.ts, GOLDEN_PATH_SEED=612deadbcae7ad23: "no staged ask in 240 days" in all six draws: Nathrop, Colorado (0853010); Smithville, Georgia (1371464); Patagonia, Arizona (0453490); draw 3 (world seed 3dd46573...); Norwalk, Connecticut (0955990); Palmdale, California (0655156). (Reported by the bargaining thread, which had filed it as words-ask-vote-no-staged-ask-in-six-draws; that file is folded into this one.)

The player sees it in play as a floor vote with no member asking for their vote the evening before, and no chance to ask a colleague for theirs. Seen: the scene the evening before a floor vote, where a colleague asks the player for their vote or the player asks one for theirs.

**Cause.** Measured: Langley, Oklahoma (4041500) and the nine other places named above, run seeds 2fbac58e4f032a6b and a4283ecd1ef6d55c, with the commands `GOLDEN_PATH_SEED=2fbac58e4f032a6b npx vitest run src/director/ask-before-the-roll.test.ts` and `GOLDEN_PATH_SEED=a4283ecd1ef6d55c npx vitest run src/core2/legislature-ask-reaches-roll.test.ts` on the train at 32a994212b, with a counter at each step of `askBeforeTheRoll` (src/core2/modules/legislature.ts): ten places and 2,900 played days in all. `ask-before-the-roll.test.ts` (GOLDEN_PATH_SEED=2fbac58e4f032a6b, six places, 240 days each): 218 bills stood on the next day's agenda, 203 of them in a body the player does not sit in, 15 in the player's chamber, and all 15 already had a majority the evening before. `legislature-ask-reaches-roll.test.ts` (GOLDEN_PATH_SEED=a4283ecd1ef6d55c, four places, 365 days each): 156 on the agenda, 139 in another body, 16 in the player's chamber, and all 16 had a majority, ahead by between 11 and 70 percent of the chamber's seats. No bill came to the eve of its vote short, so the step that asks was never reached; the player's floor-vote stop is not involved. The reason no bill is short: the floor takes filings in the leader's order, the most backed first (`fileChanges` and `floorWeeks`, src/core2/modules/world-legislating.ts), and a legislature takes up a handful of bills a session (#8967), so what reaches the floor is what already has the votes, and a filing short of them dies unreached at adjournment (`closeSession`). The ask is placed after the point where it could matter.

**Fix.** The sponsor asks for votes while the bill is waiting for the floor, and the tests stage a close bill instead of waiting for one.

1. Measured already (Nov 15, the first test's six places, 240 days each): 32 bills waited in the player's chamber. 21 had a majority without the player. 11 were short, and none of the 11 ever came onto the floor's agenda. Ten of them needed more than six more votes in a chamber of over 60 seats; one needed two more in a chamber of 21 to 60. So a close bill is rare: about one in six places over eight months.
2. `askBeforeTheRoll` reads the bills waiting in the leader's order for the coming floor week (`floorQueue`, through the reader world-legislating already registers), as well as tomorrow's agenda. For a waiting bill that is short but within reach of the members who could be carried, the sponsor asks them, by the same count and the same `vote-ahead` record as today.
3. The leader's order counts a recorded yes to an ask as backing, so a bill that wins its asks moves up and reaches the floor. One order, read by the floor weeks and by the ask.
4. The three tests stop waiting for a draw to hold a close bill, which step 1 shows it seldom does. Each stages one through the game's own path (skill pinned-tests, rule 2): at a named place, a member files a bill whose count is one or two short, by the same filing call the game uses, and the test reads the ask the evening the floor's order is set. Each is shown red with the new read taken out.

**Time box.** 3 hours.

**Rules.** No dice; never loosen a test to get green (`pinned-tests`); ask why, by record (the bill, its floor date, the vote-ahead row or its absence).

**Done when.** A second session runs the three tests at the three seeds above and sees them pass, and in a drawn place (any of those named above, or a fresh draw) plays a floor vote on a bill the player sponsors that is short of votes and sees a member asked for their vote the evening before.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts (`askBeforeTheRoll`), src/core2/modules/world-legislating.ts (`floorQueue`, `floorWeeks`, `fileChanges`), src/director/ask-before-the-roll.test.ts, src/core2/legislature-ask-reaches-roll.test.ts, src/director/ask-vote-variants.test.ts

**Notes.** Cause measured by Fable B, Nov 15, 2026. The count of waiting bills in step 1 of the Fix leaves the player's own vote out of each margin. `ask-vote-variants.test.ts` was not run with the counters; it reads the same record.

Nov 15 (views thread): `ask-vote-variants` is still red on the train at ff9703d7 with GOLDEN_PATH_SEED=8c295d93bea70bd5: "no staged ask in 240 days" in Lakewood, New Jersey (3438580), world seed 84d8d272, then Decatur, Alabama (0120104). The lead ruled that it is a draw-hunting test. Once the cause is found, it stages the evening-before ask through the game's own path at one named place and seed, instead of drawing and waiting.

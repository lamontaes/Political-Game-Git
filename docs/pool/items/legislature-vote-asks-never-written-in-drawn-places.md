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

The player sees it in play as a floor vote with no member asking for their vote the evening before, and no chance to ask a colleague for theirs.

**Cause.** Needs cause. Looked at: the three commands above, red on the clean train 942bea34 and on #9207's head ceea29e1 with the same places. `askBeforeTheRoll` reads `floorAgendaOn(tomorrow)` and asks only where the player sits in the voting chamber and the margin is short. Not yet known whether no bill reaches that agenda the evening before (the floor week's reader, the meeting's agenda), the margin is never short, or the player's floor-vote stop (owner's card, Nov 14 02:03Z) keeps the asks from being written.

**Fix.** None until the cause is found.

**Time box.** 3 hours.

**Rules.** No dice; never loosen a test to get green (`pinned-tests`); ask why, by record (the bill, its floor date, the vote-ahead row or its absence).

**Done when.** A second session runs the three tests at the three seeds above and sees them pass, and in a drawn place (any of those named above, or a fresh draw) plays a floor vote on a bill the player sponsors that is short of votes and sees a member asked for their vote the evening before.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/director/ask-before-the-roll.test.ts, src/core2/legislature-ask-reaches-roll.test.ts, src/director/ask-vote-variants.test.ts

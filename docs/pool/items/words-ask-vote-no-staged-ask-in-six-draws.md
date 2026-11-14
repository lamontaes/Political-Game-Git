---
id: words-ask-vote-no-staged-ask-in-six-draws
title: "No colleague's ask for a vote is staged in 240 days in six drawn places, so the ask-vote scene never plays there"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: bargaining thread gate of #9167, Nov 14 2026 (src/director/ask-vote-variants.test.ts red on the clean train)
lead: words
standard: 2
model: opus
effort: medium
root: none
---

**What.** A sponsor asks a member for their vote the evening before a floor vote (a `vote-ahead` record), and the director stages it as the ask-vote scene for the member. In six drawn places no such ask was staged on any member's schedule in 240 days of play. A player sitting on those bodies never hears a colleague ask for a vote. Seen: the evening-before ask scene (vote-asked) never appears in the member's day.

**Cause.** Needs cause. Measured: `GOLDEN_PATH_SEED=612deadbcae7ad23 npx vitest run src/director/ask-vote-variants.test.ts` on the clean train at 942bea34b12bf925c86eddfc8bada86fc4a10c03 fails with "no staged ask in 240 days" at all six draws: Nathrop, Colorado (0853010), draw 0; Smithville, Georgia (1371464), draw 1; Patagonia, Arizona (0453490), draw 2; draw 3 (world seed 3dd46573802120dcb5ecfb339b3d6cf899290df57898c78608250cf056c681de); Norwalk, Connecticut (0955990), draw 4; Palmdale, California (0655156), draw 5. The same run on the bargaining branch with its committee change switched off fails the same way, so it is not that change. Where to look first: whether `askBeforeTheRoll` (src/core2/modules/legislature.ts) finds a floor agenda in the chosen body at all in 240 days, then whether the director binds the `vote-ahead` record as `vote-asked` (the test's `open()` needs the bill still `drafted` and a binding on the member's schedule).

**Fix.** None until the cause is found.

**Time box.** 3 hours, one Opus session to find the cause, then the fix.

**Rules.** One rule, all 56 places: the ask must be staged in every place with a body that votes, so the cause is found in data or engine, never by naming a place. Never loosen a test: the test stays as it is and is not re-pinned.

**Done when.** The test passes at seed 612deadbcae7ad23, and a second session sees a colleague's ask for a vote in the running game at the drawn place Nathrop, Colorado (drawPlace("612deadbcae7ad23:0", "ask-vote-variants")).

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/director/ask-vote-variants.test.ts, src/director/purpose-scene.ts

**Notes.** Filed by the bargaining thread (#9167) without a fix: the red is the clean train's, not that branch's.

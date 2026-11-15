---
id: gov-state-bill-floor-date-the-paper-names-is-not-kept
title: "The floor date the paper names for a State House bill is not kept"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: filed by hand on branch claude/project-thread-xy4wd4 (cluster 13, PR #9308)
after:
lead: governing
standard: 2
model: opus
effort: medium
root: none
---

**What.** A State Representative drafts a bill and the paper says "The floor takes it up on February 10, 2025". The player plays the days past that date and the bill is still drafted at April 25, with no floor result; the date the paper names slides later (February 10, then May 19 in a second run). Seen: on the bill paper's "Where it is" line, which names a floor date the game does not keep.

**Cause.** Measured: at Holiday Lakes, Texas, seed aa11, playing Aaron Powers (State Representative), `node scripts/play-walks/fee-bill.mjs` drafts HB 2 on January 20, 2025; the paper names February 10, and `/api/bill/stage` reads status drafted, committees [] and floor [] after the days to April 25 (the player answering the April 7 and April 21 floor-vote cards on HB 3 and the walk pressing Day each time). It reproduces on the clean Train head ff9703d7 with a sales-tax bill at the same place and seed, so fee bills are not the cause. The committees thread reproduced it with this draft date and traced it to the pace in `floorWeeks` in src/core2/modules/world-legislating.ts being recomputed on every ask, so the named date moves each week (reported by that thread, not re-proved here). Dev mode's hold-vote route does run the floor for the bill (passed 85 to 65).

**Fix.** Make the floor date the paper names the date the bill's floor day is, computed once and kept; delete any second pacing. Prove it by playing a drawn place and seed past the date and reading the stage.

**Time box.** 4 hours for one opus session.

**Rules.** No dice. One engine for every chamber and place; pinned places and fixed seeds in the test.

**Done when.** A second session drafts a state bill at a place and seed it did not choose, plays the days past the date the paper names, and sees the bill taken up on the date the paper names and a floor result by name in the running game, with the drawn place and seed written down and the bill's record id on the stage view.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/bench/legislature.ts

**Notes.** Found while replaying the State House fee walks for PR #9308; the second reader noticed the walk ran past the floor date. The Politics-tab timeouts in those walks were the walk's own: the clock stops on April 7 for the player's vote on another member's bill (a Yes, No, Abstain card) and the script did not answer it.

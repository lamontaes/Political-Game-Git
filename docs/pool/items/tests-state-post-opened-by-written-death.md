---
id: tests-state-post-opened-by-written-death
title: "Tests that open a state post do it through the health engine's death path, not by writing the death"
area: gov
kind: bug
priority: 2
size: S
status: merged
standard: 2
root: none
claimed-by: claude/project-thread-86yqt4-death-path
pr: 9495
after: executive-governor-pick-offers-the-state
blocked-on:
lead: governing
source: "Civic roles builder, Nov 15, Account lead's ruling on #9438"
model: sonnet
effort: medium
---

**What.** Three tests open a cabinet post by writing its holder's death directly, instead of letting the game's own death path run. Two of them, post-ask-drawn-refuses and post-ask-scene, set the holder's `alive` to false and end their job. The third, governor-pick-from-the-state, sets `alive` to false and emits a `life.death` event by hand. A written death skips whatever the health engine's death does (the cause of death, the public record, the estate, who hears of it), so a test can pass on a world the game would never make. Seen: those three tests' setup.

**Cause.** Found in code: the `world` function in src/director/post-ask-scene.test.ts (removed) (line 114), the setup in src/director/post-ask-drawn-refuses.test.ts (line 65) and `openPost` in src/core2/governor-pick-from-the-state.test.ts (line 53) each write the death. A post opens only when its holder has died (statePostsToFill in src/core2/modules/executive.ts).

**Fix.** Open each post through `beginSeriousIllness` (src/core2/modules/health.ts) and play the days to the booked death. For these holders, aged 46 to 63, remainingDaysAfterOnset gives 238 to 286 days, about 8 to 9 months, or roughly 60 to 90 seconds more per place. Raise each test's limit and say why in a comment (the game's own played days). Re-pin from what the later date gives, stating each old premise. If the real death path changes an answer, report that as a finding.

**Time box.** 1 hour for one session.

**Rules.** Wire to the world: the death that opens the post is the health engine's own, so every engine that reads a death reads this one. No dice: the illness is staged once by hand and its course decides the date.

**Done when.** A second session runs the three tests, then opens a post the same way in a drawn place named with its seed, and sees the post open on the holder's booked death through the health engine, with nothing written by hand.

**Waits on.** nothing.

**Files.** src/core2/governor-pick-from-the-state.test.ts

**Notes.** Filed by hand by the civic roles builder on the Account lead's ruling of Nov 15, 10:44Z.

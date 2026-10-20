---
id: play-m6-03-art-fixes
title: "M6-03 Art fixes"
area: play
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
blocked-on:
milestone: M6
source: "docs/roadmap/later-specs-draft.md M6-03"
---

**What.** Seated poses that sit, formal clothes by role and place, frame corners, and the rest of the owner's October 8 list. (Owner: OPUS-PLAY, with the CTO's art pipeline.)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** The owner's October 8 defect list is cleared, judged by him side by side.

**Files.** see spec

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.

Checked Oct 20 (claude, claude/political-game-pool-76ksvw), in code only; the owner judges art side by side, so nothing here clears the item. From `docs/ui/playtest-2026-10-08.md` section A: #10 (Campaigns screen lists "Role: sales clerk" and "offices you could run for") has no such text in `src/bench/play.mjs` or `controls.json` any more; #12 (a stranger's card shows job and pay) is handled in `src/bench/card.ts` (the work line shows only for family, housemates and coworkers; wage is not on the other-person card). Items that need to be looked at, not read: #2 (seated poses), #3 (corner ornaments), #4 (pant cuffs), #5 (formal outfits by role), #6 (the governor scene), #7 (Congress twice), #8 (family shows only your mom), #9 (first day with no context), #11 (conversation choices and the Lie button). Not re-verified: #1 (the opening loading during the loading screen).

#12 now has a test (`src/bench/card-stranger.test.ts`, seed cs1): in a drawn place an employed stranger's `knownCard` has no work and no age and no wage text, and an employed housemate's shows their work.

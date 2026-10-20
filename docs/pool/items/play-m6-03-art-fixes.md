---
id: play-m6-03-art-fixes
title: "M6-03 Art fixes"
area: play
kind: feature
priority: 3
size: L
status: blocked
claimed-by:
pr:
blocked-on: not scheduled: a roadmap milestone at priority 3 until the weekly reschedule (AGENTS.md: saves and release work wait for early-access preparation); an L item is split by whoever claims it once scheduled
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

Looked at in a real browser Oct 20 (claude, claude/political-game-pool-76ksvw), a new game at Iron City, Tennessee, 1672 by 941, screenshots of the title, creator, the opening, day one and the People, Who, Politics and Journal sheets; the owner judges, so these are observations only. #8 (family shows only your mom): the People sheet's web shows the whole family, eight relatives (father, mother, two grandparents, a sister, three brothers), only four of them with a figure and the other four as initials in a square. #3 (corner ornaments): the Menu and People panels' gold corners sit on their borders in these shots; not checked on every panel. The opening starts at home with the family and a "News: Welcome back." strip under letterbox bars and the name plate changes between frames; I did not see the President's speech or the cutaways in the five frames taken in the first twelve seconds. Day one shows the player at home with family, with a news toast "Veronica Wyatt won the election." that says nothing about who she is or where.

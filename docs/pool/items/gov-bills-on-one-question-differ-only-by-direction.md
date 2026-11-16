---
id: gov-bills-on-one-question-differ-only-by-direction
title: "A state session files one bill per question because two bills on one question cannot differ in anything the game reads"
area: gov
kind: feature
priority: 3
size: L
status: open
claimed-by:
pr:
after:
blocked-on:
source: Found by the bargaining thread (#9167) measuring the filing volume, Nov 14 2026
lead: laws-effects
standard: 2
model: opus
effort: medium
root: none
---

**What.** A state legislature in play files a few bills a session where a real chamber files hundreds, so the player's chamber has a floor vote on few days and colleagues rarely ask for a vote the evening before. Real chambers carry many bills on one subject that differ in their details (who a law covers, the amount, the date it starts, the exceptions). In the game, a bill on a policy question is only "yes" or "no". Seen: on the state floor in play, where the player's chamber votes on a handful of bills a session.

**Cause.** Measured: Nathrop, Colorado, seed 612deadbcae7ad23 (drawPlace("612deadbcae7ad23:0", "ask-vote-variants"), train 214e6a6eb88f71a127788a363ba078d6f3a6ef2b, a temporary count in `fileChanges`, src/core2/modules/world-legislating.ts):

- The 2025 Colorado session had 55 open policy questions, and 38 of them had members with a reason to change them.
- Members carried 225 changes between them (`carriedRanks`), but only 11 bills were filed, one per question with a carrier.
- `provisionStance` (src/core2/modules/legislature.ts) weighs a policy-question section only by its direction (+1 or -1), and an amount only by raise or cut. Two members' bills on one question therefore read the same, so they are one bill with cosponsors.
- Of the 11, the chamber leader refused 7 (`askLeaderForHearing`, office-day-state.ts: party and tie), and those never reached the floor. The rest were voted between March 17 and April 14 once the floor was paced (#9167's follow-up, floor pacing).
- Calibration only: the Colorado General Assembly introduced 705 bills in 2024 and passed 525 (Denver Gazette, May 17, 2024).

**Fix.** Give a section on a policy question the details a member weighs: its reach (which places, people or businesses it covers) and its start date. Members' stances then weigh how far a bill goes, not only which way, through `provisionStance`. A member files their own bill on a question when its details differ from the bills already filed; otherwise they cosponsor. The player sees more bills on the floor of their chamber and more evening-before asks. This is a new mechanic: before building, check with the laws-effects lead which engine owns a section's reach (laws in force, `seriesPowers`).

**Time box.** 8 hours.

**Rules.** No dice: a member's details come from their own stance and their district's records. Distinct bills only: a second bill on a question must differ in effect. Speed: year-1 time per record within 10% at three places, with and without, each side run twice. One rule, all places.

**Done when.** A second session runs a played year at Nathrop, Colorado and two drawn places and sees more than one bill on at least one question, each with different details read by the members' votes (record ids), and the player's chamber with floor votes through April.

**Waits on.** The amount-bills PR (state amount series filed by members), which shows whether amounts alone are enough.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/legislature.ts

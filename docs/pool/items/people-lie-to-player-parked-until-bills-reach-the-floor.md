---
id: people-lie-to-player-parked-until-bills-reach-the-floor
title: "A colleague's false yes to the player is built but never played, because no bill of the player's reaches the eve of a vote short"
area: people
kind: feature
priority: 2
size: S
status: blocked
standard: 2
claimed-by:
pr:
after:
blocked-on: the committees thread's fix for bills that carry the senate and then end failed with no House roll call
lead: people
model: opus
effort: medium
root: none
source: Lying thread, Nov 15 2026; parked by the Account lead after the 60-run rerun on Train #9554
---

**What.** PR #9456 (head f6a552b3, "People can lie to the player: a colleague's false yes, found out at the roll call") holds the engine: a colleague asked for their vote on the eve of a roll call may say yes while their position says no (`tellsTruth` in src/core2/told-claims.ts, a file only #9456 adds, weighing the temperament and the closeness at stake through the general chooser), and the roll call finds them out. It stays untouched, and the found-out lines and the press tip stay unwired, until this item reopens. At 4846968 (Texas) seed 8647-mason, 12 of the 31 senators lean toward the false yes (021, 010, 014, 008, 027, 020, 001, 019, 022, 028, 013 and 016), so the conditions allow a lie. The scene is starved because no ask reaches them. The 60-run search (12 questions, 5 senate seats, the player's bill drafted on day 1, played up to 240 days; files in /mnt/project-files/lying/rerun-60-train-29ef4685/):

| head | reach a roll call | short on the eve | evening asks |
| --- | --- | --- | --- |
| d1f9f3bf | 13 of 60 | not measured | 0 |
| 29ef4685 (Train #9554, with #9535, #9534 and #9539) | 9 of 60 | 0 of 9 (19 or 20 for, 16 needed) | 0 |

Where the other 51 died on 29ef4685: the chair never heard the bill (45), or the committee heard it and voted it down (6, all on Feb 9, the first committee day). None was reported and then left off the calendar. Of the 9 that reached a roll call, right-to-work passed both chambers at all 5 seats, and the gas hookup ban and retail electric choice carried the senate at seats 4 and 9 (19-11 and 18-12) and then ended failed with no House roll call (the House committee voted them down). Seen: the evening ask on a close vote, and a colleague's yes that the roll call shows was false.

**Cause.** Measured: the search scripts in /mnt/project-files/lying/rerun-60-train-29ef4685/ at 4846968 seed 8647-mason. No bill the player writes reaches the eve of its roll call short of a majority, so `askBeforeTheRoll` (src/core2/modules/legislature.ts) asks nobody.

**Fix.** None to build now. Nothing is tuned to make a bill short. After the committees thread's fix for bills that carry the senate and then end failed is folded, run one bounded search, capped at one hour: the contested questions (those that carried a chamber by four votes or fewer) at seats where the count starts short. Not the same 12 questions again. If an ask reaches one of the 12 who would lie, that run is the pinned played case for #9456 and the PR goes to the readers with it. If not, the Account lead decides between another search and closing the engine.

**Time box.** 1 hour for the search, one Opus session at medium effort.

**Rules.** No dice and no staging: the case comes from a played world, never a tuned bill or a hand-set position. Look before you ask: the rulings are the Account lead's of Nov 15.

**Done when.** At the named place 4846968 seed 8647-mason, the bounded search finds a played eve where an ask reaches one of the 12, or reports that none does with its numbers. A second session sees in dev mode on main a colleague's yes found false at the roll call, once #9456 lands.

**Waits on.** The committees thread's fix for bills that carry the senate and then end failed with no House roll call.

**Files.** src/core2/told-claims.ts (new), src/core2/modules/legislature.ts

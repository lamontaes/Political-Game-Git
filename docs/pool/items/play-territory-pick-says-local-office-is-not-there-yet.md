---
id: play-territory-pick-says-local-office-is-not-there-yet
title: "Picking a place in Guam, the Virgin Islands, American Samoa or the Northern Marianas says plainly that local office is not there yet"
area: play
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: rc7-player-cannot-drive
source: Owner card answer "After early access", Nov 14, 2026 06:41Z, relayed by the Account lead
checked:
---

**What.** The owner ruled on Nov 14 (card "After early access") that the four territories' local governments wait until after early access, and that until then the game says plainly, when a player picks one of those places, that local office is not there yet. Seen: on the title screen, a player who picks a place in Guam, the U.S. Virgin Islands, American Samoa or the Northern Marianas reads one plain sentence saying that the town's offices are not in the game yet and that the territory's offices are.

**Cause.** Design: the owner's ruling above. The place pick (`src/bench/creator.ts`) gives no word about it, and `localOfficesForPlace` (`src/core2/offices-local.ts`) returns no office for those 158 villages (see gov-territory-local-governments-not-recorded), so the player finds the gap only by looking for a town office that is not there.

**Fix.** Read the fact, never name the place: the notice shows where the place's recorded local offices are none (the offices engine reads empty for the place), so Puerto Rico and the 52 others never see it and the notice disappears by itself when the territories' governments are built. Its words come from the English engine's banks, not from code. One notice, shown where the place is picked; no new screen.

**Time box.** 2 hours, Sonnet.

**Rules.** One rule, all 56 places: no territory is named in logic. No hand-written player text in code. Words-bar evidence for the sentence (before and after pictures at three places, the line quoted).

**Done when.** In a drawn place of each of the four territories the pick shows the notice, in a drawn place elsewhere it does not; a test is pinned to named places and seeds. A second session sees it on main.

**Waits on.** Nothing.

**Files.** src/bench/creator.ts, src/core2/offices-local.ts, data/english/parts/

**Notes.** The government build itself is gov-territory-local-governments-not-recorded (after early access).

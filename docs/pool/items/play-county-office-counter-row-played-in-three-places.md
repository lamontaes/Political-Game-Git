---
id: play-county-office-counter-row-played-in-three-places
title: "Play the county-office row at the filing counter, now only staged in the seat-said test"
area: play
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Words lead, Nov 14 (rulings on #9144, held/town-labels.md); S4
lead: words
standard: 2
model: sonnet
effort: medium
root: design-words-machine
after:
---

**What.** The seat said with its area at the filing counter ("the county clerk", the county's commissioner seat) was proved on a staged row in `src/director/filing-visit-seat-place.test.ts` (county clerk, governor, state Senate, U.S. Senate and U.S. House, labeled staged). Mayor and trustee were played in a drawn place (Woodstock VT); governor, state House and Senate, U.S. Senate and U.S. House were played at state counters (Apple Canyon Lake IL, Enville TN). A county office never came open in the three drawn places, so its row is still staged. Seen: the clerk's line when a player files for a county office.

**Cause.** Design: docs/design/words-machine.md (the words are graded on what a played scene says, not a staged one); a played row is the evidence for what a player reads, and a county office only opens at a counter when a drawn place has one in its filing window; the draw (up to 12 places, waiting up to 80 weeks) did not reach one in three places.

**Fix.** Play the row when a drawn place opens one: draw places on a fresh seed, wait for a county office at a counter, play the pick and the ask through `chooseAtCounter`, name the place, the seed and every place passed over, quote the clerk's line, and make the staged row in the test cite that played line.

**Time box.** 2 hours, Sonnet medium.

**Rules.** One rule for all 56 places; drawn-place-tests; no dice.

**Done when.** A drawn place and seed (named) shows the clerk saying a county office with its area and no town; the test's staged county row says it stands for that played row. A second session, on main, files for a county office at the counter and sees the clerk say it with its area and no town.

**Waits on.** Nothing.

**Files.** src/director/filing-visit-seat-place.test.ts

**Notes.** Filed by S4 from the Words lead's ruling 3 on #9144.

---
id: tests-door-fill-in-no-counted-door-in-six-draws
title: "The door fill-in test finds no counted resident opening a door in six drawn places"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: design-one-model-two-tiers
lead: governing
model: sonnet
effort: medium
source: views thread, Nov 14 (seen while gating views cut 3b)
---

**What.** The test that checks an evening of the player's doors fills in only the residents a porch scene could cast found no counted resident at a door in any of its six drawn places, so it checks nothing and fails. Either three hours of the oldest adult's doors reach only full people in those towns, or the walk list skips counted households. A player whose doors reach no counted resident would talk only to people already met. Seen: a doors outing's result on the Campaign tab.

**Cause.** Measured: `DOOR_FILL_SEED=d708bcfbdaba1e9c npx vitest run src/core2/door-fill-in.test.ts` on the train at 53e4b29fe8, with a line written each time the test passes a drawn place over. It never knocks on a door. The test files its candidate on the day the world opens, January 20, 2025, and on that day five of the six places have no race open for filing (`openContests` is empty at Ingalls, Kansas; Canton, Ohio; Jacona, New Mexico; Big Pine Key, Florida; and Charlotte Amalie, U.S. Virgin Islands). At the sixth, Cumbola, Pennsylvania, the one open race (`contest:seat:gus2025:112273:board:0:2025-11-04`) refuses the filing. With no filing the test moves to the next place without a word, and after six it reports "no drawn place had counted residents at a door", which is not what happened. The doors and the walk list were never reached, so nothing here says they skip counted households. Filing windows follow each place's real dates now; the test was written when a race was open on the first day.

**Fix.** The test stages its case through the game's own path and says why it passes a place over.

1. At a named place, it advances to the first day a local race's filing is open, gives the candidate the cash for any filing fee and asserts the filing was not refused (skill pinned-tests, rule 9), then knocks doors for the evening.
2. It is pinned to two or three named places with seeds, found once by drawing, where counted residents open the door.
3. The error for a place passed over names the reason (no race open, the filing refused and why, no counted resident opened), so a red tells what happened.
4. Not changed: what the test asserts about the evening (at most `playerDoorFillIns` households filled in, every other counted opener reached as a count and answering by the same rule).

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** Tests are pinned to named places and seeds where the case occurs (pinned-tests). Never loosen a test to get green.

**Done when.** The test passes at seed d708bcfbdaba1e9c or is pinned to named places where counted residents open doors; a second session, on the train or main in a drawn place it names with its seed, knocks doors for an evening and sees counted residents reached on the outing's result.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts (walkDoors, countedToFill), src/core2/door-fill-in.test.ts

**Notes.** Nov 14 (claude, views thread): found while gating views cut 3b; red on the clean train at the same seed. The test prints "no counted resident opened" for each place it passed over; read those lines first. Cause found by Fable B, Nov 15, 2026. Not traced: why Cumbola refused the filing (the result carried no reason field the probe read).

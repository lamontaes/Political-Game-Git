---
id: elections-new-player-never-wins-a-race-by-campaigning
title: "A new player who files and campaigns every week wins none of the first races in ten drawn places"
area: elections
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: opus
effort: medium
root: none
source: Account lead measurement, Nov 15, 2026 (contested win through the campaign day choices)
---

**What.** A new life that waits for the first race it can enter, files, gathers the signatures and then plays every campaign day choice each week (canvass, raise money, forum, event) won no race in ten drawn places. Of the ten, five were petition short and never reached the ballot (the campaign choices are refused: `canvass:no`), and of the five on the ballot none won; the closest was Greene, Maine, 4,989 votes to 5,257. The path the owner plays first (turn 18, file, campaign, win or lose) therefore ends in a loss in every place read, and the Journal's win lines and the "town changes after you win" half of the golden path are never reached by a new player. This is a finding about the game, not a defect in one place: whether a first-time candidate in a small town can win a contested race by working at it is a calibration question for the elections line, and the answer today is no. Seen: a player who files and campaigns every week reads a loss on the results screen and in the Journal in every place read.

**Cause.** Measured: seeds `jpr-pin:0`, `3`, `5`, `6`, `9`, `12`, `13`, `15`, `16` and `17` (`drawPlace(seed, "journal-player-race:0")`; script `.walk/winrace.ts`, outside the test, on the Train 892427ec15), each a new life that waits at the clerk's door for the first race it can enter, files, gathers signatures, then each week plays `campaignDayChoices` in order (canvass, canvass, raise money, canvass, forum or event) until the count. Vote totals at the five places on the ballot, the player lost each: Greene ME 5,257 and 4,989 (1 rival); Arthurdale WV 3,137 and 1,526 (1 rival); Durham OR 796, 251, 173, 128, 82 and 71 (3 rivals); Lisbon ND 492, 180, 114, 95, 77 and 74 (3 rivals); New Llano LA 391, 76, 64, 46, 30 and 18 (3 rivals; on the earlier Train the player won a third seat there with 51 votes, which a later fold took away). The cause is not read: whether the player's own name recognition, the volunteers they bring, the money they raise or the incumbent's record decides these totals is the question for the first hour.

**Fix.** Needs cause. Read each of the five totals back to the records that made them (who voted for whom and why, from the vote reasons) and name which input is short for a first-time candidate; do not add a bonus for the player or a floor on their share. If the inputs are right and a first-time candidate in a small town really loses most first races, say so in the Notes with the real-world rate it is checked against.

**Time box.** 4 hours for one Opus session for the read, then size the fix.

**Rules.** No dice (`no-dice`): who wins follows the voters' own reasons, never a typed chance that the player wins. Estimate, never UNKNOWN (`estimate-not-unknown`): any real-world win rate for first-time local candidates used to check totals is labeled from memory or sourced, and never decides one race. Wire to the world (`wire-to-the-world`): the fix moves votes through the engines that count them, not through a player-only path.

**Done when.** A second session plays a new life at a drawn place named with its seed on main, files, campaigns every week and reads the count, and either sees the player win a contested race (the Journal telling it by the result record id) or the item's Notes name, by record, which input keeps a first-time candidate from winning and why that matches real small-town races.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/modules/candidacy.ts, src/core2/campaign-real-race-played.test.ts

**Notes.** Account lead, Nov 15. The contested-win case for the Journal test was not staged: the test's win is Duryea, Pennsylvania (`jpr-pin:37`), an at-large seat won without campaigning. Five of the ten were petition short before any campaigning could count; that is the petition-short builder's (#9536).

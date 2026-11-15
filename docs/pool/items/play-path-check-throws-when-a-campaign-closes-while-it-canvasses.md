---
id: play-path-check-throws-when-a-campaign-closes-while-it-canvasses
title: "The golden-path check throws when the race it is canvassing for closes under it"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: m0-m2
model: sonnet
effort: medium
root: none
source: "Fable B, Nov 15 (seen while proving the filing fee fix at Bennington, Kansas)"
---

**What.** The golden-path check stops with an error instead of printing the furthest step the player reached. At Bennington, Kansas it plays the player's first race, then files for a second one, and on August 5, 2026 it throws "Campaign day choice not available: canvass". A run that throws reports nothing, so the place counts as no step reached. Seen: the golden-path check's output for the place, which is an error where the furthest step should be.

**Cause.** Measured: Bennington, Kansas (2006075), `GOLDEN_PATH_SEED=d3e80a0a852ebb1850f1420f52bfa167ccf63d7cd1446c0457af35a5162a3507 GOLDEN_PATH_PLACE_KEY=2006075 node --import tsx src/bench/path-check.ts` on the train at b22cd35098 with the filing fee fix of #9513's item, and a temporary detail added to the error (not committed). The throw is in `stand` (src/bench/path-check.ts, the petition loop near line 296), which calls `campaignDay(..., { kind: "canvass" })` without first reading whether the filing's campaign still offers anything. The filing is the player's second, for the state senate seat of November 3, 2026 (`filing:contest:seat:US-KS:upper:036:0:2026-11-03:person_ff2b4c8e04947e2d`, filed with the Secretary of State on April 8, 2026). On August 5, 2026, the day after that race's primary, `campaignDayChoices` for the filing returns no choices at all, and `takeCampaignDayChoice` (src/core2/campaign-day.ts) throws for a choice that is not offered.

**Fix.** In the petition loop, read `campaignDayChoices` before each day and leave the loop when canvassing is not offered, logging why (the campaign closed, with the filing's status), so the check goes on to read the result and prints the steps reached. The same read before the weekly campaign loop below it. No engine change: the engine is right to refuse a choice it did not offer.

**Time box.** 1 hour for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the check names its place and seed and prints the furthest step in any drawn place, never an error. Ask why: when it leaves the loop it says by record why canvassing was not offered. One engine per mechanic: the check plays the routes the screens call and reads the same choices the play screen offers. Never loosen a test to get green.

**Done when.** A second session runs the command above on the train or main and it prints Bennington's furthest step with no error, then runs the check in a drawn place it names with its seed where the player loses a primary, and sees the same.

**Waits on.** play-stop-new-adult-with-no-money-cannot-file-where-a-fee-is-charged, without which the check at Bennington never files at all.

**Files.** src/bench/path-check.ts

**Notes.** Nov 15 (Fable B): not traced: why the filing's campaign closed that day (a primary lost, or the clerk's check). Not measured: how the first race, the council's of November 2025, ended in that run; the check throws before it prints its log.

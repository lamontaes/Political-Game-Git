---
id: tests-real-race-played-bennington-cannot-file
title: "The real-race proof test is red at its pinned place: the player at Bennington, Kansas can file for no council race on Mar 3, 2026"
area: elections
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: "#9556"
after:
blocked-on:
root: none
lead: governing
model: sonnet
effort: medium
source: Views thread, Nov 15 (gate of #9434 on the train at ff9703d7)
---

**What.** `src/core2/campaign-real-race-played.test.ts` fails on the train at ff9703d7 and on #9434's head the same way: "pinned place did not show all four clauses: Bennington, Kansas (2006075), place seed d3e80a0a852ebb1850f1420f52bfa167ccf63d7cd1446c0457af35a5162a3507: on 2026-03-03 the player person_ff2b4c8e04947e2d could file for no council race (0 contests offered)". The test proves the player files, campaigns and is counted in a real race, so the golden path's filing step is unproven while it is red. Seen: a pinned test, red on the clean train.

**Cause.** Measured: Bennington, Kansas (2006075), place seed d3e80a0a852ebb1850f1420f52bfa167ccf63d7cd1446c0457af35a5162a3507, `npx vitest run src/core2/campaign-real-race-played.test.ts` on the train at 53e4b29fe8, with a scratch copy of the test (not committed) that wrote down each month's offered contests and unmet checks. The town's calendar is not the cause. The council race of November 4, 2025 is offered to the player on April 26 and May 24, 2025, on time. Both months its one unmet check is the filing fee: needs $20, has $0. The player turns 18 on February 22, 2025, never takes a job in the test, and holds $0.00 in every one of the 14 months walked. Filing closes in June and nothing is offered after, which is why the message says 0 contests on March 3, 2026. A bisect of the train's folds (first parent, d1fd50663e9 to 53e4b29fe8, 7 runs) puts the first red at the fold of #9153 (55614240e78), which made the filing fee a check (`checkEligibility` in src/core2/modules/elections.ts) and a payment (`payFilingFee`). One fold earlier (e136a81d2ad) the test passes: the same player filed with no money.

**Fix.** Answered by the owner's ruling of Nov 15, 2026: "Remove the filing fee for now. I don't think it needs to be done. I think that's too much, a little bit too much depth." The fee is out of the game (f271995aa7bbd64a36728da383cc1bef3126db2b, merged with #9556), so the player at Bennington files with no money. A checker session ran `src/core2/campaign-real-race-played.test.ts` on that change and it passed. Nothing is left to build.

**Time box.** 2 hours.

**Rules.** Never loosen a test to get green: the four clauses stay (pinned-tests). Ask why, by record: name the contest the town held and its filing window before changing the date.

**Done when.** A second session runs `src/core2/campaign-real-race-played.test.ts` on main and sees all four clauses at its pinned place, and in a drawn place (place and seed named) plays to a filing day and files for a council race.

**Waits on.** Nothing.

**Files.** src/core2/campaign-real-race-played.test.ts

**Notes.**

- Nov 15 (views thread): a likely fix, once the cause is named: if the town's council is no longer on the 2026 ballot by its state's municipal cycle, re-pin the test to the town's real filing day, with the old premise stated and the lead's yes. The clauses are never loosened.
- Nov 15 (Fable B): cause found; see Cause. The premise of the note above did not hold: the council is on the 2025 ballot and its filing opens on time. What stops the player is $20.
- Nov 15 (acting CTO): the fee was removed on the owner's word, so this stop is gone; the item waits only for a second session to see the test pass on main.

---
id: tests-rival-campaign-day-played-rich-turn-red
title: "The rival-campaign-day test draws its seed at random and reads two correct outcomes as faults (a statewide race holds no town event; every door already knocked adds none)"
area: gov
kind: bug
priority: 3
size: S
status: merged
standard: 2
claimed-by:
pr: 9293
after:
blocked-on:
lead: wire-office
model: opus
effort: medium
root: none
source: found by the Account lead's gate of the I Liyang fix, Nov 14, 2026
---

**What.** `src/core2/rival-campaign-day-played.test.ts` takes `RIVAL_DAY_SEED` or a random one (`randomBytes(8)`), plays up to six drawn places and takes about seven minutes. With RIVAL_DAY_SEED=pinned-rival-2 three of its six draws fail on the pushed train with and without the I Liyang change: Kirby, Wyoming (5642730, place seed e2c89bdf506a144e1bc3624d1a5dbedb86f7911e4a6df969adb7e1f0c28e73a8) and Lucien, Oklahoma (4044350, place seed 2b1b963f438817ae14e14b7dfd95df1b34501cc033e8ec87f87d074670351e6d) "the rich turn holds the event: expected null to be 'event'", and Capac, Michigan (2613140, place seed a3cbd278d04af1450584269dfd85eef98b032266e1701011510a7cd1f7db8003) "doors knocked: expected 842 to be greater than 842". With RIVAL_DAY_SEED=pinned-rival-1 all six pass. Seen: reproduces with `RIVAL_DAY_SEED=pinned-rival-2 npx vitest run src/core2/rival-campaign-day-played.test.ts --maxWorkers=1` on the train.

**Cause.** Found in code: the code is right in all three failing draws and the test's premise was wrong. Kirby, Wyoming (and Lucien, Oklahoma, same shape) is a statewide special: `townShareOfRace` in src/core2/modules/campaigns.ts gives the town 0.000197 of the race's voters, `heldInTown` owes the town that share of an event a turn (Nov 8 speed rule), so a turn's `dayAct` is null until the credit reaches one; the rich turn holds no event, correctly. Capac, Michigan is a town race (share 1) where the draw's candidate had already knocked all 843 of the town's doors, so another canvass adds none. The test took any rival in any race and any day, played five months by chance, and read "null" and "no new door" as faults.

**Fix.** Rewrite the test as three pinned cases with no draw and nothing passed over: Flushing, Michigan (2629200), a town race in which a rival with doors left is on the ballot within three days of 2025-06-19, shows the poor day on calls and doors, the rich day and turn on an event, and the doors over seven days of the day's own hours (not one 400-hour turn) raising doors knocked and recognition and lowering the doors share, with no counted resident filled in; Kirby, Wyoming (5642730, statewide special, world from game start) holds no town event from a share of 0.0002; Capac, Michigan (2613140) walks every door of the town and a further day adds none. `townShareOfRace` is exported so the case reads the race's share instead of guessing. Each case fails naming the place, seed and contest. Run: about 56, 36 and 16 seconds, with limits of 110, 75 and 35 seconds (about twice each measured time).

**Time box.** 3 hours for one Opus session. When it runs out, push what is measured, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a rival's act follows the scores the records give. One rule, all 56 places: name each place with its seed. Never loosen an assertion to get green.

**Done when.** A second session runs `npx vitest run src/core2/rival-campaign-day-played.test.ts` and sees the three pinned cases pass, each place, seed and contest named in any failure.

**Waits on.** Nothing.

**Files.** src/core2/rival-campaign-day-played.test.ts, src/core2/modules/campaigns.ts

**Notes.** Built locally on branch rival-day-pin; pushed after #9268 folds. Plan that was followed: at Kirby, Wyoming and Lucien, Oklahoma on RIVAL_DAY_SEED=pinned-rival-2 print the rival's scores (event, interview, best hourly) and whether the event is offered, and write the reason into this item's Notes; then pin the test to three named places and seeds (the pinned-tests skill) so it runs in under two minutes and never by draw. Filed by hand on the branch of the PR that found it, as the thread rule says.

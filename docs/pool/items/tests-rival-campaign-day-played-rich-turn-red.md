---
id: tests-rival-campaign-day-played-rich-turn-red
title: "The rival-campaign-day test draws its seed at random and three of six draws fail on a named seed (the rich turn does not hold the event; doors knocked do not rise)"
area: gov
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: wire-office
model: opus
effort: medium
root: none
source: found by the Account lead's gate of the I Liyang fix, Nov 14, 2026
---

**What.** `src/core2/rival-campaign-day-played.test.ts` takes `RIVAL_DAY_SEED` or a random one (`randomBytes(8)`), plays up to six drawn places and takes about seven minutes. With RIVAL_DAY_SEED=pinned-rival-2 three of its six draws fail on the pushed train with and without the I Liyang change: Kirby, Wyoming (5642730, place seed e2c89bdf506a144e1bc3624d1a5dbedb86f7911e4a6df969adb7e1f0c28e73a8) and Lucien, Oklahoma (4044350, place seed 2b1b963f438817ae14e14b7dfd95df1b34501cc033e8ec87f87d074670351e6d) "the rich turn holds the event: expected null to be 'event'", and Capac, Michigan (2613140, place seed a3cbd278d04af1450584269dfd85eef98b032266e1701011510a7cd1f7db8003) "doors knocked: expected 842 to be greater than 842". With RIVAL_DAY_SEED=pinned-rival-1 all six pass. Seen: reproduces with `RIVAL_DAY_SEED=pinned-rival-2 npx vitest run src/core2/rival-campaign-day-played.test.ts --maxWorkers=1` on the train.

**Cause.** Needs cause. Measured: the same three failures with and without the cash change in src/core2/campaign-day.ts, so the day's choice is not what stops the event. Not traced: in the failing draws a rich rival's turn picks no act ("null") because the event's score does not beat the best hourly choice (`rivalDay` in src/core2/modules/campaigns.ts), or the event is not on offer (`openToday`); and a rival who already knocked every door cannot knock more (842 of 842), a case the test should pass over and name.

**Fix.** None until the cause is found.

**Time box.** 3 hours for one Opus session. When it runs out, push what is measured, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a rival's act follows the scores the records give. One rule, all 56 places: name each place with its seed. Never loosen an assertion to get green.

**Done when.** A second session runs the test on a pinned set and on RIVAL_DAY_SEED=pinned-rival-2, sees each pass, with each place and seed named in the output.

**Waits on.** Nothing.

**Files.** src/core2/rival-campaign-day-played.test.ts, src/core2/modules/campaigns.ts

**Notes.** First step, no code change: at Kirby, Wyoming and Lucien, Oklahoma on RIVAL_DAY_SEED=pinned-rival-2 print the rival's scores (event, interview, best hourly) and whether the event is offered, and write the reason into this item's Notes; then pin the test to three named places and seeds (the pinned-tests skill) so it runs in under two minutes and never by draw. Filed by hand on the branch of the PR that found it, as the thread rule says.

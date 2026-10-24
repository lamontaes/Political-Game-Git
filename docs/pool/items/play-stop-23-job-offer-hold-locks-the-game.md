---
id: play-stop-23-job-offer-hold-locks-the-game
title: "A job offer the screen never shows locks the game on December 14, 2026"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On the v0.22.10 release, on Monday December 14, 2026 (six weeks after I won my council seat), the screen says SOMETHING NEEDS YOU with no talk box and no message; Day and Week are grayed and Continue is the only control. Each Continue returns to the same date and screen, two Week presses wait almost two minutes and change nothing, and Quit to title then CONTINUE returns to the same lock. The pause behind it is a held job offer: the game's stop names reason "job-offered" for a Janitor job at $13.48 an hour (record job-offer:position:organization_e3138a3bdaea64a0:2026-12-01:4:person_fe9956e2c35fa4e5, hold true), but the play screen never shows the offer or a way to take or turn it down. A player can do nothing but close the game.

**Rules.** This is a game, not a spreadsheet: every hold the core raises for the player must show as a choice the player can answer, or play stops. Wire to the world: the job offer is a decision for the player, read by the jobs engine when answered.

**Done when.** The owner does the same steps on the next build and is not stopped: when the core holds the player for a job offer, the screen shows the employer, the job and the pay with Take and Turn down, either answer releases the hold, and Day and Week work again. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/play.mjs, src/bench/handler.ts, src/bench/jobs.ts

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:36 to 16:42; screenshots 83-dec-needs-7, 83-dec-needs-9, 84, 86, 87, 88, 89, 90. Pause id player:person_fe9956e2c35fa4e5:707. Stopper 3 of 3; this one ends play.

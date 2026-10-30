---
id: core-speed-emotion-dates-acts
title: "Each feeling re-parses the same dates, and each act a background person commits is validated again in play"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** affectAt in src/core2/emotion.ts calls dateTime twice for every witness's appraisal and every need refresh, and each call parses the date and checks it round-trips, though the same few dates repeat all day. recordAct in src/core2/state.ts validates every committed act a second time in play, after the offer was already checked when it was chosen. Both are checks that tests and the bench need, not play, under Keep it simple (bookkeeping is a debug switch).

**Rules.** Speed: a country's year runs under 120 seconds, and no change makes it more than 20 percent slower. A speed change never changes what the simulation decides: dev mode's records proof must be identical before and after on a drawn place.

**Done when.** dateTime keeps each validated date's time, and recordAct validates a committed act only with bookkeeping on or for the controlled person; npm run speed:year -- --seed long-1 --years 2 on main and on the branch, one process at a time, keeps dev mode's records proof identical in every table of the played world at year 2, with both runs' times in the PR body.

**Files.** src/core2/emotion.ts, src/core2/state.ts

**Notes.** TODO

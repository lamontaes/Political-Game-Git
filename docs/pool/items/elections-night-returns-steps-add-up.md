---
id: elections-night-returns-steps-add-up
title: "Election night's returns steps add up to the final count"
area: elections
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Confirmer replay of Lane 4 path 13 on main 705120be1b: New Game in Storrs, Connecticut (0973980, replay storrs-1), the player ran for Selectman and lost November 4, 2025. Election night steps: 'The polls closed... 0 votes / 0 votes', then 'The rest of the town is in. Avery Cooper leads there, 2 to 0.' with 2 votes and 0 votes, then 'Avery Cooper has won the race for Selectman.' 552 to 223. The middle step says the rest of the town is in with two votes counted, then the call adds 773 more; the steps don't add up to the count, and only the named voters seem to be in the middle step.

**Rules.** One engine per mechanic: the returns read the one tally (named people and counted groups by the same rule), place by place; a view never keeps its own count. No hand-written player text in code.

**Done when.** A fresh session replays New Game in Storrs, Connecticut at replay storrs-1 on main, runs for the first race, and on election night each returns step's totals are part of the final count and the last step before the call equals it; the same in two places drawn from all 56 (place and seed named); a test fails when a step's totals exceed or fall far short of the counted votes it says are in.

**Files.** src/bench/election-night.ts, src/core2/modules/voting.ts

**Notes.** TODO

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
after:
lead: elections
standard: 2
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
checked: fable 2026-11-10
---

**What.** Election night's returns steps do not add up to the final count. On main 705120be1b, New Game in Storrs, Connecticut (0973980, replay storrs-1), the player ran for Selectman and lost November 4, 2025. The steps read "The polls closed" with 0 votes each, then "The rest of the town is in. Avery Cooper leads there, 2 to 0." with 2 votes and 0 votes, then the call "Avery Cooper has won the race for Selectman" at 552 to 223. The middle step says the rest of the town is in with two votes counted, then the call adds 773 more, so only the named voters seem to be in the middle step. Seen: election night's returns screen, whose steps now add up to the final count (2 to 0, then 552 to 223 today).

**Cause.** Needs cause. Looked at: New Game in Storrs, Connecticut (0973980, replay seed storrs-1) on main 705120be1b, election night: the middle step totals 2 to 0 while the call totals 552 to 223. The steps are built in `src/bench/election-night.ts` (`electionNight`, the `places.forEach` loop reading `returnsOf`), whose running totals come from `recordPlaces` in `src/core2/modules/voting.ts`, summing each place row's votes.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one sonnet session.

**Rules.** One engine per mechanic: the returns read the one tally (named people and counted groups by the same rule), place by place; a view never keeps its own count. One model, two tiers: a counted group votes with the same rule as a full person, times its count. No hand-written player text in code.

**Done when.** A second session replays New Game in Storrs, Connecticut at replay storrs-1 on main, runs for the first race, and on election night sees each returns step's totals be part of the final count and the last step before the call equal it. The same holds in two places drawn from all 56 (place and seed named). A test fails when a step's totals exceed or fall far short of the counted votes it says are in.

**Waits on.** Nothing.

**Files.** src/bench/election-night.ts, src/core2/modules/voting.ts

**Notes.** TODO

**Notes (Fable's check, Nov 10).** How to find the cause: in the Storrs, Connecticut replay, print the place rows of that race from src/core2/modules/voting.ts beside the tally and find which counted groups' votes are missing from the rest-of-town row (`town:<place>:rest`). The fix then makes that row carry the counted groups' votes by the same rule as the tally, so the night's steps add up to the call; the screen keeps no total of its own.

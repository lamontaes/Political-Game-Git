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

**What.** Election night's returns steps do not add up to the final count. On main 705120be1b, New Game in Storrs, Connecticut (0973980, replay storrs-1), the player ran for Selectman and lost November 4, 2025. The steps read "The polls closed" with 0 votes each, then "The rest of the town is in. Avery Cooper leads there, 2 to 0." with 2 votes and 0 votes, then the call "Avery Cooper has won the race for Selectman" at 552 to 223. The middle step says the rest of the town is in with two votes counted, then the call adds 773 more, so only the named voters seem to be in the middle step.

**Cause.** Found in code: `keepCount` in `src/core2/modules/voting.ts` (line 3770) adds three parts into a race's totals: the named voters' votes, the counted residents' votes and the coarse places' votes (`wider`). It records election night's returns from the coarse places alone: `recordPlaces(api, input.id, wider.places)` (line 3806, the function at line 3916). Each report's `running` total is summed over those place rows only. `electionNight` in `src/bench/election-night.ts` (the `places.forEach` loop near line 306, reading `returnsOf`) shows one step per report, then the call from the result's totals. In a town race the coarse place is the part of the town nobody models, so in Storrs it held 2 votes, while the town's named and counted voters, 773 votes, are in no step. The call then jumps from 2 to 0 to 552 to 223.

**Fix.** In `keepCount`, give the town's own voters a report of their own. Pass `recordPlaces` the coarse places plus one place result for the town's named and counted voters together: the town's place id and name, their `votes` summed by candidate from `named.votes` and `counted.votes`, and their `cast` from `named.turnout + counted.turnout`. Do this also when `wider` is null, where it is then the only report. `recordPlaces` already orders reports smallest first and keeps running totals, so the last report's `running` then equals the totals. In `src/bench/election-night.ts`, check that the step for the town's own report reads as the town, not as "the rest of the town". If its words need a new line, list the line for the Story session (`data/english/parts/` is theirs) and use the existing `returns-step` words until it lands. Add to `src/core2/voting.test.ts` a check, in a drawn place, that the last returns report's running totals equal the result's totals for every local race.

**Time box.** 2 hours for one Sonnet session.

**Rules.** One engine per mechanic: the returns read the one tally (named people and counted groups by the same rule), place by place; a view never keeps its own count. One model, two tiers: a counted group votes with the same rule as a full person, times its count. No hand-written player text in code.

**Done when.** A second session plays New Game in a drawn place (named with its seed) and in Storrs, Connecticut (replay storrs-1) to election night, and sees each step's totals add up: the last step before the call shows the same totals as the call, by result record id. `src/core2/voting.test.ts` passes on two fresh seeds.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/bench/election-night.ts, src/core2/voting.test.ts

**Notes.** TODO

**Notes (Fable's check, Nov 10).** How to find the cause: in the Storrs, Connecticut replay, print the place rows of that race from src/core2/modules/voting.ts beside the tally and find which counted groups' votes are missing from the rest-of-town row (`town:<place>:rest`). The fix then makes that row carry the counted groups' votes by the same rule as the tally, so the night's steps add up to the call; the screen keeps no total of its own.

Nov 11 (cause finder for Fable B): read on main d604b3494b. Election night's steps come only from the coarse places, while the race's totals also hold the town's named and counted voters, who are in no step. Found in code; not replayed in Storrs.

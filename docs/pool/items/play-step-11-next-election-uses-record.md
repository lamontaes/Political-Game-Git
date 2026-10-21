---
id: play-step-11-next-election-uses-record
title: "Golden path step 11: the next election uses the player's record, detected and checked"
area: play
kind: wiring
priority: 2
size: M
status: done
claimed-by: claude/step-11-next-election
pr: #4901
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-17T09:31:45.066Z
---

**What.** The last golden-path step, "the next election uses the record", is built in the voting engine (an incumbent's record, votes and promises kept or broken, is weighed by a voter who knows the officeholder: `recordAppeal` in `src/core2/modules/voting.ts`) but nothing detects or checks it from the player's path. `reachedSteps` (`src/bench/reached.ts`) stops at step 10, and `path-check.ts` ends right after the player's law takes effect, years before the seat's next election. Detect step 11 as: an election for the seat the player holds, after their bill took effect, whose ballots (kept for the player's circle) carry `recordReasons` for the player naming a record item by id; and let `path-check.ts` run on to that election in a place where it is within a few years.

**Rules.** An effect is a read, not a record: the check follows one ballot from the player's vote on their bill, through the record module's item, to a voter's recorded reason. Ask why: the reason names the record item id. Speed: the run is long, so it goes behind a flag and not into the default check. One rule, all 56 places: draw the place and name it with the seed.

**Done when.** In a drawn place where the player's seat comes up again within the run, `reachedSteps` reports step 11 with the ballot id and the record item id, and `path-check.ts` prints it; a test in src/bench names the place, the seed, the voter and the record item.

**Files.** src/bench/reached.ts, src/bench/path-check.ts, src/core2/modules/voting.ts, src/core2/modules/record.ts

**Notes.** Steps 3 to 10 now run end to end in `path-check.ts` (PRs #4876 and #4887). On Deer Island, Oregon (seed pc-d) the player's seat is a four-year county commissioner term, so the next election is 2030; a council with two-year terms would reach it sooner.

Measured Oct 17 (claude): on Deer Island, Oregon (seed pc-d) `GOLDEN_PATH_TO_NEXT_ELECTION=1` lives the commissioner's bill through its law to the 2028-11-07 election; steps 3 to 11 reached (1017 s, bookkeeping on for the run).

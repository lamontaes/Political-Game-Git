---
id: elections-governor-margins-twice-real
title: "The world's 2026 governor races are won by margins about twice the real ones"
area: elections
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-elections-governor-margins-twice-real
pr: #8724
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: design-electorate-one-model
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at: 2026-11-11T06:37:38.109Z
---

**What.** On election night of November 3, 2026 in Cecilia, Louisiana (custom world seed lane4-gov-1), the 36 governor races were won by 12 to 65 points: Maryland Democratic by 64, Massachusetts by 65, California by 60, Hawaii by 60, Alabama Republican by 38. The real 2022 margins were about half that (Maryland about 32, Massachusetts about 29, California about 18). The picture is docs/play-first/shots/play-governor-races-on-screen/governors-1440.png on lane-4/governor-rows. The figures come from `raceVotes` in `src/core2/modules/voting.ts`, read by `governorRacesTonight` in `src/bench/results.ts`. Why the margins run so wide has not been traced.

**Cause.** Found in code: `partyField` in `src/core2/modules/voting.ts` (line 5223) builds each out-of-town race's field with `isIncumbent` set and no `incumbentLeanCenter`. So `countedAppeal` (`src/core2/electorate.ts` line 545) adds each counted voter's whole incumbent lean (`incumbentLeanOf`, the `voting.back-incumbent` trait lean) to the holder's appeal. The town's own races subtract the town's average (`incumbentLeanCenter: townIncumbentLean(api)`, voting.ts line 1176), because the candidate's standing already carries the average incumbency edge (`incumbencyShare`, 0.02). Every race counted from afar (governors, senators, House seats, other states' legislatures, through `decide`, line 5259) counts that edge twice. Measured: Cecilia, Louisiana (2213575), world seed lane4-gov-1, main 6e88a3f4f9, played to Nov 5, 2026. The sample's mean incumbent lean is 0.30 appeal, which is 0.075 of the vote or about 15 points of margin. Across the 36 governor races the holder's party gained 14.4 points over the 2024 presidential margin where Republicans hold the seat and 33.1 where Democrats do, and the median absolute margin was 39.2 against a 2024 presidential median of 15.6 in the same states. With a probe that set `incumbentLeanCenter` to the sample's mean (then undone), the shifts fell to -3.9 and 15.7 and the median to 23.4. What is left is the midterm and approval tide against the president's party (-0.025 and -0.013 of the vote on each Republican candidate) and the 0.02 incumbency share, both recorded in each result's `electorateReasons`.

**Fix.** In `partyField` (voting.ts line 5223), give an incumbent entry `incumbentLeanCenter: townIncumbentLean(api)`, the same center the town's own races use at line 1176. Pass `api` in from both callers of `partyField`: `decide` (line 5322) and each state's presidential popular vote in `electoralCollege` (line 4651). Change nothing in the tide or incumbency parameters: the probe shows that what is left after centering is their recorded size. Add `src/core2/world-race-incumbency.test.ts` (new): in a drawn place (named with its seed), a world race with a holder counted with no other change to its reasons comes out within the incumbency share of its 2024 lean plus its recorded tide, and the holder's appeal in `countedAppeal` carries no uncentered incumbent lean.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Research before building: real results check the totals and never pick one race. No dice. One rule, all 56 places. Ask why: each wide margin is explained by the voters' recorded reasons. Ranges are not targets (owner, Nov 8): the real medians are reported, never steered to.

**Done when.** A second session plays to election night, Nov 3, 2026, in two drawn places (names and seeds written down), and reads each governor race's margin beside its 2024 presidential margin and its `electorateReasons`. It sees the holder's party gain no more than the incumbency share and the recorded tide explain (no constant 15-point shift toward every holder), and it reports the median absolute governor margin beside the real 2018 and 2022 medians, sourced, as a check, not a target. `src/core2/world-race-incumbency.test.ts` passes on both seeds.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/electorate.ts, src/core2/world-race-incumbency.test.ts (new), src/bench/results.ts

**Notes.** lead: Lane 1. Found by Lane 4 on Nov 4 while building play-governor-races-on-screen.

Nov 11 (cause finder for Fable B): played Cecilia, Louisiana (seed lane4-gov-1) to Nov 5, 2026 on main 6e88a3f4f9 and read all 36 governor counts and their reasons. Every race moved by a nearly constant amount toward the seat holder's party, while the recorded reasons were small. The cause is the out-of-town field leaving the incumbent lean uncentered, which counts the incumbency edge twice. A probe that centered it (undone) cut the median absolute margin from 39.2 to 23.4 points. The same field serves every out-of-town race, so House, Senate, other states' legislative and each state's presidential margins carry the same shift.

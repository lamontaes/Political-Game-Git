---
id: elections-governor-margins-twice-real
title: "The world's 2026 governor races are won by margins about twice the real ones"
area: elections
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: high
root: design-electorate-one-model
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** On election night of November 3, 2026 in Cecilia, Louisiana (custom world seed lane4-gov-1), the 36 governor races were won by 12 to 65 points: Maryland Democratic by 64, Massachusetts by 65, California by 60, Hawaii by 60, Alabama Republican by 38. The real 2022 margins were about half that (Maryland about 32, Massachusetts about 29, California about 18). The picture is docs/play-first/shots/play-governor-races-on-screen/governors-1440.png on lane-4/governor-rows. The figures come from `raceVotes` in `src/core2/modules/voting.ts`, read by `governorRacesTonight` in `src/bench/results.ts`. Why the margins run so wide has not been traced.

**Cause.** Needs cause. Measured: Cecilia, Louisiana, custom world seed lane4-gov-1, election night Nov 3, 2026, 36 governor races won by 12 to 65 points. The numbers come from `raceVotes` (`src/core2/modules/voting.ts`) read by `governorRacesTonight` (`src/bench/results.ts` line 205); the engine and cause have not been traced.

**Fix.** None until the cause is found.

**Time box.** 8 hours for one Opus session, to trace the margins to the electorate's inputs and then fix the cause.

**Rules.** Research before building: real results check the totals and never pick one race. No dice. One rule, all 56 places. Ask why: each wide margin is explained by the voters' recorded reasons. Ranges are not targets (owner, Nov 8): the real medians are reported, never steered to.

**Done when.** A second session plays election night in two drawn seeds (names written down), reads each governor race's margin and finds it explained by the voters' recorded reasons, by record id, with the cause of the wide margins named by file and line. It reports the median absolute 2026 governor margin beside the real 2018 and 2022 medians (sourced in the PR) without treating them as a target.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/electorate.ts, src/bench/results.ts

**Notes.** lead: Lane 1. Found by Lane 4 on Nov 4 while building play-governor-races-on-screen.

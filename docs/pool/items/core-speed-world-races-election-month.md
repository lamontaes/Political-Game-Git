---
id: core-speed-world-races-election-month
title: "The election month runs seven times an ordinary month: every race elsewhere counts thousands of places against a fresh sample"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr: #8677
after:
blocked-on:
model: opus
effort: medium
root: rc5-full-detail-every-day
lead: speed
source: added with npm run pool -- add
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-core-speed-world-races-election-month
---

**What.** In Bedford, Wyoming (key 5606045, seed 9a4dd331ace7), the month that ends on election day 2026 took 17.0 s against 2.3 s for an ordinary month. Profiled on Oct 25, 7.75 s of that growth is `decide` in src/core2/modules/voting.ts: 582 races elsewhere decided that month (438 House, 34 Senate, 35 governors, 75 state legislative), 5,138 places in all, each place counted coarsely in src/core2/electorate.ts with coarseSampleVoters (400, TUNABLE) of the town's counted adults standing for its voters. The cost is the same for every town, so a small town's election month is mostly other places' races. That profile predates core-speed-voting-sample-once (#6966) and core-speed-gc-other-places-count, so re-measure first. This item also takes the two leftovers of core-speed-campaign-season-kept-whys: keep a campaign cause row (keepCause) only for the player's own races, and make keepWeighing find its record id without trying suffixes (9.5 s in Sarasota's third year). Seen: the game running; an election-year month in a small town takes seconds, not seventeen, so a country's year stays under two minutes.

**Cause.** Measured: Bedford, Wyoming (5606045, seed 9a4dd331ace7), month ending 2026 election day 17.0 s vs 2.3 s ordinary; 7.75 s is `decide` over 582 races elsewhere (5,138 places each counted against the coarse sample of 400 voters, coarseSampleVoters in src/core2/electorate.ts, TUNABLE in src/core2/data/electorate/parameters.json). The race loop is `for (const race of racesIn(api, year)) decide(api, race, year)` in `raceWork` in src/core2/modules/voting.ts (line 4332); `decide` itself is at line 5223.

**Fix.** Re-measure; then count a place once for all races it votes in on one day (its coarse count does not change between its races), and decide with the owner-flag whether a House race is counted per place or per state. Also keep `keepCause` (src/core2/modules/campaigns.ts line 853) only for the player's own races and make `keepWeighing` (src/core2/trait-decisions.ts line 329) find its id without trying suffixes.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. One rule, all 56 places: every state's races are counted by the same rule. No dice: the counted share of each place decides, never a draw. Owner decisions are flagged, never waited on: whether a House race is counted per place or per state is a design call the builder makes simply and flags. Keep it simple (owner, Oct 11): why records only for the player and the people they deal with.

**Done when.** A second session, not the builder, plays Bedford, Wyoming (seed 9a4dd331ace7, key 5606045) and a place drawn from all 56 (named with its seed) for two years in the played world (buildBenchWorld): the month ending on the 2026 election day runs within 2 times an ordinary month, `decide`'s inclusive time in a CPU profile of that month falls by at least half, and every race elsewhere has the same winner as before (a test names the races and their record ids), with any share that moves reported with its size. Sarasota, Florida (key 1264175, seed 23cf8a4ebe4750b7287b19bf719f7fd1) year 3 reports the `keepWeighing` time before and after.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/race-places.ts, src/core2/electorate.ts, src/core2/data/electorate/parameters.json, src/core2/modules/campaigns.ts, src/core2/trait-decisions.ts

**Notes.** Filed Oct 25 by the speed lead from the Bedford month-by-month profile (main a351e12f45). The same place counted again for each race it votes in (House, Senate, governor, legislature) may be the first cut: a place's coarse count does not change between its races on one day.

Released (2026-11-11): Re-measured in Bedford WY 9a4dd331ace7: decide is 3.6 s of an 18.6 s election month and campaigns 6.4 s, so counting each place once cannot bring the month within twice an ordinary one (PR 8677). Continue on branch claude/pool-core-speed-world-races-election-month and pull request #8677.

Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 06:17 UTC) on branch claude/pool-core-speed-world-races-election-month.

Released by next (2026-11-13): no push to claude/pool-core-speed-world-races-election-month since 2026-11-11 06:05 UTC, more than twice its 6-hour time box. Continue on branch claude/pool-core-speed-world-races-election-month and pull request #8677.

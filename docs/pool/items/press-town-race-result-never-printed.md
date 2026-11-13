---
id: press-town-race-result-never-printed
title: "The town's paper never prints its own council race's result, because the desk weighs a race by its three or four candidates"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
source: "Account lead T20, Nov 13, 2026, while making the concession-reported test draw its race from the calendar (PR #9050)"
model: sonnet
effort: medium
root: none
---

**What.** A town's council race is decided and its result goes on the press wire, but no outlet ever prints it, so the race a player ran (or watched) never appears in the paper and the paper's election story, which tells the concession, never runs. In Searsboro, Iowa (place 1971355, draw `de4ef0f8ff6efdfb:agree:15` of `drawPlace(..., "concession-reported")`), the at-large council race `contest:seat:gus2025:164548:council:0:2025-11-04` is won by person_3357b17eae49dfd5 (totals 38, 21, 16, 11, 4); `election-result:<that contest>` is on the press `wire` table, the town has a local newspaper (`outlet:newspaper:0:jurisdiction_47de32828dc0db4c`) and three local stations, and of 754 `press.printed` stories in the year none has an `election-result` source, including 17 printed in the ten days after the count. The same race printed nothing on main at 48296b91, so it is not from #9050. The same happened in Hauula, Hawaii (`de4ef0f8ff6efdfb:agree:16`) and Excursion Inlet, Alaska (`de4ef0f8ff6efdfb:agree:19`). Seen: the Paper screen and the Journal on the days after a town race, where the race never appears.

**Cause.** Measured: in Searsboro, Iowa, seed `de4ef0f8ff6efdfb:agree:15` (drawPlace purpose `concession-reported`), replaying that test's steps. The result reaches the wire (press.ts `onEvent`, line 436) and is passed over by every reporter in `runDesk` (src/core2/press-desk.ts, lines 786 to 835). The desk scores an item by proximity times reader care, people, renown and drive; an election result's `people` term is `log1p` of its named subjects in town (three or four candidates), while the town's sitting votes, budget lines, laws in force and town-wide briefs count every follower, named and counted, in `involved` (lines 721 to 778). In a week with a council meeting or a budget change the race ranks below `storiesPerReporterWeek` and is never printed; by the next desk it is older than `storyFreshDays` or still outranked.

**Fix.** In `involved`, a decided race for a seat of the town's own governments (town, county or school, by the result's `contestId` and the contest's level) involves every follower who could vote in it, named and counted, as a sitting vote does: `followers.length + ctx.countedFollowers(outlet)` limited to followers in the race's electorate where the elections engine keeps one. No new weight or parameter. Check that a statewide or other place's race is unchanged.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the desk's own score, no special case that prints every race. No dice. One rule, all 56 places: no place named in logic. Speed: no new scan of the wire or the people per desk.

**Done when.** A second session, not the builder, on main, draws three places with `drawPlace` (named, with seeds), plays each to the day after its first local race with two or more candidates on the ballot, and reads in dev mode a `press.printed` story whose `sourceRecordId` is that race's `election-result`, within ten days of the count, in each. `src/director/concession-reported.test.ts` passes on five fresh seeds with no place passed over for "the race was not printed".

**Waits on.** Nothing.

**Files.** src/core2/press-desk.ts, src/core2/press-desk-race.test.ts (new), src/director/concession-reported.test.ts (read only).

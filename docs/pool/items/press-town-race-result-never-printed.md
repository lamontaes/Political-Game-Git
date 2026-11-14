---
id: press-town-race-result-never-printed
title: "The town's paper never prints its own council race's result, because the desk weighs a race by its three or four candidates"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: Account lead T42 (branch claude/project-thread-nlmccl)
pr: 9081
after:
blocked-on:
lead: governing
source: "Account lead T20, Nov 13, 2026, while making the concession-reported test draw its race from the calendar (PR #9050)"
model: sonnet
effort: medium
root: none
---

**What.** A town's council race is decided and its result goes on the press wire, but no outlet ever prints it, so the race a player ran (or watched) never appears in the paper and the paper's election story, which tells the concession, never runs. In Searsboro, Iowa (place 1971355, draw `de4ef0f8ff6efdfb:agree:15` of `drawPlace(..., "concession-reported")`), the at-large council race `contest:seat:gus2025:164548:council:0:2025-11-04` is won by person_3357b17eae49dfd5 (totals 38, 21, 16, 11, 4); `election-result:<that contest>` is on the press `wire` table, the town has a local newspaper (`outlet:newspaper:0:jurisdiction_47de32828dc0db4c`) and three local stations, and of 754 `press.printed` stories in the year none has an `election-result` source, including 17 printed in the ten days after the count. The same race printed nothing on main at 48296b91, so it is not from #9050. The same happened in Hauula, Hawaii (`de4ef0f8ff6efdfb:agree:16`) and Excursion Inlet, Alaska (`de4ef0f8ff6efdfb:agree:19`). Seen: the Paper screen and the Journal on the days after a town race, where the race never appears.

**Cause.** Found in code: `runDesk` (src/core2/press-desk.ts) scores an item's people as `log1p` of the larger of its named subjects in town and `involved(item)`; `involved` counted every follower for sitting votes, laws in force, town-wide briefs and signed budgets but returned 0 for an `election-result`, so a race weighed its candidates alone. Measured in Searsboro, Iowa, seed `de4ef0f8ff6efdfb:agree:15`: on the desk of 2025-11-10 the newspaper (41 named and about 35 counted followers, 2 stories a reporter) scored the budget line 4.10, the council vote 3.41 and two laws 3.39 and 3.28, each with people 4.35, and the best race 2.49 with people 1.10, fifth; the other three races of the night ranked lower; every station the same. By the next desk the race was older than `storyFreshDays`. The same zero held for a state ballot question on the town's ballot and a recall's vote.

**Fix.** In `involved`, a count of the town's voters involves the followers on its roll: for an `election-result`, the named followers the count gave a ballot in the contest (`onContestRoll`, voting.ts: a ward seat's ward, the town for an at-large or wider seat); for a `ballot-measure-result`, those on the measure's roll (`onMeasureRoll`, ballot-measures.ts); for a recall's kept or removed vote, every follower in town; plus the counted followers in the same share. And election night is covered whole like a sitting: the reporter who files one `election-result` files the others of the same level counted the same day, one story a seat (`sameSitting`). No new weight or parameter. A primary is still weighed by its candidates (its electorate is the party's identifiers and keeps no roll per voter).

The stories it puts in front of players for the first time follow the Words lead's rules 30 to 37 (brief F, Nov 13): one story a race that fills several seats (the desk dedupes a race's seats by the record's `race`), names in full once then by last name, no share for an unopposed or vote-for-N race, the office in lower case, turnout as people who voted (the count's turnout, not ballots for N seats), the count in figures; the printed race builder and the archive's past-race builder in src/bench/printed-words.ts read the same facts, and the election pieces in data/english/parts/news.json and headlines.json were replaced (14 removed, 49 added).

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the desk's own score, no special case that prints every race. No dice. One rule, all 56 places: no place named in logic. Speed: no new scan of the wire or the people per desk.

**Done when.** A second session, not the builder, on main, draws three places with `drawPlace` (named, with seeds), plays each to the day after its first local race with two or more candidates on the ballot, and reads in dev mode a `press.printed` story whose `sourceRecordId` is that race's `election-result`, within ten days of the count, in each. `src/director/concession-reported.test.ts` passes on five fresh seeds with no place passed over for "the race was not printed".

**Waits on.** Nothing.

**Files.** src/core2/press-desk.ts, src/core2/modules/voting.ts, src/core2/modules/ballot-measures.ts, src/core2/press-desk-race.test.ts (new), src/core2/press-race-test-kit.ts (new), src/bench/printed-words.ts, src/bench/race-result-stories.test.ts (new), data/english/parts/news.json, data/english/parts/headlines.json, src/director/concession-reported.test.ts (read only).

---
id: tests-two-level-third-candidate-no-votes
title: "two-level-elections fails on main: an independent in a two-party statewide race gets no votes, and a Washington town has no two-party race"
area: elections
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-tests-two-level-third-candidate-no-votes
pr: #8541
after:
blocked-on:
lead: wire-elections
model: opus
effort: medium
root: design-electorate-one-model
source: wire-office session, Oct 28 (found red on main)
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:50:55.960Z
branch: claude/pool-tests-two-level-third-candidate-no-votes
merged-at: 2026-11-12T05:06:43.154Z
---

**What.** src/core2/two-level-elections.test.ts fails on clean main for two of four fixed seeds. With GOLDEN_PATH_SEED=b2 (Clayville, Rhode Island, 4415940) the Attorney General race has a third filing with no party and it gets 0 votes, while the test expects every filing in a contested race to get real votes; the same failure was seen with a Governor race on a random seed. With GOLDEN_PATH_SEED=c3 (Machias, Washington, 5341470) no November 3, 2026 race has both a Republican and a Democrat on the ballot. Seeds a1 and d4 pass.

**Cause.** Measured: two causes, one for each seed, both still red on main 8f2a7f2725 (Nov 10). First seed, `GOLDEN_PATH_SEED=b2 npx vitest run src/core2/two-level-elections.test.ts` (Clayville, Rhode Island, 4415940): the failure is now "Governor Democratic: expected 0 to be greater than 0". The general ballot of contest:seat:US-RI:governor:2026-11-03 holds five filings: the Democratic and Republican stand-in nominees, both filed on the opening day, and three people of the town filed at the deadline of June 24, two of them Democrats and one with no party. The state's Democratic vote (93,394) goes to one of the town's Democrats, who wins the governorship; the Democratic stand-in gets none. Found in code: `weighClosedContest` in src/core2/modules/candidacy.ts (line 1690) puts every runner of the town straight on the general ballot of a race whose filing closed before the record began, whatever the race's primary date. `scheduleContest` in src/core2/modules/voting.ts (line 474) books a primary only when its date is still ahead, so a primary that fell before the opening (here September 9) is never held and two runners of one party stand in November. The same function (line 473) calls `fileStandingCandidates` (line 1859) at once for a race already closed, which is before `candidacyDay` (candidacy.ts line 1796) first weighs it, so each party's stand-in is placed because nobody of its side has filed yet, and the town's runners are added beside it. Second seed, measured with `GOLDEN_PATH_SEED=c3` (Machias, Washington, 5341470): three races on November 3, 2026 (the U.S. House seat and two state House seats), each with one Democrat and one or two runners with no party, and no Republican. Washington has no statewide race that day, so `fileStandingCandidates` adds no stand-in (it returns for any race with a district, line 1918), and a district race's field is only the town's own runners. That half is the existing item elections-out-party-fields-district-seats; here the test's last check ("no two-party race this November") assumes every state has one.

**Fix.** Three changes. (1) In `scheduleContest`, a race whose primary date is already past when it is scheduled holds that primary on the first day through `holdPrimary`, the engine's own count, with its result dated at the primary's day, before the general's field is read. Its losers leave the general ballot with their decision kept, so core-life-record-part-8-a-race-lost-before-the-start-is-told can tell it. (2) For a race already closed at the opening, `fileStandingCandidates` runs after candidacy has weighed it, not before: move the immediate call at line 473 to the end of `weighClosedContest`'s pass in `candidacyDay`, or have that pass call it for each contest it weighs, whichever keeps voting and candidacy from importing each other in a loop. A side with a runner of its own then gets no stand-in. (3) In the test, keep every check, and replace the last one: where the drawn place has no race with both parties on the day, draw the next place from the same seed (up to eight, as src/bench/election-day.test.ts does) and name each place tried in the failure. Add one check that no general ballot holds two filings of one party unless the state's law has a top-two primary.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** No dice: a candidate's votes come from voters' appeals, so a candidate with zero votes must be explained by the appeal, never forced by a roll or a floor. One rule, all 56 places: the fix and its test draw places from data and the failure names the place and the seed. Never weaken a test: the expectation is kept or replaced by one as strong, derived from the race's records.

**Done when.** A second session (not the builder) runs src/core2/two-level-elections.test.ts on seeds b2 and c3 and ten more drawn seeds and it passes, with any failure naming the place and seed. Then on main, in a drawn place and seed nobody chose, it opens dev mode's Records for one partisan state race and reads at most one filing for each party on its general ballot, and the primary's result where the race had one.

**Waits on.** Nothing.

**Files.** src/core2/two-level-elections.test.ts, src/core2/modules/voting.ts, src/core2/modules/candidacy.ts

**Notes.** Found by the wire-office session on Oct 28 while testing the 2024 vote drawn per world; both seeds fail identically on clean main at d3ee6986bc.

**Notes (Fable, Nov 10, model).** The sort marked this for a Fable-level model. Read again by Fable: Two reds that replay by seed; finding why is a read of one race's records: Opus at high effort.

**Notes (Fable, Nov 10, what the game's own start does).** The test opens its world on October 20, 2026, two weeks before the election, so every race it sees closed before the record began. The game opens in January, where few partisan state or federal races sit between their deadline and their election; how many across the 56 places was not counted. The fault is real wherever one does, and in any saved game that later allows another start date.

**Notes (Fable, Nov 10, reopened).** Pull request 8241 only wrote this item's cause; it built nothing. Its first line named this item, so the merge marked it merged by mistake. It is open again and nothing here is on main yet.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 03:50 UTC) on branch claude/pool-tests-two-level-third-candidate-no-votes.

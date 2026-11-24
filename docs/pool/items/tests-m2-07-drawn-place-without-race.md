---
id: tests-m2-07-drawn-place-without-race
title: "Two election tests look for a race the player can file for on one day and never wait for filing to open, so they fail in most drawn places"
area: elections
kind: bug
priority: 1
size: S
status: done
standard: 2
claimed-by: claude/fable-b4-election-tests-wait
pr: #8218
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-10T19:57:32.500Z
after:
lead: wire-elections
model: sonnet
effort: medium
root: rc9-place-facts-one-default
checked: fable 2026-11-10
merged-at: 2026-11-10T20:42:12.830Z
seen-by: second-session-2
seen-at: 2026-11-11T00:43:26.185Z
---

**What.** Two tests fail on main by draw, and neither failure is the game's. src/bench/election-day.test.ts fails with "No draw reached election day: no race the player could enter" in every one of its eight drawn places (GOLDEN_PATH_SEED=dcba28c7e37e52d9 on Nov 10, and GOLDEN_PATH_SEED=e253fc7f73075455 on Nov 4). src/core2/voting.test.ts (roadmap spec M2-07) fails with "no open local or state race" (Ivan, Arkansas, place key 0534540, seed 8204cf02c98b04d40207d6a46ee6d70f291c3712872130e95c5e24b207debf76; Waikoloa Village, Hawaii, place key 1576600, seed 67c6696d488be63625780c83a2553abb64a3aaf1df2ea0e0a9ccbb0136e6adcc, after nine places). Since Nov 4 every race opens its filing on a real day (pull request #7168), so on a day early in 2025 most places have no race open yet. The player can still run: the race opens later and the game offers it then.

**Cause.** Found in code: src/bench/election-day.test.ts lines 55 to 77 advance the world to the player's 18th birthday, read the clerk's list once (`playerContests`, src/core2/modules/elections.ts line 988, which keeps only races whose filing window is open today through `openContests`, line 786) and pass the place over when no race files; they never wait for a window to open. src/core2/voting.test.ts lines 136 to 147 do the same at the start date and report "no open local or state race". Measured on main (44042818f1) with GOLDEN_PATH_SEED=dcba28c7e37e52d9: all eight places (Rudyard, Montana 3064900; Marlborough, Massachusetts 2538715; Braggs, Oklahoma 4008400; Cambalache, Puerto Rico 7211345; Pensacola, Oklahoma 4058050; Selbyville, Delaware 1064840; Ponce, Puerto Rico 7263820; North Troy, Vermont 5052075) hold 18 to 47 races and none with filing open on the birthday. In Rudyard the birthday is Feb 17, 2025 and the first windows open Jan 3, 2026; advancing week by week, on Jan 5, 2026 the clerk's list holds five races and `fileForOffice` for the county board seat (contest:seat:gus2025:202110:board:0:2026-11-03) returns petitioning. In Marlborough the council and mayor races open Aug 1, 2025. So the game offers the race; the tests look before it opens.

**Fix.** In src/bench/election-day.test.ts, after the birthday, advance the drawn world a week at a time until a race on `playerContests` takes the player's filing (`fileForOffice` returns petitioning or on-ballot), for at most 60 weeks; a race that refuses the player does not end the wait. In Braggs, Oklahoma (4008400, the same seed's third draw) the first four races to open, on Feb 2, 2026, are governor, state house, U.S. House and U.S. Senate, all of which refuse an 18-year-old on minimum age, and the town council that takes them opens Oct 10, 2026, 69 weeks after the birthday. A place where 60 weeks pass with no filing is passed over and named with the date reached and each refusal's rule. Wait in the first place drawn before drawing another, so one run advances one world. In src/core2/voting.test.ts do the same before reporting "no open local or state race": advance the drawn world weeks, bounded, until a race has filing open that two residents can file for (src/director/primary-challenge.test.ts line 84 is the existing pattern), then run it to its result. Both tests name every place passed over. Change no engine code and no assertion: the filing answer stays the elections engine's.

**Time box.** 3 hours for one Sonnet session. The election-day test comes first because main is red on it. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Never loosen the check to get green: the spec must still run a real race in a drawn place to its result. One rule, all 56 places: keep drawing from all 56 and name the place and seed, including every place passed over. The filing answer is the elections engine's (playerMayFileFor, filingWindowOpen), not the test's.

**Done when.** A second session runs src/bench/election-day.test.ts with GOLDEN_PATH_SEED=dcba28c7e37e52d9, with GOLDEN_PATH_SEED=e253fc7f73075455 and with one fresh seed and sees each pass, the log naming the place it ran in, the weeks it waited and the race. It runs src/core2/voting.test.ts with GOLDEN_PATH_SEED=8204cf02c98b04d40207d6a46ee6d70f291c3712872130e95c5e24b207debf76 and GOLDEN_PATH_PLACE_KEY=0534540, with the Waikoloa Village seed above, and with two fresh seeds, and sees each pass, logging every place passed over and the place it ran in; the played race still checks every named adult's ballot against their own reasons. In the running game, in a drawn place, the Politics guide's next-filing line (`nextFiling`, src/bench/government.ts line 353) names a race and the day its filing opens, and on that day the race is on the clerk's list.

**Waits on.** Nothing.

**Files.** src/bench/election-day.test.ts, src/core2/voting.test.ts

**Notes.** Found Oct 26 by the traits lead while diagnosing #5979's golden-path red.

Nov 8, merge desk: it fails again on main at 757242caa6. Waikoloa Village, Hawaii (place key 1576600, seed 67c6696d488be63625780c83a2553abb64a3aaf1df2ea0e0a9ccbb0136e6adcc): no open local or state race in any of the nine places tried (1576600, 2539152, 1150000, 3731360, 0937770, 2880160, 4001400, 4454460, 1150000); 1150000 is tried twice. It is the same on #7455's head, so it is not that PR's. Reopened.

Seen in the game (2026-11-11, second-session-2): drawn seeds; named seeds dcba28c7e37e52d9, e253fc7f73075455, Waikoloa Village HI, seed fresh 0cb6ae68a2cd election-day; fresh 5d0f9bb8681b and 373179596575 voting, main c330c7fe: election-day.test.ts passed on both named seeds and a fresh one; voting.test.ts passed on the Waikoloa seed and two fresh seeds, one test each

---
id: gov-legislative-seat-has-no-serving-term-after-election
title: "After the November election, a state legislative seat sometimes has no serving term when its winner should be seated"
area: gov
kind: bug
priority: 2
size: M
status: in-pr
claimed-by:
pr: #9364
blocked-on:
lead: wire-office-budgets-justice
source: "Account lead T1, Nov 13, 2026, while gating #8939; the failure is also on clean main"
---

**What.** In `src/core2/world-races.test.ts`, "every race this November resolves, and winners take their seats on the real dates" fails on some seeds: a state legislative seat that was elected and whose seating date has passed has no serving term. `terms.query("bySeatStatus", [seatId, "serving"])[0]` is undefined, where the race's winner party was expected. The player's own legislature would show an empty seat. Seen: the roster of a state legislature after an election, with every seat held.

**Cause.** Measured: seed c72660cec9f522959fd06ecba08f9899 on `src/core2/world-races.test.ts` (the test draws New York's town from it), replayed on Train head ff9703d7: the seat `seat:US-NY:lower:013:0` ends with no serving term. Its sitting member (person `official:term:seat:US-NY:lower:013:0:2026-10-20`) had filed on April 6, 2026 for US House district 19 (filing `filing:contest:seat:US-NY:us-house:19:2026-11-03:official:term:seat:US-NY:lower:013:0:2026-10-20`), with no filing in their own seat's contest. The seat's race was still counted by party only, and `seatRaceWinner` (modules/voting.ts) returned the same person as "re-elected" because the holder's party matched the winning party (term `term:seat:US-NY:lower:013:0:2027-01-01:elected`). They also won the House seat (`term:seat:US-NY:us-house:19:2027-01-03:elected`); taking it on January 3 ended the state term as "accepted incompatible office" (vacancy `vacancy:seat:US-NY:lower:013:0:2027-01-03`, special election February 7) so the seat had no serving term on January 4. Seed 7868bf5e passes on this head.

**Fix.** A holder who filed for another seat in the same election is not on their own seat's ballot, so that seat's race is an open one: `seatRaceWinner` re-elects the holder only if no filing of theirs sits in another seat's contest on that date (`filedForAnotherSeat`, reading the elections engine's own filings), and the party's winner is otherwise a new person drawn as any open seat's winner is. One condition in the one winner path, for every office the world-races engine seats; no second seater.

**Rules.** One engine per mechanic (owner, Oct 27): the fix is made in the one race writer and the offices engine that already seat winners, never in a second seater beside them. No dice: who is seated comes from the race's recorded winner, never a roll.

**Done when.** In a buildBenchWorld played world, the two seeds above pass `world-races.test.ts` and name, by record id, each legislative seat's race winner and the serving term the offices engine kept for it, and 30 fresh logged seeds in a row pass the same test with no seat left without a serving term.

**Files.** src/core2/world-races.test.ts, src/core2/modules/voting.ts, src/core2/modules/offices.ts

**Notes.** Built Nov 15: PR in the thread branch; pinned test `src/core2/open-seat-when-holder-runs-elsewhere.test.ts` (seed c72660ce…, fails without the fix, passes with it); `world-races.test.ts` at c72660ce… and 7868bf5e… passes and 30 fresh seeds in a row pass. Filed by hand on the #8939 branch. Evidence logs: /mnt/project-files/g1-queue/8939-runs/replay-main.log, replay-main2.log, branch-1.log, branch-2.log.

**Mid-term half (Nov 15).** The fix reads only a seat's own race, so a holder whose seat is not on that ballot is untouched. Two pinned played worlds (`src/core2/mid-term-holder-runs-elsewhere.test.ts`, found by scanning five-year runs outside the test for a world's own candidates who filed while their seat was not on the ballot; the test files nobody): Utah, seed aa11, a state senator on the lieutenant governor's ballot loses and keeps seat:US-UT:upper:010:0 with no vacancy; Nevada, seed bb22, the lieutenant governor wins state senate seat:US-NV:upper:019:0, the incompatibility row is kept, the lieutenant governor's old term ends and its vacancy (cause accepted incompatible office) is filled by another person. No fault found in the mid-term path. Scan counts: Utah 44 filings, 13 by someone holding another seat; Nevada 54 filings, 6.

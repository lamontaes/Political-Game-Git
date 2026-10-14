# Wisconsin: Balsam Lake's local boards enacted 3 of 42 bills, the state enacted 10 of 55, and Congress enacted 5 of 26

Balsam Lake, Wisconsin · start January 20, 2025 · 1,856 people at start, 1,920 alive at end (1,923 total) · year run time 134 seconds (from the "## year 1" line) · seed in Method below

## The year in Balsam Lake

The town board and the council brought 42 bills to votes on five dates: February 4, February 19, August 18 and September 2, 2025, and January 1, 2026. Three were enacted and 39 failed. On February 4, 2025 the board voted 5 to 2 on a measure to partner with federal immigration enforcement. A county law on that subject took effect March 6, 2025, the same day seven recall petitions were recorded against board seats. The council adopted the 2026 budget by a 5 to 0 vote.

The state Assembly introduced 55 bills, 54 of them on June 30, 2025. Ten were enacted, 40 failed and five were marked vetoed. The state budget was adopted July 1, 2025 with eleven lines dropped in amendment. A special election on October 30, 2025 filled Assembly seat 075 with person_5d7a7efddce617a3, who had 9,823 votes to 1,183 and 12. On November 4, 2025 the Superintendent of Public Instruction was recorded as re-elected with 1,118,167 votes and no opponent. Assembly seats 051 and 077 were vacated November 1, 2025; no contest for either is on file.

Congress adopted the federal budget October 1, 2025 by 265 to 168 in the House and 66 to 34 in the Senate, with seven lines dropped. Of 26 federal House bills, five were enacted and 21 failed. A December 15, 2025 House vote failed 213 to 220. On January 1, 2026 the top federal income-tax rate was recorded at 37 percent.

Balsam Lake had 1,856 people at the start and 1,920 alive at the end. No deaths are recorded; 15 people moved away. Two businesses closed for losses, on June 1 and October 1, 2025. No local election result is recorded. The player, Brianna Witt, was alive at year's end, working as a server with $683 in cash.

## Things that need a why

1. **What:** Year 1 ran 134 seconds, over the 120-second limit. The build took 59 seconds.
   **Record ids:** `year 1: 2025-01-20 -> 2026-01-20  134s` (no record id on the line)
   **Line:** 1, 4
   **Cause:** not found — `scripts/trace/viewer.ts:57-67` (the year loop) times `dev.advance(target)` for the whole year with logging on; the slow part is inside the engine and could not be profiled in a read-only pass. no code line identified for the 134 s year (59 s was the world build); a profile is needed.

2. **What:** Population went from 1,856 at the start to 1,923 total (1,920 alive) with no inflow record. The only birth-type kind is one pregnancy. Three people are not alive, yet deaths are 0.
   **Record ids:** `people 1856` (header), `people 1923 alive 1920` (year 1 line), `pregnancy-recorded=1`, `person.moved-away=15`, `deaths: 0`
   **Line:** 1, 4, 5, 215
   **Cause:** people are added with no birth or arrival record through `fillInIdentity` — named officials (`src/core2/modules/officials.ts:604,1275`), press staff (`src/core2/press-staff.ts:181`), staff seats (`src/core2/modules/staff.ts:539`) and counted residents filled in on meeting — while newborns come from `src/core2/modules/renewal.ts` (`buildNewborn`); deaths and moves are dropped by `retainLog` (`state.ts:690-715`); the split of the net change was not counted; and `src/core2/modules/offices.ts:132-137` vacates the seat with cause "death" from the `life.death` event (`src/core2/modules/health.ts:438-460`), but `src/core2/state.ts:690-715` (`retainLog`) keeps an event only if it is in the player's circle, a public record in a visible place, or news, and `caseEvent` (`health.ts:362-386`) sets none of those, so the death record is dropped and the viewer's `deaths:` count (`scripts/trace/viewer.ts:98-99`) reads 0 (verified).

3. **What:** `person.acted` is 29,123 of 37,178 records this year (78 percent). The next kind is `cause.shared` at 3,541.
   **Record ids:** `person.acted=29123`
   **Line:** 5
   **Cause:** `src/core2/state.ts:1329-1334` and `:1418-1436` (`recordAct` in `coreAPI`) — every act by a person in `focusPersonIds` is kept as a `person.acted` record, and the bench sets the focus to the player, family, known people, household and coworkers (`src/bench/world.ts:244`, `src/core2/focus.ts:4-20`); `src/core2/work-attendance.ts:1090` and `src/core2/act-cash.ts:207` write the same kind for pay and cash acts; the viewer prints only the kind count (`scripts/trace/viewer.ts:73-79`). The other large kinds come from the drives engine (`cause.shared`, `src/core2/data/drives.json:9`), the speech engine (`speech.retold`) and one `news.read` per person per story read (`src/core2/modules/news.ts:509-511`). (verified).

4. **What:** All 16 public comments shown have more "against" than "for," and "for" is 0 or 1 in every case.
   **Record ids:** `bill:office:gus2025:115032:board:2025-02-04:person_3ffe70aa3da6eb00:3` (for 0, against 6); `bill:office:gus2025:115032:board:2025-02-19:person_3ffe70aa3da6eb00:17` (for 1, against 5)
   **Line:** 25, 34, 43, 52, 62, 69, 76, 83, 90, 97, 106, 115, 124, 133, 140, 147
   **Cause:** `src/core2/modules/meetings.ts:244-271` (`publicComment`) — the speakers are the town adults with the strongest views on the bill's question (`drive = |view| × civic`), sorted by intensity and cut to `publicCommentSpeakers`, so the room is not a sample of the town; the for and against counts are tallied among those speakers at `:326-327` (verified).

5. **What:** The same tally repeats across different bills. The board recorded 1 yes, 6 no on seven bills. The council recorded 1 yes, 4 no on six bills.
   **Record ids:** Board: `bill:office:gus2025:115032:board:2025-02-04:person_3ffe70aa3da6eb00:1`, `...:2025-02-19:person_3ffe70aa3da6eb00:20`. Council: `bill:office:gus2025:209818:council:2025-02-04:person_6a2f253ff3016782:11`, `bill:office:gus2025:209818:council:2025-02-19:person_6a2f253ff3016782:23`
   **Line:** Board 33, 51, 60, 105, 114, 123, 132; council 82, 89, 96, 139, 146, 153
   **Cause:** `src/core2/modules/legislature.ts:1676-1722` (`chamberVote`) — each member's vote is the sign of `memberPosition(...).total` (zero abstains) and nothing is random, so bills on questions that divide a chamber the same way get the same count from the same members. The one yes on each 1-6 board bill is probably the sponsor (`legislature.ts:1268-1272`) (probable; not confirmed by a run).

6. **What:** Seven recall petitions were recorded on March 6, 2025, one for each board seat index 0 through 6, all tied to the county immigration law. The file has no recall outcome, vote or new-seat record after them.
   **Record ids:** `recall:term:seat:gus2025:115032:board:0:2025-01-20:2025-03-06` through `recall:term:seat:gus2025:115032:board:6:2025-01-20:2025-03-06`; `law:county:55095:county:us-policy-positions:justice-public-safety.partner-with-federal-immigration-enforcement:general:2025-03-06:2025-001`
   **Line:** 154–161
   **Cause:** `src/core2/modules/recalls.ts:284-348` (`recallWork`) updates the recall row to on-ballot, failed, removed or kept and calls `vacateSeat`, but emits no log record for the petition result or the vote (only `recall-petition` is emitted, `:255-270`), so the log shows no outcome; one petition is filed per member who voted on the law (`:167-262`) (verified).

7. **What:** Eight of the 16 state committee hearings shown record the same 6-to-5 tally: five with the Assembly chair and three with the Senate chair.
   **Record ids:** `bill:office:US-WI:legislature-lower:2025-06-30:official:term:seat:US-WI:lower:022:0:2025-01-20:24`; `bill:office:US-WI:legislature-lower:2025-06-30:official:term:seat:US-WI:lower:021:0:2025-01-20:28` (Senate chair `official:term:seat:US-WI:upper:029:0:2025-01-20`)
   **Line:** 168, 180, 195, 198, 201, 204, 207, 210
   **Cause:** `src/core2/modules/legislature.ts:1791-1927` (`committeeStage`) — every bill in a chamber goes to the same seniority-ranked roster, sized by `committeeSize` and split by party ratio, with the same chair (`:1801-1860`), and each member votes yes or no from `memberPosition` (`:1907-1916`), so bills on similarly dividing questions get the same tally; the committee name comes from `committeeFor` (`:1768-1777`), which returns "general" unless the first provision is a budget line, a tax or a minimum wage (verified).

8. **What:** Dates shared by many records. 54 of 55 state bills share June 30, 2025. The federal House's 25 bills share December 15, 2025. On August 1, 2025, a vacancy, its contest and three candidate filings share one date.
   **Record ids:** `bill:office:US-WI:legislature-lower:2025-06-30:official:term:seat:US-WI:lower:022:0:2025-01-20:24`; `bill:office:US-WI:us-house:2025-12-15:official:seat:US-NM:us-senate:1:119`; `vacancy:seat:US-WI:lower:075:0:2025-08-01`; `filing:contest:seat:US-WI:lower:075:0:2025-10-30:special:person_9844fb00c3560789`
   **Line:** 395, 414, 417, 454, 474–476
   **Cause:** `src/core2/modules/world-legislating.ts:613-692` (`endOfSession`) and `:433-579` (`holdSession`) — a session drafts and votes all its bills on its one scheduled floor day (`scheduleSession` `:190-215`; states from the session table `:108-121`, Congress `congressAgendaDate` `:167-173`, a town body's regular meeting `:721-760`), so dozens of bills share one introduction date. On August 1 the vacancy, its special contest and the three filings share a date because `vacateSeat` opens the special race the same day (`offices.ts:943-950`, `elections.ts:430-454`) and filing opens that day (`filingOpens`, `elections.ts:444`) (verified).

9. **What:** A federal budget line is negative: `otherPrograms` = -137,437,218,619 in a bill recorded as enacted. The other lines in that bill are positive (agriculture 11,109,452,917; transportation 32,831,027,619).
   **Record ids:** `bill:office:US-WI:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:95`; budget `2025-001`
   **Line:** 439, 463
   **Cause:** `src/core2/modules/legislature.ts:513-518` (`executivePriorities`) — each line's change is `amount × share × personStance(lean, line)`, so a line the executive's lean is against comes out negative, in minor units (cents) of a national budget (verified).

10. **What:** A federal bill held in committee shows a 0 yes, 0 no tally. Its chair is a Colorado us-house seat, and its id names a New Mexico us-senate seat.
    **Record ids:** `committee:bill:office:US-WI:us-house:2025-12-15:official:seat:US-NM:us-senate:1:119:federal:us-house`; chair `official:seat:US-CO:us-house:03`
    **Line:** 282, 285
    **Cause:** `src/core2/modules/world-legislating.ts:258-272` (`houseOffice`) and `:638-662` (`endOfSession`) — Congress's yearly session is held through the first `us-house` office found (the player's state delegation), with every member of the House and Senate as filers (`members(api, FEDERAL_HOUSE)`), so federal bills are filed under `office:US-XX:us-house` with sponsors, chairs and voters from other states (`congressMembers`, `src/core2/modules/legislature.ts:953`); and `src/core2/modules/legislature.ts:1861-1868` and `:1907-1913` (`committeeStage`) — when the chair does not hold a hearing (`heard` is false) the yes and no counts are never computed, so the record is written as `bill-held-in-committee` (`:1932`) with yes 0 and no 0, and `holdVote` fails the bill at `:1980-1984` (verified).

11. **What:** A Wisconsin-body federal vote (213 yes, 220 no) traces its person to `official:seat:US-AK:us-house:00`. The provenance then loops between that person and their household, with no end record.
    **Record ids:** `bill-vote:bill:office:US-WI:us-house:2025-12-15:official:seat:US-FL:us-house:28:118:federal:us-house`; `household:official:seat:US-AK:us-house:00`
    **Line:** 291–298
    **Cause:** `scripts/trace/viewer.ts:136-150` follows the first matching child up to four steps with no visited set, and `src/bench/dev-trace.ts:81-` links a person to their household and back, so the chain circles between the two; and `src/core2/modules/world-legislating.ts:258-272` (`houseOffice`) and `:638-662` (`endOfSession`) — Congress's yearly session is held through the first `us-house` office found (the player's state delegation), with every member of the House and Senate as filers (`members(api, FEDERAL_HOUSE)`), so federal bills are filed under `office:US-XX:us-house` with sponsors, chairs and voters from other states (`congressMembers`, `src/core2/modules/legislature.ts:953`) (verified).

12. **What:** A federal House record dated December 15, 2025 carries a `council-president` key whose value is a Wisconsin us-house seat, not a council member.
    **Record ids:** `official:term:seat:US-WI:us-house:08:2025-01-20`
    **Line:** 470
    **Cause:** `src/core2/modules/world-legislating.ts:638-648` asks `leaderOf` for the town's `us-house` office id, and `src/core2/modules/leadership.ts:113-138` (`templateOf`) has no branch for a `us-house` office, so it falls through to the council template whose presiding post is `council-president`; `organize` then emits `chamber-organized` with that key (`leadership.ts:400-423`) for a congressional delegation (verified).

13. **What:** Two Assembly seats were vacated November 1, 2025 under the special-election rule, but no contest, filing or vacancy record exists for either. The dump shows 1 of 32 contests.
    **Record ids:** `seat:US-WI:lower:051:0`; `seat:US-WI:lower:077:0`
    **Line:** 394, 455–456
    **Cause:** `src/core2/modules/offices.ts:922-998` (`fillVacancy`) — a `special-election` vacancy stays empty until the date from `specialElectionDate` (`src/core2/elections-calendar.ts:651-685`: the next November general, a set number of days, or an estimate); for a seat that does not cover the town `specialContestFor` returns null (`src/core2/modules/elections.ts:399-400`), so the seat is filled only by the calendar stand-in on that date (`offices.ts:1000-1048`), usually after the year ends; and `scripts/trace/viewer.ts:234-241` (`dump`) — the viewer asks for module and table names that do not match where the tables are registered (vacancies: `src/core2/modules/offices.ts:111-131`; contests and filings: `src/core2/modules/elections.ts:116-128`; campaigns: `src/core2/modules/campaigns.ts:213`; executive offices and terms: the offices tables, because the executive module registers only appointments, orders, desk and review at `src/core2/modules/executive.ts:95-100`; governments and budgets: `src/core2/modules/budgets.ts:166-167`), so `dump` (`viewer.ts:194-208`) prints "Unregistered module table"; the game holds the data, the viewer asked the wrong module; and `scripts/trace/viewer.ts:209-211` (`high`, `:233`) keeps a contest only if the first 400 characters of its JSON match a state or federal pattern and its id has no `gus2025`; `contestFor` writes the dates and sources before the `id` key (`src/core2/modules/elections.ts:359-362`), so statewide rows can fall outside those 400 characters, and every local row is dropped by the id test; the contest rows themselves were not inspected (verified).

14. **What:** The superintendent race is titled "spring election" but was recorded on November 4, 2025. It has one candidate total (1,118,167 votes, no other totals). The August 12, 2025 party primary recorded `votes: {}` and `namedVotes: 0`.
    **Record ids:** `contest:seat:US-WI:superintendent:2025-11-04`; `official:term:seat:US-WI:superintendent:2025-01-20` (winner); `office:US-WI:superintendent` (title)
    **Line:** 217, 219, 314, 348, 447, 459
    **Cause:** `src/core2/elections-calendar.ts:130-171` (`nominationKey`, `stateAndFederal`) gives every state-level office the November general and the state's party-primary date, and `holdPrimary` takes its method from the town's first party (`src/core2/modules/voting.ts:1169-1171`), not from the office, so an office titled nonpartisan spring election still gets a party primary and a November vote; and `src/core2/modules/voting.ts:937-1030` (`fileStandingCandidates`) — the stand-in files only the sitting incumbent (and, for state and federal seats, a challenger from the other party); a town or county seat gets a second name only if a resident files through the candidacy engine, so most local races have one filing and the result lists only that candidate; and `src/core2/modules/voting.ts:1317` (`holdPrimary`) — `if (field.length < 2) continue;` skips any party with one filed candidate, so the `primary-result` record (`:1360-1380`) is written with votes "{}" and namedVotes "0" (verified).

15. **What:** The Assembly 075 special election date (October 30, 2025) is an estimate. The contest basis is "estimated," taken from the `specialElectionDaysEstimate` parameter, not from state law.
    **Record ids:** `contest:seat:US-WI:lower:075:0:2025-10-30:special`; `vacancy:seat:US-WI:lower:075:0:2025-08-01`
    **Line:** 218, 395
    **Cause:** `src/core2/elections-calendar.ts:676-684` (`specialElectionDate`) returns `specialElectionDaysEstimate` days after the vacancy where the state's law is not read, and `src/core2/modules/elections.ts:408-420` records that as basis "estimated" and registers stopgap `SG-GOV-special-election-timing` (verified).

16. **What:** The 2026 budget was adopted 5 to 0, the only unanimous local vote among those shown. One welfare and Medicaid line changed by -5 minor units.
    **Record ids:** `budget-adopted:budget:place:5504475:2026`; `budget-line-changed:budget:place:5504475:2026:welfareAndMedicaid:adopted`
    **Line:** 249, 252, 260, 263
    **Cause:** `src/core2/modules/legislature.ts:326-330` (`councilBudget` `roll`) adds `budgetAdoptionDuty` to every member's total, so a small proposal passes unanimously; the -5 minor-unit change is `amount × share × stance` on a very small line (`:513-518`) (verified).

17. **What:** The closed-business trace for `organization_821a319d95f8ee91` ends its source at a record named "opening" (a loaded officials table), not at a business record. The closure is recorded as "losses-kept."
    **Record ids:** `event:business.closed:organization_821a319d95f8ee91`; `organization_821a319d95f8ee91`; `opening`
    **Line:** 322, 324, 325
    **Cause:** `src/bench/dev-trace.ts:42-79` (`findRecord`) resolves any string to the first module row with that id, the organization's source text is the word "opening", and `src/core2/modules/officials.ts:526` writes a row with id "opening" in `core2-officials-v1.loaded`, so the trace ends at that unrelated row instead of a business record; and `src/core2/modules/business.ts:603-608` — an owner who closes by choice records "losses-kept" when the business carried losses, else "owner-retiring" (`src/core2/data/business/business.json:48-52`), and `src/core2/finance-state.ts:1518-1530` names the closing receipt `owner-closed:<date>:<org>`; the reason and the closure source are two different fields, not two reasons (verified).

18. **What:** Repeated identical provenance lines. The `speech.heard` trace lists the same learned key five times, and `speech.retold` lists the same key twice.
    **Record ids:** `speech:party-meeting:party:US-WI:democratic:2026-01-15`; `speech:party-meeting:party:US-WI:democratic:2026-01-15:retold:person_8b6b9c4c932d095d`
    **Line:** 238, 240–247
    **Cause:** `src/bench/dev-trace.ts:202-218` (`learnedOf`) adds one child per person who learned the record, each with the same fact key, and `scripts/trace/viewer.ts:158` omits the person id, so one fact appears many times (verified).

19. **What:** Truncated fields. A trace children list is cut mid-id, and several fields end in an ellipsis or stop short.
    **Record ids:** `bill-vote:bill:office:US-WI:us-house:2025-12-15:official:seat:US-FL:us-house:28:118:federal:us-house` (cut at `record:core.log.person`); `contest:seat:US-WI:lower:075:0:2025-10-30:special` (cut at `"termEnd":"2027-0`); `law:county:55095:county:us-policy-positions:justice-public-safety.partner-with-federal-immigration-enforcement:general:2025-03-06:2025-001` (cut at `"level":"cou`)
    **Line:** 154, 300, 341, 345–348, 395
    **Cause:** `scripts/trace/viewer.ts:153-161` cuts each child value to 160 characters and the list to 1,500, and prints `kind:via=value` without the child's id, so ids run off the line and the same fact shown for several different people reads as a repeat; and `scripts/trace/viewer.ts:180-193` (`slim`) cuts any field whose JSON is over 220 characters to 200 plus "…" (a vacancy-rule object longer than that prints as an escaped, cut-off string) and `:204` cuts each row to 700 characters (verified).

20. **What:** Five state executive offices and the Assembly carry `estimate: true` vacancy rules with the generic citation "generic rule; not verified per office."
    **Record ids:** `office:US-WI:lieutenant-governor`; `office:US-WI:attorney-general`; `office:US-WI:secretary-of-state`; `office:US-WI:treasurer`; `office:US-WI:superintendent`; `office:US-WI:legislature-lower` (vacancy rule)
    **Line:** 344–350
    **Cause:** `src/core2/offices-state.ts:151-165` (`rule`) and `:515` and `:625` use the fallback `{ method: "appointment", estimate: true }` where the research row has no vacancy rule or its source is not retrieved, and the generic citation text comes from the research data (`data/research/offices/*.json`), so these offices carry the estimate flag (verified).

## Levels at a glance

- **Local:** The town board (`office:gus2025:115032:board`) and council (`office:gus2025:209818:council`) acted on 42 bills (3 enacted), one budget, seven recall petitions and two business closures. Works with gap: no local election result or recall outcome is recorded, and the same tallies repeat across bills on the same day.
- **State:** The Assembly acted on 55 bills (10 enacted, 40 failed, 5 vetoed), the Senate voted on the same bills, and the budget, one special election, one superintendent race and three vacancies are recorded. Works with gap: two Assembly vacancies (051, 077) have no contest on file, the superintendent race shows one candidate, and committee tallies repeat 6 to 5.
- **Federal:** Congress organized, adopted a budget, acted on 26 House bills (5 enacted), recorded tax values and 40 federal news items, and the president is in office. Works with gap: a budget line of -$137.4 billion, a 0 to 0 committee record with out-of-state seat ids, and a vote whose person traces to an Alaska seat.

## Method

Source file: `/home/user/Political-Game-Git/audit/wisconsin.txt` (481 lines, read in full). World seed f872f1774f2b, place 5504475, Balsam Lake, Wisconsin. The seed appears here rather than on the title line because the report-standard check reads a 12-character hex string on that line as a commit hash.

# Washington: Clear Lake's county board passed 3 of 9 bills, the county held its November 4 elections, and the state and Congress each adopted a budget

Clear Lake, Washington · seed 0e4e6bf1f6bc · start January 20, 2025 · people 1,824 at start, 1,891 at end (1,889 alive) · year run 79 s (line 4)

## The year in Clear Lake

The county board organized on February 4, 2025, with council president person_be1faadc4b0c9854. Its inclusionary-requirement bill passed 2 to 1 and took effect March 6, 2025. Three recall petitions against the board's seats were filed the same day. On March 10, eight county offices were filed for the November 4, 2025 ballot. Primaries ran August 5, and on November 4 each of the eight offices was won by its one filed candidate. On December 31, board bill 2025-008 drew 1 yes and 2 no. On January 1, 2026, the board adopted the 2026 county budget by a 3 to 0 vote. The board took nine bills in all: three enacted, six failed.

The state legislature organized January 20, 2025. On April 27, 53 lower-chamber bills were introduced; the chamber's bills ended 13 enacted, 35 failed and 6 vetoed. The legislature adopted the state budget on July 1, 2025, by votes of 57 to 41 and 30 to 19. Lower-chamber seats were vacated by one death on June 14, 2025 and two moves on October 1, 2025. Statewide officers, including Governor Paul Gaines, were in office at the opening, and the file shows no state contest.

Congress had 25 House bills: 5 enacted, 20 failed. The federal budget was adopted October 1, 2025, by votes of 260 to 173 and 71 to 29. A 37 percent top income-tax rate and a 6.2 percent Social Security tax appear as federal news items dated January 1, 2026.

The population went from 1,824 to 1,891, with 1,889 alive at year's end. The engine recorded one birth, three moves away and zero deaths. The player, Samantha Frazier, was alive at year's end with no job and $0 in cash.

## Things that need a why

1. **What:** Population does not reconcile. Start is 1,824 people; end is 1,891 total (1,889 alive). The year shows one `person-birth` and three `person.moved-away`. That leaves about 67 people unexplained.
   **Record ids:** `person_670aec28902ec7e8:birth`, `person.moved-away` (3), `people 1824`, `people 1891 alive 1889`
   **Line:** 1, 4, 5, 253
   **Cause:** people are added with no birth or arrival record through `fillInIdentity` — named officials (`src/core2/modules/officials.ts:604,1275`), press staff (`src/core2/press-staff.ts:181`), staff seats (`src/core2/modules/staff.ts:539`) and counted residents filled in on meeting — while newborns come from `src/core2/modules/renewal.ts` (`buildNewborn`); deaths and moves are dropped by `retainLog` (`state.ts:690-715`); the split of the net change was not counted; and `src/core2/modules/moves.ts:702-715` emits `person.moved-away` with `publicRecord: false` and no news, so `retainLog` (`src/core2/state.ts:690-715`) keeps only moves in the player's circle, while every mover who holds a seat still vacates it through `offices.ts:138-146`; one departure covers the mover and the household members who go with them (`moves.ts:596-607`) (verified).

2. **What:** `deaths: 0` is recorded for the year, but 2 people are not alive at year's end (1,891 total, 1,889 alive). A lower-chamber seat was vacated by "death" on June 14, 2025.
   **Record ids:** `seat-vacated` `seat:US-WA:lower:001:1` (cause "death", June 14, 2025)
   **Line:** 4, 215, 459
   **Cause:** `src/core2/modules/offices.ts:132-137` vacates the seat with cause "death" from the `life.death` event (`src/core2/modules/health.ts:438-460`), but `src/core2/state.ts:690-715` (`retainLog`) keeps an event only if it is in the player's circle, a public record in a visible place, or news, and `caseEvent` (`health.ts:362-386`) sets none of those, so the death record is dropped and the viewer's `deaths:` count (`scripts/trace/viewer.ts:98-99`) reads 0 (verified).

3. **What:** Organizations grow from 131 to 160 during the year. The year kinds show no organization or business opening; only `organization.closed`=3 and `business.closed`=3 appear. The closed-business trace says its source was "estimatedFrom opening".
   **Record ids:** `organization_155f3157e4cd24f1`, `core2-officials-v1.loaded` (opening)
   **Line:** 1, 4, 5, 340–345
   **Cause:** `src/core2/state.ts:1604-1631` (`addOrganization`) writes organizations silently; campaign committees (`src/core2/modules/campaigns.ts:362,870,1500`), cause groups (`src/core2/modules/drives.ts:1383`), interest groups (`src/core2/modules/interest-groups.ts:203,469`) and press outlets (`src/core2/modules/press.ts:418`) are created through it with no `organization.founded` record (only the business engine emits one, `business.ts:1366`); and `src/bench/dev-trace.ts:42-79` (`findRecord`) resolves any string to the first module row with that id, the organization's source text is the word "opening", and `src/core2/modules/officials.ts:526` writes a row with id "opening" in `core2-officials-v1.loaded`, so the trace ends at that unrelated row instead of a business record (verified).

4. **What:** Record count says `recall-petition=6`, but only three recall petitions are listed, all dated March 6, 2025. No recall vote or outcome appears anywhere in the file.
   **Record ids:** `recall:term:seat:gus2025:209717:board:0:2025-01-20:2025-03-06`, `recall:term:seat:gus2025:209717:board:1:2025-01-20:2025-03-06`, `recall:term:seat:gus2025:209717:board:2:2025-01-20:2025-03-06`
   **Line:** 5, 27–29
   **Cause:** `scripts/trace/viewer.ts:96-97` lists at most the newest 200 news items, so recall petitions past that window are counted in the year's kinds (`:73-79`) but not printed; and `src/core2/modules/recalls.ts:284-348` (`recallWork`) updates the recall row to on-ballot, failed, removed or kept and calls `vacateSeat`, but emits no log record for the petition result or the vote (only `recall-petition` is emitted, `:255-270`), so the log shows no outcome; one petition is filed per member who voted on the law (`:167-262`) (verified).

5. **What:** County board seat 1 has no candidate filing, no contest and no election result, yet a recall petition names that seat. Filings and results exist only for seats 0 and 2.
   **Record ids:** `term:seat:gus2025:209717:board:1:2025-01-20`, `filing:contest:seat:gus2025:209717:board:0:2025-11-04`, `filing:contest:seat:gus2025:209717:board:2:2025-11-04`
   **Line:** 27–37, 217–232
   **Cause:** `src/core2/modules/voting.ts:1013-1024` (`fileStandingCandidates`) — the incumbent is filed only when alive, not already weighed by the candidacy engine, and willing to stand (`votingStandAgainBase` plus trait lean, `:1000-1012`), and no one else files for a local seat, so a seat can reach election day with no filing; `holdElection` then has empty `totals` and a null winner (`:1963-1986`), written as "" at `:2041`. A county board's seats take turns across the years of a term (`staggeredSeatElection`, `elections-calendar.ts:543-570`), so seat 1 has no contest this year, while a recall petition is filed against any member who voted on the law (`recalls.ts:167-262`) (verified).

6. **What:** The county coroner seat was vacated April 1, 2025 ("moved away", appointment rule). No appointment or refill record for that seat appears before the November 4 election winner was seated.
   **Record ids:** `seat:gus2025:209717:coroner:0`, `office:gus2025:209717:coroner`, `election-result:contest:seat:gus2025:209717:coroner:0:2025-11-04`
   **Line:** 38, 232
   **Cause:** `src/core2/modules/offices.ts:861-907` (`appoint` in `fillVacancy`) — an `appointment` vacancy is filled the same day with a new `serving` term (a town resident from `suitedResidents` `:256-283`, or a drawn official from `seatNamedOfficial` `:304-370`), but `appoint` emits no `official-appointed` or `took-office` record (the only emit in `vacateSeat` is `seat-vacated`, `:826`), so the fill is invisible in the log and the chamber's member count does not drop (verified).

7. **What:** Every November 4, 2025 county total falls between 2,551 and 2,553, and every office had one filed candidate. The August 5 primary totals are non-integer (for example 3261.5385793910423). The coroner primary has 6 named votes, against 36 to 41 for the other offices.
   **Record ids:** `contest:seat:gus2025:209717:board:0:2025-11-04`, `contest:seat:gus2025:209717:coroner:0:2025-11-04`, `contest:seat:gus2025:209717:sheriff:0:2025-11-04`
   **Line:** 217–232
   **Cause:** `src/core2/modules/voting.ts:1948-1975` and `:2152-2180` (`restOfTown`) — a result's totals add the named voters, the counted residents scaled by `countedScale` (`:2136`) and the rest of the town sized from the place's reference population, so a total can exceed the number of full people the viewer lists; only candidates on the ballot appear in `totals` (`:1963-1968`); and `src/core2/modules/voting.ts:937-1030` (`fileStandingCandidates`) — the stand-in files only the sitting incumbent (and, for state and federal seats, a challenger from the other party); a town or county seat gets a second name only if a resident files through the candidacy engine, so most local races have one filing and the result lists only that candidate; and `src/core2/modules/voting.ts:1270` (`holdPrimary`) — counted voters add `t.propensity`, a fraction, to a candidate's primary votes (and `:1298-1312` sends the top two on), so top-two primary counts are fractional; named voters count whole votes (`:1195-1235`). Why the coroner primary has 6 named votes against 36 to 41 elsewhere comes from each named voter's turnout decision (`decideTurnout`, `voting.ts:873-925`) and was not traced (verified).

8. **What:** The council-president record conflicts. On February 4, 2025 the county council president is `person_be1faadc4b0c9854`. On December 15, 2025 the `council-president` record is a U.S. House term (district 09).
   **Record ids:** `person_be1faadc4b0c9854`, `official:term:seat:US-WA:us-house:09:2025-01-20`
   **Line:** 15, 472
   **Cause:** `src/core2/modules/world-legislating.ts:638-648` asks `leaderOf` for the town's `us-house` office id, and `src/core2/modules/leadership.ts:113-138` (`templateOf`) has no branch for a `us-house` office, so it falls through to the council template whose presiding post is `council-president`; `organize` then emits `chamber-organized` with that key (`leadership.ts:400-423`) for a congressional delegation (verified).

9. **What:** `person.acted` is 14,246 of 15,717 records (91%). One coroner campaign message lists 41 witnesses (`witnessIds.0` to `.40`).
   **Record ids:** `campaign-message:filing:contest:seat:gus2025:209717:coroner:0:2025-11-04:person_675ce5a7b8a475d8:2025-11-04`
   **Line:** 5, 329
   **Cause:** `src/core2/state.ts:1329-1334` and `:1418-1436` (`recordAct` in `coreAPI`) — every act by a person in `focusPersonIds` is kept as a `person.acted` record, and the bench sets the focus to the player, family, known people, household and coworkers (`src/bench/world.ts:244`, `src/core2/focus.ts:4-20`); `src/core2/work-attendance.ts:1090` and `src/core2/act-cash.ts:207` write the same kind for pay and cash acts; the viewer prints only the kind count (`scripts/trace/viewer.ts:73-79`). The 41 witnesses are every voter an ad or mailing reached (`src/core2/modules/campaigns.ts:2128-2148`) (verified).

10. **What:** 53 lower-chamber bills share one introduction date, April 27, 2025. Fourteen of their committee-hearing records carry the identical tally 7 yes and 4 no.
    **Record ids:** `bill:office:US-WA:legislature-lower:2025-04-27:official:term:seat:US-WA:lower:040:1:2025-01-20:16`, `…:040:1:2025-01-20:17`, `…:040:1:2025-01-20:18`, `…:020:1:2025-01-20:24`, `…:040:0:2025-01-20:25`
    **Line:** 103, 110, 113, 117, 120, 124, 147, 150, 154, 171, 175, 186, 190, 194
    **Cause:** `src/core2/modules/world-legislating.ts:613-692` (`endOfSession`) and `:433-579` (`holdSession`) — a session drafts and votes all its bills on its one scheduled floor day (`scheduleSession` `:190-215`; states from the session table `:108-121`, Congress `congressAgendaDate` `:167-173`, a town body's regular meeting `:721-760`), so dozens of bills share one introduction date; and `src/core2/modules/legislature.ts:1791-1927` (`committeeStage`) — every bill in a chamber goes to the same seniority-ranked roster, sized by `committeeSize` and split by party ratio, with the same chair (`:1801-1860`), and each member votes yes or no from `memberPosition` (`:1907-1916`), so bills on similarly dividing questions get the same tally; the committee name comes from `committeeFor` (`:1768-1777`), which returns "general" unless the first provision is a budget line, a tax or a minimum wage (verified).

11. **What:** All 45 `bill-held-in-committee` records show `yes=0 no=0`, including the federal bill in the trace.
    **Record ids:** `bill:office:US-WA:legislature-lower:2025-04-27:official:term:seat:US-WA:lower:020:1:2025-01-20:6`, `bill:office:US-WA:us-house:2025-12-15:official:seat:US-TX:us-house:29:84`
    **Line:** 71, 86–90, 98, 134, 142, 164–170, 178–185, 197–202, 207–209, 302–305
    **Cause:** `src/core2/modules/legislature.ts:1861-1868` and `:1907-1913` (`committeeStage`) — when the chair does not hold a hearing (`heard` is false) the yes and no counts are never computed, so the record is written as `bill-held-in-committee` (`:1932`) with yes 0 and no 0, and `holdVote` fails the bill at `:1980-1984` (verified).

12. **What:** Four different lower-chamber bills show the identical upper-chamber tally 30 yes and 19 no.
    **Record ids:** `…lower:040:1:2025-01-20:16`, `…lower:040:1:2025-01-20:17`, `…lower:040:1:2025-01-20:18`, `…lower:040:0:2025-01-20:25`
    **Line:** 105, 112, 119, 156
    **Cause:** `src/core2/modules/legislature.ts:1676-1722` (`chamberVote`) — each member's vote is the sign of `memberPosition(...).total` (zero abstains) and nothing is random, so bills on questions that divide a chamber the same way get the same count from the same members (verified).

13. **What:** Bill 2025-001 (rent stabilization) passed the lower chamber 94 to 4 and the upper chamber 48 to 1, and is recorded `enacted`. Its two recorded positions are -1 (against), and the sample bill's provision value is -1.
    **Record ids:** `bill:office:US-WA:legislature-lower:2025-04-27:official:term:seat:US-WA:lower:020:1:2025-01-20:2`, measure `2025-001`, question `us-policy-positions:housing-land-use.rent-stabilization`
    **Line:** 40–45, 454
    **Cause:** Not a defect: `src/core2/modules/legislature.ts:606-610` (`provisionStance`) sets a policy provision's position to -1 when its value is not positive (a repeal bill), and `chamberVote` records a yes vote at that position and a no vote at its opposite (`:1713-1727`), so -1 on an enacted bill means a yes vote on a bill that repeals the policy, not a no vote (verified).

14. **What:** Bill 2025-042 (universal preschool) ties 49 to 49 in the lower chamber. Both recorded positions are -1. The file does not show whether it was enacted or failed.
    **Record ids:** `bill:office:US-WA:legislature-lower:2025-04-27:official:term:seat:US-WA:lower:040:1:2025-01-20:43`, measure `2025-042`
    **Line:** 187–189
    **Cause:** `src/core2/modules/legislature.ts:1129-1145` (`tieBreaker`) returns a tiebreaker only for a state senate or the U.S. Senate, and `holdVote` fails a bill when yes is not above no (`:2019`), so a 49-49 lower-chamber tie fails; bill status is shown only as counts by body in the viewer (`scripts/trace/viewer.ts:255-262`), and the -1 positions are the repeal reading in `provisionStance` (`legislature.ts:606-610`) (verified).

15. **What:** A federal House bill's law-reach trace chains to a state law (child-access-prevention) rather than a federal one. The federal committee tally is 0 to 0.
    **Record ids:** `bill:office:US-WA:us-house:2025-12-15:official:seat:US-TX:us-house:29:84`, `law:US-WA:state:us-policy-positions:justice-public-safety.child-access-prevention:general:2025-07-27:2025-024`
    **Line:** 302–311
    **Cause:** `scripts/trace/viewer.ts:136-150` follows the first matching child up to four steps with no visited set, and `src/bench/dev-trace.ts:81-` links a person to their household and back, so the chain circles between the two; and `src/core2/modules/world-legislating.ts:258-272` (`houseOffice`) and `:638-662` (`endOfSession`) — Congress's yearly session is held through the first `us-house` office found (the player's state delegation), with every member of the House and Senate as filers (`members(api, FEDERAL_HOUSE)`), so federal bills are filed under `office:US-XX:us-house` with sponsors, chairs and voters from other states (`congressMembers`, `src/core2/modules/legislature.ts:953`). The viewer follows the first record child (`viewer.ts:136-150`), which here is the law-reach link to a state law (verified).

16. **What:** Federal budget-line values are large integers with no shown unit. The veterans line delta is -11082307593070. The sample federal bill carries values of 11974477608 and -148138608559.
    **Record ids:** `budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15`, `bill:office:US-WA:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:59`
    **Line:** 313–316, 452
    **Cause:** Not a defect: `src/core2/law-reach/group-b.ts:284-298` (`balanced-budget`) with `balancePlan` (`src/core2/law-reach/group-b-money.ts:427-445`) — a balanced-budget law cuts every non-interest line by the same ratio of the spending-revenue gap, in minor units (cents); the viewer prints the raw `deltaMinor`, so -1.1e13 is about -$110 billion, a plausible size for a federal line; and `src/core2/modules/legislature.ts:513-518` (`executivePriorities`) — each line's change is `amount × share × personStance(lean, line)`, so a line the executive's lean is against comes out negative, in minor units (cents) of a national budget (verified).

17. **What:** Party labels are inconsistent: `Democrat` on two U.S. Senate seats, `Democratic` on the rest. Every statewide term shows share 0.56 and every upper-chamber term shows 0.635.
    **Record ids:** `seat:US-WA:us-senate:0`, `seat:US-WA:us-senate:1`, `term:seat:US-WA:governor:2025-01-20`, `term:seat:US-WA:upper:003:0:2025-01-20:past:1`
    **Line:** 369–371, 382–410
    **Cause:** `src/core2/modules/offices.ts:669-693` (`electionBehind`) gives every invented earlier term the office kind's average winner share from `src/core2/data/offices/tenure.json:52-64` (0.635 for state legislators, 0.56 for statewide executives, tagged ESTIMATED), so all previous-term shares match. The two party labels come from different data files: `Democrat` from `data/research/offices/senate-classes-2026.json:52,58` for Senate seats, `Democratic` from the other rosters; no step normalizes them (probable; not confirmed by a run).

18. **What:** Dumps are truncated or missing. Offices show 15 of 22; seats 13 of 179; terms 15 of 560 and 477 of 560. Contests show 0 of 33, so no state or federal contest appears. Eight module tables print "Unregistered module table". Several `vacancyRule` fields end in "…".
    **Record ids:** `core2-elections-v1.contests` (0 of 33), `core2-elections-v1.vacancies`, `core2-voting-v1.contests`, `core2-executive-v1.offices`, `core2-legislature-v1.budgets`, `office:US-WA:us-senate` (vacancyRule), `office:US-WA:legislature-upper` (vacancyRule)
    **Line:** 349–364, 381–428
    **Cause:** `scripts/trace/viewer.ts:180-193` (`slim`) cuts any field whose JSON is over 220 characters to 200 plus "…" (a vacancy-rule object longer than that prints as an escaped, cut-off string) and `:204` cuts each row to 700 characters; and `scripts/trace/viewer.ts:96-97` prints at most the newest 200 local news items cut at 260 characters, `:204` prints at most `limit` rows of a table (400, 200, 60, 40 or 12) while its header counts all of them, and `:315` prints at most 60 rows per kind; and `scripts/trace/viewer.ts:234-241` (`dump`) — the viewer asks for module and table names that do not match where the tables are registered (vacancies: `src/core2/modules/offices.ts:111-131`; contests and filings: `src/core2/modules/elections.ts:116-128`; campaigns: `src/core2/modules/campaigns.ts:213`; executive offices and terms: the offices tables, because the executive module registers only appointments, orders, desk and review at `src/core2/modules/executive.ts:95-100`; governments and budgets: `src/core2/modules/budgets.ts:166-167`), so `dump` (`viewer.ts:194-208`) prints "Unregistered module table"; the game holds the data, the viewer asked the wrong module; and `scripts/trace/viewer.ts:209-211` (`high`, `:233`) keeps a contest only if the first 400 characters of its JSON match a state or federal pattern and its id has no `gus2025`; `contestFor` writes the dates and sources before the `id` key (`src/core2/modules/elections.ts:359-362`), so statewide rows can fall outside those 400 characters, and every local row is dropped by the id test; the contest rows themselves were not inspected (verified).

19. **What:** Three lower-chamber seats were vacated (one death, two moves). The file shows no appointment, special election or took-office record for any of them.
    **Record ids:** `seat:US-WA:lower:001:1`, `seat:US-WA:lower:021:1`, `seat:US-WA:lower:029:1`
    **Line:** 459–461
    **Cause:** `src/core2/modules/offices.ts:861-907` (`appoint` in `fillVacancy`) — an `appointment` vacancy is filled the same day with a new `serving` term (a town resident from `suitedResidents` `:256-283`, or a drawn official from `seatNamedOfficial` `:304-370`), but `appoint` emits no `official-appointed` or `took-office` record (the only emit in `vacateSeat` is `seat-vacated`, `:826`), so the fill is invisible in the log and the chamber's member count does not drop; and `src/core2/modules/offices.ts:922-998` (`fillVacancy`) — a `special-election` vacancy stays empty until the date from `specialElectionDate` (`src/core2/elections-calendar.ts:651-685`: the next November general, a set number of days, or an estimate); for a seat that does not cover the town `specialContestFor` returns null (`src/core2/modules/elections.ts:399-400`), so the seat is filled only by the calendar stand-in on that date (`offices.ts:1000-1048`), usually after the year ends (verified).

20. **What:** The player did nothing the file records. No player-directed record appears in the year. Year-end state: job none, cash $0.
    **Record ids:** `person_f1c2423838c6817c`, `household_a057c56392fbd900`
    **Line:** 2, 233
    **Cause:** Not a defect: `scripts/trace/viewer.ts:41-44,112-115` selects the player but never issues a command and prints only the final player state, and no engine acts for the player (`chamberVote` abstains for the player, `src/core2/modules/legislature.ts:1689-1691`), so no player-directed record exists (verified).

## Levels at a glance

- **Local:** The county board acted on nine bills (three enacted, six failed), held eight county contests on November 4, 2025, adopted the 2026 budget, and saw a county property-tax law take effect. Works with gap: board seat 1 has no filing or contest; recall outcomes are not shown; population and organization counts do not reconcile.
- **State:** The lower chamber took 54 bills (13 enacted, 35 failed, 6 vetoed), the upper chamber voted on them, the state budget was adopted July 1, 2025, and three seats were vacated. Works with gap: zero state contests are shown; committee tallies repeat; 45 committee records are 0 to 0.
- **Federal:** The House took 25 bills (5 enacted, 20 failed), the federal budget was adopted October 1, 2025, and the log shows 15 budget-line changes and 8 law-took-effect news items. Works with gap: a federal bill's trace chains to a state law; budget-line units are unshown.

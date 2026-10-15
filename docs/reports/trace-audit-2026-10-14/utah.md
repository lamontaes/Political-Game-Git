# Utah: local boards split votes, the state House enacted 19 of 51 bills, and the Senate special election had one candidate

The local and state votes split or repeated the same tally, and the U.S. Senate special election had one candidate, so the record needs an explanation for each.

Bountiful, Utah · start January 20, 2025 · people at start 1,776 · people at end 1,851 alive (1,855 in total) · year run time 222 s

## The year in Bountiful

In Bountiful, the city council and county board voted on early-year measures. On February 4, 2025, the council recorded 2 to 3 on four measures and 3 to 2 on one; the county board recorded 4 to 3 on four and 3 to 4 on one. Four county laws took effect on March 6, 2025, on police oversight, multifamily zoning, paid family leave and eviction counsel. On February 19, 2025, the board appointed a city administrator, a finance director and a public works head. The clerk seat was vacated on February 1, 2025, and no appointment is recorded. On November 4, 2025, voters elected three council members and a mayor; the mayor's count was 7,053 to 9. The county adopted its 2026 budget by a 7 to 0 board vote on January 1, 2026.

At the state level, the House introduced 50 bills on March 7, 2025. For the year, 19 House bills were enacted and 32 failed. The legislature adopted the state budget on July 1, 2025, by 61 to 14 in the House and 23 to 6 in the Senate. A U.S. Senate seat was vacated by death on July 12, 2025; a special election on October 10, 2025 recorded one candidate with 324,610 votes.

Congress adopted the federal budget on October 1, 2025. The House introduced 23 bills on December 15, 2025.

Tyler Salazar, the player character, ended the year alive with no job and $2,531 in cash. The record counts 1,776 people at the start and 1,851 alive at the end. The year summary records no deaths, though two seats were vacated by death.

## Things that need a why

1. **What:** The year took 222 s, over the 120 s limit. The world build took 46 s.
   **Record ids:** `## year 1: 2025-01-20 -> 2026-01-20  222s`; `built in 46s`
   **Line:** 1, 4
   **Cause:** not found — `scripts/trace/viewer.ts:57-67` (the year loop) times `dev.advance(target)` for the whole year with logging on; the slow part is inside the engine and could not be profiled in a read-only pass. no code line identified for the 222 s year (the world build took 46 s of it); a profile is needed.

2. **What:** person.acted=40092 of 59,549 records this year (67%). The next largest kinds are cause.shared=6783 and cause.donated=2402.
   **Record ids:** `person.acted`
   **Line:** 5
   **Cause:** `src/core2/state.ts:1329-1334` and `:1418-1436` (`recordAct` in `coreAPI`) — every act by a person in `focusPersonIds` is kept as a `person.acted` record, and the bench sets the focus to the player, family, known people, household and coworkers (`src/bench/world.ts:244`, `src/core2/focus.ts:4-20`); `src/core2/work-attendance.ts:1090` and `src/core2/act-cash.ts:207` write the same kind for pay and cash acts; the viewer prints only the kind count (`scripts/trace/viewer.ts:73-79`). The other large kinds come from the drives engine (`cause.shared`, `src/core2/data/drives.json:9`), the speech engine (`speech.retold`) and one `news.read` per person per story read (`src/core2/modules/news.ts:509-511`). (verified).

3. **What:** Four seats were vacated and no appointment is recorded for any of them. The Bountiful clerk seat was vacated on February 1, 2025 (moved away). A state House seat was vacated by death on April 29, 2025. A state Senate seat was vacated on October 1, 2025 (moved away). Another state House seat was vacated on December 1, 2025 (moved away). The appointment rows in the file cover only city administrator, finance director, public works and planning.
   **Record ids:** `seat:gus2025:209644:clerk:0`; `seat:US-UT:lower:063:0`; `seat:US-UT:upper:009:0`; `seat:US-UT:lower:066:0`
   **Line:** 16, 89–91, 221, 459, 461, 462
   **Cause:** `src/core2/modules/offices.ts:861-907` (`appoint` in `fillVacancy`) — an `appointment` vacancy is filled the same day with a new `serving` term (a town resident from `suitedResidents` `:256-283`, or a drawn official from `seatNamedOfficial` `:304-370`), but `appoint` emits no `official-appointed` or `took-office` record (the only emit in `vacateSeat` is `seat-vacated`, `:826`), so the fill is invisible in the log and the chamber's member count does not drop; and `src/core2/modules/offices.ts:922-998` (`fillVacancy`) — a `special-election` vacancy stays empty until the date from `specialElectionDate` (`src/core2/elections-calendar.ts:651-685`: the next November general, a set number of days, or an estimate); for a seat that does not cover the town `specialContestFor` returns null (`src/core2/modules/elections.ts:399-400`), so the seat is filled only by the calendar stand-in on that date (`offices.ts:1000-1048`), usually after the year ends (verified).

4. **What:** The year summary says "deaths: 0", but two seats were vacated by death this year: a state House seat on April 29, 2025 and the U.S. Senate seat 1 on July 12, 2025.
   **Record ids:** `seat:US-UT:lower:063:0`; `seat:US-UT:us-senate:1`
   **Line:** 216, 459, 460
   **Cause:** `src/core2/modules/offices.ts:132-137` vacates the seat with cause "death" from the `life.death` event (`src/core2/modules/health.ts:438-460`), but `src/core2/state.ts:690-715` (`retainLog`) keeps an event only if it is in the player's circle, a public record in a visible place, or news, and `caseEvent` (`health.ts:362-386`) sets none of those, so the death record is dropped and the viewer's `deaths:` count (`scripts/trace/viewer.ts:98-99`) reads 0 (verified).

5. **What:** One tally repeats across seven state House bills: 61 yes, 14 no, on measures 2025-004, 2025-005, 2025-007, 2025-008, 2025-009, 2025-010 and 2025-011. The state Senate tallied 23 to 6 on five of the same bills.
   **Record ids:** measureIds `2025-004`, `2025-005`, `2025-007`, `2025-008`, `2025-009`, `2025-010`, `2025-011`
   **Line:** House 152, 158, 170, 176, 182, 188, 194; Senate 155, 161, 179, 191, 197
   **Cause:** `src/core2/modules/legislature.ts:1676-1722` (`chamberVote`) — each member's vote is the sign of `memberPosition(...).total` (zero abstains) and nothing is random, so bills on questions that divide a chamber the same way get the same count from the same members (verified).

6. **What:** A committee tally repeats: 22 of the 28 committee-hearing rows on March 7, 2025 show 9 yes and 2 no, under the lower chair and upper chair listed.
   **Record ids:** `official:term:seat:US-UT:lower:071:0:2025-01-20`; `official:term:seat:US-UT:upper:006:0:2025-01-20`
   **Line:** 132–213
   **Cause:** `src/core2/modules/legislature.ts:1791-1927` (`committeeStage`) — every bill in a chamber goes to the same seniority-ranked roster, sized by `committeeSize` and split by party ratio, with the same chair (`:1801-1860`), and each member votes yes or no from `memberPosition` (`:1907-1916`), so bills on similarly dividing questions get the same tally; the committee name comes from `committeeFor` (`:1768-1777`), which returns "general" unless the first provision is a budget line, a tax or a minimum wage (verified).

7. **What:** On February 4, 2025 the board tallied 4 to 3 on four of five measures and 3 to 4 on one. The council tallied 2 to 3 on four and 3 to 2 on one, on the same measure numbers.
   **Record ids:** measureIds `2025-001` to `2025-005`; `bill:office:gus2025:209644:board:2025-02-04:person_8babc740033646fb:6` through `:10`; `bill:office:gus2025:184198:council:2025-02-04:person_472725495cb70007:0` through `:3`
   **Line:** council 23, 29, 35, 41, 47; board 56, 64, 72, 80, 88
   **Cause:** `src/core2/modules/legislature.ts:1676-1722` (`chamberVote`) — each member's vote is the sign of `memberPosition(...).total` (zero abstains) and nothing is random, so bills on questions that divide a chamber the same way get the same count from the same members; and `src/core2/modules/legislature.ts:750-757` (`nextNumber`) numbers bills `<year>-<NNN>` from a counter kept per body and year, so each body restarts at 2025-001 and one number names different bills in different bodies; `src/core2/modules/record.ts:74` keys vote records by `vote:<number>:<person>` with no body. The council and the board are different bodies whose numbering restarts, so the same measure number carries opposite counts (probable; not confirmed by a run).

8. **What:** Five measures had vote-recorded rows on February 19, 2025 but no legislative-vote tally. The board's bill count for that date is 6.
   **Record ids:** measureIds `2025-010`, `2025-011`, `2025-012`, `2025-013`, `2025-014`; `bill:office:gus2025:209644:board:2025-02-19:person_8babc740033646fb:16`
   **Line:** 92–117, 97, 424
   **Cause:** `scripts/trace/viewer.ts:96-97` prints at most the newest 200 local news items cut at 260 characters, `:204` prints at most `limit` rows of a table (400, 200, 60, 40 or 12) while its header counts all of them, and `:315` prints at most 60 rows per kind. `legislative-vote` is a news item and falls inside the 200-item window only for the newest dates, while `vote-recorded` is not news (probable; not confirmed by a run).

9. **What:** Measure numbers are reused across bodies for different questions. "2025-001" is the council minimum wage vote, the board minimum wage vote and the state all-mail voting bill. "2025-004" is council cannabis and board paid family leave.
   **Record ids:** measureId `2025-001`; measureId `2025-004`
   **Line:** 18, 36, 56, 73, 134
   **Cause:** `src/core2/modules/legislature.ts:750-757` (`nextNumber`) numbers bills `<year>-<NNN>` from a counter kept per body and year, so each body restarts at 2025-001 and one number names different bills in different bodies; `src/core2/modules/record.ts:74` keys vote records by `vote:<number>:<person>` with no body (verified).

10. **What:** The county civilian oversight law took effect on March 6, 2025 from measure 2025-002. The council voted that measure down 2 to 3, and the county board passed it 4 to 3. The file does not show which vote makes county law.
    **Record ids:** `law:county:49011:county:us-policy-positions:justice-public-safety.civilian-oversight-of-police:general:2025-03-06:2025-002`; `bill:office:gus2025:184198:council:2025-02-04:person_472725495cb70007:1`
    **Line:** 29, 64, 118
    **Cause:** Not a defect: `src/core2/modules/legislature.ts:750-757` (`nextNumber`) numbers bills `<year>-<NNN>` from a counter kept per body and year, so each body restarts at 2025-001 and one number names different bills in different bodies; `src/core2/modules/record.ts:74` keys vote records by `vote:<number>:<person>` with no body. `src/core2/modules/laws.ts:453-458` stores only the measure number in `terms.enactedBy`, so a law enacted by the county board's 2025-002 (passed 4-3) looks like the council's 2025-002 (failed 2-3) in the file; the two are separate votes in separate bodies (verified).

11. **What:** The February 19, 2025 appointments name person_4efae286b25c4a06 as appointer. That person won the November 4, 2025 mayor contest, 7,053 to 9, so the file does not show who held the mayor's office before the election.
    **Record ids:** `person_4efae286b25c4a06`; `contest:seat:gus2025:184198:mayor:0:2025-11-04`
    **Line:** 89–91, 226
    **Cause:** `src/core2/modules/executive.ts:140-148` (`townAppointer`) names the mayor seat's holder as appointer; that person is probably the sitting mayor who filed again as incumbent (`voting.ts:1015-1024`), won 7,053 to 9 against one other filing (`:1963-1968`), so held the seat before the election; the mayor's term row was not read (probable; not confirmed by a run).

12. **What:** Many bills share one introduction date: 50 state House bills on March 7, 2025, and 23 federal House bills on December 15, 2025.
    **Record ids:** `office:US-UT:legislature-lower 2025-03-07`; `office:US-UT:us-house 2025-12-15`
    **Line:** 412, 415
    **Cause:** `src/core2/modules/world-legislating.ts:613-692` (`endOfSession`) and `:433-579` (`holdSession`) — a session drafts and votes all its bills on its one scheduled floor day (`scheduleSession` `:190-215`; states from the session table `:108-121`, Congress `congressAgendaDate` `:167-173`, a town body's regular meeting `:721-760`), so dozens of bills share one introduction date (verified).

13. **What:** The organization count rose from 128 at build to 194 at year end (+66). The year's kinds show organization.closed=2 and business.closed=2, and no opening record.
    **Record ids:** orgs 128; orgs 194; `organization.closed`; `business.closed`
    **Line:** 1, 4, 5
    **Cause:** `src/core2/state.ts:1604-1631` (`addOrganization`) writes organizations silently; campaign committees (`src/core2/modules/campaigns.ts:362,870,1500`), cause groups (`src/core2/modules/drives.ts:1383`), interest groups (`src/core2/modules/interest-groups.ts:203,469`) and press outlets (`src/core2/modules/press.ts:418`) are created through it with no `organization.founded` record (only the business engine emits one, `business.ts:1366`) (verified).

14. **What:** The federal veterans budget line changed by deltaMinor=-11083297448959. If minor units are cents, that is about -$110.8 billion. The file does not state the unit.
    **Record ids:** `budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15`
    **Line:** 298, 301
   **Cause:** Not a defect: `src/core2/law-reach/group-b.ts:284-298` (`balanced-budget`) with `balancePlan` (`src/core2/law-reach/group-b-money.ts:427-445`) — a balanced-budget law cuts every non-interest line by the same ratio of the spending-revenue gap, in minor units (cents); the viewer prints the raw `deltaMinor`, so -1.1e13 is about -$110 billion, a plausible size for a federal line (verified).

15. **What:** The trace for a Senate vote names a U.S. House bill sponsored from the US-GA Senate seat, but the trace's first person is `official:seat:US-AK:us-senate:0`. The job and official records loop back on each other. A House bill from December 15, 2025 also has a US-OH seat in its id, with a US-TX chair.
    **Record ids:** `bill:office:US-UT:us-house:2025-12-15:official:seat:US-GA:us-senate:1:112`; `official:seat:US-AK:us-senate:0`; `job:office:seat:US-AK:us-senate:0:official:seat:US-AK:us-senate:0`; `bill:office:US-UT:us-house:2025-12-15:official:seat:US-OH:us-house:13:121`
    **Line:** 269–285
    **Cause:** `src/core2/modules/world-legislating.ts:258-272` (`houseOffice`) and `:638-662` (`endOfSession`) — Congress's yearly session is held through the first `us-house` office found (the player's state delegation), with every member of the House and Senate as filers (`members(api, FEDERAL_HOUSE)`), so federal bills are filed under `office:US-XX:us-house` with sponsors, chairs and voters from other states (`congressMembers`, `src/core2/modules/legislature.ts:953`); and `scripts/trace/viewer.ts:136-150` follows the first matching child up to four steps with no visited set, and `src/bench/dev-trace.ts:81-` links a person to their household and back, so the chain circles between the two (verified).

16. **What:** Trace child lists run past 47 person ids, and some lines are cut off mid-id.
    **Record ids:** `record:core.log.personIds.47`; `record:core.log.witnessIds.45` followed by `record:c`
    **Line:** 287, 323
    **Cause:** `scripts/trace/viewer.ts:153-161` cuts each child value to 160 characters and the list to 1,500, and prints `kind:via=value` without the child's id, so ids run off the line and the same fact shown for several different people reads as a repeat (verified).

17. **What:** Fields are truncated with "…" in the dump: vacancyRule values end at "st…", "ballot…" and "https…". The offices header reads "293 of 359" but 12 rows print. The module tables for vacancies, contests, filings, campaigns, executive offices and terms, legislature governments and budgets print "Unregistered module table".
    **Record ids:** `office:US-UT:us-senate`; `office:US-UT:lieutenant-governor`; `office:US-UT:legislature-upper`; `core2-elections-v1.vacancies`; `core2-legislature-v1.budgets`
    **Line:** 346, 349, 353, 378, 379–390, 395–409
    **Cause:** `scripts/trace/viewer.ts:180-193` (`slim`) cuts any field whose JSON is over 220 characters to 200 plus "…" (a vacancy-rule object longer than that prints as an escaped, cut-off string) and `:204` cuts each row to 700 characters; and `scripts/trace/viewer.ts:96-97` prints at most the newest 200 local news items cut at 260 characters, `:204` prints at most `limit` rows of a table (400, 200, 60, 40 or 12) while its header counts all of them, and `:315` prints at most 60 rows per kind; and `scripts/trace/viewer.ts:234-241` (`dump`) — the viewer asks for module and table names that do not match where the tables are registered (vacancies: `src/core2/modules/offices.ts:111-131`; contests and filings: `src/core2/modules/elections.ts:116-128`; campaigns: `src/core2/modules/campaigns.ts:213`; executive offices and terms: the offices tables, because the executive module registers only appointments, orders, desk and review at `src/core2/modules/executive.ts:95-100`; governments and budgets: `src/core2/modules/budgets.ts:166-167`), so `dump` (`viewer.ts:194-208`) prints "Unregistered module table"; the game holds the data, the viewer asked the wrong module (verified).

18. **What:** The Senate special election had one candidate with 324,610 votes. The election date and the contest basis are marked "estimated", not read from the law. The filing closed August 26, 2025.
    **Record ids:** `contest:seat:US-UT:us-senate:1:2025-10-10:special`; `filing:contest:seat:US-UT:us-senate:1:2025-10-10:special:official:term:seat:US-UT:us-senate:1:2025-07-12`
    **Line:** 222, 393, 477
    **Cause:** `src/core2/elections-calendar.ts:676-684` (`specialElectionDate`) falls back to `specialElectionDaysEstimate` where the state's law is not read, and `elections.ts:408-420` marks the contest basis "estimated"; the single candidate follows from `fileStandingCandidates` adding a nominee only for a party with no filed candidate (`voting.ts:1060-1100`) and `checkEligibility` dropping filings that fail a rule (`:966-973`), which was not traced for this seat (probable; not confirmed by a run).

19. **What:** The player has job=none and cash=$2531 at year end. The file names person_e95ec0bb1330b510 only in the header and the state line, with no action recorded.
    **Record ids:** `person_e95ec0bb1330b510`
    **Line:** 2, 227
    **Cause:** Not a defect: `scripts/trace/viewer.ts:41-44,112-115` selects the player but never issues a command and prints only the final player state, and no engine acts for the player (`chamberVote` abstains for the player, `src/core2/modules/legislature.ts:1689-1691`), so no player-directed record exists (verified).

## Levels at a glance

- **Local:** The council and county board acted: council 14 bills (1 enacted, 12 failed, 1 vetoed) and board 34 bills (9 enacted, 25 failed). The November 4, 2025 council and mayor elections were held. Works with gap: the clerk seat is vacant with no appointment recorded, and five February 19 measures have no tallies.
- **State:** The House introduced 50 bills on March 7, 2025 (19 enacted, 32 failed for the year), the Senate voted on them, and the state budget was adopted July 1, 2025. Works with gap: repeated 61-14 and 9-2 tallies, and three vacated seats with no appointment rows.
- **Federal:** Congress adopted the budget October 1, 2025; the House recorded 24 bills (6 enacted, 18 failed); the Senate special election was held October 10, 2025. Works with gap: the module tables are unregistered and the dump is truncated, the veterans delta has no stated unit, and trace chains name the wrong states.

Method: one generated world, seed 49fec817bf1f, place 4907690, read from audit/utah.txt (480 lines, read in full).

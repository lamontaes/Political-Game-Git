# West Virginia: Addison's board passed five measures in February, 16 state bills became law, and Congress adopted a budget

Addison (Webster Springs), start January 20, 2025; 1,784 people at start and 1,855 at end (1,853 alive); the year ran in 64 seconds.

## The year in Addison

Addison's town board met on February 4, February 19, July 1, July 19, September 2 and December 1, 2025, and the council met on July 1. On February 4, 2025 the board organized with a council president and a mayor pro tem, and passed five measures on 2-to-1 votes; five county laws from them took effect on March 6, 2025. On February 19, 2025 the board appointed a finance director and failed two measures on 1-to-2 votes. The town's bodies handled 16 bills in the year: 10 enacted and 6 failed.

The state House of Delegates had 51 bills dated April 12, 2025 and one dated July 1, 2025; 16 were enacted, 35 failed and one was vetoed. The state minimum wage law took effect on January 21, 2025. The legislature adopted the state budget on July 1, 2025 by votes of 91 to 9 and 32 to 2. Three state House seats were vacated: on May 1, 2025, on September 4, 2025 (a death), and on January 1, 2026.

Congress adopted the federal budget on October 1, 2025 (House 249 to 184, Senate 65 to 35). Of 25 federal House bills in the file, six were enacted and 19 failed. Federal news dated January 1, 2026 lists a 37 percent top income tax rate and a 6.2 percent Social Security tax.

One business closed on September 1, 2025, and one death was recorded on June 5, 2025. No election was held in the year. The mayoral contest is dated April 7, 2026, and 12 candidate filings were recorded. The player, John Walsh, works as a production worker with $894 in cash, and no record in the file shows him acting.

## Things that need a why

1. **What:** The council-president record for Addison names a U.S. House seat holder on December 15, 2025, after naming a local person on February 4, 2025. A federal seat is written into a town office.
   - **Record ids:** `official:term:seat:US-WV:us-house:01:2025-01-20` (chamber-organized, December 15, 2025); `person_a514f809b7168a85` (chamber-organized, February 4, 2025)
   - **Line:** 17, 459
     **Cause:** `src/core2/modules/world-legislating.ts:638-648` asks `leaderOf` for the town's `us-house` office id, and `src/core2/modules/leadership.ts:113-138` (`templateOf`) has no branch for a `us-house` office, so it falls through to the council template whose presiding post is `council-president`; `organize` then emits `chamber-organized` with that key (`leadership.ts:400-423`) for a congressional delegation (verified).

2. **What:** The West Virginia U.S. House body (`office:US-WV:us-house`) holds members from other states. One bill's chair is a New York seat, one bill's voters include Nevada, Pennsylvania and Alaska seats, and the October 1, 2025 House budget bill is sponsored by the president's term. The December 15, 2025 roll reads 205 yes and 228 no.
   - **Record ids:** `bill:office:US-WV:us-house:2025-12-15:official:seat:US-NV:us-house:01:92`; `bill-vote:bill:office:US-WV:us-house:2025-12-15:official:seat:US-PA:us-house:13:88` (personIds resolve to `official:seat:US-AK:us-house:00`); `bill:office:US-WV:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:66`
   - **Line:** 250, 253, 259, 263, 439
     **Cause:** `src/core2/modules/world-legislating.ts:258-272` (`houseOffice`) and `:638-662` (`endOfSession`) — Congress's yearly session is held through the first `us-house` office found (the player's state delegation), with every member of the House and Senate as filers (`members(api, FEDERAL_HOUSE)`), so federal bills are filed under `office:US-XX:us-house` with sponsors, chairs and voters from other states (`congressMembers`, `src/core2/modules/legislature.ts:953`). The October 1 House budget bill is sponsored by the president's term because `councilBudget` takes the sponsor from the executive's priorities (`legislature.ts:307-309`, `executivePriorities` `:467-520`) (verified).

3. **What:** The upper-chamber tally is 32 yes and 2 no on 13 of the 16 state upper votes in the file, on bills whose lower-chamber tallies ranged from 85-15 to 93-7. The only other upper tallies are 31-3, 30-4 and 18-16.
   - **Record ids:** `bill:office:US-WV:legislature-lower:2025-04-12:official:term:seat:US-WV:lower:077:0:2025-01-20:9` (line 64) through `...:077:0:2025-01-20:21` (line 148)
   - **Line:** 64, 71, 78, 85, 92, 99, 106, 113, 120, 127, 134, 141, 148
     **Cause:** `src/core2/modules/legislature.ts:1676-1722` (`chamberVote`) — each member's vote is the sign of `memberPosition(...).total` (zero abstains) and nothing is random, so bills on questions that divide a chamber the same way get the same count from the same members (verified).

4. **What:** Committee tallies repeat exactly. The lower chair reports 10 yes and 1 no on 13 hearings, and the upper chair reports 10 yes and 0 no on 15 hearings.
   - **Record ids:** committee chair `official:term:seat:US-WV:lower:020:0:2025-01-20`; committee chair `official:term:seat:US-WV:upper:012:0:2025-01-20`; billIds `bill:office:US-WV:legislature-lower:2025-04-12:official:term:seat:US-WV:lower:077:0:2025-01-20:9` and `...:077:0:2025-01-20:10`
   - **Line:** 58, 61, 65, 68, 72, 75, 79, 82, 86, 89, 93, 96, 100, 103, 107, 110, 114, 117, 121, 124, 128, 131, 135, 138, 142, 145, 152, 159
     **Cause:** `src/core2/modules/legislature.ts:1791-1927` (`committeeStage`) — every bill in a chamber goes to the same seniority-ranked roster, sized by `committeeSize` and split by party ratio, with the same chair (`:1801-1860`), and each member votes yes or no from `memberPosition` (`:1907-1916`), so bills on similarly dividing questions get the same tally; the committee name comes from `committeeFor` (`:1768-1777`), which returns "general" unless the first provision is a budget line, a tax or a minimum wage (verified).

5. **What:** Thirty `bill-held-in-committee` records dated April 12, 2025 all show 0 yes and 0 no. Twenty-six of them name an upper-seat sponsor on a bill id under `legislature-lower`.
   - **Record ids:** `bill:office:US-WV:legislature-lower:2025-04-12:official:term:seat:US-WV:upper:013:0:2025-01-20:31`; `bill:office:US-WV:legislature-lower:2025-04-12:official:term:seat:US-WV:lower:077:0:2025-01-20:29`
   - **Line:** 168, 176-204
     **Cause:** `src/core2/modules/legislature.ts:1861-1868` and `:1907-1913` (`committeeStage`) — when the chair does not hold a hearing (`heard` is false) the yes and no counts are never computed, so the record is written as `bill-held-in-committee` (`:1932`) with yes 0 and no 0, and `holdVote` fails the bill at `:1980-1984`; and `src/core2/modules/world-legislating.ts:454-475` and `:658-662` — filers are the members of every chamber of the state and the member with the strongest reason sponsors the bill, but the bill is drafted into the lower chamber's office (`:638-642`, `:521-526`), so a senator can sponsor a bill with a `legislature-lower` id (verified).

6. **What:** The lower chamber's July 1, 2025 budget vote is 91-9, a 100-member total. Seat 077 was vacated on May 1, 2025, so the chamber had 99 seated members by then. The file shows no seat count that drops with a vacancy.
   - **Record ids:** `seat:US-WV:lower:077:0` (seat-vacated, May 1, 2025); budget-adopted for `US-WV`, 2025, "the legislature vote 91-9, 32-2, 2025-052"
   - **Line:** 205, 207, 451
     **Cause:** `src/core2/modules/offices.ts:861-907` (`appoint` in `fillVacancy`) — an `appointment` vacancy is filled the same day with a new `serving` term (a town resident from `suitedResidents` `:256-283`, or a drawn official from `seatNamedOfficial` `:304-370`), but `appoint` emits no `official-appointed` or `took-office` record (the only emit in `vacateSeat` is `seat-vacated`, `:826`), so the fill is invisible in the log and the chamber's member count does not drop. Seat 077 was filled the same day under the appointment rule, so the chamber still had 100 serving members for the July 1 budget vote (verified).

7. **What:** Three lower seats were vacated under the rule "appointment": 077:0 (moved away, May 1, 2025), 096:0 (death, September 4, 2025) and 031:0 (moved away, January 1, 2026). The file has no appointment record for any of them. The only `official-appointed` record is the Addison finance director on February 19, 2025. The one death in the year is on June 5, 2025, and does not match the September 4 death vacancy.
   - **Record ids:** `seat:US-WV:lower:096:0` (seat-vacated, September 4, 2025); `seat:US-WV:lower:031:0` (seat-vacated, January 1, 2026); `person_24f83df0f24df5d5` (life.death, June 5, 2025)
   - **Line:** 205, 42, 326, 446-448
     **Cause:** `src/core2/modules/offices.ts:861-907` (`appoint` in `fillVacancy`) — an `appointment` vacancy is filled the same day with a new `serving` term (a town resident from `suitedResidents` `:256-283`, or a drawn official from `seatNamedOfficial` `:304-370`), but `appoint` emits no `official-appointed` or `took-office` record (the only emit in `vacateSeat` is `seat-vacated`, `:826`), so the fill is invisible in the log and the chamber's member count does not drop (verified).

8. **What:** The county property-tax law was replaced on January 1, 2026 at 0.398 percent of home value, replacing a from-start law. The file has no measure, vote, board record or news item for the replacement. The trace follows it only to the treasury and the place.
   - **Record ids:** `law:county:54101:county:property-tax:general:2026-01-01`; `replacesLawId law:county:54101:county:property-tax:general:2026-01-01:from-start`
   - **Line:** 239, 242-246
     **Cause:** Not a defect: `src/core2/laws-starting.ts:136-165` (`propertyTaxRows`) — the county property-tax law is a dated data row (effective 2026-01-01, from the ACS estimate) and `laws.ts:96-104` fires `law-took-effect` on that date, replacing the `:from-start` carry-back row (`laws.ts:225-254`); it is data, not an enacted measure, so no vote or board record exists (verified).

9. **What:** All five public-comment records shown for the Addison board (5 of 10 counted) report 0 for and 1 to 6 against. None shows support.
   - **Record ids:** `bill:office:gus2025:176954:board:2025-02-04:person_a514f809b7168a85:1`; `...:2025-02-04:person_a514f809b7168a85:3`; `...:2025-02-04:person_a514f809b7168a85:4`; `bill:office:gus2025:176954:board:2025-02-19:person_a514f809b7168a85:7`; `...:2025-02-19:person_a514f809b7168a85:8`
   - **Line:** 22, 31, 36, 43, 48
     **Cause:** `src/core2/modules/meetings.ts:244-271` (`publicComment`) — the speakers are the town adults with the strongest views on the bill's question (`drive = |view| × civic`), sorted by intensity and cut to `publicCommentSpeakers`, so the room is not a sample of the town; the for and against counts are tallied among those speakers at `:326-327` (verified).

10. **What:** The position -1 is recorded on bills that passed. State bill 2025-001 (preschool) passed the lower chamber 93-7 and the upper chamber 32-2, is marked enacted, and carries position -1 on its vote records. The Addison board's 2-to-1 measures carry position -1 for the one no vote. The file does not define what -1 means for a passing majority.

- **Record ids:** `bill:office:US-WV:legislature-lower:2025-04-12:official:term:seat:US-WV:lower:077:0:2025-01-20:9`; vote-recorded `2025-001` on the Addison board (position "-1")
- **Line:** 20, 59, 60, 62, 63, 441
  **Cause:** Not a defect: `src/core2/modules/legislature.ts:606-610` (`provisionStance`) sets a policy provision's position to -1 when its value is not positive (a repeal bill), and `chamberVote` records a yes vote at that position and a no vote at its opposite (`:1713-1727`), so -1 on an enacted bill means a yes vote on a bill that repeals the policy, not a no vote. The board's -1 for a no vote is `-stance.position` on a no vote (`legislature.ts:1713-1727`) (verified).

11. **What:** The player appears in the file only at the start and the end. No record in the year names him as actor, witness, voter or applicant. He ends with a production-worker job and $894 in cash.

- **Record ids:** `person_a2f3db673443989a`
- **Line:** 2, 219
  **Cause:** Not a defect: `scripts/trace/viewer.ts:41-44,112-115` selects the player but never issues a command and prints only the final player state, and no engine acts for the player (`chamberVote` abstains for the player, `src/core2/modules/legislature.ts:1689-1691`), so no player-directed record exists (verified).

12. **What:** Five federal policy-position news items dated December 15, 2025 carry `value=1` with no unit. The federal medicaid match (74.22 percent) and SNAP maximum (298 USD/month) are dated October 1, 2025, the same day Congress adopted a budget that drops the medicare, health and incomeSecurity lines.

- **Record ids:** `us-policy-positions:fiscal.balanced-operating-budget` (value=1); `medicaid-match`; `budget:US:2025`
- **Line:** 9-15, 300, 452
  **Cause:** Not a defect: `src/core2/modules/laws.ts:538-545` — the `law-took-effect` event carries `unit: row.unit ?? ""`; a policy-position law (value 1 means in force) has no unit, so the viewer's FED line (`scripts/trace/viewer.ts:92-95`) prints value=1 with a blank unit. The Medicaid match and SNAP rows are dated starting-law rows effective October 1, 2025 (`laws.ts:96-104`), the same day the fiscal-year budget runs (`legislature.ts:288`) (verified).

13. **What:** One federal budget-line change to veterans is -11,081,667,611,313 minor units, larger in magnitude than any other line the file shows. The file gives no unit definition for `deltaMinor`.

- **Record ids:** `budget-line-changed:budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15`; federal sample bill `otherPrograms` value -169467455300 in `bill:office:US-WV:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:66`
- **Line:** 282, 439
  **Cause:** Not a defect: `src/core2/law-reach/group-b.ts:284-298` (`balanced-budget`) with `balancePlan` (`src/core2/law-reach/group-b-money.ts:427-445`) — a balanced-budget law cuts every non-interest line by the same ratio of the spending-revenue gap, in minor units (cents); the viewer prints the raw `deltaMinor`, so -1.1e13 is about -$110 billion, a plausible size for a federal line (verified).

14. **What:** The state budget adopted July 1, 2025 changed eight lines and nets to -20,344,812,894 minor units. The localAid line is -13,304,281,806, about 65 percent of the net. No local record in the file reads the localAid line.

- **Record ids:** `budget:US-WV:2025` (budget-line-changed, line `localAid`)
- **Line:** 208-215
  **Cause:** `src/core2/modules/legislature.ts:513-518` (`executivePriorities`) — each line's change is `amount × share × personStance(lean, line)`, so a line the executive's lean is against comes out negative, in minor units (cents) of a national budget. Whether any other engine reads the localAid line: not found; no code in `src/core2` names `localAid`, and lines are read generically by name from `spendingMinor` (verified).

15. **What:** A business-closed event on September 1, 2025 has reason `losses-kept`, and its source is the opening record (`core2-officials-v1.loaded`), not a cause. The same organization's employer-closed record gives `owner-closed`.

- **Record ids:** `event:business.closed:organization_64913e594268bac9`; `employer-closed:2025-09-01:organization_64913e594268bac9`
- **Line:** 306-311, 318
  **Cause:** Not a defect: `src/core2/modules/business.ts:603-608` — an owner who closes by choice records "losses-kept" when the business carried losses, else "owner-retiring" (`src/core2/data/business/business.json:48-52`), and `src/core2/finance-state.ts:1518-1530` names the closing receipt `owner-closed:<date>:<org>`; the reason and the closure source are two different fields, not two reasons; and `src/bench/dev-trace.ts:42-79` (`findRecord`) resolves any string to the first module row with that id, the organization's source text is the word "opening", and `src/core2/modules/officials.ts:526` writes a row with id "opening" in `core2-officials-v1.loaded`, so the trace ends at that unrelated row instead of a business record (verified).

16. **What:** One `person.moved-away` record dated November 1, 2025 carries residence facts for four people at the same jurisdiction. The year logs 12 moved-away records in total.

- **Record ids:** `person.moved-away:person_de068f92a13269e6:2025-11-01`; persons `person_de069092a1326b99`, `person_de068e92a1326833`, `person_de068d92a1326680`
- **Line:** 5, 288-291
  **Cause:** Not a defect: `src/core2/modules/moves.ts:702-715` emits `person.moved-away` with `publicRecord: false` and no news, so `retainLog` (`src/core2/state.ts:690-715`) keeps only moves in the player's circle, while every mover who holds a seat still vacates it through `offices.ts:138-146`; one departure covers the mover and the household members who go with them (`moves.ts:596-607`) (verified).

17. **What:** `person.acted` is 13,780 of 14,620 records (94 percent). The next kinds are `news.read` at 187 and `speech.retold` at 116. The file does not say what the `person.acted` records are.

- **Record ids:** kind `person.acted`; compare `speech:party-meeting:party:US-WV:republican:2026-01-15:retold:person_08c3bcf0169e387b`
- **Line:** 5
  **Cause:** `src/core2/state.ts:1329-1334` and `:1418-1436` (`recordAct` in `coreAPI`) — every act by a person in `focusPersonIds` is kept as a `person.acted` record, and the bench sets the focus to the player, family, known people, household and coworkers (`src/bench/world.ts:244`, `src/core2/focus.ts:4-20`); `src/core2/work-attendance.ts:1090` and `src/core2/act-cash.ts:207` write the same kind for pay and cash acts; the viewer prints only the kind count (`scripts/trace/viewer.ts:73-79`). The other large kinds come from the drives engine (`cause.shared`, `src/core2/data/drives.json:9`), the speech engine (`speech.retold`) and one `news.read` per person per story read (`src/core2/modules/news.ts:509-511`). (verified).

18. **What:** Eight module tables print "Unregistered module table": vacancies, voting contests, filings, campaigns, executive offices and terms, legislature governments and budgets. The 12 candidate-filed and 36 campaign-message records have no table to read against, and the four local budget-adopted records have no budget table.

- **Record ids:** `core2-voting-v1.filings`; `core2-voting-v1.campaigns`; `core2-legislature-v1.budgets`; `campaign-message:filing:contest:seat:gus2025:177045:mayor:0:2026-04-07:person_a2f3dc6734439a4d:2026-01-15`
- **Line:** 5, 401-415
  **Cause:** `scripts/trace/viewer.ts:234-241` (`dump`) — the viewer asks for module and table names that do not match where the tables are registered (vacancies: `src/core2/modules/offices.ts:111-131`; contests and filings: `src/core2/modules/elections.ts:116-128`; campaigns: `src/core2/modules/campaigns.ts:213`; executive offices and terms: the offices tables, because the executive module registers only appointments, orders, desk and review at `src/core2/modules/executive.ts:95-100`; governments and budgets: `src/core2/modules/budgets.ts:166-167`), so `dump` (`viewer.ts:194-208`) prints "Unregistered module table"; the game holds the data, the viewer asked the wrong module. The 12 candidate-filed and 36 campaign-message records are written by the elections and campaigns engines (`voting.ts:937-1030`, `campaigns.ts:2146`); only the viewer's table names are wrong (verified).

19. **What:** Fields are cut off and trace entries repeat. The minimum-wage law's unit is cut at `minor/hour`. Law rows end mid-field. Trace child lists are cut mid-word, and one trace repeats the same learned entry four times, with others repeating three to six times. Vacancy rules and contest sources end in "...".

- **Record ids:** `speech:party-meeting:party:US-WV:republican:2026-01-15:retold:person_08c3bcf0169e387b` (repeated learned entry); `office:US-WV:us-senate` vacancyRule; `contest:seat:US:president:2028-11-07` sources
- **Line:** 16, 53-57, 228, 237, 268, 295, 331, 336-345, 387-399
  **Cause:** `scripts/trace/viewer.ts:180-193` (`slim`) cuts any field whose JSON is over 220 characters to 200 plus "…" (a vacancy-rule object longer than that prints as an escaped, cut-off string) and `:204` cuts each row to 700 characters; and `scripts/trace/viewer.ts:153-161` cuts each child value to 160 characters and the list to 1,500, and prints `kind:via=value` without the child's id, so ids run off the line and the same fact shown for several different people reads as a repeat; and `src/bench/dev-trace.ts:202-218` (`learnedOf`) adds one child per person who learned the record, each with the same fact key, and `scripts/trace/viewer.ts:158` omits the person id, so one fact appears many times; and `src/core2/modules/laws.ts:172-218` (`minimumWageHistoryRows`) and `:96-104` — the minimum wage comes from dated rows in `data/research/laws/minimum-wage-history-2000-2026.json` and the starting-law rows, `minor/hour` is the literal unit string (`:205`), and the event fires on whatever effective date the row carries (verified).

## Levels at a glance

- **Local:** The Addison board and council acted on 16 bills (10 enacted, 6 failed), and five county laws took effect March 6, 2025. A federal House seat holder is recorded as council president on December 15, 2025. The budget and filing tables are unregistered, so candidate and budget records cannot be read here. **Works with gap:** the council-president record and the unregistered tables.
- **State:** The House had 52 bills (16 enacted, 35 failed, one vetoed). The budget was adopted July 1, 2025, and three seats were vacated. Upper-chamber and committee tallies repeat, and upper votes sit under lower-chamber bill ids. Vacancies have no appointment records. **Works with gap:** the repeated tallies and the missing appointments.
- **Federal:** The House had 25 bills (six enacted, 19 failed), and the budget was adopted October 1, 2025. Federal news items were written. The West Virginia House body records members and sponsors from other states' seats, and federal law values carry no units. **Works with gap:** the out-of-state seats and the unit-less values.

Method: seed 3f38dc269c37; the year's run time and people counts are from the "## year 1" line and the header line of the input file.

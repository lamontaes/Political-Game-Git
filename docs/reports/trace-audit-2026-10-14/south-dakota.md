# South Dakota: Kranzburg's mayor seat was vacated in February, its council passed one visible bill, and state vote tallies repeat

Kranzburg, seed 85748008adb3, start January 20, 2025; people 1,827 at build and 1,901 at year end (1,897 alive); the year ran in 84 seconds.

## The year in Kranzburg

Kranzburg began the year on January 20, 2025. The player, Taylor Hall, is listed as a Public Works Director with $68,599 in cash. By the file's birth date the player is 17 for the whole year. The mayor's seat was vacated on February 1, 2025 after the officeholder moved away, and the council chose a mayor pro tem on February 4. The council met on February 4 and February 19 and on March 21, 2025. The one passing council vote in the file is ordinance 2025-001, 3-2 on February 4, which took effect March 6, 2025. Recall petitions for council seats 1 and 4 were recorded the same day. Council and mayor elections were held April 1, 2025, with three winners recorded. A city administrator post was recorded as filled on April 20, 2025. The council adopted the 2026 budget on January 1, 2026 by a 4-1 vote.

At the state level, 50 House bills were introduced on March 31, 2025. Across state bodies, 16 bills were enacted and 35 failed. A minimum-wage law took effect January 21, 2025. The governor and other statewide offices appear in the file only as seated terms.

Federal records show the budget adopted October 1, 2025 (House 254-179, Senate 67-33) with seven lines dropped by amendment. 23 House bills were introduced December 15, 2025: 2 enacted, 21 failed, 1 vetoed. Federal tax and benefit values are dated January 1, 2026 and October 1, 2025.

One death was recorded, on January 11, 2026. 21 people moved away and 3 businesses closed. Organizations rose from 120 to 145.

## Things that need a why

1. **What:** The player is 17 for the whole year (born January 25, 2007; the year runs January 20, 2025 to January 20, 2026), yet the summary lists the job Public Works Director and cash of $68599. No other record in the file names the player after the header.
   **Record ids:** `person_35a78115f7162b3b`
   **Line:** 2, 218
   **Cause:** Not a defect: the age premise is wrong: born 2007-01-25, the player turns 18 on 2025-01-25, five days into the year, so the April 20 appointment clears the age gate. `src/core2/modules/executive.ts:228-242` (`fillTownPost`) builds the pool from every alive person at or above `appointmentAdulthoodAge` = 18 (`src/core2/data/campaigns/parameters.json:891-896`) with no other eligibility test, and `nominateAndConfirm` picks by qualification (`:245-262`); and `scripts/trace/viewer.ts:41-44,112-115` selects the player but never issues a command and prints only the final player state, and no engine acts for the player (`chamberVote` abstains for the player, `src/core2/modules/legislature.ts:1689-1691`), so no player-directed record exists (verified).

2. **What:** The mayor seat was vacated February 1, 2025 (cause "moved away", rule "appointment"). No appointment record for the mayor seat appears. A mayor pro tem was named February 4, and the April 1 mayor election gave `person_072fe54d456956ba` 3,154 votes. Who held the seat between February 1 and April 1 is not recorded.
   **Record ids:** `seat:gus2025:134562:mayor:0` (`office:gus2025:134562:mayor`); mayor pro tem `person_c2a97db2db3dc543`; `contest:seat:gus2025:134562:mayor:0:2025-04-01`
   **Line:** 16, 17, 216
   **Cause:** `src/core2/modules/offices.ts:861-907` (`appoint` in `fillVacancy`) — an `appointment` vacancy is filled the same day with a new `serving` term (a town resident from `suitedResidents` `:256-283`, or a drawn official from `seatNamedOfficial` `:304-370`), but `appoint` emits no `official-appointed` or `took-office` record (the only emit in `vacateSeat` is `seat-vacated`, `:826`), so the fill is invisible in the log and the chamber's member count does not drop. The seat holder between February 1 and April 1 is whoever `appoint` seated that day (see item 3), and the elected mayor takes office after the April 1 vote on the office's start day (`voting.ts:2456-2526`) (verified).

3. **What:** The city-administrator appointment is recorded as made by a television reporter, not by a council or mayor.
   **Record ids:** `person:press:outlet:television:2:jurisdiction_d6ec256b02df8147:reporter:0` (post city-administrator)
   **Line:** 217
   **Cause:** `src/core2/modules/offices.ts:256-283` (`suitedResidents`) picks from every alive adult whose `placeId` is the town, and press staff are created as full people placed in the town (`src/core2/press-staff.ts:171-186`), so a reporter can be chosen to fill the mayor's vacancy (`appoint`, `offices.ts:861-907`); `townAppointer` then returns that seat holder's id (`src/core2/modules/executive.ts:140-148`) (verified).

4. **What:** The elections table holds 0 of 36 contests, yet three election-result records exist for April 1, 2025. Each election-result lists only the winner in its totals (3156, 3147, 3154), so no losing candidate's count is recorded.
   **Record ids:** `contest:seat:gus2025:134562:council:0:2025-04-01`; `contest:seat:gus2025:134562:council:4:2025-04-01`; `contest:seat:gus2025:134562:mayor:0:2025-04-01`
   **Line:** 214, 215, 216, 396
   **Cause:** `scripts/trace/viewer.ts:209-211` (`high`, used for the contests dump at `:233`) drops every row whose id contains `gus2025`, which is every town and county contest, so the table prints 0 kept out of N; and `src/core2/modules/voting.ts:937-1030` (`fileStandingCandidates`) — the stand-in files only the sitting incumbent (and, for state and federal seats, a challenger from the other party); a town or county seat gets a second name only if a resident files through the candidacy engine, so most local races have one filing and the result lists only that candidate (verified).

5. **What:** The record kind `person.acted` is 13950 of 16387 records (85%).
   **Record ids:** `person.acted=13950`
   **Line:** 5
   **Cause:** `src/core2/state.ts:1329-1334` and `:1418-1436` (`recordAct` in `coreAPI`) — every act by a person in `focusPersonIds` is kept as a `person.acted` record, and the bench sets the focus to the player, family, known people, household and coworkers (`src/bench/world.ts:244`, `src/core2/focus.ts:4-20`); `src/core2/work-attendance.ts:1090` and `src/core2/act-cash.ts:207` write the same kind for pay and cash acts; the viewer prints only the kind count (`scripts/trace/viewer.ts:73-79`) (verified).

6. **What:** The same tallies repeat across different bills. The lower chamber recorded 65-5 on ten bills. The upper chamber recorded 32-3 on six bills. The same totals appear on each bill. That needs a why.
   **Record ids:** `bill:office:US-SD:legislature-lower:2025-03-31:official:term:seat:US-SD:upper:008:0:2025-01-20:14` (65-5); `...:upper:008:0:2025-01-20:15` (65-5 and 32-3); `...:upper:002:0:2025-01-20:23` (32-3)
   **Line:** 89, 96, 99, 103, 106, 110, 113, 117, 120, 124, 127, 138, 155, 166, 173
   **Cause:** `src/core2/modules/legislature.ts:1676-1722` (`chamberVote`) — each member's vote is the sign of `memberPosition(...).total` (zero abstains) and nothing is random, so bills on questions that divide a chamber the same way get the same count from the same members (verified).

7. **What:** Committee tallies repeat. The chair `official:term:seat:US-SD:lower:033:0:2025-01-20` recorded 10-1 on 13 bills. Bills held in committee on March 31, 2025 all show 0-0.
   **Record ids:** `bill:office:US-SD:legislature-lower:2025-03-31:official:term:seat:US-SD:upper:008:0:2025-01-20:15` (10-1, line 97, chair upper 004); `...:lower:26A:0:2025-01-20:33` (held, 0-0, line 203)
   **Line:** 86, 93, 100, 107, 114, 121, 128, 135, 142, 156, 163, 170, 184; 196, 202-211
   **Cause:** `src/core2/modules/legislature.ts:1791-1927` (`committeeStage`) — every bill in a chamber goes to the same seniority-ranked roster, sized by `committeeSize` and split by party ratio, with the same chair (`:1801-1860`), and each member votes yes or no from `memberPosition` (`:1907-1916`), so bills on similarly dividing questions get the same tally; the committee name comes from `committeeFor` (`:1768-1777`), which returns "general" unless the first provision is a budget line, a tax or a minimum wage; and `src/core2/modules/legislature.ts:1861-1868` and `:1907-1913` (`committeeStage`) — when the chair does not hold a hearing (`heard` is false) the yes and no counts are never computed, so the record is written as `bill-held-in-committee` (`:1932`) with yes 0 and no 0, and `holdVote` fails the bill at `:1980-1984` (verified).

8. **What:** One date carries many records. 50 House bills share March 31, 2025, 23 federal House bills share December 15, 2025, and 9 council bills share February 4, 2025.
   **Record ids:** `bill:office:US-SD:legislature-lower:2025-03-31:...` (50 bills); `bill:office:US-SD:us-house:2025-12-15:...` (23 bills); `bill:office:gus2025:134562:council:2025-02-04:...` (9 bills)
   **Line:** 415, 418, 419
   **Cause:** `src/core2/modules/world-legislating.ts:613-692` (`endOfSession`) and `:433-579` (`holdSession`) — a session drafts and votes all its bills on its one scheduled floor day (`scheduleSession` `:190-215`; states from the session table `:108-121`, Congress `congressAgendaDate` `:167-173`, a town body's regular meeting `:721-760`), so dozens of bills share one introduction date (verified).

9. **What:** The sampled state bill is enacted, but its recorded provision is value -1 on local-minimum-wage-authority. Its chamber votes were 65-5 (lower) and 34-1 (upper), and the sampled member's position is -1. The file does not say why a -1 provision was enacted.
   **Record ids:** `bill:office:US-SD:legislature-lower:2025-03-31:official:term:seat:US-SD:upper:008:0:2025-01-20:14`
   **Line:** 87, 89, 91, 92, 439
   **Cause:** Not a defect: `src/core2/modules/legislature.ts:606-610` (`provisionStance`) sets a policy provision's position to -1 when its value is not positive (a repeal bill), and `chamberVote` records a yes vote at that position and a no vote at its opposite (`:1713-1727`), so -1 on an enacted bill means a yes vote on a bill that repeals the policy, not a no vote. The provision value -1 on `local-minimum-wage-authority` is the repeal side of that policy question, passed 65-5 and 34-1 by the same count rule (verified).

10. **What:** The council passed one bill in the visible record. Of 24 council bills, 2 are enacted and 22 failed, but only bill 2025-001 (3-2) appears as a passing vote. Six council bills show 1-4. The second enacted council bill is not identified in the file.
    **Record ids:** `bill:office:gus2025:134562:council:2025-02-04:person_c2a97db2db3dc543:0` (3-2, passed); `bill:office:gus2025:134562:council:2025-02-04:person_f31481ccdb0a749a:3` (1-4)
    **Line:** 23, 35, 41, 55, 62, 69, 75, 85, 433, 434
    **Cause:** `scripts/trace/viewer.ts:96-97` prints at most the newest 200 local news items cut at 260 characters, `:204` prints at most `limit` rows of a table (400, 200, 60, 40 or 12) while its header counts all of them, and `:315` prints at most 60 rows per kind; and `src/core2/modules/legislature.ts:1676-1722` (`chamberVote`) — each member's vote is the sign of `memberPosition(...).total` (zero abstains) and nothing is random, so bills on questions that divide a chamber the same way get the same count from the same members. The viewer prints only the first federal and state bill as samples (`viewer.ts:263-270`) and counts of bills by status (`:255-262`), so the second enacted council bill is never listed (verified).

11. **What:** The federal budget sample has a negative line value of -77266042870 for otherPrograms. The budget adopted October 1, 2025 dropped seven lines by amendment.
    **Record ids:** `bill:office:US-SD:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:73`; budget-adopted `2025-001` (Congress vote 254-179, 67-33)
    **Line:** 437, 450
    **Cause:** `src/core2/modules/legislature.ts:513-518` (`executivePriorities`) — each line's change is `amount × share × personStance(lean, line)`, so a line the executive's lean is against comes out negative, in minor units (cents) of a national budget; and `src/core2/modules/legislature.ts:362-390` (`councilBudget`) — when the first budget vote fails, the loop drops the line the opponents in the failing chamber object to most and revotes until it passes, and the executive proposes a change on every line (`executivePriorities`, `:513-518`), so several dropped lines are the expected result; the adopted bill keeps only the surviving provisions (`:415`) while its `authority` list keeps the original entries (`draftBill`, `:810-827`) (verified).

12. **What:** Federal House records use seats from other states. The bill sponsor is a US-CA seat, the committee chair is a US-TX seat, and the personIds include a US-AK seat. The bill's vote is 197-236 with no status shown in the trace.
    **Record ids:** `bill:office:US-SD:us-house:2025-12-15:official:seat:US-CA:us-house:08:96`; chair `official:seat:US-TX:us-house:27`; `bill:office:US-SD:us-house:2025-12-15:official:seat:US-ID:us-house:01:92`; `official:seat:US-AK:us-house:00`
    **Line:** 280-283, 292-293, 297
    **Cause:** `src/core2/modules/world-legislating.ts:258-272` (`houseOffice`) and `:638-662` (`endOfSession`) — Congress's yearly session is held through the first `us-house` office found (the player's state delegation), with every member of the House and Senate as filers (`members(api, FEDERAL_HOUSE)`), so federal bills are filed under `office:US-XX:us-house` with sponsors, chairs and voters from other states (`congressMembers`, `src/core2/modules/legislature.ts:953`). The 197-236 bill shows no status because the viewer prints bill status only as counts by body (`viewer.ts:255-262`) and one sample bill (`:263-267`) (verified).

13. **What:** Two law values need their source checked. The minimum-wage law took effect January 21, 2025 at 1500 minor units per hour. The federal Medicaid match is 51.01 percent, dated October 1, 2025.
    **Record ids:** `law:US-SD:state:minimum-wage:general:2025-01-21:...:starting`; medicaid-match 51.01 percent
    **Line:** 10, 12
    **Cause:** Not a defect: `src/core2/modules/laws.ts:172-218` (`minimumWageHistoryRows`) and `:96-104` — the minimum wage comes from dated rows in `data/research/laws/minimum-wage-history-2000-2026.json` and the starting-law rows, `minor/hour` is the literal unit string (`:205`), and the event fires on whatever effective date the row carries. The Medicaid match and the other federal values are dated rows in `src/core2/data/laws/starting-law.json` (effective 2025-10-01) that `laws.ts:96-104` fires as `law-took-effect`; both are sourced data, not simulation output (verified).

14. **What:** The populations do not reconcile with the record kinds. People rose from 1,827 at build to 1,901 at year end with one death and 21 moves away, and no birth kind appears. Organizations rose from 120 to 145 with three closures, and no organization-opened kind appears.
    **Record ids:** `organization_aa75ad833bb9455e` (closed); `person_4da7347262f8419e` (moved away)
    **Line:** 1, 4, 5, 327
    **Cause:** people are added with no birth or arrival record through `fillInIdentity` — named officials (`src/core2/modules/officials.ts:604,1275`), press staff (`src/core2/press-staff.ts:181`), staff seats (`src/core2/modules/staff.ts:539`) and counted residents filled in on meeting — while newborns come from `src/core2/modules/renewal.ts` (`buildNewborn`); deaths and moves are dropped by `retainLog` (`state.ts:690-715`); the split of the net change was not counted; and `src/core2/state.ts:1604-1631` (`addOrganization`) writes organizations silently; campaign committees (`src/core2/modules/campaigns.ts:362,870,1500`), cause groups (`src/core2/modules/drives.ts:1383`), interest groups (`src/core2/modules/interest-groups.ts:203,469`) and press outlets (`src/core2/modules/press.ts:418`) are created through it with no `organization.founded` record (only the business engine emits one, `business.ts:1366`); and `src/core2/modules/offices.ts:132-137` vacates the seat with cause "death" from the `life.death` event (`src/core2/modules/health.ts:438-460`), but `src/core2/state.ts:690-715` (`retainLog`) keeps an event only if it is in the player's circle, a public record in a visible place, or news, and `caseEvent` (`health.ts:362-386`) sets none of those, so the death record is dropped and the viewer's `deaths:` count (`scripts/trace/viewer.ts:98-99`) reads 0 (verified).

15. **What:** The business-closure trace gives two different reasons. The record says closing-reason "losses-kept", and the closure-source is "owner-closed". The source chain ends at the word "opening" from core2-officials-v1.loaded, not at a record.
    **Record ids:** `event:business.closed:organization_aa75ad833bb9455e`; `employer-closed:2025-12-01:organization_aa75ad833bb9455e`
    **Line:** 312-315, 321
    **Cause:** Not a defect: `src/core2/modules/business.ts:603-608` — an owner who closes by choice records "losses-kept" when the business carried losses, else "owner-retiring" (`src/core2/data/business/business.json:48-52`), and `src/core2/finance-state.ts:1518-1530` names the closing receipt `owner-closed:<date>:<org>`; the reason and the closure source are two different fields, not two reasons; and `src/bench/dev-trace.ts:42-79` (`findRecord`) resolves any string to the first module row with that id, the organization's source text is the word "opening", and `src/core2/modules/officials.ts:526` writes a row with id "opening" in `core2-officials-v1.loaded`, so the trace ends at that unrelated row instead of a business record (verified).

16. **What:** Trace output has repeats and truncation. The campaign-message trace lists `record:core.log.witnessIds.0` through `.31`. The life.death trace repeats the same learned line seven times. Vacancy-rule fields end in "…" on six state office rows and one senate row.
    **Record ids:** `campaign-message:filing:contest:seat:gus2025:134562:council:1:2026-04-07:person_c2a97db2db3dc543:2026-01-15`; `life.death:person_8acb0236ffa1983b:2026-01-11`; `office:US-SD:us-senate`; `office:US-SD:governor`
    **Line:** 227, 245, 339, 342-348
    **Cause:** `scripts/trace/viewer.ts:153-161` cuts each child value to 160 characters and the list to 1,500, and prints `kind:via=value` without the child's id, so ids run off the line and the same fact shown for several different people reads as a repeat; and `src/bench/dev-trace.ts:202-218` (`learnedOf`) adds one child per person who learned the record, each with the same fact key, and `scripts/trace/viewer.ts:158` omits the person id, so one fact appears many times; and `scripts/trace/viewer.ts:180-193` (`slim`) cuts any field whose JSON is over 220 characters to 200 plus "…" (a vacancy-rule object longer than that prints as an escaped, cut-off string) and `:204` cuts each row to 700 characters (verified).

17. **What:** Council public comment is 0 for and 4 to 6 against on every council bill that has it.
    **Record ids:** `bill:office:gus2025:134562:council:2025-02-19:person_63dd170ed4476e30:9`; `...:2025-02-19:person_f31481ccdb0a749a:10`; `...:2025-02-19:person_f31481ccdb0a749a:11`; `...:2025-03-21:person_f31481ccdb0a749a:13`
    **Line:** 49, 56, 63, 79
    **Cause:** `src/core2/modules/meetings.ts:244-271` (`publicComment`) — the speakers are the town adults with the strongest views on the bill's question (`drive = |view| × civic`), sorted by intensity and cut to `publicCommentSpeakers`, so the room is not a sample of the town; the for and against counts are tallied among those speakers at `:326-327` (verified).

18. **What:** Two recall petitions were filed the same day, March 6, 2025, against council seats 1 and 4. The file has no outcome record for either recall.
    **Record ids:** `recall:term:seat:gus2025:134562:council:1:2025-01-20:2025-03-06`; `recall:term:seat:gus2025:134562:council:4:2025-01-20:2025-03-06`
    **Line:** 77, 78
    **Cause:** `src/core2/modules/recalls.ts:284-348` (`recallWork`) updates the recall row to on-ballot, failed, removed or kept and calls `vacateSeat`, but emits no log record for the petition result or the vote (only `recall-petition` is emitted, `:255-270`), so the log shows no outcome; one petition is filed per member who voted on the law (`:167-262`) (verified).

19. **What:** Eight module tables are unregistered and report no rows: core2-elections-v1.vacancies, core2-voting-v1.contests, core2-voting-v1.filings, core2-voting-v1.campaigns, core2-executive-v1.offices, core2-executive-v1.terms, core2-legislature-v1.governments, core2-legislature-v1.budgets.
    **Record ids:** `core2-voting-v1.contests`; `core2-legislature-v1.governments`; `core2-legislature-v1.budgets`
    **Line:** 398, 400, 402, 404, 406, 408, 410, 412
    **Cause:** `scripts/trace/viewer.ts:234-241` (`dump`) — the viewer asks for module and table names that do not match where the tables are registered (vacancies: `src/core2/modules/offices.ts:111-131`; contests and filings: `src/core2/modules/elections.ts:116-128`; campaigns: `src/core2/modules/campaigns.ts:213`; executive offices and terms: the offices tables, because the executive module registers only appointments, orders, desk and review at `src/core2/modules/executive.ts:95-100`; governments and budgets: `src/core2/modules/budgets.ts:166-167`), so `dump` (`viewer.ts:194-208`) prints "Unregistered module table"; the game holds the data, the viewer asked the wrong module (verified).

## Levels at a glance

- **Local:** The mayor, council, and city administrator records show one passing council bill, three April 1 elections, two recall petitions, and a 4-1 budget adoption. Works with gap: the mayor seat is empty February 1 to April 1 with no appointment record, and the elections table is empty (0 of 36 contests).
- **State:** The House and Senate recorded 50 House bills introduced, 16 enacted, and 35 failed, with committee and floor votes. Works with gap: repeated identical tallies, and the executive tables are unregistered, so the governor's acts are not visible.
- **Federal:** The budget, 23 House bills, and federal law values are recorded. Works with gap: House bills carry seats from other states, and one budget line is negative.

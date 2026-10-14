# Texas: Midland passed 8 of 52 local bills, the state House enacted 17 of 53, and six seats emptied with no fill on record

Midland, Texas. Seed `b08f4ec07e71`. Start January 20, 2025. People: 1,708 at start, 1,793 at end (1,789 alive). Year run time: 86 s.

## The year in Midland

Midland's board introduced 23 bills and its council 29. The board enacted one bill, vetoed two and saw 20 fail. The council enacted seven and saw 22 fail. A city ban on discrimination in housing and work took effect March 6, 2025, and a limit on government facial recognition took effect March 21, 2025. The council adopted the 2025 budget by a 3-2 vote, recorded October 1, 2025. A county property-tax law at 1.225 percent of home value took effect January 1, 2026, replacing the law in force at the start.

Three businesses closed on March 25, May 24 and May 29, 2025, each recorded as out of cash and credit. Two more closed on their owners' decision for losses, on June 1, 2025 and October 1, 2025. The file shows 120 organizations at the start and 182 at the end.

The Texas House introduced 52 bills on June 2, 2025, and both chambers voted on them that day. The House enacted 17 of its 53 bills for the year. The legislature adopted the state budget on September 1, 2025, by 88-62 in the House and 19-11 in the Senate. Six seats were vacated by members who moved away, in July, November, December and January, and the file records no special election or appointment to fill any of them. No election dated 2025 is recorded.

Congress adopted the federal budget on October 1, 2025, by 256-177 in the House and 69-31 in the Senate. Of 22 bills in the House body, four were enacted. Federal news records the top income tax rate at 37 percent from January 1, 2026.

One death was recorded, on November 6, 2025. The player, Monique Sweeney, ended the year as a front desk clerk with $12,009 in cash. The file records no action by her.

## Things that need a why

1. **Six state and federal seats vacated, none filled on record**
   - **What:** Six seat-vacated records with cause "moved away" and rule "special-election": upper 006 (July 1, 2025), lower 081 (November 1, 2025), U.S. House 10 (November 1, 2025), lower 024 (December 1, 2025), lower 029 (January 1, 2026), upper 003 (January 1, 2026). The dump shows no contest, filing, appointment or fill for any of them. `elections.vacancies` is an unregistered module table, and `contests` shows 0 of 32.
   - **Record ids:** `seat:US-TX:upper:006:0`, `seat:US-TX:lower:081:0`, `seat:US-TX:us-house:10`, `seat:US-TX:lower:024:0`, `seat:US-TX:lower:029:0`, `seat:US-TX:upper:003:0`
   - **Line:** 444-449, 388-390
   - **Cause:** `src/core2/modules/offices.ts:922-998` (`fillVacancy`) — a `special-election` vacancy stays empty until the date from `specialElectionDate` (`src/core2/elections-calendar.ts:651-685`: the next November general, a set number of days, or an estimate); for a seat that does not cover the town `specialContestFor` returns null (`src/core2/modules/elections.ts:399-400`), so the seat is filled only by the calendar stand-in on that date (`offices.ts:1000-1048`), usually after the year ends; and `src/core2/modules/moves.ts:702-715` emits `person.moved-away` with `publicRecord: false` and no news, so `retainLog` (`src/core2/state.ts:690-715`) keeps only moves in the player's circle, while every mover who holds a seat still vacates it through `offices.ts:138-146`; one departure covers the mover and the household members who go with them (`moves.ts:596-607`) (verified).

2. **No election record at all**
   - **What:** The contests table reports 0 of 32 rows. The year counts show no election kind; `election-ish kinds: official-appointed=1` is the only one. Seventeen federal and state filings (`candidate-filed=17` in the dump, `29` in the year counts) all point to contests dated November 3, 2026. No contest dated November 2025 appears, and no local election for November 2025 is recorded. The board seat 4 contest is also dated November 3, 2026.
   - **Record ids:** `contest:seat:US-TX:governor:2026-11-03`, `contest:seat:US-TX:us-senate:1:2026-11-03`, `filing:contest:seat:gus2025:113510:board:4:2026-11-03:official:term:seat:gus2025:113510:board:4:2025-01-20`
   - **Line:** 388, 462-479, 237
   - **Cause:** `scripts/trace/viewer.ts:209-211` (`high`, `:233`) keeps a contest only if the first 400 characters of its JSON match a state or federal pattern and its id has no `gus2025`; `contestFor` writes the dates and sources before the `id` key (`src/core2/modules/elections.ts:359-362`), so statewide rows can fall outside those 400 characters, and every local row is dropped by the id test; the contest rows themselves were not inspected. No 2025 contest exists because `nextElectionForSeat` picks the last election before each seat's term end (`src/core2/elections-calendar.ts:512-534`), which for these Texas offices is the 2026 general, and `fileStandingCandidates` files a year ahead of it (`voting.ts:937-1030`) (verified).

3. **Board and council measure ids collide on the same day**
   - **What:** On February 4 and February 19, 2025, the board and council both use measureIds 2025-001 to 2025-003 and 2025-011 for different questions. Measure 2025-001 on February 4 is "limit-groundwater-withdrawal" (lines 15-21) and "ban-discrimination-in-housing-and-work" (lines 58-60). Measure 2025-002 is "ban-discrimination" (lines 24-30) and "raise-minimum-wage" (lines 61-63). Measure 2025-003 is "paid-family-leave" (lines 33-40) and "legalize-cannabis-sales" (lines 64-66). Measure 2025-011 is "legalize-cannabis-sales" (lines 75-81) and "limit-groundwater-withdrawal" (lines 123-125). Votes cannot be tied to a bill by measureId.
   - **Record ids:** measureId `2025-001`, `2025-002`, `2025-003`, `2025-011`; billId `bill:office:gus2025:113510:board:2025-02-04:person_b62acde2fdfc39ff:0`; billId `bill:office:gus2025:194825:council:2025-02-19:person_db3f1fefcd90be0f:24`
   - **Line:** 15-21, 24-30, 33-40, 58-66, 75-81, 123-125
   - **Cause:** `src/core2/modules/legislature.ts:750-757` (`nextNumber`) numbers bills `<year>-<NNN>` from a counter kept per body and year, so each body restarts at 2025-001 and one number names different bills in different bodies; `src/core2/modules/record.ts:74` keys vote records by `vote:<number>:<person>` with no body (verified).

4. **Federal budget line values look wrong in size or unit**
   - **What:** The veterans line change is deltaMinor -11082993745461, which is -$110.8 billion if minor units are cents or -$11.08 trillion if dollars. The file does not state the unit. The sample federal budget bill lists otherPrograms at -125269881832. The same bill carries 10 authority entries against 3 provisions.
   - **Record ids:** `budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15`; `bill:office:US-TX:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:102`
   - **Line:** 284-287, 437
   - **Cause:** `src/core2/law-reach/group-b.ts:284-298` (`balanced-budget`) with `balancePlan` (`src/core2/law-reach/group-b-money.ts:427-445`) — a balanced-budget law cuts every non-interest line by the same ratio of the spending-revenue gap, in minor units (cents); the viewer prints the raw `deltaMinor`, so -1.1e13 is about -$110 billion, a plausible size for a federal line; and `src/core2/modules/legislature.ts:513-518` (`executivePriorities`) — each line's change is `amount × share × personStance(lean, line)`, so a line the executive's lean is against comes out negative, in minor units (cents) of a national budget; and `src/core2/modules/legislature.ts:362-390` (`councilBudget`) — when the first budget vote fails, the loop drops the line the opponents in the failing chamber object to most and revotes until it passes, and the executive proposes a change on every line (`executivePriorities`, `:513-518`), so several dropped lines are the expected result; the adopted bill keeps only the surviving provisions (`:415`) while its `authority` list keeps the original entries (`draftBill`, `:810-827`) (verified).

5. **Population, deaths and organizations do not reconcile**
   - **What:** People rose from 1,708 to 1,793, yet the year counts show one life.death, no birth kind and no arrival kind. Alive is 1,789, which implies four people not alive, but only one death is logged. Organizations rose from 120 to 182 with organization.founded=1, while organization.closed=6 and business.closed=6.
   - **Record ids:** `life.death:person_bd829a4c71634c66:2025-11-06`; organization.founded (one record; id not in file)
   - **Line:** 1, 4, 5, 214, 293-300
   - **Cause:** people are added with no birth or arrival record through `fillInIdentity` — named officials (`src/core2/modules/officials.ts:604,1275`), press staff (`src/core2/press-staff.ts:181`), staff seats (`src/core2/modules/staff.ts:539`) and counted residents filled in on meeting — while newborns come from `src/core2/modules/renewal.ts` (`buildNewborn`); deaths and moves are dropped by `retainLog` (`state.ts:690-715`); the split of the net change was not counted; and `src/core2/state.ts:1604-1631` (`addOrganization`) writes organizations silently; campaign committees (`src/core2/modules/campaigns.ts:362,870,1500`), cause groups (`src/core2/modules/drives.ts:1383`), interest groups (`src/core2/modules/interest-groups.ts:203,469`) and press outlets (`src/core2/modules/press.ts:418`) are created through it with no `organization.founded` record (only the business engine emits one, `business.ts:1366`); and `src/core2/modules/offices.ts:132-137` vacates the seat with cause "death" from the `life.death` event (`src/core2/modules/health.ts:438-460`), but `src/core2/state.ts:690-715` (`retainLog`) keeps an event only if it is in the player's circle, a public record in a visible place, or news, and `caseEvent` (`health.ts:362-386`) sets none of those, so the death record is dropped and the viewer's `deaths:` count (`scripts/trace/viewer.ts:98-99`) reads 0 (verified).

6. **person.acted is 70 percent of all records**
   - **What:** person.acted=9684 of 13,896 records (70 percent). cause.shared=1399 and speech.retold=508 are also high. The file shows no person.acted record id, only the kind count.
   - **Record ids:** person.acted (kind; no sample id in file); `speech:party-meeting:party:US-TX:republican:2026-01-15:retold:person_91927d22e1e11257`
   - **Line:** 5, 219-226
   - **Cause:** `src/core2/state.ts:1329-1334` and `:1418-1436` (`recordAct` in `coreAPI`) — every act by a person in `focusPersonIds` is kept as a `person.acted` record, and the bench sets the focus to the player, family, known people, household and coworkers (`src/bench/world.ts:244`, `src/core2/focus.ts:4-20`); `src/core2/work-attendance.ts:1090` and `src/core2/act-cash.ts:207` write the same kind for pay and cash acts; the viewer prints only the kind count (`scripts/trace/viewer.ts:73-79`). The viewer prints record kinds as counts only (`viewer.ts:73-79`) and traces at most 12 kinds (`:119-127`), so no `person.acted` id appears (verified).

7. **Committee tallies are constant and committee is always "general"**
   - **What:** All 22 committee-hearing records shown total 11 members (yes plus no), for example 11-0, 10-1, 7-4, 6-5. The committee field is "general" on every record. Only two chair ids appear: `official:term:seat:US-TX:lower:072:0:2025-01-20` and `official:term:seat:US-TX:upper:027:0:2025-01-20`. The year count is committee-hearing=50.
   - **Record ids:** billId `bill:office:US-TX:legislature-lower:2025-06-02:official:term:seat:US-TX:lower:051:0:2025-01-20:29` (yes 11, no 0)
   - **Line:** 148-211 (committee-hearing lines), 5
   - **Cause:** `src/core2/modules/legislature.ts:1791-1927` (`committeeStage`) — every bill in a chamber goes to the same seniority-ranked roster, sized by `committeeSize` and split by party ratio, with the same chair (`:1801-1860`), and each member votes yes or no from `memberPosition` (`:1907-1916`), so bills on similarly dividing questions get the same tally; the committee name comes from `committeeFor` (`:1768-1777`), which returns "general" unless the first provision is a budget line, a tax or a minimum wage. All 22 hearings total 11 because the committee size is a fixed parameter and each member votes yes or no (verified).

8. **One date carries most of the state and federal bills**
   - **What:** 52 House bills are dated June 2, 2025, and every committee hearing and state vote shown is dated June 2, 2025. 21 U.S. House bills are dated December 15, 2025, the same day as three federal news items.
   - **Record ids:** `bill:office:US-TX:legislature-lower:2025-06-02:official:term:seat:US-TX:lower:051:0:2025-01-20:29`; `bill:office:US-TX:us-house:2025-12-15:official:seat:US-WA:us-house:01:123`
   - **Line:** 148-213, 407, 410, 9-11
   - **Cause:** `src/core2/modules/world-legislating.ts:613-692` (`endOfSession`) and `:433-579` (`holdSession`) — a session drafts and votes all its bills on its one scheduled floor day (`scheduleSession` `:190-215`; states from the session table `:108-121`, Congress `congressAgendaDate` `:167-173`, a town body's regular meeting `:721-760`), so dozens of bills share one introduction date (verified).

9. **Vote totals never change: no absences anywhere**
   - **What:** All 10 board legislative votes in the sample total 7 members (4-3, 3-4, 2-5, and so on). All 22 state legislative-vote lines total 150 (lower) or 31 (upper). No absence is recorded in any vote.
   - **Record ids:** billId `bill:office:gus2025:113510:board:2025-02-04:person_b62acde2fdfc39ff:0` (yes 4, no 3); billId `bill:office:US-TX:legislature-lower:2025-06-02:official:term:seat:US-TX:lower:127:0:2025-01-20:32` (lower 128-22, upper 27-4)
   - **Line:** 22-118, 150-213
   - **Cause:** `src/core2/modules/legislature.ts:1676-1722` (`chamberVote`) — each member's vote is the sign of `memberPosition(...).total` (zero abstains) and nothing is random, so bills on questions that divide a chamber the same way get the same count from the same members. There is no absence concept in the vote rule; a member is only yes, no or abstain (zero position) (verified).

10. **Budget vote arithmetic does not match the chamber**

- **What:** The state budget vote "88-62, 19-11" sums to 30 in the Senate, which has 31 seats. The federal vote "256-177" sums to 433 in the House, which has 435 seats, yet no House vacancy is recorded before November 1, 2025.
- **Record ids:** budget-adopted `governmentId US-TX fiscalYear 2025` (adopted September 1, 2025); budget-adopted `governmentId US fiscalYear 2025` (adopted October 1, 2025); `seat:US-TX:us-house:10` (first vacancy, November 1, 2025)
- **Line:** 343, 444-453
- **Cause:** `src/core2/modules/legislature.ts:326-345` (`councilBudget` `roll`) and `:1689-1696` (`chamberVote`) — a member whose total is exactly zero abstains, and `members` (`:906-922`) counts only serving terms, so yes plus no can be below the seat count when a seat is vacant or a member abstains. Texas's Senate has 31 seats but upper seat 006 was vacated July 1 under the special-election rule with no interim holder (`offices.ts:922-998`), so only 30 serve on the September 1 budget vote; the 433 federal total is two House members with a zero position abstaining (verified).

11. **Federal House bill attributed to a Texas body with out-of-state sponsor and chair**

- **What:** The traced bill sits in the Texas U.S. House office but is sponsored by a Washington seat and chaired by a Louisiana seat. It has 0 yes and 0 no and was held in committee. The `us-house` office is Texas-jurisdiction with 38 seats. Its 21 bills dated December 15, 2025 are the same batch.
- **Record ids:** `bill:office:US-TX:us-house:2025-12-15:official:seat:US-WA:us-house:01:123`; chair `official:seat:US-LA:us-house:05`
- **Line:** 275-282, 410
- **Cause:** `src/core2/modules/world-legislating.ts:258-272` (`houseOffice`) and `:638-662` (`endOfSession`) — Congress's yearly session is held through the first `us-house` office found (the player's state delegation), with every member of the House and Senate as filers (`members(api, FEDERAL_HOUSE)`), so federal bills are filed under `office:US-XX:us-house` with sponsors, chairs and voters from other states (`congressMembers`, `src/core2/modules/legislature.ts:953`); and `src/core2/modules/legislature.ts:1861-1868` and `:1907-1913` (`committeeStage`) — when the chair does not hold a hearing (`heard` is false) the yes and no counts are never computed, so the record is written as `bill-held-in-committee` (`:1932`) with yes 0 and no 0, and `holdVote` fails the bill at `:1980-1984` (verified).

12. **Mislabeled record and count mismatches**

- **What:** A federal House record dated December 15, 2025 carries the key "council-president", which is a local office. Year count `chamber-organized=3` (5 in the federal and state dump, plus the local one on February 4, 2025). Year count `law-took-effect=38` against 37 federal and state records, plus two city laws and one county law in the file, which makes 40.
- **Record ids:** `official:term:seat:US-TX:us-house:02:2025-01-20` (key council-president, December 15, 2025); chamber-organized council-president `person_45bf8ed970af887a` (February 4, 2025); `law:place:4848072:city:us-policy-positions:civil-family-community.ban-discrimination-in-housing-and-work:general:2025-03-06:2025-001`
- **Line:** 5, 14, 138-139, 249, 441, 455, 460
- **Cause:** `src/core2/modules/world-legislating.ts:638-648` asks `leaderOf` for the town's `us-house` office id, and `src/core2/modules/leadership.ts:113-138` (`templateOf`) has no branch for a `us-house` office, so it falls through to the council template whose presiding post is `council-president`; `organize` then emits `chamber-organized` with that key (`leadership.ts:400-423`) for a congressional delegation. The count mismatches come from the viewer: the year line counts all records of a kind (`viewer.ts:71-79`) while the dump counts only records whose facts or id match a state or federal pattern (`:278-282`, `:309-311`) (verified).

13. **Moves counted as six vacancies but one person record**

- **What:** Six seat-vacated records carry cause "moved away", but the year counts show person.moved-away=1.
- **Record ids:** `seat:US-TX:upper:006:0` (July 1, 2025); person.moved-away (kind; one record, id not in file)
- **Line:** 5, 444-449
- **Cause:** `src/core2/modules/moves.ts:702-715` emits `person.moved-away` with `publicRecord: false` and no news, so `retainLog` (`src/core2/state.ts:690-715`) keeps only moves in the player's circle, while every mover who holds a seat still vacates it through `offices.ts:138-146`; one departure covers the mover and the household members who go with them (`moves.ts:596-607`) (verified).

14. **Eight module tables not registered in the dump**

- **What:** These tables print as "Unregistered module table": elections.vacancies, voting.contests, voting.filings, voting.campaigns, executive.offices, executive.terms, legislature.governments, legislature.budgets. Local government, executive, campaign and vacancy records cannot be checked from the file.
- **Record ids:** none (tables not registered)
- **Line:** 390-405
- **Cause:** `scripts/trace/viewer.ts:234-241` (`dump`) — the viewer asks for module and table names that do not match where the tables are registered (vacancies: `src/core2/modules/offices.ts:111-131`; contests and filings: `src/core2/modules/elections.ts:116-128`; campaigns: `src/core2/modules/campaigns.ts:213`; executive offices and terms: the offices tables, because the executive module registers only appointments, orders, desk and review at `src/core2/modules/executive.ts:95-100`; governments and budgets: `src/core2/modules/budgets.ts:166-167`), so `dump` (`viewer.ts:194-208`) prints "Unregistered module table"; the game holds the data, the viewer asked the wrong module (verified).

15. **County property-tax law has no traced cause**

- **What:** The county law effective January 1, 2026 replaces a "from-start" law. The trace shows the law, the county government and the treasury, but no vote, budget or other record that caused the change.
- **Record ids:** `law:county:48329:county:property-tax:general:2026-01-01`; `law:county:48329:county:property-tax:general:2026-01-01:from-start`
- **Line:** 246-255
- **Cause:** Not a defect: `src/core2/laws-starting.ts:136-165` (`propertyTaxRows`) — the county property-tax law is a dated data row (effective 2026-01-01, from the ACS estimate) and `laws.ts:96-104` fires `law-took-effect` on that date, replacing the `:from-start` carry-back row (`laws.ts:225-254`); it is data, not an enacted measure, so no vote or board record exists (verified).

16. **Three closures cite cash exhaustion; source trace ends at "opening"**

- **What:** Three businesses closed with reason finance.unfunded-obligation-cash-and-credit-exhausted, each sourced to a payroll calendar. The owner-closed business traced at October 1, 2025 has its source resolved to "opening [core2-officials-v1.loaded]", not to an owner decision record. Why the cash ran out is not in the file.
- **Record ids:** `organization_507e99fea3adae57` (March 25, 2025); `organization_3f9763e0640197dc` (May 24, 2025); `organization_0a7d3dbb7503762d` (May 29, 2025); `organization_4abefd30f4490a5d` (October 1, 2025)
- **Line:** 140-145, 302-307
- **Cause:** `src/core2/modules/business.ts:603-608` — an owner who closes by choice records "losses-kept" when the business carried losses, else "owner-retiring" (`src/core2/data/business/business.json:48-52`), and `src/core2/finance-state.ts:1518-1530` names the closing receipt `owner-closed:<date>:<org>`; the reason and the closure source are two different fields, not two reasons; and `src/bench/dev-trace.ts:42-79` (`findRecord`) resolves any string to the first module row with that id, the organization's source text is the word "opening", and `src/core2/modules/officials.ts:526` writes a row with id "opening" in `core2-officials-v1.loaded`, so the trace ends at that unrelated row instead of a business record. Forced closures take their reason key from the finance engine that closes the business (`src/core2/finance-state.ts:1380-1397`) (verified).

17. **Trace defects: duplicate learned lines and truncated fields**

- **What:** The speech.retold trace repeats the same learned line three times. The speech.heard trace repeats the same learned line about seven times across its eight witnesses. The bill-vote trace repeats the same "billId" learned line five times. The campaign-message trace lists campaignId twice. Trace text is cut off mid-field in several places. No "trace failed" line appears.
- **Record ids:** `speech:party-meeting:party:US-TX:republican:2026-01-15:retold:person_91927d22e1e11257`; `speech:party-meeting:party:US-TX:republican:2026-01-15`; `bill-vote:bill:office:gus2025:194825:council:2025-12-31:person_a68bf958ef81d0da:126:office:gus2025:194825:council`; `life.death:person_bd829a4c71634c66:2025-11-06` (cut off)
- **Line:** 219-226, 230-235, 244, 257-264, 300, 138-139
- **Cause:** `scripts/trace/viewer.ts:153-161` cuts each child value to 160 characters and the list to 1,500, and prints `kind:via=value` without the child's id, so ids run off the line and the same fact shown for several different people reads as a repeat; and `src/bench/dev-trace.ts:202-218` (`learnedOf`) adds one child per person who learned the record, each with the same fact key, and `scripts/trace/viewer.ts:158` omits the person id, so one fact appears many times; and `scripts/trace/viewer.ts:180-193` (`slim`) cuts any field whose JSON is over 220 characters to 200 plus "…" (a vacancy-rule object longer than that prints as an escaped, cut-off string) and `:204` cuts each row to 700 characters (verified).

18. **Office data: railroad seat count and vacancy rules**

- **What:** The Railroad Commission title says "3 members, statewide", but seats is 1. The vacancyRule field is an escaped JSON string on eight offices and an object on the rest, and all eight strings are cut off with "…".
- **Record ids:** `office:US-TX:railroad-commission`; `office:US-TX:governor`
- **Line:** 332-344
- **Cause:** `scripts/trace/viewer.ts:180-193` (`slim`) cuts any field whose JSON is over 220 characters to 200 plus "…" (a vacancy-rule object longer than that prints as an escaped, cut-off string) and `:204` cuts each row to 700 characters. The Railroad Commission's `seats: 1` is hard-coded for every researched executive office (`src/core2/offices-state.ts:494`) while its title text comes from the research row, so the two disagree (verified).

19. **The player has no records in the file**

- **What:** The player's record shows front desk clerk, cash $12,009 and home `household_af8abfd5dd9d0302` at year end. The start cash and any income or action records are not in the file, so it cannot be told whether the player did anything this year. The player was 17 at the start (born January 23, 2007).
- **Record ids:** `person_486b81c184cd2e17`; `household_af8abfd5dd9d0302`
- **Line:** 2, 217
- **Cause:** Not a defect: `scripts/trace/viewer.ts:41-44,112-115` selects the player but never issues a command and prints only the final player state, and no engine acts for the player (`chamberVote` abstains for the player, `src/core2/modules/legislature.ts:1689-1691`), so no player-directed record exists (verified).

## Levels at a glance

- **Local:** Board and council recorded 52 bills (board 23, council 29), with 8 enacted, 44 failed or vetoed, and 2 city laws in effect. Works with gap: measureIds collide across the board and council (item 3), no local election is recorded for 2025, and per-bill outcomes are not in the file.
- **State:** The House introduced 52 bills on June 2, 2025, and enacted 17 of 53 for the year; the budget was adopted September 1, 2025. Works with gap: six seats vacated with no special election or appointment on record (item 1), constant committee tallies (item 7), and the executive and vacancy tables are not registered (item 14).
- **Federal:** Congress adopted the budget on October 1, 2025, and the House body enacted 4 of 22 bills; federal news recorded budget lines and laws in effect. Works with gap: the budget unit and magnitude need checking (item 4), a Texas-body bill has out-of-state sponsor and chair (item 11), and the House vote totals imply two unrecorded members (item 10).

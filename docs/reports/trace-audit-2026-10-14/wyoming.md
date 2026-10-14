# Wyoming: Ranchettes' board enacted 1 of 25 bills, the state enacted 17 and Congress 3, and no election was recorded

Ranchettes, Wyoming · seed 171cc24ba5ed · start January 20, 2025 · 1,683 people and 124 organizations at start; 1,747 alive (1,749 total) and 154 organizations at end · year run 84 seconds

## The year in Ranchettes

The town board (office:gus2025:115476:board) introduced 25 bills between February 4 and December 1, 2025, and enacted one. Its council president was seated on February 4, 2025. Vote lines cover nine measures, five on February 4 and four on February 19. Seven of the nine drew no yes votes.

The state legislature recorded floor votes on 16 measures on March 6, 2025. House yes votes ranged from 54 to 61 and Senate yes votes from 27 to 29. Committees held 25 further bills with no vote. Five state laws took effect June 4, 2025, on property-tax growth, private-school funding, groundwater withdrawal, the handgun purchase age and photo ID to vote. The state budget was adopted July 1, 2025. Four state seats were vacated by people moving away, on June 1, October 1 and two on November 1, 2025. No replacement is recorded.

Congress adopted the 2025 federal budget on October 1, 2025, with seven budget lines dropped. Three House bills were enacted and 23 failed. A House bill drew a 54-to-46 Senate vote on December 15, 2025. On January 1, 2026, the federal top income-tax rate of 37 percent took effect.

No election, contest or filing is recorded. Two businesses closed, one on June 1, 2025 and one on October 1, 2025. A county property-tax law took effect January 1, 2026, at 0.568 percent of home value. No deaths are recorded. The player character, Frances Witt, was a server with $1,321 in cash and alive at year end. No record names her as acting.

## Things that need a why

1. **Seven of nine board measures drew zero yes votes, and the public-comment tallies are identical.**
   - **What:** Measures 2025-003, 2025-004, 2025-005, 2025-010, 2025-011, 2025-012 and 2025-013 each recorded six no votes and no yes votes. Measure 2025-001 recorded 2 yes and 4 no, and 2025-002 recorded 1 yes and 5 no. Four February 19, 2025 public-comment records each show "for":"0","against":"6".
   - **Record ids:** measureId 2025-003, 2025-010, 2025-013; billId `bill:office:gus2025:115476:board:2025-02-19:person_9223fb06831a0060:9` (also :10, :11, :12)
   - **Line:** 14-71 (votes), 44, 51, 58, 65 (public comment)
   - **Cause:** not found — `src/core2/modules/legislature.ts:1676-1722` (`chamberVote`) gives the count rule and `world-legislating.ts:395-409` (`filingReason`) why a member files, but why a bill's own sponsor and cosponsors vote no on it (six no and no yes) was not traced without a run; this is an open lead. The identical comment counts are explained by `meetings.ts:244-271` (`publicComment`): speakers are the most intense views, cut to a fixed number.

2. **Fifteen of 25 board bills have no vote line in the file.**
   - **What:** Nine bills were introduced February 4, 2025, but only measures 2025-001 to 2025-005 have votes. The May 20, 2025 bill (2025-014) has 3 vote lines where the other measures have 6. Bills introduced July 1, July 19, August 18 (4), September 2 (4) and December 1, 2025 have no vote lines. Ten bills in total have any vote line.
   - **Record ids:** measureId 2025-014; `office:gus2025:115476:board` introduced `2025-07-01`, `2025-07-19`, `2025-08-18`, `2025-09-02`, `2025-12-01`
   - **Line:** 14-43, 202-204, 398-405
   - **Cause:** `src/core2/modules/world-legislating.ts:560-565,590-602` — a local meeting has `floorDays: 1` and `billsPerFloorDay` = agenda minutes over ordinance minutes (`:752-756`), so only that many bills reach a vote (`reached = index < floorTime`) and the rest die on the calendar (`dieOnCalendar`) with no vote line (verified).

3. **State vote totals repeat exactly across bills.**
   - **What:** The lower chamber recorded 56 yes and 6 no on 12 of 16 measures from March 6, 2025 (2025-001, -002, -003, -005, -006, -007, -008, -009, -010, -013, -015, -016). The upper chamber recorded 29 yes and 2 no on 10 of 16. Other lower totals were 57-5, 61-1, 58-4 and 54-8. Other upper totals were 28-3 and 27-4.
   - **Record ids:** billId `bill:office:US-WY:legislature-lower:2025-03-06:official:term:seat:US-WY:lower:009:0:2025-01-20:13` (measure 2025-001); billId `...:lower:009:0:2025-01-20:21` (measure 2025-009)
   - **Line:** 75, 78, 81, 84, 87, 90, 96, 99, 102, 105, 108, 111, 114, 117, 120, 123, 126, 129, 147, 159, 162, 165
   - **Cause:** `src/core2/modules/legislature.ts:1676-1722` (`chamberVote`) — each member's vote is the sign of `memberPosition(...).total` (zero abstains) and nothing is random, so bills on questions that divide a chamber the same way get the same count from the same members (verified).

4. **Committee tallies repeat, and 25 held bills show 0-0.**
   - **What:** The lower committee chair (`official:term:seat:US-WY:lower:022:0:2025-01-20`) recorded 10 yes and 1 no on hearings for bills 2025-001 to 2025-016, except one 11-0 hearing. The upper chair (`official:term:seat:US-WY:upper:011:0:2025-01-20`) recorded 10-1 on the same bills. Twenty-five bills were held with yes 0 and no 0. Other hearings were 1-10 (six), 2-9 (one) and 5-6 (one).
   - **Record ids:** billId `bill:office:US-WY:legislature-lower:2025-03-06:official:term:seat:US-WY:lower:033:0:2025-01-20:35` (held, 0-0); billId `...:lower:033:0:2025-01-20:31` (hearing, 1-10)
   - **Line:** 73-166 (hearings), 133 (11-0), 169-174, 191, 201 (other hearings), 175-190 and 192-200 (held)
   - **Cause:** `src/core2/modules/legislature.ts:1791-1927` (`committeeStage`) — every bill in a chamber goes to the same seniority-ranked roster, sized by `committeeSize` and split by party ratio, with the same chair (`:1801-1860`), and each member votes yes or no from `memberPosition` (`:1907-1916`), so bills on similarly dividing questions get the same tally; the committee name comes from `committeeFor` (`:1768-1777`), which returns "general" unless the first provision is a budget line, a tax or a minimum wage; and `src/core2/modules/legislature.ts:1861-1868` and `:1907-1913` (`committeeStage`) — when the chair does not hold a hearing (`heard` is false) the yes and no counts are never computed, so the record is written as `bill-held-in-committee` (`:1932`) with yes 0 and no 0, and `holdVote` fails the bill at `:1980-1984` (verified).

5. **Measure numbers are reused across bodies, and state votes are doubled.**
   - **What:** measureId "2025-001" names four different things.
     - It is a board measure on federal immigration enforcement (February 4, 2025).
     - It is a state measure on property-tax growth (March 6, 2025).
     - It is a federal budget bill number and a federal House bill number.
   - measureId "2025-014" is a state measure on juvenile court age (line 152) and a board measure on civilian oversight (line 202).
   - **What, continued:** Each state measure's vote line is written twice with identical text. The second line of each pair adds no new vote.
   - **Record ids:** measureId 2025-001 (lines 14, 74, 305, 414); measureId 2025-014 (lines 152, 202); identical pairs for 2025-001, 2025-002, 2025-005, 2025-007 and 2025-011
   - **Line:** 14-15, 74 and 77, 80 and 83, 98 and 101, 110 and 113, 134 and 137, 152, 202, 305, 414
   - **Cause:** `src/core2/modules/legislature.ts:750-757` (`nextNumber`) numbers bills `<year>-<NNN>` from a counter kept per body and year, so each body restarts at 2025-001 and one number names different bills in different bodies; `src/core2/modules/record.ts:74` keys vote records by `vote:<number>:<person>` with no body. Each state measure has two vote lines because `chamberVote` emits one `legislative-vote` per chamber (`legislature.ts:1724-1745`); the lines differ only in the `chamber` field (lower and upper), which the viewer shows (verified).

6. **Four vacated state seats have no fill record, and a minority whip sits in an ended term.**
   - **What:** Four state seats were vacated under the rule "appointment." The file has no appointment, successor or special-election record for any of them. The upper-chamber minority whip is `official:term:seat:US-WY:upper:009:0:2025-01-20`, but the only listed term for that seat ended January 1, 2025, before the year began.
   - **Record ids:** seat:US-WY:lower:009:0 (June 1, 2025); seat:US-WY:upper:012:0 (October 1, 2025); seat:US-WY:lower:050:0 (November 1, 2025); seat:US-WY:upper:026:0 (November 1, 2025); `term:seat:US-WY:upper:009:0:2025-01-20:past:1`
   - **Line:** 207, 372, 420-424, 434
   - **Cause:** `src/core2/modules/offices.ts:861-907` (`appoint` in `fillVacancy`) — an `appointment` vacancy is filled the same day with a new `serving` term (a town resident from `suitedResidents` `:256-283`, or a drawn official from `seatNamedOfficial` `:304-370`), but `appoint` emits no `official-appointed` or `took-office` record (the only emit in `vacateSeat` is `seat-vacated`, `:826`), so the fill is invisible in the log and the chamber's member count does not drop. The whip's term is missing because the viewer prints only 12 rows of the lower and upper terms (`scripts/trace/viewer.ts:227-232`) (verified).

7. **Chamber-organized count disagrees with the dump, and a House entry uses the council key.**
   - **What:** The summary records chamber-organized=2 (line 5). The dump lists five federal and state entries (lines 431-435) plus the board entry on February 4, 2025 (line 13). The December 15, 2025 entry for the U.S. House (line 435) uses the "council-president" key, which is the key the town board uses.
   - **Record ids:** `official:term:seat:US-WY:us-house:00:2025-01-20` (line 435); person_1d2e4fa7316fa612 (line 13); `official:term:seat:US-WY:lower:003:0:2025-01-20` (line 433)
   - **Line:** 5, 13, 431-435
   - **Cause:** `src/core2/modules/world-legislating.ts:638-648` asks `leaderOf` for the town's `us-house` office id, and `src/core2/modules/leadership.ts:113-138` (`templateOf`) has no branch for a `us-house` office, so it falls through to the council template whose presiding post is `council-president`; `organize` then emits `chamber-organized` with that key (`leadership.ts:400-423`) for a congressional delegation. The count of 2 is this year's records only (`viewer.ts:71-79`) while the dump lists all-time records that match a state pattern (`:306-319`) (verified).

8. **Federal House bills carry seats from other states.**
   - **What:** office:US-WY:us-house has one seat (line 324). A December 15, 2025 bill names New York House seat 18 as sponsor and Wisconsin House seat 03 as committee chair (line 249). Another names Georgia House seat 09 and records a Senate vote of 54 yes and 46 no (line 258). A senator from Alaska appears among its voters (lines 259, 262).
   - **Record ids:** billId `bill:office:US-WY:us-house:2025-12-15:official:seat:US-NY:us-house:18:100`; `official:seat:US-WI:us-house:03`; billId `bill:office:US-WY:us-house:2025-12-15:official:seat:US-GA:us-house:09:80`; `official:seat:US-AK:us-senate:0`
   - **Line:** 249, 255-259, 262, 324
   - **Cause:** `src/core2/modules/world-legislating.ts:258-272` (`houseOffice`) and `:638-662` (`endOfSession`) — Congress's yearly session is held through the first `us-house` office found (the player's state delegation), with every member of the House and Senate as filers (`members(api, FEDERAL_HOUSE)`), so federal bills are filed under `office:US-XX:us-house` with sponsors, chairs and voters from other states (`congressMembers`, `src/core2/modules/legislature.ts:953`) (verified).

9. **Law and budget counts do not match the enacted bills.**
   - **What:** law-took-effect is recorded 29 times (line 5) and 28 times in the federal and state dump (line 418). Enacted bills total 21: 17 state lower, 3 federal House and 1 board (lines 407, 409, 411). budget-adopted is recorded 3 times (line 5) but the dump lists 2 (lines 426-428).
   - **Record ids:** lawId `law:US-WY:state:us-policy-positions:fiscal.cap-property-tax-growth:general:2025-06-04:2025-001`; `budget-adopted:budget:US:2025`
   - **Line:** 5, 207-212, 407-411, 418, 426-428
   - **Cause:** `scripts/trace/viewer.ts:71-79` counts all of the year's records of a kind, while `:306-319` lists only those whose facts or id match a state or federal pattern and only the first 60, so the counts (29, 3) differ from the dump (28, 2); the enacted-bill total mixes state, federal and board bodies (verified).

10. **No election, contest or filing appears, and eight module tables are unregistered.**
    - **What:** "election-ish kinds" is blank. The elections contests table reads 0 of 24. Eight tables read "Unregistered module table": elections vacancies, voting contests, filings and campaigns, executive offices and terms, and legislature governments and budgets. The town board's election schedule cannot be checked from this file.
    - **Record ids:** core2-elections-v1.contests (0 of 24); core2-voting-v1.filings; core2-executive-v1.offices; core2-legislature-v1.budgets
    - **Line:** 214, 375-391

- **Cause:** `scripts/trace/viewer.ts:234-241` (`dump`) — the viewer asks for module and table names that do not match where the tables are registered (vacancies: `src/core2/modules/offices.ts:111-131`; contests and filings: `src/core2/modules/elections.ts:116-128`; campaigns: `src/core2/modules/campaigns.ts:213`; executive offices and terms: the offices tables, because the executive module registers only appointments, orders, desk and review at `src/core2/modules/executive.ts:95-100`; governments and budgets: `src/core2/modules/budgets.ts:166-167`), so `dump` (`viewer.ts:194-208`) prints "Unregistered module table"; the game holds the data, the viewer asked the wrong module; and `scripts/trace/viewer.ts:209-211` (`high`, `:233`) keeps a contest only if the first 400 characters of its JSON match a state or federal pattern and its id has no `gus2025`; `contestFor` writes the dates and sources before the `id` key (`src/core2/modules/elections.ts:359-362`), so statewide rows can fall outside those 400 characters, and every local row is dropped by the id test; the contest rows themselves were not inspected (verified).

11. **person.acted is three-quarters of all records.**
    - **What:** person.acted=14125 of 18932 records (74.6 percent). The next largest kind is cause.shared=1600.
    - **Record ids:** kind person.acted
    - **Line:** 5

- **Cause:** `src/core2/state.ts:1329-1334` and `:1418-1436` (`recordAct` in `coreAPI`) — every act by a person in `focusPersonIds` is kept as a `person.acted` record, and the bench sets the focus to the player, family, known people, household and coworkers (`src/bench/world.ts:244`, `src/core2/focus.ts:4-20`); `src/core2/work-attendance.ts:1090` and `src/core2/act-cash.ts:207` write the same kind for pay and cash acts; the viewer prints only the kind count (`scripts/trace/viewer.ts:73-79`) (verified).

12. **People and organization counts rose with no arrival or opening record.**
    - **What:** People rose from 1,683 to 1,749 (+66) with zero deaths and one move-out (person_5899acf708890654, February 1, 2025). Organizations rose from 124 to 154 (+30). The records show no birth, arrival, business-opened or organization-founded kind.
    - **Record ids:** person_5899acf708890654; kind cause-group.founded=9 (a cause group, not an organization)
    - **Line:** 1, 4, 5, 213, 311-318

- **Cause:** people are added with no birth or arrival record through `fillInIdentity` — named officials (`src/core2/modules/officials.ts:604,1275`), press staff (`src/core2/press-staff.ts:181`), staff seats (`src/core2/modules/staff.ts:539`) and counted residents filled in on meeting — while newborns come from `src/core2/modules/renewal.ts` (`buildNewborn`); deaths and moves are dropped by `retainLog` (`state.ts:690-715`); the split of the net change was not counted; and `src/core2/state.ts:1604-1631` (`addOrganization`) writes organizations silently; campaign committees (`src/core2/modules/campaigns.ts:362,870,1500`), cause groups (`src/core2/modules/drives.ts:1383`), interest groups (`src/core2/modules/interest-groups.ts:203,469`) and press outlets (`src/core2/modules/press.ts:418`) are created through it with no `organization.founded` record (only the business engine emits one, `business.ts:1366`) (verified).

13. **One closure is visible, one is estimated from an opening, and an owner change is empty.**
    - **What:** organization.closed=2 and business.closed=2 are recorded (line 5). The visible closure is organization_7a074bb9d2ac840b, June 1, 2025, owner-closed, losses kept (lines 205-206). The second, organization_15018c321d341c05, closed October 1, 2025 and appears only in traces, with its source estimated from "opening" [core2-officials-v1.loaded] (lines 284-301, 289). The owner change on March 1, 2025 has an empty payload.
    - **Record ids:** organization_7a074bb9d2ac840b; organization_15018c321d341c05; `organization.owner-changed 2025-03-01 {}`
    - **Line:** 5, 72, 205-206, 284-301

- **Cause:** `src/core2/modules/business.ts:1366-1375` (`organization.founded`) and `:429-445` (`organization.owner-changed`) emit with no `facts` key (the organization id is in `topic`), so the viewer's `JSON.stringify(r.facts ?? {})` (`scripts/trace/viewer.ts:110,317`) prints `{}`. Only one closure is printed because the viewer picks one trace per kind (`viewer.ts:119-127`); the second closure's source text names the opening (`dev-trace.ts:42-79`) (verified).

14. **Federal budget values look wrong or lack units.**
    - **What:** The veterans budget line records deltaMinor=-11083112388939 (line 278). A sample federal bill records otherPrograms=-121315501890 (line 414). The line says "minor" units without naming them: the first value is about $11.1 trillion if read as dollars, or $110.8 billion if read as cents. The 2025 budget was adopted with seven lines dropped: nationalDefense, communityAndRegionalDevelopment, incomeSecurity, internationalAffairs, medicare, education, health (lines 305, 428).
    - **Record ids:** budgetId `budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15`; billId `bill:office:US-WY:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:74`; `budget-adopted:budget:US:2025`
    - **Line:** 278, 305, 414, 428

- **Cause:** Not a defect: `src/core2/law-reach/group-b.ts:284-298` (`balanced-budget`) with `balancePlan` (`src/core2/law-reach/group-b-money.ts:427-445`) — a balanced-budget law cuts every non-interest line by the same ratio of the spending-revenue gap, in minor units (cents); the viewer prints the raw `deltaMinor`, so -1.1e13 is about -$110 billion, a plausible size for a federal line; and `src/core2/modules/legislature.ts:513-518` (`executivePriorities`) — each line's change is `amount × share × personStance(lean, line)`, so a line the executive's lean is against comes out negative, in minor units (cents) of a national budget (verified).

15. **The player character recorded no action.**
    - **What:** person_9223fc06831a0213 (Frances Witt) appears only in the header and the player line: job Server, cash $1321, alive. No record names the player, and no cash change is recorded.
    - **Record ids:** person_9223fc06831a0213; household_50836b04b48fbb2d
    - **Line:** 2, 215

- **Cause:** Not a defect: `scripts/trace/viewer.ts:41-44,112-115` selects the player but never issues a command and prints only the final player state, and no engine acts for the player (`chamberVote` abstains for the player, `src/core2/modules/legislature.ts:1689-1691`), so no player-directed record exists (verified).

16. **Trace blocks show a wrong key and duplicated facts.**
    - **What:** The learned fact for a Senate vote is keyed "measureId" instead of an event key (line 271). The same learned:core.observe.perceived fact is listed four times for a retold speech (line 224) and repeatedly for a heard speech (line 233). The speaker of a party-meeting speech is a newspaper outlet head (line 229).
    - **Record ids:** `vote-recorded:vote:2025-006:official:term:seat:US-WY:us-senate:1:2025-01-20`; `speech:party-meeting:party:US-WY:republican:2026-01-15:retold:person_05af74bd213405fb`; `person:press:outlet:newspaper:3:jurisdiction_0d2f82d6417d27b9:head:0`
    - **Line:** 217-233, 266-273

- **Cause:** `src/bench/dev-trace.ts:202-218` (`learnedOf`) adds one child per person who learned the record, each with the same fact key, and `scripts/trace/viewer.ts:158` omits the person id, so one fact appears many times. The learned key is "measureId" because `record.ts:102-106` puts generic keys (`measureId`, `question`, `position`) in the fact map and the observe step stores the fact name, unlike event-scoped keys such as `health.ts:384`; the party-meeting speaker is chosen from all adult town residents, press staff included (`src/core2/modules/parties.ts:453-475,586`) (verified).

17. **Several dumps are truncated, and the news list is partial.**
    - **What:** The news list covers about 200 lines (13-212) for 347 news items, with no marker. Lines 208-212 end mid-field. Lines 323 and 326-331 end in "…". Dump headers show partial counts: offices 11 of 18 (line 320), seats 9 of 116 (line 333), terms 15 of 378 (line 344) and 309 of 378 (line 361). The law on line 208 has value "0" and a blank unit.
    - **Record ids:** lawId `law:US-WY:state:us-policy-positions:fiscal.cap-property-tax-growth:general:2025-06-04:2025-001`; office:US-WY:us-senate (line 323)
    - **Line:** 13-212, 208-212, 320-331, 333, 344, 361

- **Cause:** `scripts/trace/viewer.ts:96-97` prints at most the newest 200 local news items cut at 260 characters, `:204` prints at most `limit` rows of a table (400, 200, 60, 40 or 12) while its header counts all of them, and `:315` prints at most 60 rows per kind; and `scripts/trace/viewer.ts:180-193` (`slim`) cuts any field whose JSON is over 220 characters to 200 plus "…" (a vacancy-rule object longer than that prints as an escaped, cut-off string) and `:204` cuts each row to 700 characters (verified).

## Levels at a glance

- **Local:** The town board (office:gus2025:115476:board) introduced 25 bills, recorded votes on 10 of them, and enacted 1. works with gap: 15 bills have no vote line, and the government and budget tables are unregistered.
- **State:** Both chambers acted on 16 measures and 25 further bills were held, with 17 lower-chamber enactments and 5 laws in effect. works with gap: committee tallies repeat, four vacated seats have no fill record, and the executive and budget tables are unregistered.
- **Federal:** Congress adopted the 2025 budget, enacted 3 House bills and took Senate votes on 2025 House bills, and the news list shows tax and benefit values. works with gap: House bills carry out-of-state seats, and budget values lack units.

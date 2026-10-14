# Caldwell, Idaho: a board whose visible votes all failed, and a mayor elected 10,283 to 1

The visible board votes all failed, the mayor won 10,283 to 1, and the file records no deaths and no births. Several vote records, vacancies and counts do not match each other or the population, so this year needs checking before anyone relies on it.

## The year

On February 1, 2025, a council seat and the mayor's seat both emptied when their holders moved away. The file records no appointment to either seat.

On February 4, 2025, the council chose a council president and a mayor pro tem. The council voted on five bills that day. The first passed 3 to 2, and the other four failed 1 to 4. The board voted on five bills that day and passed none.

On February 19, 2025, a radio reporter is recorded as appointing the police chief. The council and board then voted on six more bills, and all six failed.

Ten public comments are shown for those two dates. Every one was against.

On April 26, 2025, the state House introduced 53 bills. All 16 House votes shown passed, most by 34 to 1 or 35 to 0.

Three state House seats emptied on June 1, 2025, November 1, 2025, and January 1, 2026. The file records no appointment to any of them.

On July 1, 2025, the state adopted its budget. The House voted 35 to 0, and the Senate voted 29 to 6.

On October 1, 2025, Congress adopted the federal budget. The House voted 251 to 182, and the Senate voted 71 to 29.

On November 4, 2025, voters elected a mayor and three council members. The mayor, person_bb5739bae59a23e0, won 10,283 to 1. Each council winner had between 10,953 and 12,102 votes, with no opponent listed.

The file records no deaths and no births. The population rose from 1,681 at the start to 1,766 at year end.

The player, Asher Walsh, is alive at year end with no job and $0 cash.

On December 15, 2025, 24 U.S. House bills were introduced. A chamber record from that day names a U.S. House seat as council president.

On January 1, 2026, a local business closed. A county property tax law also took effect, at 0.516 percent of home value.

On January 15, 2026, a Democratic party meeting took place, and people retold it.

The file holds 499 news items for the year, 37 of them federal.

## What needs a why

1. **The vote totals cannot come from the population shown.** The mayor race recorded 10,283 votes for person_bb5739bae59a23e0 and 1 vote for person_999ceb05dc19ecd4. The three council winners recorded 11,321, 12,102 and 10,953 votes. The file gives 1,766 people alive at year end and does not show the counted population. Records: `contest:seat:gus2025:162060:mayor:0:2025-11-04`, `contest:seat:gus2025:162060:council:0:2025-11-04`, `contest:seat:gus2025:162060:council:2:2025-11-04`, `contest:seat:gus2025:162060:council:4:2025-11-04`.

2. **State vote positions contradict the tallies; local positions do not.** Eleven of the 16 state bills with visible votes carry a recorded position of -1 on their vote records, and all eleven passed the House. Examples: measure 2025-001 (same-day voter registration) passed the House 35 to 0 and the Senate 29 to 6 with -1 recorded (`bill:office:US-ID:legislature-lower:2025-04-26:official:term:seat:US-ID:lower:012:0:2025-01-20:22`). Measure 2025-006 (Medicaid eligibility) passed 35 to 0 with -1 recorded (`bill:office:US-ID:legislature-lower:2025-04-26:official:term:seat:US-ID:lower:012:0:2025-01-20:27`). The other nine are measures 2025-003, 2025-004, 2025-005, 2025-007, 2025-008, 2025-009, 2025-010, 2025-013 and 2025-015. On the council, the recorded positions match the tallies: measure 2025-001 has three +1 entries and passed 3 to 2.

3. **A U.S. House seat is recorded as council president.** The chamber-organized record of December 15, 2025 names `"council-president": official:term:seat:US-ID:us-house:01:2025-01-20`. The council president chosen February 4, 2025 is person_70d4e5c280d6ffa9. The year total for chamber-organized is 4, but the federal and state log lists 5 records, and the December 15 record is one of them.

4. **Every visible board vote failed, yet the board enacted one bill.** All 10 visible board votes went 1 to 2: measures 2025-001 to 2025-005 on February 4, 2025 and 2025-011 to 2025-015 on February 19, 2025. Each vote shows the same member pattern (-1, -1, +1). The bill table says the board enacted 1 and failed 24, but no visible board vote passed. Records: `bill:office:gus2025:207745:board:2025-02-04:person_a6c7783b8a63dd12:6` through `:10`, and `bill:office:gus2025:207745:board:2025-02-19:person_a6c7783b8a63dd12:17` through `:21`. The table shows 10 board bills introduced February 4, 2025, but only five are listed.

5. **Measure numbers and questions repeat across bodies.** Measure 2025-001 is used by the council (partner with federal immigration enforcement, 3 to 2), the board (same question, 1 to 2), the state (same-day voter registration, 35 to 0) and the federal budget (budget adopted under 2025-001). The council's budget record reads "adopted by the council vote 4-1, 2025-015" (`budget:place:1612250:2025`). Measure 2025-015 is a board bill (paid family leave, failed 1 to 2). The council's listed votes stop at measure 2025-007. On February 19, 2025, the council (2025-007) and the board (2025-011) both voted on the inclusionary-requirement question.

6. **Local enactments have no law-in-force record, and the one veto has no record.** The bill table says the council enacted 1 bill, vetoed 1, and the board enacted 1. The only local law that took effect is `law:county:16027:county:property-tax:general:2026-01-01`, a county law. The file has no veto record. It also records no appointment to the mayor's seat (`seat:gus2025:162060:mayor:0`) before the November 4, 2025 election.

7. **Seats emptied with no appointment, and the vacancy tables are unregistered.** Five seats emptied, and the file records no appointment to any of them: `seat:gus2025:162060:council:3` and `seat:gus2025:162060:mayor:0` (both February 1, 2025, both "moved away"), `seat:US-ID:lower:026:0` (June 1, 2025), `seat:US-ID:lower:015:0` (November 1, 2025) and `seat:US-ID:lower:008:0` (January 1, 2026). No contest appears for council seat 1 or seat 3; the contests shown are seats 0, 2 and 4. The council voted on five bills on February 4, 2025, three days after seat 3 emptied. The file reports core2-elections-v1.vacancies as an "Unregistered module table" with no rows.

8. **A radio reporter appointed the police chief.** The only appointment in the file is an official-appointed record dated February 19, 2025, for post "police-chief", appointedBy `person:press:outlet:radio:0:jurisdiction_bc86e017f9ae60d2:reporter:0`.

9. **No deaths or births, but the population grew by 85.** The file lists deaths: 0 and no birth record kind. The population went from 1,681 to 1,766, and the only movement record is person.moved-away=4.

10. **Organizations grew by 48 with no matching creation record.** Organizations went from 128 at build to 176 at year end. The file records 3 business closures and 3 organization closures. The creation-like kinds are drive.formed=6, cause-group.founded=3, initiative.organizing-started=3 and housing.completed=5, which together do not account for 48 new organizations.

11. **One business closed on January 1, 2026, with two different reasons.** For organization_63c82a4a04bf504a, the business.closed record (`event:business.closed:organization_63c82a4a04bf504a`, audit file line 253) gives closing-reason=losses-kept. The organization.closed record for the same organization (audit file lines 262 and 263, the id beginning with employer-closed) gives closure-source=owner-closed.

12. **House leadership is blank, and the House seat count needs a check.** The January 20, 2025 chamber-organized record leaves the lower chamber's minority-leader and minority-whip as empty strings. The Senate record names an upper-chamber minority leader (`official:term:seat:US-ID:upper:019:0:2025-01-20`). Every state seat and term shown is Republican, yet a Democratic party meeting is recorded on January 15, 2026 (`speech:party-meeting:party:US-ID:democratic:2026-01-15`). The file lists office:US-ID:legislature-lower at 35 seats. Outside the file, Idaho's House is usually described as 70 members in 35 districts, so the seat count should be checked against the state's district records.

13. **Federal records name members from other states.** The federal Senate vote record for measure 2025-022 lists official:seat:US-AK:us-senate:0 among its persons. The House committee chair on `bill:office:US-ID:us-house:2025-12-15:official:seat:US-PA:us-house:05:118` is official:seat:US-SC:us-house:05. The House speaker record is official:seat:US-OH:us-house:15. The Idaho Senate seat appears only in a separate vote-recorded record (`official:term:seat:US-ID:us-senate:1:2025-01-20`).

14. **Held bills, repeated committee tallies and cross-chamber sponsors.** The file counts 50 bills held in committee, and 13 are listed. All 13 are 0 to 0 under chair `official:term:seat:US-ID:lower:034:0:2025-01-20`. All 13 are sponsored by `official:term:seat:US-ID:upper:029:0:2025-01-20` but carry a House body id, for example `bill:office:US-ID:legislature-lower:2025-04-26:official:term:seat:US-ID:upper:029:0:2025-01-20:38` through `:50`. In the lower chair's hearings, 13 of 16 show 11 to 0. The state House tally of 35 to 0 appears six times, 34 to 1 six times, and the Senate tally of 29 to 6 five times.

15. **Filings and candidates do not reconcile.** The file counts 15 candidate filings, but the election totals list five candidates: one per council contest and two for mayor. The mayor's second candidate, person_999ceb05dc19ecd4, received 1 vote and also perceived the November 4, 2025 result (`contest:seat:gus2025:162060:mayor:0:2025-11-04`). The file reports the filings and campaigns tables as "Unregistered module table" with no rows. The assessor filing `campaign-message:filing:contest:seat:gus2025:207745:assessor:0:2026-11-03:person_a2bd9522a843e11a:2026-01-09` is by person_a2bd9522a843e11a, who won council seat 0 on November 4, 2025.

16. **Trace records repeat identical learned entries.** The speech record `speech:party-meeting:party:US-ID:democratic:2026-01-15:retold:person_999ced05dc19f03a` lists the same learned:core.observe.perceived entry five times. The campaign-message record `campaign-message:filing:contest:seat:gus2025:207745:assessor:0:2026-11-03:person_a2bd9522a843e11a:2026-01-09` lists the same entry eight times.

17. **Counts disagree inside the file.** Law-took-effect is 30 for the year, but 29 are federal and state, against 21 enacted federal and state bills (16 House, 5 U.S. House). Budget-adopted is 4 for the year, but 2 federal and state records are listed and 1 local. Chamber-organized is 4 for the year, but the federal and state log lists 5. Legislative-vote is 77 for the year, and 45 are federal and state, which implies 32 local votes; 16 local votes are listed. Public-comment is 26 for the year, and 10 are listed. Council bills dated February 4, 2025 number 6, but 5 are listed. Eighteen local bills introduced from July 19 to October 1, 2025 (council 8, board 10) show no votes or outcomes.

18. **Federal values and a budget line look fixed or unitless.** Four federal policy positions all record value 1 on December 15, 2025: us-policy-positions:fiscal.fund-pensions-to-schedule, us-policy-positions:fiscal.minimum-reserve-balance, us-policy-positions:civil-family-community.restrict-abortion and us-policy-positions:fiscal.balanced-operating-budget. On the same day 24 U.S. House bills were introduced. The veterans line change `budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15` has deltaMinor -11082872955405, with no unit named in the file.

19. **Cause-group balances are tiny, and both ads show reach 24.** The civilian-oversight group `organization:cause-group:person_a6c7783b8a63dd12:cause:us-policy-positions:justice-public-safety.civilian-oversight-of-police` had a balance of 6309 minor units before its April 1, 2025 ad and spent 4731, leaving 1578. The cannabis group `organization:cause-group:person_bb5739bae59a23e0:cause:us-policy-positions:business-commerce.legalize-cannabis-sales` had 18927 and spent 14195, leaving 4732. Both ads recorded "reached": "24". The civilian-oversight group's id contains person_a6c7783b8a63dd12, the same id used in every board bill record, and the cannabis group's id contains the mayor's id.

## Counts

Records this year: 12227. Person.acted is 10613 of them.

Top 10 record kinds:

1. person.acted=10613
2. news.read=474
3. cause.shared=223
4. vote-recorded=174
5. speech.retold=156
6. speech.heard=78
7. legislative-vote=77
8. committee-hearing=50
9. bill-held-in-committee=50
10. campaign-message=44

## Method

World seed `b6b680d034f8`, one year from January 20, 2025 to January 20, 2026, through the trace viewer. Raw trace: `raw-trace-2/idaho.txt`.

## Verification

Every item above was checked against the code. The causes, and the items that turned out not to be defects, are in `README-TRACE-2.md`.

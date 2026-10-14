# Arkansas: one year traced

The year ran in 79 seconds and ended with 1,968 people and 166 organizations, yet the file records no deaths while 4 people are gone. The Council, county board and House acted on the same days, and the records do not show why several results repeat.

- Town: Haynes, Arkansas. Start date: January 20, 2025. Year end: January 20, 2026.
- People at start: 1,900. People at end: 1,968, alive 1,964.
- Organizations at start: 111. At end: 166.
- Player: Molly Barnes, born January 24, 2007. At the end: alive, Sales associate, cash $384, in the same household.

## The year in this place

1. A state minimum-wage law took effect January 21, 2025, at $15.00 an hour, recorded as a starting law.
2. Two Council seats were vacated February 1, 2025, both for "moved away" under the appointment rule.
3. The Council organized February 4, 2025, with a council president from the town. The county board organized the same day, with a mayor pro tem recorded as a television reporter.
4. On February 4, 2025, the Council voted 1-4 on five bills. The county board passed a bill on partnering with federal immigration enforcement 6-1.
5. On February 19, 2025, the Council voted 1-4 on two bills and 3-2 on a third.
6. The county sheriff seat was vacated March 1, 2025, for "moved away." The county immigration law took effect March 6, 2025. A police chief was appointed March 21, 2025.
7. A birth was recorded April 7, 2025.
8. On April 11, 2025, the state House introduced 51 bills in one day. Its floor passed 13 bills, most 80-20, and failed two at 43-57 and 47-53. The Senate voted on 13 of the same bills, between 27-8 and 31-4.
9. On April 11, 2025, House committee hearings were mostly 9-2 under the same chair. Thirty-two House bills were held in committee at 0-0.
10. The 2025 state budget was adopted July 1, 2025, by 80-20 in the House and 29-6 in the Senate. Thirteen state budget lines changed, with the welfare and Medicaid line falling by about $483.7 million and the local aid line by about $282.5 million.
11. The property-tax growth cap took effect July 11, 2025, and is recorded as ended with value 0.
12. Congress adopted the federal budget October 1, 2025, 433-0 in the House and 100-0 in the Senate. Federal Medicaid match was set at 69.23 percent and the SNAP maximum at 298 dollars a month the same day.
13. Candidate filings for the November 3, 2026 contests were filed with the Secretary of State on November 11, 2025.
14. On December 15, 2025, the U.S. House record shows 24 bills introduced in one day. One bill failed 198-235. Three federal policy questions were set to value 1. A U.S. House member was recorded as council president.
15. A local business closed December 18, 2025, with the closing reason of unfunded obligations with cash and credit exhausted.
16. On January 1, 2026, the city adopted its 2026 budget by a 5-0 council vote, the county property-tax law was replaced at 0.463 percent of home value, the federal income tax top rate became 37 percent, and one resident moved away.

## Needs a why

1. Deaths and people do not agree. The records show "deaths: 0," and the only person event is one birth (`person_7a2b1621b9745531`). People went from 1,900 to 1,968, with 1,964 alive, so four people are gone with no death record in the file.
2. Organizations went from 111 to 166, a gain of 55. The file shows two organization closures and two business closures, and no founding record kind in the records list.
3. Chamber organization counts disagree. The records count says 3, the dump says 5 (four dated January 20, 2025, and one dated December 15, 2025). The dump rows at the start date are not in the year's counts.
4. Budget adoption counts disagree. The records count says 4, the federal and state log kinds say 2, and the dump lists 2. The city 2026 budget (`budget-adopted:budget:place:0530880:2026`) appears only in a trace. No county budget is in the file.
5. Election-ish kinds lists only one official appointment. The file has 22 candidate-filed records, 32 campaign-message records and 3 seat-vacated records, none counted.
6. No contests are stored: `core2-elections-v1.contests: 0 of 33`. The `core2-elections-v1.vacancies` table is unregistered, so the three vacancies have no election record.
7. Seven module tables are unregistered: `core2-voting-v1` (contests, filings, campaigns), `core2-executive-v1` (offices, terms) and `core2-legislature-v1` (governments, budgets). Filing and campaign records exist, but the tables meant to hold them are not registered.
8. Every statewide seat is Republican: `seat:US-AR:governor`, lieutenant governor, attorney general, secretary of state, treasurer, auditor and land commissioner. Both U.S. Senate seats (`seat:US-AR:us-senate:0` and `:1`) and the president and vice president are Republican too.
9. Every past statewide term shows elected share 0.56. Examples: `term:seat:US-AR:governor:2025-01-20:past:1` (elected in November 2018) and `term:seat:US-AR:auditor:2025-01-20:past:2` (elected in November 2014).
10. Every past House term in the file shows elected share 0.635. Examples: `term:seat:US-AR:lower:002:0:2025-01-20:past:1` (elected in November 2022) and `term:seat:US-AR:lower:009:0:2025-01-20:past:2` (elected in November 2020).
11. The term `term:seat:US-AR:lower:008:0:2025-01-20:past:2` has no party field, unlike the other House terms.
12. Committee tallies repeat. Most committee-hearing records on April 11, 2025, read 9-2 under chair `official:term:seat:US-AR:lower:052:0:2025-01-20`. A few read 8-3, 6-5, 1-10, 3-8 and 2-9.
13. Floor tallies repeat. Six House bills passed 80-20 (2025-002, 003, 004, 006, 007, 014), and six Senate votes were 29-6 (2025-002, 003, 006, 008, 009, 014).
14. Many bills share one date: 51 House bills on April 11, 2025; 24 U.S. House bills on December 15, 2025; 8 Council bills on February 4, 2025; and 5 Council bills on August 18, 2025.
15. Thirty-two House bill-held records dated April 11, 2025, are visible. Every one is 0-0 under the same chair, for example `bill:office:US-AR:legislature-lower:2025-04-11:official:term:seat:US-AR:lower:063:0:2025-01-20:31`.
16. Failed versus enacted: 21 bills enacted, 76 failed and 2 vetoed across the file. The failed count includes the 0-0 committee holds.
17. Council bills without a visible vote: the Council has 20 bills, but only seven vote lines are visible (bills 2025-001 through 2025-005, 2025-010 and 2025-011), plus the 3-2 vote on 2025-009.
18. A House bill is sponsored by a Senate seat: `bill:office:US-AR:legislature-lower:2025-04-11:official:term:seat:US-AR:upper:008:0:2025-01-20:30`, held 0-0.
19. A U.S. House bill sits in the Arkansas office with a Rhode Island Senate sponsor: `bill:office:US-AR:us-house:2025-12-15:official:seat:US-RI:us-senate:1:96`, held 0-0 under chair `official:term:seat:US-AR:us-house:03:2025-01-20`.
20. A U.S. House bill sits in the Arkansas office with a South Carolina sponsor: `bill:office:US-AR:us-house:2025-12-15:official:seat:US-SC:us-house:04:94` (number 2025-023, 198 yes, 235 no).
21. The vote trace for that bill (2025-023) reaches an Alaska member, `official:seat:US-AK:us-house:00`, and then loops back to the same job and person. The chain never reaches a cause.
22. The president sponsors a U.S. House bill: `bill:office:US-AR:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:72` (budget, enacted, with provisions for agriculture at 11,654,519,972 and transportation at 34,441,828,052).
23. House committee hearings name a Senate seat as chair: `official:term:seat:US-AR:upper:034:0:2025-01-20`, for example on the bill `...lower:034:0:2025-01-20:12`.
24. The council president on December 15, 2025, is a U.S. House member (`official:term:seat:US-AR:us-house:03:2025-01-20`), while the council president on February 4, 2025, is a different person (`person_763875967748e0a0`).
25. A mayor pro tem is recorded as a television reporter: `person:press:outlet:television:0:jurisdiction_c9b4f13067769b49:reporter:0`.
26. Money values are very large. State budget lines: welfare and Medicaid -48,365,269,585; local aid -28,254,106,421; higher education -7,643,540,756; health and hospitals -3,876,971,338. Federal sample provisions: transportation 34,441,828,052 and agriculture 11,654,519,972. The city's welfare and Medicaid line is -69.
27. Three federal policy questions are set to value 1 with no unit or direction, all on December 15, 2025 (`us-policy-positions:fiscal.fund-pensions-to-schedule`, `fiscal.minimum-reserve-balance` and `fiscal.balanced-operating-budget`).
28. Federal laws share dates. Income tax and Social Security tax took effect January 1, 2026. Three policy values took effect December 15, 2025. Medicaid match, the SNAP maximum and the federal budget are all dated October 1, 2025.
29. All 13 state budget-line records and the state budget adoption are dated July 1, 2025.
30. A law ended within the year: `law:US-AR:state:us-policy-positions:fiscal.cap-property-tax-growth:general:2025-07-11:2025-001` is recorded as ended, with value 0 and a blank unit. The file does not show what replaced it.
31. The sample House bill for the property-tax cap (`bill:office:US-AR:legislature-lower:2025-04-11:official:term:seat:US-AR:lower:034:0:2025-01-20:12`) has a policy value of -1 and status enacted. Its floor votes were 84-16 in the House and 30-5 in the Senate.
32. The minimum-wage raise bill (`bill:office:US-AR:legislature-lower:2025-04-11:official:term:seat:US-AR:lower:062:0:2025-01-20:17`) passed the House 80-20 and the Senate 29-6 on April 11, 2025. The file shows no law-took-effect record for it. The January 21, 2025, starting law is the only minimum-wage law shown.
33. The trace for `person.moved-away:person_5f83b4c75d896f31:2026-01-01` stops after the person's own job status. The move has no reason.
34. The city budget traces (`budget-line-changed` and `budget-adopted` for the 2026 budget) stop at the region. Neither reaches the council vote record.
35. The county property-tax trace (`law:county:05077:county:property-tax:general:2026-01-01`) stops at the jurisdiction. No vote or act is linked to the replacement law.
36. The business-closure trace for `organization_3d8ca3e7f9260b97` gives a cash-and-credit closing reason, but the chain ends at the opening record. No cash or credit record is shown.
37. The held-bill trace for the U.S. House bill with the Rhode Island sponsor ends at the office. It has no reason child.
38. Several traces list the same `learned:core.observe.perceived` line two or three times (speech retold, speech heard, campaign message and employer closed).
39. Two state senators filed for other offices: one for U.S. House (`filing:contest:seat:US-AR:us-house:01:2026-11-03:official:term:seat:US-AR:upper:015:0:2025-01-20`) and one for secretary of state (`filing:contest:seat:US-AR:secretary-of-state:2026-11-03:official:term:seat:US-AR:upper:009:0:2025-01-20`). Both are dated November 11, 2025.
40. Log kinds include an inauguration and a presidential address, but the records-this-year counts do not.
41. The federal budget vote of 433-0 and 100-0 is unanimous, and it dropped eight budget functions in amendment.
42. The state's vacancy rule is special election, but the only vacancies in the file are three appointments, and no special-election contest is stored.
43. Every statewide office carries the government name "US-AR" rather than the state name.

## Raw facts for the report

- Bills by body and status (99 bills): House enacted 14, failed 38. U.S. House enacted 4, failed 21. County board enacted 2. Council enacted 1, failed 17, vetoed 2.
- Bills by body and introduction date: House on April 11, 2025 (51) and July 1, 2025 (1). U.S. House on October 1, 2025 (1) and December 15, 2025 (24). County board on February 4, 2025 (1) and January 1, 2026 (1). Council on February 4, 2025 (8), February 19, 2025 (3), August 18, 2025 (5), September 2, 2025 (3) and January 1, 2026 (1).
- Budget-adopted lines: July 1, 2025, state, fiscal year 2025, the legislature 80-20 and 29-6 (2025-052). October 1, 2025, federal, fiscal year 2025, Congress 433-0 and 100-0 (2025-001, amended, eight functions dropped). Trace only: city, fiscal year 2026, council 5-0 (2026-001).
- Seat-vacated lines: February 1, 2025, Council seat 0, moved away, appointment. February 1, 2025, Council seat 3, moved away, appointment. March 1, 2025, county sheriff seat 0, moved away, appointment.
- Federal law lines: January 1, 2026, income tax 37 percent top rate. January 1, 2026, Social Security tax 6.2 percent of wages. December 15, 2025, three fiscal policy values of 1. October 1, 2025, Medicaid match 69.23 percent. October 1, 2025, SNAP maximum 298 dollars a month.
- Federal and state log kinds: vote-recorded 55, committee-hearing 52, bill-held-in-committee 43, legislative-vote 42, budget-line-changed 30, campaign-message 30, law-took-effect 29, candidate-filed 12, chamber-organized 5, pay-raised-to-minimum-wage 2, budget-adopted 2, inauguration 1, president.address 1.
- Records this year: 26,576 in total. News items: 429, of which 35 are federal.

## Run details

- Place: Haynes, Arkansas (place 0530880). Seed: 5d36f2c5c304. Build time 53 seconds. Year runtime 79 seconds. Heap 1,151 MB.

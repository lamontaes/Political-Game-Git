# Missouri: Benton, seed 70cdb7d9991e

The one-year run of Benton, Missouri produced a working council, a working state legislature and a working federal record. It also produced numbers that need explaining. A minimum wage fell. A pension money entry was booked before its law. A 17-17 tie became law. Vote tallies repeat. Four House seats sit empty with no special election. Federal and council records name people from the wrong body.

## The year

Benton, Missouri (place 2904798) started 2025 with 1,849 modeled people and 122 organizations. It ended the year with 1,904 people (1,899 alive) and 138 organizations. The player, Blair Garrett, was alive at year end with no job and $0 in cash, in household_9e90c62fdf7e0405.

The town council organized on February 4, 2025, with person_81838274c31da570 as council president. That day it passed measure 2025-001, on partnering with federal immigration enforcement, by 4-1. The measure took effect March 6, 2025. On January 1, 2026, the council adopted the 2026 budget 5-0, with eleven lines dropped in amendment. The only town budget line changed in the file is parks, by 2,070 minor units.

The county replaced its property tax on January 1, 2026, with a rate of 0.62 percent of home value.

The state House met on May 16, 2025. It took up 50 bills that day, and the Senate voted on them the same day. Of the 51 state House bills, 14 were enacted and 37 failed. Several laws took effect on August 14, 2025, including right to work, cannabis sales and a Medicaid work requirement. The state minimum wage was $15.00 from January 21, 2025. It became $13.75 on August 15, 2025. On July 1, 2025, the legislature adopted the state budget 111-50. Ten of its thirteen lines were cut, including welfare and Medicaid, down 44,185,504,724 minor units.

Four state House seats were vacated in 2025: two by moving away and two by death. The file shows no special election and no appointment for any of them. A $43.7 billion retirement contribution was booked on July 20, 2025, and reversed on August 14, 2025.

Congress adopted the federal budget on October 1, 2025 (House 246-187, Senate 68-32), with seven functions dropped in amendment. The U.S. House record shows 25 bills: 3 enacted, 2 vetoed and 20 failed. Many federal records fall on December 15, 2025.

No election or contest was recorded. The contests table shows 0 of 27. Three businesses closed. One closed on May 5, 2025, for exhausted cash and credit, and two closed on June 1, 2025, and November 1, 2025, with the reason "losses-kept." One organization was founded on December 1, 2025. Five single-family homes were completed, none affordable. The year summary reports 0 deaths, although two House seats were vacated by death.

## Local / State / Federal at a glance

- Local: works with gap: the council organized, passed a measure and adopted a budget, but no municipal election or contest appears in the file, and a U.S. House member is recorded as council president on December 15, 2025.
- State: works with gap: House and Senate votes, a budget and laws all ran, but four House seats were vacated with no special election, and the minimum wage fell from $15.00 to $13.75 after a vote recorded against raising it.
- Federal: works with gap: the budget and floor votes ran, but Missouri's House record holds December 15, 2025 bills sponsored by North Carolina and Indiana members, chaired by a Utah member, and the Senate vote on one of them lists an Alaska senator first.

## Needs a why

1. Minimum wage fell. The minimum-wage law record for January 21, 2025 has value 1500 minor/hour ($15.00). The minimum-wage record effective August 15, 2025 has value 1375 ($13.75). Why did the floor drop when the raise-minimum-wage law (measure 2025-008) took effect August 14, 2025 with value 0?
2. Measure number collision. The `vote-recorded` record for `vote:2025-008` on seat `us-senate:1` shows measureId 2025-008 on clean-air-plan (position -1). The state law numbered 2025-008 is raise-minimum-wage. Why does one measure number point to two measures?
3. Money before the law. The `budget-line-changed` record for retirementContributions with deltaMinor 43718262000 was booked July 20, 2025, 25 days before the fund-pensions law took effect on August 14, 2025. The matching `#undo` record reverses it on August 14, 2025. Why was the money booked before the law was in force?
4. Tie that passed. The upper-chamber `legislative-vote` for measure 2025-013 reads yes 17, no 17 (May 16, 2025). The fund-pensions law took effect August 14, 2025 anyway. Why did a 17-17 tie produce a law, when the lower chamber's vote on the same measure was 109-53?
5. Same-day passage. Fifty lower-chamber bills were introduced May 16, 2025, and each has a committee hearing, a House floor vote, a Senate committee and a Senate floor vote that same day (for example, the `legislative-vote` for measure 2025-004, yes 112, no 50). Why does every bill clear all four stages in one day?
6. Identical tallies. Senate floor votes read 24-10 on measures 2025-003, 2025-004, 2025-006, 2025-007 and 2025-008. House floor votes read 112-50 on measures 2025-004, 2025-006, 2025-007 and 2025-008. Why do unrelated bills land on the same totals?
7. Identical committee tallies. Senate committee hearings chaired by `official:term:seat:US-MO:upper:029:0` read yes 7, no 3 on about eight bills in a row. House committee hearings chaired by `official:term:seat:US-MO:lower:153:0` read yes 8, no 3 on about a dozen. Why do the same tallies repeat?
8. Held with no vote. Forty `bill-held-in-committee` records all read yes 0, no 0, and most name the same chair (`lower:153`). Example: `bill:office:US-MO:legislature-lower:...:lower:083:0:2025-01-20:19`. Why was no committee vote taken on forty bills?
9. Vacant seats with no election. Seat `seat:US-MO:lower:108:0` was vacated May 1, 2025 (moved away). Seat `lower:063:0` was vacated May 23, 2025 (death). Seat `lower:156:0` was vacated July 1, 2025 (moved away). Seat `lower:028:0` was vacated December 16, 2025 (death). The contests table shows 0 of 27. Why were no special elections or appointments recorded for four seats?
10. Deaths disagree. The year summary says `deaths: 0`, but two seats were vacated by death (`lower:063:0` and `lower:028:0`), and `health.serious-illness=1` is also recorded. Why does the death count not match?
11. State budget cuts. The budget adopted July 1, 2025 by "the legislature vote 111-50, 24-10" cut ten of thirteen lines, including welfareAndMedicaid at -44185504724 and localAid at -21405552532 minor units. Why does a budget adopted 111-50 cut local aid and welfare this much?
12. Town budget unanimous. The 2026 town budget was adopted by "the council vote 5-0 (amended: ... 11 lines dropped), 2026-001". The only budget-line trace is parks, deltaMinor 2070. Why 5-0 after eleven lines were dropped, and why is parks the only line that moved?
13. Vote count mismatch. The council `legislative-vote` for measure 2025-001 (February 4, 2025) reads yes 4, no 1. The seven `vote-recorded` lines for the same measure show four +1 and three -1 records. Why does the total read 4-1 when the records show 4 for and 3 against?
14. Federal official as council president. The `chamber-organized` record for December 15, 2025 names `official:term:seat:US-MO:us-house:06:2025-01-20` as council-president. A U.S. House seat holder is recorded as the town council president. Why?
15. Out-of-state sponsors. The U.S. House record for Missouri holds 24 bills introduced December 15, 2025 by members from other states, including `official:seat:US-NC:us-house:06` and `official:seat:US-IN:us-house:01`. Their committee chair is `official:seat:US-UT:us-house:03`. Why are these bills in Missouri's House body?
16. Senate vote on a House bill. The `bill-vote` for a Missouri House bill sponsored by `official:seat:US-NV:us-house:04` reads yes 67, no 33 in the federal Senate. The first person in its record is `official:seat:US-AK:us-senate:0`. Why does a Missouri House bill sponsored by a Nevada member show an Alaska senator first?
17. Repeating election shares. Every statewide term shows share 0.56, and every legislative term shows share 0.635, including six consecutive governor terms (`term:seat:US-MO:governor:2025-01-20:past:1` through `past:6`). Why is every share the same?
18. All Republican. Every seat and term in the sample is Republican, including `seat:US:president`, `seat:US-MO:governor` and both U.S. Senate seats. Why does every listed seat share one party?
19. One date, many events. On August 14, 2025, fourteen state laws took effect at once. On December 15, 2025, the federal record holds six chamber and vote events, three committee hearings and two federal news items. Why do so many events land on one date?
20. Closure reason. The business closure for organization_0bfc666292f24d23 (May 5, 2025) gives the reason `finance.unfunded-obligation-cash-and-credit-exhausted`, with closure source `residents:wages:opening-payroll-calendar:organization_0bfc666292f24d23`. Why did an employer close for exhausted cash on a payroll-calendar source, and why do the other two closures read "losses-kept"?
21. Empty founding record. The `organization.founded` record for December 1, 2025 has payload `{}`. It has no organization id, type or place. Why is the payload empty?
22. Two speakers, one meeting. The `speech.retold` record for the January 15, 2026 Democratic party meeting names person_45dd8943d459d15c as speaker. The `speech.heard` record for the same meeting names person_47986025b606c351. Why does one party meeting have two speakers?
23. Player status. Player person_b7a99119551ff3b5 (Blair Garrett) was born January 22, 2007, so was 17 on January 20, 2025, and turned 18 two days later. At year end the record reads `alive=true job=none cash=$0`. Why does the player have no job and $0 after a year, and does the age at start affect filing eligibility?
24. Unregistered tables and a zero count. The viewer reports unregistered module tables for vacancies, filings, campaigns, executive offices and terms, and legislature governments and budgets. It shows `core2-elections-v1.contests: 0 of 27`. Why does the contests table show zero of 27, and why are the other tables missing?
25. Replaced tax without its old value. The county property-tax law effective January 1, 2026 has value 0.62 percent of home value and change "replaced," replacing the `from-start` law. The file does not show the replaced rate. Why was the county property tax replaced, and what was the old rate?
26. Population check. The file gives 1,849 modeled people at the start for place 2904798. Does this match the real place's population in the census record for that place?

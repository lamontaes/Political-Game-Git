# Rancho Palos Verdes, California: one year traced

The year finished, but its counts do not reconcile. A pension budget line moved 54 days before its bill was voted on, and several trace chains stop before they explain anything.

## The year in this place

On February 4, 2025, the local board organized with council president person_999b3b00bac29077 and passed four bills, by 5-0, 5-0, 4-1 and 5-0. All four took effect as county laws on March 6, 2025. On February 19, 2025, the city administrator was appointed by person_0f009c285cd52885. On June 1, 2025, organization_b07775feaecca286 closed, with the reason losses-kept. On July 1, 2025, a county minimum wage of 1,781 minor per hour replaced a state minimum-wage law. That same day the state legislature adopted the 2025 budget by 61-19 and 30-10, the county board adopted its budget 4-1, and the city council adopted its budget 3-2. On July 20, 2025, three state budget lines moved under two laws. One of them is a pension line of +276018841000, dated 54 days before its bill was voted on. On August 1, 2025, a state senate seat and U.S. Senate seat 1 were vacated, both with cause "moved away". On September 12, 2025, 54 bills were introduced in the state lower chamber. By year end that body had enacted 12 and failed 43 of its 55 bills. On September 15, 2025, two candidates filed for the October 30, 2025 U.S. Senate special election. On October 1, 2025, Congress adopted the federal budget by 249-184 and 79-21. On October 30, 2025, the appointed senator won the special with 4,919,681 votes to 2,750,275 for a sitting House member, after a two-candidate debate on October 20. The winner took office the same day. On November 1, 2025, a U.S. House seat was vacated and organization_94d1d7f4c9ec91cb closed. On December 15, 2025, the U.S. House introduced 23 bills, and bill 2025-024 failed 210-223. Four federal policy laws took effect that day with value 1. On January 1, 2026, the federal income-tax top rate (37 percent) and Social Security tax (6.2 percent) took effect. The state all-mail voting law 2025-017 also took effect that day, already marked "ended", and a second U.S. House seat was vacated. On January 5, 2026, candidates filed for the November 3, 2026 state senate and assembly races. On January 13, 2026, one child was born. The player ended the year alive, with no job and $0 cash.

## Needs a why

1. **Population does not add up.** The file says "deaths: 0", "person-birth=1" and "person.moved-away=3". Yet people went from 1,789 to 1,875, and alive is 1,874 of 1,875. The file does not name the one person who is not alive. It gives no source for the other 85 people (not in the file).
2. **Seat-vacated causes have no matching move records.** All four seat-vacated records say cause "moved away": `seat:US-CA:upper:029:0` and `seat:US-CA:us-senate:1` (August 1, 2025), `us-house:35` (November 1, 2025), and `us-house:18` (January 1, 2026). Yet person.moved-away is 3. One vacancy has no person record in the file (not in the file).
3. **Organization count jumps.** Organizations went from 130 to 172 (+42). The records show organization.founded=1, organization.closed=2 and organization.owner-changed=2. About 43 added organizations have no record in the file.
4. **Law totals do not match the federal and state kinds.** law-took-effect has 34 records this year and 33 in the federal and state kinds. The file also shows five county-level law-took-effect records: four on March 6, 2025 and the county minimum wage on July 1, 2025.
5. **Budget-line totals do not reconcile.** budget-line-changed has 43 records, 36 of them in the federal and state kinds. The file lists 11 city lines dated July 1, 2025. Adding those gives 47, not 43.
6. **Other kinds do not reconcile.** candidate-filed has 15 records, 4 in the federal and state kinds, so 11 are not in the file. campaign-message has 24 records, 17 in the federal and state kinds.
7. **Recall petitions with no outcome.** recall-petition has 129 records this year, 119 in the federal and state kinds. The file has no recall vote, recall election or recall trace.
8. **"Election-ish kinds" is incomplete.** It lists only official-appointed=1 and election-result=1. It omits candidate-filed (15), campaign-message (24) and debate (1).
9. **Only one contest is dumped.** "core2-elections-v1.contests: 1 of 32" shows only `contest:seat:US-CA:us-senate:1:2025-10-30:special`. The three other special-election vacancies have no contest in the file (not in the file).
10. **The U.S. Senate special runs on an estimate.** The contest basis is "estimated". It uses days from vacancy to election "where the state's law is not read" (data/elections/parameters.json, specialElectionDaysEstimate). The gap from August 1 to October 30, 2025 is 90 days.
11. **No appointment record for the Senate seat.** The vacancy rule says "appointment-then-special", but no appointment record is in the file. The winner's term is dated to the vacancy. No term row for `us-senate:1` is dumped.
12. **Winner took office on election day.** election-result and took-office are both dated October 30, 2025, for `official:term:seat:US-CA:us-senate:1:2025-08-01`. The file has no certification or swearing-in step (not in the file).
13. **Runner-up holds a House seat.** The runner-up, `official:term:seat:US-CA:us-house:01:2025-01-20`, filed for the Senate special on September 15, 2025. That person held a U.S. House term at the time. The file has no seat-vacated or resignation record for `us-house:01` (not in the file).
14. **Pension money moved before its vote.** budget-line-changed on July 20, 2025 moves retirementContributions by deltaMinor 276018841000. It cites `law:US-CA:state:us-policy-positions:fiscal.fund-pensions-to-schedule:general:starting#2025-07-20`.
15. **The pension bill was voted on later.** The bill for that law, `bill:office:US-CA:legislature-lower:2025-09-12:official:term:seat:US-CA:lower:053:0:2025-01-20:14`, was introduced and voted on September 12, 2025. Its lower vote was 62-18 and its upper vote was 32-7.
16. **The pension line was undone.** On January 1, 2026, the line was undone with deltaMinor -276018841000 (budget-line-changed, `...2025-009#2026-01-01#undo`). The undo trace stops at "retirementContributions [core2-law-reach-b-v1.services]" and names no law or vote.
17. **Transit shift has no bill.** On July 20, 2025, highways moved -135230867993 and transit +135230867993. The law is the highway-to-transit shift starting July 20, 2025. No bill or vote for it is in the file (not in the file).
18. **Budget lines on one date, with no vote record.** All 13 state lines and all 11 city lines are dated July 1, 2025. The largest state values are localAid +267673468685, welfareAndMedicaid +339103116361 and corrections -5395054301. The file gives no unit and no baseline.
19. **State budget vote is not in the file.** No legislative-vote record for the state budget bill on July 1, 2025 is in the file. Only the budget-adopted tally "61-19, 30-10, 2025-001" is.
20. **Same tallies repeat.** 61-19 appears on the state budget and on lower-chamber bills 2025-005 and 2025-008. 29-10 appears three times in the upper chamber on September 12, 2025. 62-18 appears twice in the lower chamber.
21. **Board votes are narrow.** Every board legislative vote is 5-0 or 4-1. The 4-1 result appears on bills 2025-003 and 2025-006.
22. **Committee tallies are constant.** On September 12, 2025, eight hearings were 8-3, three were 11-0, and five were 0-11. Every committee record names the committee "general".
23. **Same chairs on most hearings.** Most hearings that day had chair `official:term:seat:US-CA:lower:050:0:2025-01-20`. The rest had `official:term:seat:US-CA:upper:016:0:2025-01-20`.
24. **Public comment is one-sided.** All five public-comment records show against=0, with for=4, 2, 4, 6 and 4.
25. **Bills held in committee at 0-0.** There are 35 bill-held-in-committee records this year, most with yes=0 and no=0. Examples are `bill:office:US-CA:legislature-lower:2025-09-12:official:term:seat:US-CA:upper:004:0:2025-01-20:33` and `bill:office:US-CA:us-house:2025-12-15:official:seat:US-CT:us-house:04:82`.
26. **Bills introduced on one date.** 54 state bills were introduced on September 12, 2025. 23 U.S. House bills were introduced on December 15, 2025.
27. **Failed bills dominate.** State lower: 43 of 55 failed (78 percent). U.S. House: 19 of 24 failed (79 percent). Local: 0 of 8 failed.
28. **Odd U.S. House bill id.** `bill:office:US-CA:us-house:2025-12-15:official:seat:US-AZ:us-house:09:86` carries office US-CA:us-house but an Arizona sponsor seat. Its vote trace starts with `official:seat:US-AK:us-house:00`.
29. **The vote trace loops.** The trace for that vote loops between `job:office:seat:US-AK:us-house:00:official:seat:US-AK:us-house:00` and the official. It lists personIds through at least .47.
30. **President sponsors a House bill.** `bill:office:US-CA:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:63` has the president as sponsor in the U.S. House office.
31. **Out-of-state chair.** The U.S. House bill `...:official:seat:US-CT:us-house:04:82` is held with chair `official:seat:US-MO:us-house:04`, a Missouri seat.
32. **House member named council president.** The December 15, 2025 chamber-organized record names `official:term:seat:US-CA:us-house:02:2025-01-20`, a U.S. House member, as council-president.
33. **Senate leadership record repeats.** The December 15, 2025 federal senate chamber-organized record is identical to the January 20, 2025 one. No change is recorded.
34. **Federal leaders sit in other states.** The January 20, 2025 federal leaders include speaker US-PA, majority leader US-IN, minority leader US-NV and Senate president pro tempore US-KY.
35. **Upper-chamber seats sponsor lower bills.** State lower-chamber bills are sponsored and chaired by upper-chamber seats, such as `official:term:seat:US-CA:upper:004:0:2025-01-20` and `upper:016:0`. The upper chamber then votes on them.
36. **County laws from an unclear body.** County-level laws (jurisdiction county:06037) come from board bills with ids `office:gus2025:123085:board`. The file does not say which body the gus2025 ids name (not in the file).
37. **Federal laws share three dates.** All eight federal law lines fall on October 1, 2025, December 15, 2025, or January 1, 2026. October 1 has medicaid-match at 50 percent and snap-maximum at 298 USD per month.
38. **Four policy laws with value 1.** The four December 15, 2025 laws are civil-family-community.restrict-abortion, government-operations.ban-lobbying-after-office, fiscal.minimum-reserve-balance and fiscal.balanced-operating-budget. Each has value=1, no unit and no stated effect in the file.
39. **County laws share a date.** All four county laws took effect on March 6, 2025.
40. **A law that ended in the year.** `law:US-CA:state:us-policy-positions:government-operations.all-mail-voting:general:2026-01-01:2025-017` has change=ended and value=0 with no unit. It replaces `...all-mail-voting:general:starting`, and the governor signed it.
41. **The ended law's bill is close.** Bill 2025-017 passed the lower chamber 48-32 and the upper chamber 20-19 on September 12, 2025. The law-took-effect record already says ended. The file does not say when it was replaced.
42. **A replaced state law with no record.** The county minimum wage replaced a state minimum-wage law, `law:US-CA:state:minimum-wage:gene...` (truncated in the file). That state law's record is not in the file.
43. **Offices with no act in the file.** Lieutenant governor, attorney general, secretary of state, treasurer, controller, insurance commissioner and superintendent have no vote, act or record id.
44. **Legislative bodies that never introduced bills.** The state upper chamber introduced no bills; all 55 state bills are under legislature-lower. The U.S. Senate introduced no bills and shows no votes except the budget.
45. **Races filed for, not held.** The November 3, 2026 state races were only filed for. No race was held in the year.
46. **Statewide shares are constant.** Every sampled statewide term has elected share 0.56. Every sampled legislative term has 0.635.
47. **Statewide party is constant.** All seven partisan statewide seats are Democratic. Both U.S. Senate seats are Democrat.
48. **Statewide elections share a date.** The current statewide elections are all dated November 8, 2022. Every term has endEstimated=true.
49. **Two officials share a birth date.** Governor Vincent Knox and Lieutenant Governor Holly Bates both have the birth date December 14, 1974.
50. **Speech trace stops early.** The chain for `speech:party-meeting:party:US-CA:democratic:2026-01-15:retold:person_7889bf31c1d408ec` ends at core.observe.perceived. It gives no reason for the retelling.
51. **Birth trace stops early.** The chain for `person_93a006ecad064581:birth` stops at pregnancyId and planId (`partnership_9279c93e0dfdd0b9:plan:2025-04-22`).
52. **Campaign trace stops early.** The chain for the coroner campaign message stops at campaignId. It gives no campaign reason.
53. **Ended-law trace stops early.** The chain for the all-mail-voting law stops at decidedBy. It does not reach bill 2025-017 or the replacement.
54. **Vote trace stops early.** The chain for `vote-recorded:vote:2025-024:official:term:seat:US-CA:us-house:36:2025-01-20` (position -1) stops at the person's perceived record. The 210-223 outcome is not linked.
55. **Committee trace stops early.** The chain for the U.S. House bill `...:04:82` ends at the bill's body office, with no reason beyond the chair.
56. **Closure reasons are copied.** The business.closed and organization.closed traces for organization_94d1d7f4c9ec91cb copy "losses-kept" from the record. Their chains end at the opening and the region, and no losses record appears.
57. **Senate result is not traced to votes.** The election-result chain for the Senate special does not trace the winner's term or the totals to votes.
58. **Money values with no baseline.** The state budget lines run to hundreds of billions with no unit or baseline. Federal sample bill 2025-001 lists agriculture 7553915676 and transportation 22323584792, with no baseline.
59. **Player income is missing.** The player has $0 cash and no job. No income or payment record for the player is in the file (not in the file).

## Raw facts for the report

- Bills by body and introduction date (87 total):
  - office:US-CA:legislature-lower: July 1, 2025, 1; September 12, 2025, 54.
  - office:US-CA:us-house: October 1, 2025, 1; December 15, 2025, 23.
  - office:gus2025:123085:board: February 4, 2025, 4; July 1, 2025, 1; September 17, 2025, 1.
  - office:gus2025:184452:council: July 1, 2025, 1; September 17, 2025, 1.
- Bills by body and status:
  - office:US-CA:legislature-lower enacted 12, failed 43.
  - office:US-CA:us-house enacted 5, failed 19.
  - office:gus2025:123085:board enacted 6.
  - office:gus2025:184452:council enacted 2.
- budget-adopted (4 this year):
  - July 1, 2025, US-CA: "the legislature vote 61-19, 30-10, 2025-001".
  - July 1, 2025, county:06037: "the county board vote 4-1, 2025-005".
  - July 1, 2025, place:0659514: "the council vote 3-2, 2025-001".
  - October 1, 2025, US: "Congress vote 249-184, 79-21 (amended ...), 2025-001".
- seat-vacated (4):
  - August 1, 2025: office:US-CA:legislature-upper, seat:US-CA:upper:029:0, moved away, special-election.
  - August 1, 2025: office:US-CA:us-senate, seat:US-CA:us-senate:1, moved away, appointment-then-special.
  - November 1, 2025: office:US-CA:us-house, seat:US-CA:us-house:35, moved away, special-election.
  - January 1, 2026: office:US-CA:us-house, seat:US-CA:us-house:18, moved away, special-election.
- FED lines (8 law-took-effect lines; 39 federal news items):
  - January 1, 2026: income-tax value=37 percent-top-rate.
  - January 1, 2026: social-security-tax value=6.2 percent-of-wages.
  - December 15, 2025: us-policy-positions:civil-family-community.restrict-abortion value=1.
  - December 15, 2025: us-policy-positions:government-operations.ban-lobbying-after-office value=1.
  - December 15, 2025: us-policy-positions:fiscal.minimum-reserve-balance value=1.
  - December 15, 2025: us-policy-positions:fiscal.balanced-operating-budget value=1.
  - October 1, 2025: medicaid-match value=50 percent.
  - October 1, 2025: snap-maximum value=298 USD/month.
- Election: October 30, 2025 election-result for `contest:seat:US-CA:us-senate:1:2025-10-30:special`. The winner is `official:term:seat:US-CA:us-senate:1:2025-08-01`. A took-office record is dated the same day (U.S. Senator, `seat:US-CA:us-senate:1`).

## Run

- Town: Rancho Palos Verdes, California (state US-CA; place 0659514; county:06037).
- Seed: `aece8c59df0d`. Start date: January 20, 2025. The year ends January 20, 2026.
- People: 1,789 at build; 1,875 at year end, 1,874 alive.
- Organizations: 130 at build; 172 at year end.
- Year runtime: 85 seconds, heap 1,311 MB (build 48 seconds; the file ends "done 2.2 min").
- Player: person_a04219ca98346d27 (Madison Kelley, born January 26, 2007). At year end: alive, job none, cash $0, home household_a9f038127e1ce049.

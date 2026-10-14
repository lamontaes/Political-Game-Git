# Florida: one year traced

This report traces one generated year in Homosassa Springs, Florida. It lists what the engine did, the fourteen-odd points where the file shows a number, date or id that needs a cause, and the raw lines behind them.

- Town: Homosassa Springs, Florida (place 1232400).
- Seed: 265e27711c34.
- Start date: January 20, 2025.
- People at start: 1877. People at end: 1924, alive 1920.
- Orgs at start: 120. Orgs at end: 145.
- Year runtime: 77 seconds, heap 1126 MB. Build time: 57 seconds.

## The year in this place

1. On February 4, 2025 the local board (office:gus2025:211663:board) named person_2f373c0ae1a2aa26 council-president and failed its three first bills 1-6 each.
2. On March 1, 2025 an organization changed owner with an empty payload. On April 1, 2025 a state House seat (seat:US-FL:lower:111:0) was vacated for "moved away" under a special-election rule.
3. On May 2, 2025 the state House introduced 52 bills, held general committee hearings (mostly 8-3), and voted on each bill in both chambers. Every state House tally shown sums to 119 and every Senate tally to 40. The state House organized its leaders that day (speaker official:term:seat:US-FL:lower:006:0:2025-01-20). The file shows 16 state House bills enacted and 37 failed.
4. On June 1, 2025 organization_9eec24831aaf9143 closed, with the reason "losses-kept".
5. On July 1, 2025 the state budget was adopted (legislature vote 86-34 and 27-13, id 2025-053), 14 budget lines changed, and 15 state laws took effect. Two of them (2025-001 and 2025-002) show change=ended with value 0 on the same day.
6. On July 2, 2025 the state minimum wage changed from 1500 minor/hour (in force since January 21, 2025) to 1300 minor/hour.
7. On August 1, 2025 another state House seat (seat:US-FL:lower:109:0) was vacated for "moved away". On August 18, 2025 the local board recorded votes on measure 2025-004, with no bill outcome in the file.
8. On October 1, 2025 Congress adopted the federal budget (House 254-179, Senate 71-29). The county board adopted the county budget 7-0 (vote 2025-007). Federal medicaid-match (57.22 percent) and snap-maximum (298 USD/month) took effect.
9. On November 1, 2025 business organization_42d1a65bd4e525a0 closed with "losses-kept". The state House seat seat:US-FL:lower:074:0 was vacated the same day for "moved away"; that seat chaired the general committee in the May 2 hearings.
10. On December 1, 2025 a U.S. House seat (seat:US-FL:us-house:03) was vacated. On December 9, 2025 a state Senate seat (seat:US-FL:upper:035:0) was vacated, and on December 26, 2025 a state House seat (seat:US-FL:lower:044:0). Both carry cause "death" and there is no death record in the file.
11. On December 15, 2025 two federal laws took effect (restrict-abortion and balanced-operating-budget, each value 1). 22 U.S. House bills were dated that day, and a U.S. House member (official:term:seat:US-FL:us-house:19:2025-01-20) was organized as council-president.
12. On January 1, 2026 federal income tax (top rate 37) and social security tax (6.2 percent) took effect. The county property tax law was replaced (0.582 percent of home value), and state Senate seat seat:US-FL:upper:001:0 was vacated.
13. The player, Jackson Cunningham (born January 23, 2007, so 17 at start and 18 from January 23, 2025), ends alive, job Cook, cash $3449, in household_abc73cc02ba4a0e6. No campaign, filing, contest or birth record is in the file.

## Needs a why

1. Deaths: the records line says "deaths: 0", but seat-vacated records give cause "death" for seat:US-FL:upper:035:0 (December 9, 2025) and seat:US-FL:lower:044:0 (December 26, 2025), and the file has no death record. People total 1924 with 1920 alive at year end, so 4 are not alive, which fits no death count.
2. "election-ish kinds:" is empty, while 8 seat-vacated records (rule special-election) exist and "core2-elections-v1.contests: 0 of 22". No candidate-filed or election record appears in the file, and none of the eight special elections has a contest in the file.
3. Special elections with no contest: U.S. House seat seat:US-FL:us-house:03 (December 1, 2025), and state seats seat:US-FL:upper:035:0, seat:US-FL:lower:044:0 and seat:US-FL:upper:001:0.
4. The local board repeats one tally. The bill-level legislative-vote lines for bill:office:gus2025:211663:board:2025-02-04:person_2f373c0ae1a2aa26:0, bill:office:gus2025:211663:board:2025-02-04:person_2f373c0ae1a2aa26:1 and bill:office:gus2025:211663:board:2025-02-04:person_65a72338084457ea:2 each read yes=1 no=6. Their public-comment counts are 0-3, 1-5 and 1-5.
5. The February 4, 2025 council-president is person_2f373c0ae1a2aa26, but the December 15, 2025 council-president is official:term:seat:US-FL:us-house:19:2025-01-20, a U.S. House member. The file does not say how a U.S. House member comes to lead a local board.
6. Committee hearings repeat 8-3. On May 2, 2025 the general committee chaired by official:term:seat:US-FL:lower:074:0:2025-01-20 reads yes=8 no=3 in the hearings at lines 45, 57, 60, 69, 75, 81, 87, 93 and 99. Upper-chamber hearings the same day read 9-2, 10-1 and 11-0.
7. Every state House floor tally on May 2, 2025 sums to 119 (for example 100-19 on bill:office:US-FL:legislature-lower:2025-05-02:official:term:seat:US-FL:lower:004:0:2025-01-20:3, 98-21 on ...:4 and 85-34 on ...:5). Every Senate tally sums to 40 (for example 35-5, 29-11, 27-13 and 38-2).
8. The Senate votes on state House bills carry the billId under office:US-FL:legislature-lower (for example bill:office:US-FL:legislature-lower:2025-05-02:official:term:seat:US-FL:lower:004:0:2025-01-20:3), but the chamber is office:US-FL:legislature-upper. A House bill id on a Senate vote needs an explanation.
9. One date for almost every bill: 52 of 53 state House bills are dated May 2, 2025 (lines 394-395).
10. Bills held in committee read yes=0 no=0 on every visible record (lines 147-174), for example bill:office:US-FL:legislature-lower:2025-05-02:official:term:seat:US-FL:lower:096:0:2025-01-20:27 and bill:office:US-FL:legislature-lower:2025-05-02:official:term:seat:US-FL:lower:043:0:2025-01-20:28.
11. Share failed: 63 of 83 bills failed and 20 enacted (state House 16 enacted and 37 failed; U.S. House 3 enacted and 20 failed; local board 1 enacted and 6 failed) (lines 402-407).
12. The federal sample bill bill:office:US-FL:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:59 is sponsored by the president (official:term:seat:US:president:2025-01-20) under the Florida U.S. House office id office:US-FL:us-house.
13. bill:office:US-FL:us-house:2025-12-15:official:seat:US-GA:us-senate:1:82 is a U.S. House bill under office:US-FL:us-house, sponsored by a Georgia Senate seat. Its committee chair is official:seat:US-WV:us-house:01 (line 249), and it was held in committee with yes=0 no=0.
14. bill:office:US-FL:us-house:2025-12-15:official:seat:US-ND:us-house:00:66 is a U.S. House bill whose vote is recorded with chamber federal:us-senate and a 56-44 tally (line 258). The first person in its trace is official:seat:US-AK:us-senate:0 (line 259).
15. The vote trace for vote:2025-007:official:term:seat:US-FL:us-senate:1:2025-01-20 (line 271) observes the key "measureId" with no measure. The question us-policy-positions:labor-workforce.right-to-work appears in no bill in the file.
16. The reason chain for bill-vote:bill:office:US-FL:us-house:2025-12-15:official:seat:US-ND:us-house:00:66 loops: official:seat:US-AK:us-senate:0, then job:office:seat:US-AK:us-senate:0:official:seat:US-AK:us-senate:0, then the official again, then the same job (lines 259-262). It never reaches a reason.
17. Large budget deltas with no unit in the file: state welfareAndMedicaid -137171571103 (line 190), localAid -61583821687 (line 184), higherEducation -17715299810 (line 181), healthAndHospitals -15173915917 (line 180), retirementContributions +163605505000 (line 195), and federal veterans -11082497955472 (line 278, measure law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15). The file does not say whether deltaMinor is in cents.
18. Federal sample provisions carry values 33871812423, 11461636525 and -141794151037 (line 409). The federal budget adopted October 1, 2025 drops seven functions (nationalDefense, communityAndRegionalDevelopment, incomeSecurity, internationalAffairs, medicare, education, health) and still reads as adopted (line 427).
19. The state budget adoption cites votes of 86-34 and 27-13 (lines 177, 426). No May 2, 2025 bill in the file has that tally; the nearest are 86-33 for bill ...:5 and 26-14 for ...:7.
20. Laws took effect and ended on the same day. law:US-FL:state:us-policy-positions:education.universal-preschool:general:2025-07-01:2025-001 and law:US-FL:state:us-policy-positions:fiscal.cap-property-tax-growth:general:2025-07-01:2025-002 (lines 191-192) both show change=ended with value 0 on July 1, 2025, while the bills that created them show enacted.
21. The state minimum wage fell. The law-took-effect record for January 21, 2025 sets 1500 minor/hour (line 13), and a July 2, 2025 record replaces it with 1300 minor/hour (line 207, replacing law:US-FL:state:us-policy-positions:labor-workforce.raise-minimum-wage:general:2025-07-01:2025-008). The kinds count shows pay-raised-to-minimum-wage=3 (line 5), and no minimum wage cause is in the file.
22. Federal policy questions with value=1: restrict-abortion and balanced-operating-budget on December 15, 2025 (lines 9-10). All federal laws in the file fall on three dates: January 1, 2026, December 15, 2025 and October 1, 2025 (line 6).
23. Board bills with outcomes missing: measure 2025-004 on August 18, 2025 has four vote-recorded lines and no legislative-vote line in the file (lines 209-212).
24. The county budget adopted October 1, 2025 by county board vote 7-0 (2025-007) (line 305) has no county vote record in the file. The county property tax law replaced January 1, 2026 (lines 238-239) has no vote record and no replacement cause in the file.
25. The trace for speech:party-meeting:party:US-FL:democratic:2026-01-15:retold:person_b03e695bd5d96030 repeats the same learned:core.observe.perceived key four times (line 224) and has no reason child.
26. The trace for business.closed:organization_42d1a65bd4e525a0 ends at the opening load (core2-officials-v1.loaded) (lines 288-289). It has no revenue, payroll or loss record behind "losses-kept", and both closures in the file carry the same reason.
27. The trace for person.moved-away:person_397b6c8615920398:2025-06-01 shows three people with residence jurisdiction_dae5b64e019c2669 (line 316) and repeats the same learned key three times (lines 318-320). The cause of the move is not in the chain.
28. organization.owner-changed on March 1, 2025 has an empty payload ({}) (line 42).
29. Tables with no data: "Unregistered module table" for core2-elections-v1.vacancies, core2-voting-v1.contests, core2-voting-v1.filings, core2-voting-v1.campaigns, core2-executive-v1.offices, core2-executive-v1.terms, core2-legislature-v1.governments and core2-legislature-v1.budgets (lines 377-391). core2-elections-v1.contests reads 0 of 22 (line 375).
30. Every statewide seat is Republican (lines 336-344: governor, lieutenant governor, attorney general, treasurer, agriculture commissioner, both U.S. Senate seats, president and vice president). Every past statewide term shows elected share 0.56 (lines 347-352 and 355-359), and every past state House term shows share 0.635 (lines 362-373).
31. The lieutenant governor record (Patricia Campos) shows four re-elections, each at share 0.56 (lines 347-350). The file shows no other candidate or contest for the seat.
32. The federal chamber-organized record of January 20, 2025 lists leaders from other states: speaker official:seat:US-TX:us-house:22, majority leader official:seat:US-NY:us-house:21, and Senate president pro tempore official:seat:US-WV:us-senate:0 (lines 430-431). Whether those are the intended leaders is not in the file.
33. The state House general committee chair official:term:seat:US-FL:lower:074:0:2025-01-20 vacated seat seat:US-FL:lower:074:0 on November 1, 2025 (line 418). No later hearing or replacement chair appears in the file, so that is not in the file.
34. The player's cash ($3449) and job (Cook) have no job or income record in the file, so the source is not in the file.

## Raw facts for the report

- Bills by body and introduction date (83 bills): office:US-FL:legislature-lower 2025-05-02: 52; office:US-FL:legislature-lower 2025-07-01: 1; office:US-FL:us-house 2025-10-01: 1; office:US-FL:us-house 2025-12-15: 22; office:gus2025:211663:board 2025-02-04: 3; office:gus2025:211663:board 2025-08-18: 3; office:gus2025:211663:board 2025-10-01: 1.
- Bills by body and status: office:US-FL:legislature-lower enacted 16, failed 37; office:US-FL:us-house enacted 3, failed 20; office:gus2025:211663:board enacted 1, failed 6.
- Budget adopted: 2025-07-01 {"governmentId":"US-FL","fiscalYear":"2025","adoptedBy":"the legislature vote 86-34, 27-13, 2025-053"}; 2025-10-01 {"governmentId":"US","fiscalYear":"2025","adoptedBy":"Congress vote 254-179, 71-29 (amended: nationalDefense, communityAndRegionalDevelopment, incomeSecurity, internationalAffairs, medicare, education, health dropped), 2025-001"}; and budget:county:12017:2025 (2025-10-01, county board vote 7-0, 2025-007).
- Seat vacated (8): 2025-04-01 seat:US-FL:lower:111:0 (moved away); 2025-08-01 seat:US-FL:lower:109:0 (moved away); 2025-11-01 seat:US-FL:lower:074:0 (moved away); 2025-12-01 seat:US-FL:lower:052:0 (moved away); 2025-12-01 seat:US-FL:us-house:03 (moved away); 2025-12-09 seat:US-FL:upper:035:0 (death); 2025-12-26 seat:US-FL:lower:044:0 (death); 2026-01-01 seat:US-FL:upper:001:0 (moved away). Every rule is special-election.
- FED lines: 2026-01-01 income-tax value=37 percent-top-rate; 2026-01-01 social-security-tax value=6.2 percent-of-wages; 2025-12-15 us-policy-positions:civil-family-community.restrict-abortion value=1; 2025-12-15 us-policy-positions:fiscal.balanced-operating-budget value=1; 2025-10-01 medicaid-match value=57.22 percent; 2025-10-01 snap-maximum value=298 USD/month.
- Records this year that matter here: deaths 0; election-ish kinds empty; business.closed 2; organization.closed 2; person.moved-away 2; chamber-organized 3; pay-raised-to-minimum-wage 3.

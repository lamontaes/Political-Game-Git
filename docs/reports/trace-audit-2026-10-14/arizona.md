# Arizona: one year traced

One generated Arizona town ran a full simulated year without crashing, but its records disagree with each other in several places. The year shows four people not alive with zero deaths recorded, three appointed seat vacancies with no appointment record, and state and federal votes that repeat the same tallies.

- Town: Orange Grove Mobile Manor, Arizona (place 0451465 in the trace reports)
- State: Arizona (US-AZ)
- Seed: 50614edd9c55
- Start date: January 20, 2025 (the year runs to January 20, 2026)
- People: 1,798 at build (start); 1,865 at year end, 1,861 alive
- Orgs: 123 at build (start); 146 at year end
- Year runtime: 76 seconds; heap 1,737 MB (the build took 45 seconds)
- Player: Mateo Walker (`person_16f99c6617a8dae8`), born January 21, 2007

## The year in this place

1. On January 21, 2025 a state minimum-wage law took effect at value 1500 (the file cuts the unit off at "minor/hour").
2. On February 4, 2025 the council (`office:gus2025:160818:board`) organized with council-president `person_4efc340ef5690a7b` and passed bills 2025-001 through 2025-005, each 5 yes to 0 no.
3. On February 19, 2025 the council passed bills 2025-009, 2025-010 and 2025-011, each 5 to 0.
4. On March 1, 2025 state upper seat `seat:US-AZ:upper:015:0` was vacated (cause "moved away", rule "appointment"); the file has no appointment record.
5. On March 6, 2025 five county laws took effect (2025-001 through 2025-005, including the groundwater limit), and five recall petitions were recorded the same day against the five board seats, all tied to the groundwater law.
6. On March 21, 2025 three more county laws took effect (2025-009, 2025-010, 2025-011).
7. On April 22, 2025 the state lower body introduced 52 bills on one date. The lower body passed bill 2025-001 52 to 8 and the upper body passed it 29 to 1; the file records no final enactment step for that bill.
8. On July 1, 2025 the state legislature adopted the state budget (2025-053) by votes of 55-5 and 29-1, with eleven budget lines dropped.
9. On August 1, 2025 state lower seat `seat:US-AZ:lower:023:1` was vacated with cause "death" (rule "appointment"); the file has no death record and no appointment record for that seat.
10. On October 1, 2025 Congress adopted the federal budget (2025-001) by 272-161 and 70-30, and two federal laws took effect the same day: medicaid-match 64.34 percent and snap-maximum 298 USD per month.
11. On November 1, 2025 `person_9181be439e002f7d` moved away, and on December 1, 2025 `organization_11351444a6f47d7e` closed (reason "owner-retiring").
12. On December 15, 2025 six federal policy laws took effect at value 1 each; 24 U.S. House bills were introduced; federal bill 2025-025 was recorded at 207 yes and 226 no; and a U.S. House member was recorded as council-president.
13. On January 1, 2026 federal income tax (37 percent top rate) and social security tax (6.2 percent of wages) took effect; a county property-tax law at 0.612 percent of home value replaced a "from-start" law; and state lower seat `seat:US-AZ:lower:017:0` was vacated (moved away).
14. The player ends the year alive, with no job, cash $0, in household `household_08a9171f55ba7d46`.

## Needs a why

1. Death count disagrees with the people count. The records say "deaths: 0", yet the year ends with 1,865 people and 1,861 alive (4 not alive). The seat-vacated record for `seat:US-AZ:lower:023:1` gives cause "death", but no death record for that seat or person is in the file. The records show `person.moved-away=2`, but only one such record (`person.moved-away:person_9181be439e002f7d:2025-11-01`) is traced.
2. Election kinds are empty while the file shows election-type records. "election-ish kinds:" is blank; `core2-elections-v1.contests: 0 of 26`; `recall-petition=5` on March 6, 2025 with no recall contest in the file; no candidate-filed record anywhere. The modules `core2-elections-v1.vacancies`, `core2-voting-v1.contests`, `core2-voting-v1.filings` and `core2-voting-v1.campaigns` each print "Unregistered module table".
3. Three seat vacancies, all with rule "appointment", and no appointment record for any of them: `seat:US-AZ:upper:015:0` (March 1, 2025), `seat:US-AZ:lower:023:1` (August 1, 2025) and `seat:US-AZ:lower:017:0` (January 1, 2026). The state appointment rule (county board of supervisors from 3 nominees) has no matching record in the file.
4. Every council vote is 5-0. All eight council bills (2025-001 to 2025-005 and 2025-009 to 2025-011) show `legislative-vote` yes 5, no 0, under `office:gus2025:160818:board`. Every council `vote-recorded` position is "1". Council public-comment counts are 4-0, 5-1, 1-0 and similar.
5. Repeated state tallies. An upper-body vote of 17-13 appears on seven bills (2025-009, 2025-011, 2025-013, 2025-014, 2025-015, 2025-016, 2025-018). A lower-body vote of 33-27 appears on four bills (2025-009, 2025-014, 2025-015, 2025-016). An upper-body vote of 21-9 appears on 2025-004 and 2025-005.
6. Every past election share is one of two values. All twelve state senate terms (for example `term:seat:US-AZ:upper:004:0:2025-01-20:past:1`) show share 0.635. All five governor terms (`term:seat:US-AZ:governor:2025-01-20` and its four past terms) show share 0.56. Every term in the dumps shows `"endEstimated": true`.
7. Bills introduced on one date. 52 state lower bills on April 22, 2025; 24 U.S. House bills on December 15, 2025; 8 council bills on February 4, 2025 and 3 on February 19, 2025. Total bills: 90.
8. Bills held in committee with 0 yes and 0 no. All 45 `bill-held-in-committee` records show yes 0 and no 0 (for example `bill:office:US-AZ:legislature-lower:2025-04-22:official:term:seat:US-AZ:upper:020:0:2025-01-20:13`). The file does not say why these bills were held.
9. Bill outcomes. Failed 60 of 90 (39 + 18 + 3), enacted 25 (9 + 7 + 9), vetoed 5 (lower body). The file has no veto or override record for the five vetoed bills.
10. Chairs repeat on every hearing. Every `committee-hearing` line on April 22, 2025 names chair `official:term:seat:US-AZ:lower:027:0:2025-01-20` or `official:term:seat:US-AZ:upper:004:0:2025-01-20`. Committee is "general" on every line.
11. Shared dates across all federal laws. Six federal laws (restrict-abortion, ban-lobbying-after-office, expand-medicaid-eligibility, fund-pensions-to-schedule, minimum-reserve-balance, balanced-operating-budget) all took effect on December 15, 2025 at value 1. The two October 1, 2025 federal laws share the date of the federal budget adoption.
12. Shared dates across county laws. Five county laws took effect on March 6, 2025 and three on March 21, 2025. The state minimum wage took effect January 21, 2025, one day after the start date.
13. Value 1 for policy questions. Each of the six December 15, 2025 federal laws and several county laws (for example paid-family-leave, value 1) carry value 1 for a yes/no policy question. The file does not show what value 1 means for each.
14. A U.S. House member as council-president. `chamber-organized` on December 15, 2025 gives "council-president": `official:term:seat:US-AZ:us-house:08:2025-01-20`. The council in this town is `office:gus2025:160818:board`, so a federal U.S. House seat in the council-president slot is not explained in the file.
15. Odd bill id, sponsor from another state. `bill:office:US-AZ:us-house:2025-12-15:official:seat:US-GA:us-house:14:89` (number 2025-025, 207 yes and 226 no) sits in the US-AZ U.S. House body, but its sponsor id is from US-GA. The trace for that bill lists `personIds.0` as `official:seat:US-AK:us-house:00` (Alaska).
16. Odd bill id, sponsor from the U.S. Senate. `bill:office:US-AZ:us-house:2025-12-15:official:seat:US-ID:us-senate:1:88` is in the U.S. House body with a sponsor from the US-ID U.S. Senate seat. Its committee record names committee chair `official:term:seat:US-AZ:us-house:08:2025-01-20`.
17. The president sponsors a U.S. House bill. `bill:office:US-AZ:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:65` is in the US-AZ U.S. House body, is sponsored by the president term, and has status enacted.
18. Federal leaders from other states. `chamber-organized` on January 20, 2025 lists the U.S. House speaker as `official:seat:US-WA:us-house:04`, majority leader `official:seat:US-TX:us-house:22` and minority leader `official:seat:US-NY:us-house:07`. The U.S. Senate president pro tempore is `official:seat:US-UT:us-senate:1`, majority leader `official:seat:US-AR:us-senate:0`, minority leader `official:seat:US-NV:us-senate:1`. None of these seats is in Arizona. The file does not say why this town's federal dump shows them.
19. Number collision. Federal bill number 2025-025 (US-GA sponsor, item 15) and the `vote-recorded` record `vote:2025-025:official:term:seat:US-AZ:us-house:07:2025-01-20` (question `us-policy-positions:technology-privacy.age-verification-for-social-media`, position -1) share one number. The trace for the vote gives no reason child.
20. Huge money values. The `budget-line-changed` record for veterans, `budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15`, has deltaMinor -11084369706276. The sample federal bill `bill:office:US-AZ:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:65` lists budget-line values 6418702471 (agriculture), 18968764681 (transportation) and -79407025836 (otherPrograms). The file does not state the minor unit. Player cash is $0.
21. A replaced law whose predecessor is not in the file. `law:county:04027:county:property-tax:general:2026-01-01` has change=replaced and replacesLawId `law:county:04027:county:property-tax:general:2026-01-01:from-start`. The replaced law and its ending record are not in the file, and the file has no change=ended record at all.
22. Trace chains that stop before a reason.
    - (a) `speech:party-meeting:party:US-AZ:republican:2026-01-15:retold:person_10b2d2b6a1097154` has five identical "learned" entries and no reason child.
    - (b) `person.moved-away:person_9181be439e002f7d:2025-11-01` ends at `person_26a8695c77ea561c`; the move has no reason.
    - (c) `event:business.closed:organization_11351444a6f47d7e` gives the closing reason "owner-retiring", and its chain stops at the opening record.
    - (d) `budget-adopted:budget:US:2025` ends at the place.
    - (e) The veterans `budget-line-changed` record in item 20 ends at `region:04:rest`, with no cause.
    - (f) `committee:bill:office:US-AZ:us-house:2025-12-15:official:seat:US-ID:us-senate:1:88` ends at the office.
23. Records counts disagree with the dumps. Records say `budget-adopted=3`, but the dump lists 2 (July 1, 2025 and October 1, 2025). Records say `chamber-organized=3`, but the dump lists 6. Records say `law-took-effect=35`, but the federal-and-state log kinds line gives `law-took-effect=34`.
24. Organizations and people grow with no creation or birth record. Orgs rise from 123 (build) to 146 (year end), while records show `organization.closed=2` and no organization-created kind. People rise from 1,798 to 1,865 with no birth kind in the records; the file gives no births count.
25. Repeated chamber organization. The upper body is organized again on April 22, 2025 with exactly the same five leaders as on January 20, 2025 (for example majority-leader `official:term:seat:US-AZ:upper:014:0:2025-01-20`).
26. Offices with no visible action. The U.S. Senate (`office:US-AZ:us-senate`) has no bills and no votes in the file. The governor and the statewide executive offices (`core2-executive-v1.offices` and `core2-executive-v1.terms`) print "Unregistered module table", and the file has no executive act. The state upper body (`office:US-AZ:legislature-upper`) introduces no bills; it appears only as a voting body.
27. Budget module unregistered. `core2-legislature-v1.governments` and `core2-legislature-v1.budgets` print "Unregistered module table", yet budget-adopted records exist for US-AZ (July 1, 2025) and US (October 1, 2025).
28. Estimates in the statewide office rows. Several statewide offices (lieutenant governor, secretary of state, attorney general, treasurer, superintendent, state mine inspector, corporation commission) print `"estimate": true`, with vacancy rules marked "not verified per office". The file does not say whether any of this was checked.
29. Council body missing from the printed rows. The council body `office:gus2025:160818:board` does not appear in the 14 printed office rows (the dump header says "14 of 21"), and its own record is not in the file.

## Raw facts for the report

- office:US-AZ:legislature-lower 2025-04-22: 52
- office:US-AZ:legislature-lower 2025-07-01: 1
- office:US-AZ:us-house 2025-10-01: 1
- office:US-AZ:us-house 2025-12-15: 24
- office:gus2025:160818:board 2025-02-04: 8
- office:gus2025:160818:board 2025-02-19: 3
- office:gus2025:160818:board 2025-07-01: 1
- office:US-AZ:legislature-lower enacted: 9
- office:US-AZ:legislature-lower failed: 39
- office:US-AZ:legislature-lower vetoed: 5
- office:US-AZ:us-house enacted: 7
- office:US-AZ:us-house failed: 18
- office:gus2025:160818:board enacted: 9
- office:gus2025:160818:board failed: 3
- budget-adopted 2025-07-01 {"governmentId":"US-AZ","fiscalYear":"2025","adoptedBy":"the legislature vote 55-5, 29-1 (amended: welfareAndMedicaid, naturalResources, police, localAid, housing, higherEducation, healthAndHospitals, schools, otherPrograms, administration, corrections dropped), 2025-053"}
- budget-adopted 2025-10-01 {"governmentId":"US","fiscalYear":"2025","adoptedBy":"Congress vote 272-161, 70-30 (amended: nationalDefense, communityAndRegionalDevelopment, incomeSecurity, internationalAffairs, medicare, education, health dropped), 2025-001"}
- seat-vacated 2025-03-01 {"officeId":"office:US-AZ:legislature-upper","seatId":"seat:US-AZ:upper:015:0","cause":"moved away","rule":"appointment"}
- seat-vacated 2025-08-01 {"officeId":"office:US-AZ:legislature-lower","seatId":"seat:US-AZ:lower:023:1","cause":"death","rule":"appointment"}
- seat-vacated 2026-01-01 {"officeId":"office:US-AZ:legislature-lower","seatId":"seat:US-AZ:lower:017:0","cause":"moved away","rule":"appointment"}
- FED 2026-01-01 income-tax value=37 percent-top-rate
- FED 2026-01-01 social-security-tax value=6.2 percent-of-wages
- FED 2025-12-15 us-policy-positions:civil-family-community.restrict-abortion value=1
- FED 2025-12-15 us-policy-positions:government-operations.ban-lobbying-after-office value=1
- FED 2025-12-15 us-policy-positions:health-human-services.expand-medicaid-eligibility value=1
- FED 2025-12-15 us-policy-positions:fiscal.fund-pensions-to-schedule value=1
- FED 2025-12-15 us-policy-positions:fiscal.minimum-reserve-balance value=1
- FED 2025-12-15 us-policy-positions:fiscal.balanced-operating-budget value=1
- FED 2025-10-01 medicaid-match value=64.34 percent
- FED 2025-10-01 snap-maximum value=298 USD/month

# Delaware (Highland Acres, Delaware): one year traced

- Town: Highland Acres, Delaware. State: Delaware (US-DE).
- Seed: 98cea258e221. Start date: 2025-01-20. Place id in traces: 1034810.
- Player: Alexis Gibson (person_e9348466b13095fe), born 2007-02-01.
- People at start: 1739. People at end: 1803 total, 1800 alive.
- Orgs at start: 120. Orgs at end: 159.
- Build time: 55 s. Year 1 runtime: 84 s. Heap: 2250 MB.

## The year in this place

1. On 2025-02-04 the local board (office:gus2025:124143:board) voted on five measures (2025-001 to 2025-005), each recorded 5 to 1, and on 2025-02-19 it voted on 2025-007 at 5 to 1.
2. Five county laws (2025-001 to 2025-005) took effect on 2025-03-06 and the universal preschool law (2025-007) on 2025-03-21.
3. Five businesses or organizations closed in the file's records: three closures are listed (2025-05-05, 2025-06-01, 2025-11-01), with three business.closed records.
4. On 2025-06-30 the state lower body (41 seats) and upper body (21 seats) voted on 50 bills introduced that day; every vote shown in the file was dated 2025-06-30, and 14 state laws are shown as taking effect that day.
5. On 2025-07-01 the state budget was adopted by "the legislature vote 27-14, 15-6, 2025-051", followed by 11 state budget-line-changed records (localAid largest, +3117247446 minor units).
6. Congress adopted the federal budget on 2025-10-01 by a vote of 251-182 in the House and 73-27 in the Senate; on the same date the file shows Medicaid match at 59.41 percent and the SNAP maximum at 298 USD per month.
7. On 2025-11-01 a state lower seat (seat:US-DE:lower:012:0) was vacated for "moved away" under a "special-election" rule; the file shows no special-election contest.
8. On 2025-12-15 Congress-level records show 25 U.S. House bills introduced to office:US-DE:us-house, and six federal policy-question laws took effect that day.
9. Federal tax lines took effect on 2026-01-01 (income tax top rate 37 percent; Social Security tax 6.2 percent of wages).
10. One person was born (2025-02-19), one died (2026-01-17, condition cancer), and 11 people moved away (last traced on 2025-12-01).
11. A county property-tax law (value 0.431 percent of home value) took effect on 2026-01-01 and replaced an earlier law.
12. The player ends the year alive, with no job, cash of $0, and home household_a8d6435574bcbff4. No player action record is traced in the file.
13. No candidate filing, campaign or contest is recorded; "election-ish kinds" is empty and core2-elections-v1.contests shows 0 of 23.

## Needs a why

1. **Population counts do not reconcile.** Start 1739; records show 1 birth (person-birth, 2025-02-19), 1 death (life.death 2026-01-17) and 11 person.moved-away. Those give about 1728, but the header shows 1800 alive at end (1803 total). The file shows no immigration kind. Three people are counted in 1803 but not alive; the file does not say where the other gain of about 72 came from.
2. **Organizations grew by 39 with no founding record.** Orgs went 120 to 159, with 3 organization.closed. The records list has cause-group.founded=1 and drive.formed=6 and no organization-created kind. Not in the file how the 39 were created.
3. **Election-ish kinds are empty.** "election-ish kinds:" is blank while seat-vacated=1 exists. core2-elections-v1.contests shows 0 of 23. Offices show nextElectionYear 2026 for US-DE us-house, attorney-general and treasurer, and seat:US-DE:us-senate:1 has electionYear 2026, but no contest for any of them is in the file.
4. **Seat vacancy with no special election.** seat-vacated 2025-11-01 seat:US-DE:lower:012:0 cause "moved away" rule "special-election". The file has no special-election contest. The vacancies dump reads "Unregistered module table: vacancies". Eleven people moved away but only one seat was vacated; not in the file whether any mover held a seat.
5. **Council tally repeats.** Vote-recorded measures 2025-001, 2025-002, 2025-003, 2025-004, 2025-005 (on 2025-02-04) and 2025-007 (on 2025-02-19) each show position 1 five times and -1 once. Six votes at 5 to 1 with the same single dissenter is a constant. Not in the file who the dissenter is.
6. **Public-comment tallies are constant.** Every public-comment record shows against=0 (e.g. billId bill:office:gus2025:124143:board:2025-02-04:person_280ec92aebb84f69:0 for=6 against=0; ...:2025-02-19:person_280ec92aebb84f69:6 for=2 against=0).
7. **Council president changed without a record.** chamber-organized 2025-02-04 {"council-president":"person_f141fa779ab309fd"}, then chamber-organized 2025-12-15 {"council-president":"official:term:seat:US-DE:us-house:00:2025-01-20"}, a U.S. House member. No council-president change record is in the file.
8. **Same tally repeated across bodies.** The 27-14 and 15-6 tallies appear on legislative-vote measures 2025-003, 2025-007 and 2025-013 (lower and upper bodies) and in budget-adopted "the legislature vote 27-14, 15-6, 2025-051" (2025-07-01). Every vote sums to the full body (41 lower, 21 upper), so no seat was absent in any vote.
9. **Committee chairs and committee names.** Every lower-body committee-hearing is committee "general". Most name chair official:term:seat:US-DE:lower:020:0:2025-01-20, and some name an upper-body seat as the chair of a lower-body bill, e.g. billId ...legislature-lower:2025-06-30:official:term:seat:US-DE:lower:006:0:2025-01-20:9 with chair official:term:seat:US-DE:upper:008:0:2025-01-20. Not in the file why a state senator chairs a House committee.
10. **Sponsors from the other chamber.** Lower-body bills are sponsored by upper-body seats, e.g. bill:office:US-DE:legislature-lower:2025-06-30:official:term:seat:US-DE:upper:005:0:2025-01-20:16 (measure 2025-010), ...upper:007:0:2025-01-20:19 (2025-013) and ...upper:012:0:2025-01-20:26 (2025-020).
11. **One introduction date.** All 50 state lower-body bills are introduced 2025-06-30, and every committee, floor vote and law-took-effect on the state side is also dated 2025-06-30.
12. **Bills held in committee with no votes.** bill-held-in-committee=34 for the year. Every shown record reads yes=0 no=0 (e.g. bill:office:US-DE:legislature-lower:2025-06-30:official:term:seat:US-DE:lower:004:0:2025-01-20:24, ...:029 ... :31, ...:34, ...:36). No committee vote is recorded for them, and the file does not say what happened to them after.
13. **Veto status with no veto record.** Bills by status show office:US-DE:legislature-lower vetoed: 5. The records list has no veto kind and the federal and state log has none. Not in the file how the 5 vetoes were recorded or who vetoed.
14. **Constant election shares.** All statewide past and current elections show share 0.56 (governor 2012, 2016, 2020 and 2024; treasurer 2018 and 2022; insurance commissioner 2012, 2016, 2020; attorney-general 2022; auditor 2022). All state senate past terms show share 0.635 (seat:US-DE:upper:001:0, 002:0, 003:0, 004:0, 005:0).
15. **Every statewide seat is Democratic.** Governor, lieutenant governor, attorney general, treasurer, auditor, insurance commissioner and both U.S. Senate seats show Democratic or Democrat. The governor's seat says "Democratic" and the senators' seats say "Democrat"; the two spellings are both in the file.
16. **Federal bills under a Delaware office with other-state sponsors.** bill:office:US-DE:us-house:2025-12-15:official:seat:US-SC:us-house:03:84 has sponsor from US-SC, yes=214 no=219 and chamber federal:us-house; bill:office:US-DE:us-house:2025-12-15:official:seat:US-CA:us-house:18:81 has sponsor from US-CA with committee chair official:seat:US-PA:us-house:10 (yes=0 no=0).
17. **President sponsoring a House bill.** Sample federal bill bill:office:US-DE:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:59 has sponsorId official:term:seat:US:president:2025-01-20 and bodyOfficeId office:US-DE:us-house (kind budget, status enacted, provisions otherPrograms -101540957978).
18. **Trace for the 214-219 vote does not explain the vote.** The trace for bill-vote:...official:seat:US-SC:us-house:03:84 begins at official:seat:US-AK:us-house:00 (a U.S. Alaska member), then loops job to person to job (saved-trace.job) with no cause step.
19. **Six federal laws on one date at value 1.** us-policy-positions for clean-air-plan, restrict-abortion, ban-lobbying-after-office, fund-pensions-to-schedule, minimum-reserve-balance and balanced-operating-budget all show value=1 and date 2025-12-15. Federal dates in the file are only 2026-01-01, 2025-12-15 and 2025-10-01.
20. **Teacher minimum salary law at value 0.** Measure 2025-003 (education.raise-teacher-minimum-salary) passed 27-14 and 15-6, and law:US-DE:state:us-policy-positions:education.raise-teacher-minimum-salary:general:2025-06-30:2025-003 shows value "0". Not in the file why the passed bill's law has value 0.
21. **Minimum-wage authority law value cut off.** law-took-effect for labor-workforce.local-minimum-wage-authority (measure 2025-020, 2025-06-30) shows its value field truncated in the file; the value is not in the file.
22. **Huge and unlabeled money values.** Federal veterans balance: deltaMinor -11083705669802 (trace budget-line-changed:budget:US:2025:veterans:law:US:federal:...:2025-002#balance#2025-12-15). Sample federal bill otherPrograms -101540957978. State localAid +3117247446 and higherEducation +1390685389 (2025-07-01). The file does not define the minor unit.
23. **Adopted federal budget lists dropped lines with no changes shown.** budget-adopted:budget:US:2025 says seven lines were "dropped" (nationalDefense, communityAndRegionalDevelopment, incomeSecurity, internationalAffairs, medicare, education, health). The file shows no budget-line-changed records for those lines.
24. **Record counts disagree with the dumps.** law-took-effect: 31 in records, 30 in the federal and state log, yet 6 county law-took-effect lines are in the file. budget-line-changed: 31 in records, 34 in the log. chamber-organized: 2 in records, 5 in the dump. budget-adopted: 3 in records, 2 in the dump. legislative-vote: 57 in records, 51 in the log. inauguration=1 and president.address=1 appear in the log but not in the records list.
25. **Trace chains that stop at one step.** life.death:person_a611b5f7e5748759:2026-01-17 (chain ends at a perceived observation; condition=cancer has no cause). speech.retold and speech.heard traces (observation only, no reason). budget-line-changed and budget-adopted traces (end at the region). business.closed:organization_cefba7c8c56885a7 (organization to "opening" only). employer-closed:2025-11-01:organization_cefba7c8c56885a7 (perceived only). committee trace for the U.S. House bill (ends at the office). vote-recorded trace (learned key is the bare word "measureId").
26. **Replaced law with no earlier record.** law:county:10001:county:property-tax:general:2026-01-01 has change=replaced and replacesLawId law:county:10001:county:property-tax:general:2026-01-01:from-start. The earlier law is not in the file.
27. **Owner change with empty payload.** organization.owner-changed on 2025-03-01 has an empty payload {}. The file shows 2 organization.owner-changed records and only one is listed.
28. **Business closure reasons and sources differ.** organization_d9a7f65f06eb2e6e closed 2025-05-05 with closing-reason finance.unfunded-obligation-cash-and-credit-exhausted, but its closure-source is residents:wages:opening-payroll-calendar. No finance record is in the file. The 2025-06-01 closure (organization_619bb941b13da6c0) and the 2025-11-01 closure (organization_cefba7c8c56885a7) both carry "losses-kept" or "owner-closed" with no finance record.
29. **Executive offices with no act all year.** Lieutenant governor, attorney general, treasurer, auditor and insurance commissioner show no executive act, vote or record in the file. Governor shows no executive act record either. Eight module tables read "Unregistered module table": core2-elections-v1.vacancies, core2-voting-v1.contests, core2-voting-v1.filings, core2-voting-v1.campaigns, core2-executive-v1.offices, core2-executive-v1.terms, core2-legislature-v1.governments, core2-legislature-v1.budgets.
30. **Shared dates across unrelated records.** 2025-12-15 holds 25 federal bills, six federal laws and the council-president change. 2025-06-30 holds all 50 state lower bills and all state laws. 2025-10-01 holds the federal budget, the federal budget bill and the Medicaid and SNAP lines. 2025-07-01 holds the state budget and its 11 budget-line-changed records.
31. **Senate seat with a gap.** seat:US-DE:upper:002:0 has past terms ending 2023-01-01 (past:1, Tony Tanner), and the chamber-organized 2025-01-20 record names official:term:seat:US-DE:upper:002:0:2025-01-20 as president pro tempore. No 2023 to 2025 term for that seat is in the file.

## Raw facts for the report

Bills by body and status (copied from the file):

- office:US-DE:legislature-lower enacted: 10
- office:US-DE:legislature-lower failed: 36
- office:US-DE:legislature-lower vetoed: 5
- office:US-DE:us-house enacted: 7
- office:US-DE:us-house failed: 19
- office:gus2025:124143:board enacted: 7
- office:gus2025:124143:board failed: 1

Bills by body and introduction date (85 bills in the file):

- office:US-DE:legislature-lower 2025-06-30: 50
- office:US-DE:legislature-lower 2025-07-01: 1
- office:US-DE:us-house 2025-10-01: 1
- office:US-DE:us-house 2025-12-15: 25
- office:gus2025:124143:board 2025-02-04: 6
- office:gus2025:124143:board 2025-02-19: 1
- office:gus2025:124143:board 2025-07-01: 1

Budget-adopted lines:

- 2025-07-01 {"governmentId":"US-DE","fiscalYear":"2025","adoptedBy":"the legislature vote 27-14, 15-6, 2025-051"}
- 2025-10-01 {"governmentId":"US","fiscalYear":"2025","adoptedBy":"Congress vote 251-182, 73-27 (amended: nationalDefense, communityAndRegionalDevelopment, incomeSecurity, internationalAffairs, medicare, education, health dropped), 2025-001"}

Seat-vacated line:

- 2025-11-01 {"officeId":"office:US-DE:legislature-lower","seatId":"seat:US-DE:lower:012:0","cause":"moved away","rule":"special-election"}

Federal law (FED) lines shown (8 of 46 federal news items):

- FED 2026-01-01 income-tax value=37 percent-top-rate
- FED 2026-01-01 social-security-tax value=6.2 percent-of-wages
- FED 2025-12-15 us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties value=1
- FED 2025-12-15 us-policy-positions:civil-family-community.restrict-abortion value=1
- FED 2025-12-15 us-policy-positions:government-operations.ban-lobbying-after-office value=1
- FED 2025-12-15 us-policy-positions:fiscal.fund-pensions-to-schedule value=1
- FED 2025-12-15 us-policy-positions:fiscal.minimum-reserve-balance value=1
- FED 2025-12-15 us-policy-positions:fiscal.balanced-operating-budget value=1
- FED 2025-10-01 medicaid-match value=59.41 percent
- FED 2025-10-01 snap-maximum value=298 USD/month

Chamber-organized lines (5 in the dump):

- 2025-01-20 federal House and Senate leadership (other-state federal seats, per the national chambers)
- 2025-01-20 {"speaker":"official:term:seat:US-DE:lower:023:0:2025-01-20", ...} state lower body
- 2025-01-20 {"president-pro-tempore":"official:term:seat:US-DE:upper:002:0:2025-01-20", ...} state upper body
- 2025-12-15 {"council-president":"official:term:seat:US-DE:us-house:00:2025-01-20"}

Needs a why items: 31

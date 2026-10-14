# Delaware (Highland Acres): one year traced

- Town: Highland Acres, Delaware (US-DE). Seed: `98cea258e221`. Place id in traces: `1034810`.
- Start date: January 20, 2025. Player: Alexis Gibson (`person_e9348466b13095fe`), born February 1, 2007.
- People at start: 1,739. People at end: 1,803 total, 1,800 alive.
- Orgs at start: 120. Orgs at end: 159.
- Build time: 55 seconds. Year 1 runtime: 84 seconds. Heap: 2,250 MB.

## The year in this place

1. In February 2025 the local board (`office:gus2025:124143:board`) voted on six measures. Each was recorded at 5 to 1, and its public-comment tallies show no votes against.
2. Five county laws took effect on March 6, 2025, and the universal preschool law (`2025-007`) took effect on March 21, 2025.
3. Three businesses closed in the file (May 5, June 1 and November 1, 2025), each with a business.closed record.
4. On June 30, 2025 the state lower body (41 seats) and upper body (21 seats) voted on 50 bills introduced that same day. Every state committee, floor vote and law in the file is dated June 30, 2025.
5. The state budget was adopted on July 1, 2025 by "the legislature vote 27-14, 15-6". Eleven state budget-line records follow the same day.
6. Congress adopted the federal budget on October 1, 2025 (House 251-182, Senate 73-27). The file also shows Medicaid match at 59.41 percent and the SNAP maximum at 298 USD a month on that date.
7. A state lower seat (`seat:US-DE:lower:012:0`) was vacated on November 1, 2025 for "moved away" under a "special-election" rule. The file shows no special-election contest.
8. On December 15, 2025, 25 U.S. House bills were introduced in the Delaware office, and six federal policy-question laws took effect.
9. Federal tax lines took effect on January 1, 2026 (income tax top rate 37 percent; Social Security tax 6.2 percent of wages).
10. One person was born (February 19, 2025), one died (January 17, 2026, condition cancer), and 11 people moved away (last traced December 1, 2025).
11. A county property-tax law (0.431 percent of home value) took effect on January 1, 2026 and replaced an earlier law.
12. The player ends the year alive, with no job, $0 cash and home `household_a8d6435574bcbff4`. No player action is traced in the file.
13. No candidate filing, campaign or contest is recorded. "Election-ish kinds" is empty, and `core2-elections-v1.contests` shows 0 of 23.

## Needs a why

1. **Population counts do not reconcile.** The start is 1,739. The records show one birth, one death and 11 moves away, which gives about 1,728. The header shows 1,800 alive at the end (1,803 total). The file has no immigration kind, so the gain of about 72 is not explained. Three people are counted but not alive.
2. **Organizations grew by 39 with no founding record.** Orgs went from 120 to 159, with three organization.closed records. The records list has `cause-group.founded=1` and `drive.formed=6`, and no organization-created kind. The file does not say how the 39 were created.
3. **Election-ish kinds are empty.** The line reads "election-ish kinds:" with nothing after it, and a seat-vacated record exists. `core2-elections-v1.contests` shows 0 of 23. Offices show next election years of 2026 (`office:US-DE:us-house`, `office:US-DE:attorney-general`, `office:US-DE:treasurer`), and `seat:US-DE:us-senate:1` has electionYear 2026, but no contest for any of them is in the file.
4. **A vacancy with no special election.** The seat-vacated record for November 1, 2025 (`seat:US-DE:lower:012:0`) gives cause "moved away" and rule "special-election". No special-election contest is in the file. The vacancies dump reads "Unregistered module table: vacancies". Eleven people moved away but only one seat was vacated. The file does not say whether any mover held a seat.
5. **The council tally repeats.** Measures `2025-001` through `2025-005` (February 4, 2025) and `2025-007` (February 19, 2025) each show position 1 five times and -1 once. Six votes at 5 to 1 with the same single dissenter is a constant. The file does not say who the dissenter is.
6. **Public-comment tallies are constant.** Every public-comment record shows against=0, for example `bill:office:gus2025:124143:board:2025-02-04:person_280ec92aebb84f69:0` (for 6, against 0) and `...:2025-02-19:person_280ec92aebb84f69:6` (for 2, against 0).
7. **The council president changed with no record.** A chamber-organized record of February 4, 2025 names `person_f141fa779ab309fd` as council-president. A chamber-organized record of December 15, 2025 names `official:term:seat:US-DE:us-house:00:2025-01-20`, a U.S. House member, as council-president. No council-president change record is in the file.
8. **The same tally repeats across bodies.** The 27-14 and 15-6 tallies appear on measures `2025-003`, `2025-007` and `2025-013`, and in the budget-adopted line ("the legislature vote 27-14, 15-6, 2025-051"). Every vote sums to the full body (41 lower, 21 upper), so no seat was absent in any vote.
9. **Committee names and chairs look wrong.** Every lower-body committee hearing is committee "general". Most name `official:term:seat:US-DE:lower:020:0:2025-01-20` as chair. Some name an upper-body seat as chair of a lower-body bill, for example `bill:office:US-DE:legislature-lower:2025-06-30:official:term:seat:US-DE:lower:006:0:2025-01-20:9`, chaired by `official:term:seat:US-DE:upper:008:0:2025-01-20`. The file does not say why a state senator chairs a House committee.
10. **Sponsors from the other chamber.** Lower-body bills have upper-body sponsors, for example `bill:office:US-DE:legislature-lower:2025-06-30:official:term:seat:US-DE:upper:005:0:2025-01-20:16` (measure 2025-010), and the same pattern for upper seats 007 and 012 (measures 2025-013 and 2025-020).
11. **One introduction date for 50 bills.** All 50 state lower-body bills were introduced June 30, 2025. Every state committee, floor vote and law in the file is also dated June 30, 2025.
12. **Bills held in committee with no votes.** There are 34 bill-held-in-committee records. Every shown record reads yes=0, no=0 (for example `bill:office:US-DE:legislature-lower:2025-06-30:official:term:seat:US-DE:lower:004:0:2025-01-20:24`). No committee vote is recorded for them, and the file does not say what happened to them.
13. **Vetoes with no veto record.** The bills-by-status dump shows 5 bills vetoed in the lower body. The records list has no veto kind, and the federal and state log has none. The file does not say how the vetoes were recorded or who issued them.
14. **Constant election shares.** Every statewide election in the file shows a share of 0.56: governor (2012, 2016, 2020, 2024), treasurer (2018, 2022), insurance commissioner (2012, 2016, 2020, 2024), attorney general and auditor (2022). Every state senate past term shows 0.635 (`seat:US-DE:upper:001:0`, `002:0`, `003:0`, `004:0`, `005:0`).
15. **Every statewide seat is Democratic.** The governor, lieutenant governor, attorney general, treasurer, auditor, insurance commissioner and both U.S. Senate seats are Democratic. The governor's seat says "Democratic" and the senators' seats say "Democrat".
16. **Federal bills under a Delaware office have other-state sponsors.** `bill:office:US-DE:us-house:2025-12-15:official:seat:US-SC:us-house:03:84` has a South Carolina sponsor, a vote of 214 yes and 219 no, and chamber `federal:us-house`. `bill:office:US-DE:us-house:2025-12-15:official:seat:US-CA:us-house:18:81` has a California sponsor and a committee chair from Pennsylvania (`official:seat:US-PA:us-house:10`), with yes=0, no=0.
17. **A president sponsors a House bill.** The sample federal bill `bill:office:US-DE:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:59` has the president as sponsor and `office:US-DE:us-house` as body. It is a budget bill with status enacted and an otherPrograms provision of -101540957978.
18. **The trace for the 214-219 vote does not explain it.** The trace for the South Carolina bill starts at `official:seat:US-AK:us-house:00`, an Alaska member, then loops from job to person to job (saved-trace.job). It has no cause step.
19. **Six federal laws at value 1 on one date.** Clean air plan, restrict abortion, ban lobbying after office, fund pensions to schedule, minimum reserve balance and balanced operating budget all show value=1 and took effect December 15, 2025. The file's federal dates are only January 1, 2026, December 15, 2025 and October 1, 2025.
20. **A passed bill with a value-0 law.** Measure `2025-003` (education.raise-teacher-minimum-salary) passed 27-14 and 15-6. Its law `law:US-DE:state:us-policy-positions:education.raise-teacher-minimum-salary:general:2025-06-30:2025-003` shows value "0". The file does not say why.
21. **A minimum-wage law value is cut off.** The law for `labor-workforce.local-minimum-wage-authority` (measure `2025-020`, June 30, 2025) is truncated in the file, so its value is not in the file.
22. **Huge and undefined money values.** The federal veterans balance line shows deltaMinor -11083705669802 (`budget-line-changed:budget:US:2025:veterans:...#balance#2025-12-15`). The sample federal bill's otherPrograms is -101540957978. The state localAid line is +3117247446 and higherEducation +1390685389 (July 1, 2025). The file does not define the minor unit.
23. **Dropped budget lines with no changes shown.** The federal budget-adopted line says seven lines were dropped (nationalDefense, communityAndRegionalDevelopment, incomeSecurity, internationalAffairs, medicare, education, health). The file shows no budget-line-changed records for those lines.
24. **Counts disagree with the dumps.** law-took-effect: 31 in the records list, 30 in the federal and state log, yet six county law-took-effect lines are in the file. budget-line-changed: 31 in records, 34 in the log. chamber-organized: 2 in records, 5 in the dump. budget-adopted: 3 in records, 2 in the dump. legislative-vote: 57 in records, 51 in the log. `inauguration=1` and `president.address=1` appear in the log but not in the records list.
25. **Trace chains that stop at one step.** The life.death trace for `person_a611b5f7e5748759` ends at a perceived observation and gives no cause for cancer. The speech traces are observation only. The budget-line and budget-adopted traces end at the region. The business.closed and employer-closed traces for `organization_cefba7c8c56885a7` end at the opening record or at perception. The committee trace ends at the office. The vote-recorded trace's learned key is the bare word "measureId".
26. **A replaced law with no earlier record.** `law:county:10001:county:property-tax:general:2026-01-01` has change=replaced and replacesLawId `law:county:10001:county:property-tax:general:2026-01-01:from-start`. The earlier law is not in the file.
27. **An owner change with an empty payload.** The organization.owner-changed record of March 1, 2025 has an empty payload. The file shows two of these records and lists one.
28. **Closure reasons and sources differ.** `organization_d9a7f65f06eb2e6e` closed May 5, 2025 with the reason "finance.unfunded-obligation-cash-and-credit-exhausted", but its closure source is a residents payroll-calendar record. No finance record is in the file. The June 1, 2025 closure (`organization_619bb941b13da6c0`) and the November 1, 2025 closure (`organization_cefba7c8c56885a7`) both give "losses-kept" or "owner-closed" with no finance record.
29. **Executive offices with no act all year.** The lieutenant governor, attorney general, treasurer, auditor and insurance commissioner have no executive act, vote or record in the file. The governor has none either. Eight module tables read "Unregistered module table": `core2-elections-v1.vacancies`, `core2-voting-v1.contests`, `core2-voting-v1.filings`, `core2-voting-v1.campaigns`, `core2-executive-v1.offices`, `core2-executive-v1.terms`, `core2-legislature-v1.governments`, `core2-legislature-v1.budgets`.
30. **Shared dates across unrelated records.** December 15, 2025 holds 25 federal bills, six federal laws and a council-president change. June 30, 2025 holds all 50 state lower bills and all state laws. October 1, 2025 holds the federal budget, the federal budget bill and the Medicaid and SNAP lines. July 1, 2025 holds the state budget and its 11 budget-line records.
31. **A Senate seat with a gap.** `seat:US-DE:upper:002:0` has a past term ending January 1, 2023 (past:1, Tony Tanner). The chamber-organized record of January 20, 2025 names `official:term:seat:US-DE:upper:002:0:2025-01-20` as president pro tempore. The file has no term covering 2023 to 2025 for that seat.

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

Chamber-organized lines (5 in the dump): January 20, 2025 federal House and Senate leadership (members from other states, as the national chambers have), January 20, 2025 state lower and upper leadership, and December 15, 2025 `{"council-president":"official:term:seat:US-DE:us-house:00:2025-01-20"}`.

Needs a why items: 31

# Red Rock Ranch, New Mexico — one year (seed da4f30ef438d)

This audit reads the one-year trace for Red Rock Ranch and lists what the engine recorded, the items that need an explanation, and the record counts. Nothing here assumes a cause.

## The year

The player is Austin Nichols (person_9256733457286070), born February 3, 2007, a warehouse worker with $2,795 in cash. The year ran from January 20, 2025 to January 20, 2026. The summary line reports zero deaths, yet 1,776 of 1,781 people were alive at year end.

The council organized February 4, 2025 under a council president. The board cast six votes on each of eight measures: five on February 4, 2025 (2025-001 to 2025-005) and three on February 19, 2025 (2025-009 to 2025-011). Six tallied 4 to 2 and two tallied 1 to 5. County laws from six of them took effect March 6 and March 21, 2025. Board bill 93 tallied 3 to 4 on January 15, 2026. Six state seats were vacated: two on June 1, 2025, two on September 1, one on November 1 and one by death on November 25. No appointments are recorded.

At the state level, the legislature organized January 20, 2025. Bill 2025-002 drew 59 to 11 in the lower chamber and 35 to 7 in the upper chamber on March 22, 2025. Twelve state laws took effect June 20, 2025, including a carbon price, along with a $106.5 million shift from highways to transit. The fiscal 2025 budget was adopted July 1, 2025 on votes of 44 to 26 and 26 to 16. A state minimum wage of $15.00 an hour took effect January 21, 2025.

Federally, Melissa Farmer took office as president January 20, 2025. Congress adopted the 2025 budget October 1, 2025 (House 251 to 182, Senate 69 to 31). Federal records set a 37 percent top income tax rate from January 1, 2026. The U.S. House office recorded 23 bills on December 15, 2025 and enacted four of its 24 bills in the year.

## Needs a why

1. **Deaths: summary says 0, the seat record says one.** The summary line reads "deaths: 0", but seatId `seat:US-NM:lower:015:0` (officeId `office:US-NM:legislature-lower`) was vacated with cause "death" on November 25, 2025. Year-end count is 1,776 alive of 1,781.

2. **Identical six-vote patterns across measures.** On February 4, 2025, measureIds 2025-001, 2025-002 and 2025-005 each show positions 1, 1, -1, 1, -1, 1 (4 to 2). Measures 2025-003 and 2025-004 each show -1, -1, -1, 1, -1, -1 (1 to 5). On February 19, 2025, measureIds 2025-009, 2025-010 and 2025-011 each show 1, 1, -1, 1, -1, 1 (4 to 2).

3. **Two local measures with no outcome record.** measureIds 2025-003 (civilian oversight of police) and 2025-004 (paid family leave) tallied 1 to 5 on February 4, 2025, and no law-took-effect record exists for either. The status counts say the board enacted 7 and failed 9, but no record names which ones.

4. **Seven voters on a board bill.** billId `bill:office:gus2025:170370:board:2026-01-15:person_b987d5e4c0cc2fa1:93` tallied yes=3, no=4 across seven personIds (personIds.0 through .6). Every other board vote in the file has six voters. Date: January 15, 2026.

5. **Six seats vacated, none filled.** `seat:US-NM:lower:063:0` and `seat:US-NM:upper:023:0` (June 1, 2025); `seat:US-NM:lower:002:0` and `seat:US-NM:upper:029:0` (September 1, 2025); `seat:US-NM:lower:028:0` (November 1, 2025); `seat:US-NM:lower:015:0` (November 25, 2025). Each has rule "appointment" and no appointment record. The vacancies table is unregistered (core2-elections-v1.vacancies).

6. **Population and organizations grew with no birth or founding record.** Header: people 1721, orgs 118. Year-end: people 1781, orgs 162. The record kinds include no birth or organization-opened kind, only organization.closed=2 and business.closed=2. Span: January 20, 2025 to January 20, 2026.

7. **Zero-value laws took effect.** lawId "law:US-NM:state:us-policy-positions:fiscal.minimum-reserve-balance:general:2025-06-20:2025-006" has value "0", and lawId "law:US-NM:state:us-policy-positions:education.raise-teacher-minimum-salary:general:2025-06-20:2025-008" has value "0". Both took effect June 20, 2025.

8. **Committee outcomes share one date and most show no vote.** All 47 bill-held-in-committee and all 47 committee-hearing records are dated March 22, 2025. Held records show yes 0, no 0 (for example billId "bill:office:US-NM:legislature-lower:2025-03-22:official:term:seat:US-NM:upper:002:0:2025-01-20:11"), and most name chair `official:term:seat:US-NM:lower:018:0:2025-01-20`. Eighteen committee-hearing records show exactly 7 yes and 4 no (for example billId "...:lower:043:0:2025-01-20:18"). Lower-chamber status counts show 41 failed.

9. **Tallies repeat across bills.** On March 22, 2025, the upper chamber recorded 26 to 16 on seven bills: billId "bill:office:US-NM:legislature-lower:2025-03-22:official:term:seat:US-NM:upper:002:0:2025-01-20:16" (measure 2025-006), and the same prefix with suffixes 18, 20, 21, 22, 24 and 25 (measures 2025-008, 2025-010, 2025-011, 2025-012, 2025-014 and 2025-015). The budget adopted July 1, 2025 cites "the legislature vote 44-26, 26-16, 2025-054", and no vote record shows measure 2025-054.

10. **Contest table empty while candidates filed.** core2-elections-v1.contests reads "0 of 25". Candidate records exist: filingId "filing:contest:seat:US-NM:lower:069:0:2026-11-03:person_538f6a6110af5c24" (December 5, 2025) and campaignId "filing:contest:seat:gus2025:170370:board:4:2026-11-03:person_81f90a481e33be93" (campaign-message, January 9, 2026). The year shows candidate-filed=12.

11. **Executive and other module tables unregistered, and the governor shows no act.** core2-executive-v1.offices, core2-executive-v1.terms, core2-legislature-v1.governments, core2-legislature-v1.budgets, core2-voting-v1.contests, core2-voting-v1.filings and core2-voting-v1.campaigns each report "Unregistered module table". office:US-NM:governor (seat:US-NM:governor) has no executive record in the year.

12. **Federal House bill sponsored and chaired from other states.** billId `bill:office:US-NM:us-house:2025-12-15:official:seat:US-VA:us-senate:1:90` (New Mexico House office, Virginia senate sponsor) reports committee chair `official:seat:US-KS:us-house:01`, with yes 0 and no 0. Date: December 15, 2025.

13. **Federal chamber record uses a local key.** The chamber-organized record of December 15, 2025 carries the key "council-president" with value `official:term:seat:US-NM:us-house:01:2025-01-20`. Federal records from January 20, 2025 use bare `official:seat:...` ids (for example `official:seat:US-MO:us-house:02`) where other records use term ids.

14. **Identical elected shares.** Every statewide term reads share 0.56 (for example `term:seat:US-NM:governor:2025-01-20`, elected November 8, 2022). Every legislative term reads 0.635 (for example `term:seat:US-NM:upper:012:0:2025-01-20:past:6`, elected November 3, 1998).

15. **Replacement law points to a "from-start" id.** lawId "law:county:35031:county:property-tax:general:2026-01-01" has change "replaced" and replacesLawId "law:county:35031:county:property-tax:general:2026-01-01:from-start". No predecessor law is recorded. Date: January 1, 2026.

16. **Obligation fell 29 percent with no law named.** law.effect-landed for obligationId "retirement-claim:person_5f4f1daa964d2f48" went from fromMinor 170832 to toMinor 120629. The record names no lawId. Date: December 15, 2025.

17. **Empty and estimated organization records.** organization.owner-changed on April 1, 2025 has an empty payload ({}). business.closed for organization_24e87350f326cbff on November 1, 2025 lists source estimatedFrom "opening" with closing-reason "losses-kept". Both need a source.

18. **Upper chamber originated no bills.** No bill lists office:US-NM:legislature-upper as its body. All 54 state bills list office:US-NM:legislature-lower (13 enacted, 41 failed), and the upper chamber only votes on them. Span: 2025.

19. **One federal line moved about $110.8 billion.** budget-line-changed on December 15, 2025 for line "veterans" has deltaMinor -11083760726950, measureId "law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15". Only the trace shows it.

## Counts

- Header: people 1721, orgs 118 (built in 57s).
- Year 1 (January 20, 2025 to January 20, 2026): people 1781, alive 1776, orgs 162.
- Records this year: 16,606.
- Top 10 record kinds: person.acted=13489, cause.shared=797, news.read=623, cause.volunteered=374, speech.retold=306, vote-recorded=126, cause.donated=101, case.made=86, cause-group.joined=73, office.approached=72 (tied with office.replied=72).

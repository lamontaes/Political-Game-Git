# Tillamook, Oregon — one year (seed 19a393194ce9)

This one-year trace shows the local county board and city council acting, a state House and Senate passing and failing bills, and a federal government running on the same engines. Several records need an explanation before the year can be trusted: the player is 17 on the first day yet holds a city job, a U.S. House member is recorded as council president, six people are not alive with zero deaths, and seats were vacated with no appointments.

## The year

The player is Amanda Campbell (person_07ace693acfa8811), born January 23, 2007. At year end she is alive, is Public Works Director and has $0 cash.

Locally, a council seat, the sheriff seat and the county clerk seat were vacated on February 1, 2025. On February 4, the county board recorded 2-1 votes on measures 2025-001, 2025-002 and 2025-003. Those county laws took effect March 6, 2025, the day three recall petitions were filed against board seats 0, 1 and 2. A city administrator and a city clerk were appointed on February 19. Two more seats were vacated on April 1. The county board adopted its budget 3-0 and the city council adopted its budget 5-0 on July 1, 2025. No election is recorded.

At the state level, the House acted on 55 bills on June 29, 2025: 12 enacted, 42 failed and 1 vetoed. The legislature adopted the state budget on July 1, 2025, by votes of 37-23 and 18-12. Minimum wage tiers took effect that day. Two state Senate seats were vacated, on November 1 and December 1, 2025. A local minimum-wage authority law, signed by Governor Andrew Holt, took effect January 1, 2026.

Federally, William Hicks (Republican) is president. Congress adopted the 2025 budget on October 1, 2025, with votes of 255-178 and 72-28. On December 15, 2025, a House bill numbered 2025-023 was recorded at 201-232. On January 1, 2026, the top federal income tax rate was 37 percent.

## Needs a why

1. **Player is 17 on the first day and holds a job.** The header gives `player person_07ace693acfa8811 Amanda Campbell born 2007-01-23`, and the year line gives `job=Public Works Director` at the end of the year. On January 20, 2025, she is 17 and turns 18 on January 23, 2025. No hire or appointment record for person_07ace693acfa8811 appears in the file. Dates: January 20, 2025 to January 20, 2026.

2. **A U.S. House member is recorded as council president.** `chamber-organized` on December 15, 2025 gives `{"council-president":"official:term:seat:US-OR:us-house:01:2025-01-20"}`. The same person appears in `vote:2025-023:official:term:seat:US-OR:us-house:01:2025-01-20` (vote-recorded, December 15, 2025, position -1). The council president was also person_9b7dc650fa9b55eb on February 4, 2025, and person_3273806fc101674a on April 5, 2025.

3. **Population arithmetic with no deaths or births.** The header shows people 1860, and the year line shows people 1947 and alive 1941. That is six people not alive, with `deaths: 0` and no death kind among the 25 record kinds. The count also rose by 87 with no birth kind listed. Dates: January 20, 2025 to January 20, 2026.

4. **County board budget 3-0 after a seat was vacated.** `budget-adopted governmentId county:41057 adoptedBy "the county board vote 3-0, 2025-004"` on July 1, 2025. Seat `seat:gus2025:111587:board:2` was vacated on April 1, 2025 (moved away, appointment). The file has no appointment for that seat. The February 4, 2025 board votes were 2-1 on three measures.

5. **Seats vacated with no fill record, and a count mismatch.** Vacated seats: `seat:gus2025:173690:council:4` (February 1, 2025), `seat:gus2025:173690:council:0` (April 1, 2025), `seat:gus2025:111587:sheriff:0` (February 1, 2025), `seat:gus2025:111587:clerk:0` (February 1, 2025), `seat:US-OR:upper:022:0` (November 1, 2025) and `seat:US-OR:upper:030:0` (December 1, 2025). Only two appointments appear, both on February 19, 2025. The city-clerk appointment does not match the vacated county clerk seat. The year line says `seat-vacated=8`, but seven seat-vacated records appear in the file.

6. **Orgs rise with no org-opened record.** The header shows orgs 124 and the year line shows orgs 143, a gain of 19. Only two closures appear: `organization_ea669ca0220dde59` (June 1, 2025) and `organization_63776682a7fe2ea6` (November 1, 2025). No org-opened kind is among the 25 kinds.

7. **Three 15-15 ties in a 30-seat Senate.** All three are on June 29, 2025, in the upper-chamber `legislative-vote` records:
   - `bill:office:US-OR:legislature-lower:2025-06-29:official:term:seat:US-OR:lower:014:0:2025-01-20:19` (number 2025-017, lower 32-28)
   - `bill:office:US-OR:legislature-lower:2025-06-29:official:term:seat:US-OR:upper:022:0:2025-01-20:21` (number 2025-019, lower 32-28)
   - `bill:office:US-OR:legislature-lower:2025-06-29:official:term:seat:US-OR:lower:047:0:2025-01-20:31` (number 2025-029, lower 36-24)

   The file does not show how any tie was decided or the final status.

8. **Vetoed bill passed both chambers, with no veto record.** `bill:office:US-OR:legislature-lower:2025-06-29:official:term:seat:US-OR:lower:047:0:2025-01-20:3` (number 2025-001, rent stabilization) recorded lower 58-2 and upper 29-1 on June 29, 2025. The sample bill shows `status: vetoed`. No veto event appears among the 25 kinds.

9. **Recall petitions filed the day the law took effect, all three seats.** `recall:term:seat:gus2025:111587:board:0:2025-01-20:2025-03-06`, `...board:1...` and `...board:2...` were all filed on March 6, 2025. Each cites the same `lawId` (county inclusionary requirement), which took effect on March 6, 2025.

10. **Vote positions look inverted against the tallies.** `vote-recorded measureId 2025-001 ... position -1` on June 29, 2025 belongs to a bill that passed its lower chamber 58-2. `measureId 2025-002` (mileage fee) recorded position -1 against a lower tally of 59-1. The file does not say what -1 means, so the recorded positions cannot be checked against the outcomes.

11. **One measure number, three bodies.** `measureId 2025-001` appears on the county board (February 4, 2025, inclusionary requirement), on the state House bill above (June 29, 2025, rent stabilization), and on a federal bill `bill:office:US-OR:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:60` (introduced October 1, 2025).

12. **Every vote is full attendance.** Lower-chamber tallies sum to 60 every time, upper-chamber tallies to 30, and committee tallies to 11 (for example 11-0 and 2-9 on June 29, 2025). No absence is recorded. The lower-chamber committee chair `official:term:seat:US-OR:lower:046:0:2025-01-20` chairs most of the 59 hearings.

13. **Bills die in committee at 0-0.** 41 `bill-held-in-committee` records are dated June 29, 2025, many with `yes:"0","no":"0"`. For example, `bill:office:US-OR:legislature-lower:2025-06-29:official:term:seat:US-OR:lower:004:0:2025-01-20:9` through `...:54`. The House recorded 42 failed bills, and the upper chamber introduced none.

14. **Federal House bills with out-of-body sponsors.** `bill:office:US-OR:us-house:2025-12-15:official:seat:US-MI:us-house:10:82` (number 2025-023, 201-232) and `bill:office:US-OR:us-house:2025-12-15:official:seat:US-GA:us-senate:1:78` (held in committee, chair `official:seat:US-FL:us-house:05`) are both in the Oregon House body. The second has a Senate sponsor. Date: December 15, 2025.

15. **A single federal line cut of about $110.8 billion.** `budget-line-changed budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15` shows `deltaMinor=-11083957904847` under a balanced-operating-budget law. Date: December 15, 2025.

16. **Same-date cluster.** 135 trace lines (lines 50 to 184) are dated June 29, 2025. Among them, 54 state House bills were introduced that day.

17. **Candidates filed, but no contest or filing rows.** The year counts show `candidate-filed=5` and `cause-group.ad-ran=4`. The filings, campaigns, vacancies, contests, executive offices and terms tables are all marked "Unregistered module table." Only one contest row (`contest:seat:US:president:2028-11-07`, 1 of 25) is shown. The file records no local or state election in the year.

18. **Tiny balance.** `budget-line-changed governmentId place:4173700 level city line corrections deltaMinor=-42` on July 1, 2025 is $0.42 if minor units are cents. The player's year-end cash is exactly $0.

## Counts

Header: `# Tillamook, Oregon seed 19a393194ce9 start 2025-01-20 built in 47s people 1860 orgs 124`

Year line: `year 1: 2025-01-20 -> 2026-01-20 74s heap 2009MB people 1947 alive 1941 orgs 143`

Records this year: 16474

Top 10 record kinds:

- person.acted: 15455
- case.made: 453
- news.read: 84
- speech.retold: 71
- vote-recorded: 64
- committee-hearing: 59
- legislative-vote: 52
- cause.shared: 50
- budget-line-changed: 42
- bill-held-in-committee: 41

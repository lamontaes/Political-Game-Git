# Utica, Ohio — one year (seed 92e8bf7f65cc)

The year's record is mostly consistent, but several things need a why before anyone trusts it: every board vote reads 1 yes, 2 no; the mayor's race has no winner; a U.S. House member is recorded as council president; and a treasurer's death sits beside a "deaths: 0" line. Nineteen items follow.

## The year

Blair Rosa (person_f33cac6322db4384, born January 22, 2007) is the player. At year end Blair is alive, has no job and has $0 in cash.

Locally, board legislative votes were recorded on five bills on February 4, 2025 and on three bills on February 19, 2025. Council seats 2 and 3 were vacated February 1, 2025 (moved away). The town appointed a finance director and a public works head on February 19, 2025, and a city administrator and a city attorney on October 17, 2025. On November 4, 2025, three council seats were decided; the mayor's race recorded no winner. Laws on an immigration partnership and universal preschool took effect March 6, 2025. The 2026 town budget passed 4-1 on January 1, 2026.

At the state level, lower-chamber bills were voted on June 30, 2025, and the state budget was adopted July 1, 2025 by 65-34 and 24-9. Treasurer Tim Carey died August 1, 2025. The governor appointed Jennifer Shannon, who won the October 30, 2025 special election, 1,231,174 to 803,384 over a state representative. Five state seats were vacated between September 1, 2025 and January 1, 2026. A state minimum wage value of 1,500 minor units an hour took effect January 21, 2025. A county property tax of 1.222 percent of home value took effect January 1, 2026.

Federally, Richard Meyer and Diane Bolton began as president and vice president on January 20, 2025. Congress adopted the federal budget October 1, 2025 (House 256-177, Senate 68-32). The 37 percent top income tax rate and the 6.2 percent Social Security tax took effect January 1, 2026. Twenty-four U.S. House bills introduced December 15, 2025 are recorded as held in committee.

## Needs a why

1. **Every board vote reads 1 yes, 2 no.** Legislative votes on bills numbered 2025-001 through 2025-005 (February 4, 2025), 2025-009 through 2025-011 (February 19, 2025) and 2026-004 (January 15, 2026) all show yes=1, no=2. Records: `bill:office:gus2025:191153:board:2025-02-04:person_2653256c3e966db1:0` through `:4`; `bill:office:gus2025:191153:board:2025-02-19:person_2653256c3e966db1:17`, `:18`, `:19`; `bill:office:gus2025:191153:board:2026-01-15:person_2653256c3e966db1:130`. Board totals: 1 enacted, 25 failed.

2. **Council public comment is nearly identical on every bill.** `bill:office:gus2025:209071:council:2025-02-19:person_2653246c3e966bfe:20`, `:22`, `:23`, `:24` each show for=0, against=6 (February 19, 2025). `bill:office:gus2025:209071:council:2025-02-04:person_2653246c3e966bfe:11` shows for=0, against=2 (February 4, 2025). Council totals are 3 enacted, 23 failed, but no council legislative-vote tally appears in the excerpt.

3. **Measure 2025-001 is used for two questions on one date, and laws took effect on numbers whose votes read 1-2.** On February 4, 2025, measureId 2025-001 appears for universal-preschool and for partner-with-federal-immigration-enforcement. City laws took effect March 6, 2025: `law:place:3979114:city:us-policy-positions:justice-public-safety.partner-with-federal-immigration-enforcement:general:2025-03-06:2025-001` and `law:place:3979114:city:us-policy-positions:education.universal-preschool:general:2025-03-06:2025-003`. The board bills numbered 2025-001 and 2025-003 that day read 1-2 (`...:2025-02-04:person_2653256c3e966db1:0` and `:2`).

4. **State vote totals repeat exactly.** Lower chamber 65-34 on `bill:office:US-OH:legislature-lower:2025-06-30:official:term:seat:US-OH:upper:012:0:2025-01-20:28` (2025-004), `...:lower:045:0:2025-01-20:29` (2025-005), `...:lower:045:0:2025-01-20:30` (2025-006) and `...:lower:045:0:2025-01-20:32` (2025-008). Upper chamber 24-9 on bills 2025-001, 2025-004, 2025-005, 2025-007, 2025-008, 2025-010 and 2025-011, all June 30, 2025. The budget-adopted record (July 1, 2025, 2025-054) repeats 65-34 and 24-9. The tallies shown sum to exactly 99 (House) or 33 (Senate).

5. **All state committee hearings and all 53 lower-chamber bill introductions fall on June 30, 2025, with the same two chairs.** Every committee-hearing record shown is chaired by `official:term:seat:US-OH:lower:050:0:2025-01-20` or `official:term:seat:US-OH:upper:008:0:2025-01-20`. Bills introduced June 30, 2025 in `office:US-OH:legislature-lower`: 53. The year total is 57 committee-hearing records.

6. **A U.S. House member is recorded as council president on December 15, 2025.** `chamber-organized` on December 15, 2025 reads `"council-president":"official:term:seat:US-OH:us-house:08:2025-01-20"`. The council president was `person_24ed8d4630853b25` on February 4, 2025, and no change record is shown. The same official is the committee chair on item 7's bill that day.

7. **U.S. House bills held in committee with no tally; sponsor is a New Mexico seat.** `bill:office:US-OH:us-house:2025-12-15:official:seat:US-NM:us-house:03:122` shows committee yes=0, no=0, chair `official:term:seat:US-OH:us-house:08:2025-01-20`. Twenty-four U.S. House bills were introduced December 15, 2025; the year has 44 bill-held-in-committee records.

8. **Deaths line says 0, but a treasurer died and five people are not alive.** The file reads "deaths: 0" (audit file line 215). Treasurer `seat-vacated` on August 1, 2025 has cause "death", and `term:seat:US-OH:treasurer:2025-01-20` ends August 1, 2025 with endedBy "death". People: 1852 total, 1847 alive. The year also shows person.moved-away=8.

9. **Mayor's race has no winner and no shown candidates; appointments come from a person not shown as mayor.** `election-result` `contest:seat:gus2025:209071:mayor:0:2025-11-04` (November 4, 2025): winnerId empty, totals {}. Appointments by `person_0c1baf47e1ba35b5`: finance-director and public-works (February 19, 2025), city-administrator and city-attorney (October 17, 2025). No candidate-filed line for the mayor's contest appears in the excerpt.

10. **Two council seats vacated the same day; seat 3 shows no fill.** `seat-vacated` on February 1, 2025 for `seat:gus2025:209071:council:2` and `seat:gus2025:209071:council:3` (office `office:gus2025:209071:council`), cause "moved away", rule "appointment". No appointment record for seat 3 appears. Seat 2 next appears in filings for `contest:seat:gus2025:209071:council:2:2025-11-04` (June 7, 2025).

11. **Five state seats vacated with no fill record.** `seat:US-OH:lower:003:0` and `seat:US-OH:lower:026:0` (September 1, 2025); `seat:US-OH:upper:016:0` (November 1, 2025); `seat:US-OH:lower:099:0` (December 1, 2025); `seat:US-OH:lower:020:0` (January 1, 2026). All are "appointment" rule. The year's official-appointed count is 4, all local posts.

12. **Council totals are lopsided.** `contest:seat:gus2025:209071:council:4:2025-11-04` (November 4, 2025): `person_f046ef310d4e80d9` 2014 to `person_2653256c3e966db1` 17. `contest:seat:gus2025:209071:council:0:2025-11-04`: `person_2653246c3e966bfe` 1269, `person_12691d3eb1ea43b8` 413, `person_03009c0003a5b440` 2 (the mayor pro tem named February 4, 2025). The seat 0 totals are cut off in the file.

13. **Seat-vacated count does not match its parts.** The year's kinds line reads seat-vacated=9. The federal and state block reads 6 (audit file lines 465 to 470). Only 2 local vacancies appear (audit file lines 16 and 17). One local vacancy is unaccounted for in the excerpt.

14. **Five cause-group ads, same date, identical reach.** `cause-group.ad-ran` on April 1, 2025 for `organization:cause-group:person_03009c0003a5b440:cause:us-policy-positions:civil-family-community.ban-discrimination-in-housing-and-work`, `...person_24ed8d4630853b25:cause:us-policy-positions:justice-public-safety.civilian-oversight-of-police`, `...person_2b36cd18f3f07aa3:cause:...civilian-oversight-of-police`, `...person_b012a1bf6505a6b1:cause:...civilian-oversight-of-police`, `...person_f046ef310d4e80d9:cause:...ban-discrimination-in-housing-and-work`. All show "reached":"38"; spend and balances differ.

15. **State minimum wage took effect with no bill shown.** `law-took-effect` on January 21, 2025 for `law:US-OH:state:minimum-wage:general:2025-01-21:law:US-OH:state:us-policy-positions:labor-workforce.raise-minimum-wage:general:starting`, value "1500", unit minor/hour. The raise-minimum-wage bill, `bill:office:US-OH:legislature-lower:2025-06-30:official:term:seat:US-OH:lower:045:0:2025-01-20:33` (June 30, 2025), read 66-33 and 23-10. Its enactment is not in the excerpt.

16. **Adopted town budget drops ten lines; only one line moves.** `budget-adopted:budget:place:3979114:2026` (January 1, 2026): "4-1 (amended: ... police ... schools, administration dropped)". The only `budget-line-changed` shown is `budget:place:3979114:2026:parks:adopted` with deltaMinor=54180.

17. **Federal budget bill sponsored by the president, with a negative line.** `bill:office:US-OH:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:99` (October 1, 2025): sponsor is the president; otherPrograms value -85299504610; status "enacted"; no vote tally on the record. The federal budget-adopted record (October 1, 2025, Congress vote 256-177, 68-32) lists seven lines dropped.

18. **Treasurer special election date is an estimate.** `contest:seat:US-OH:treasurer:2025-10-30:special` has basis "estimated" (filings opened August 1, 2025, deadline September 15, 2025). Election-result on October 30, 2025: `official:term:seat:US-OH:treasurer:2025-08-01` 1231174 to `official:term:seat:US-OH:lower:009:0:2025-01-20` 803384.

19. **People and orgs grow with no births recorded; the year ran long.** Header: people 1775 at build, 1852 at year end (+77), with no births and 0 deaths listed and 8 moved away. Orgs 126 to 208 with 2 closed (`organization_91a67e6329700c74`, June 1, 2025). The year took 132s, above the two-minute target in AGENTS.md.

## Counts

- Header: 1775 people and 126 orgs at build. Year end: 1852 people (1847 alive), 208 orgs.
- Records this year: 12082 (news items: 556).
- Top 10 record kinds:
  - person.acted=8728
  - cause.shared=627
  - news.read=505
  - speech.retold=477
  - case.made=279
  - cause.volunteered=265
  - vote-recorded=228
  - campaign-message=172
  - speech.heard=149
  - cause-group.ad-ran=98

# Felts Mills, New York — one year (seed 1ccb545e9d35)

The one-year trace of Felts Mills shows a complete calendar of local, state and federal events, but several of its numbers do not add up. The vote totals exceed the town's population, two town boards voted while seats were vacant, and the summary reports zero deaths while two state senators died. Each item under "Needs a why" needs an explanation before the trace is trusted.

## The year

The player is Piper Yarbrough, born January 25, 2007. At year end they are alive, with no job and $0 cash.

Locally, five seats on the two town boards were vacated on February 1, 2025, each marked "moved away" under an appointment rule. On February 4, the 131368 board voted on five bills, 1 yes and 2 no each, and the 170423 board voted on five, with tallies of 1-6 on four and 2-5 on one. All nine 131368 bills failed. On November 4, 2025, three 131368 seats were decided: the top vote-getter in seat 0 won with 2,326 votes to 113, while seats 1 and 2 had one filing each and recorded 2,439 and 2,436 votes. The county board adopted its 2026 budget 7-0 on January 1, 2026, and a 1.54 percent property tax took effect that day. Businesses closed 11 times, at least five citing unfunded obligations.

Statewide, the legislature adopted the 2025 budget on April 1, 2025 (lower 103-47, upper 41-22). On April 20, a pension funding law and a highway-to-transit shift took effect. Joanne Wells is governor, with Tonya Stanton as lieutenant governor, Scott Lambert as attorney general and Kimberly Patterson as comptroller. The lower chamber recorded 53 bills: nine enacted, 44 failed. Seven state legislative seats were vacated between July 1 and December 1, 2025, two of them by death, on October 6 and October 15.

Federally, Charles Shaffer (Republican) became president and Michelle Lyons vice president on January 20, 2025. Congress adopted the federal budget on October 1, 2025, on votes of 258-175 and 63-37. The House recorded 190-243 on bill 2025-024 on December 15, 2025. A 37 percent top income-tax rate and a 6.2 percent Social Security tax are recorded as taking effect January 1, 2026.

## Needs a why

1. **Vote totals exceed the town's population.** The election-result for `contest:seat:gus2025:131368:board:0:2025-11-04` totals 113 + 2,326 = 2,439. `contest:seat:gus2025:131368:board:1:2025-11-04` shows 2,439 for one candidate, `person_b5e65b2ab5e6c64d`. `contest:seat:gus2025:131368:board:2:2025-11-04` shows 2,436 for one candidate, `person_57ff805ab552c306`. Every total exceeds the 1,972 living people in the header. Date: November 4, 2025.

2. **Two seats were uncontested but show large totals.** Seats 1 and 2 on the 131368 board each have one candidate-filed record, dated June 12, 2025, and no opponent appears. Yet the two single candidates recorded 2,439 and 2,436 votes. Date: November 4, 2025.

3. **131368 board voted with three voters after two of its seats were vacated.** Seat-vacated records dated February 1, 2025 cover `seat:gus2025:131368:board:2` and `seat:gus2025:131368:board:0` (rule "appointment"). No appointment record is in the file. On February 4, 2025, `bill:office:gus2025:131368:board:2025-02-04:person_da20440872eb9d7f:0` through `:4` each show yes 1, no 2, with three vote-recorded lines each. The sponsor, `person_da20440872eb9d7f`, later won seat 0 (item 1).

4. **Deaths recorded as zero, but death vacancies and a population drop appear.** Line 215 reads "deaths: 0". The header shows people 1976 and alive 1972, so four people are not alive. Two seat-vacated records give cause "death": `seat:US-NY:upper:002:0` (October 6, 2025) and `seat:US-NY:upper:030:0` (October 15, 2025).

5. **Seats left empty with no election or appointment.** Seven state seats were vacated under rule "special-election", and the file records no special election for any of them. The seats are `seat:US-NY:lower:083:0` (July 1, 2025), `seat:US-NY:upper:007:0` (September 1, 2025), `seat:US-NY:upper:002:0` (October 6, 2025), `seat:US-NY:upper:030:0` (October 15, 2025), `seat:US-NY:lower:002:0` (November 1, 2025), `seat:US-NY:lower:124:0` (December 1, 2025) and `seat:US-NY:upper:047:0` (December 1, 2025). The elections table reads "0 of 28" with no rows, though three election-result records exist. The town seats in items 3 and 6 also have no fill record.

6. **170423 board counted seven voters after three of its seats were vacated.** Seat-vacated records dated February 1, 2025 cover `seat:gus2025:170423:treasurer:0`, `seat:gus2025:170423:board:3` and `seat:gus2025:170423:board:4` (rule "appointment"), with no fill record. On February 4, 2025, `bill:office:gus2025:170423:board:2025-02-04:person_4f3bd9017540f7b5:5` through `:8` each show yes 1, no 6, and `:9` shows yes 2, no 5. The file gives no seat count for this board, so the seven voters cannot be checked against its seats.

7. **An enacted town bill is not identified and has no law record.** The 170423 board has one enacted bill and nine failed. The file does not name the enacted bill's billId. The only 170423 bill dated January 1, 2026 is the likely candidate, and no town law-took-effect record appears in the file.

8. **Constant tallies and unbroken failure on the town boards.** All five 131368 bills on February 4, 2025 show 1 yes and 2 no (ids in item 3). Four 170423 bills (`bill:office:gus2025:170423:board:2025-02-04:person_4f3bd9017540f7b5:5` to `:8`) show 1-6, and `:9` shows 2-5. All nine 131368 bills show status failed. Such a fixed 1-2 pattern and nine failures in a row need a why.

9. **June 30, 2025 holds a concentrated run of records, and held bills show no committee vote.** 100 sampled lines (lines 114 to 213) are dated June 30, 2025. 52 lower-chamber bills share that introduction date. 38 bill-held-in-committee records show yes 0, no 0, committee "general" and chair `official:term:seat:US-NY:lower:128:0:2025-01-20`. Examples are `bill:office:US-NY:legislature-lower:2025-06-30:official:term:seat:US-NY:lower:049:0:2025-01-20:17` and `:18`. The lower chamber's 44 of 53 bills failed. Every sampled committee-hearing tally sums to 11. Such one chair across all committees, and no recorded committee vote on any held bill, need a why.

10. **The upper chamber and the U.S. Senate have no bills or votes of their own.** `office:US-NY:legislature-upper` introduces no bill, yet upper-chamber legislative-votes are recorded on June 30, 2025. One example is `bill:office:US-NY:legislature-lower:2025-06-30:official:term:seat:US-NY:lower:142:0:2025-01-20:14`, with upper yes 58 and no 5. The U.S. Senate has no bill or legislative-vote record in the file. It was chamber-organized on January 20, 2025, and the budget-adopted record for October 1, 2025 cites a 63-37 vote.

11. **People and organizations grew with no birth or founding record.** The header shows people 1903 and orgs 120 at build, and people 1976 and orgs 148 at year end, a gain of 73 people and 28 organizations. The year records 10 person.moved-away and no birth kind, and no organization founding kind. Date range: January 20, 2025 to January 20, 2026.

12. **The town never recorded a budget.** budget-adopted appears three times this year: US-NY (April 1, 2025), US (October 1, 2025) and `county:36045` (January 1, 2026). No budget-adopted record exists for `office:gus2025:131368:board` or `office:gus2025:170423:board`.

13. **The first U.S. House bill came October 1, 2025, and the president sponsored it.** No House bill appears before `bill:office:US-NY:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:71` (number 2025-001). Its sponsorId is `official:term:seat:US:president:2025-01-20`, the president, and it was enacted the same day as the federal budget. The House was chamber-organized on January 20, 2025.

14. **Values with no stated unit.** The budget-line-changed record for veterans on December 15, 2025 shows deltaMinor -11083887412268 under `law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15`. The file does not state the unit of deltaMinor. If it is whole dollars, the change is about -$11.08 trillion. Four federal laws took effect on December 15, 2025 with value=1 and no unit: expand-medicaid-eligibility, ban-lobbying-after-office, minimum-reserve-balance and balanced-operating-budget.

15. **Kind counts disagree with the lines shown.** budget-line-changed is 32 for the year, but 35 appear in the federal and state section. seat-vacated is 14 for the year, but 12 lines are shown (5 town, 7 state). chamber-organized is 5 for the year. The file shows 7 such lines: lines 20 and 41, plus five federal and state lines.

16. **A federal chamber carries a town key.** The us-house chamber-organized line on December 15, 2025 (line 449) uses the key "council-president" for `official:term:seat:US-NY:us-house:13:2025-01-20`. The core2-offices-v1.terms header reads "709 of 897" but lists 12 rows.

17. **Owner changes with empty payloads.** organization.owner-changed appears twice on March 1, 2025 with data {}. Neither record names an organization or an owner.

18. **Identical vote lines with no voter id.** vote-recorded lines carry only measureId, question and position. On February 4, 2025, six identical lines show measureId 2025-001, question us-policy-positions:education.universal-preschool, position -1 (lines 43 to 48). Six identical -1 lines show measureId 2025-002, right-to-counsel (lines 51 to 56). The lines cannot be told apart, so the voter behind each cannot be identified.

19. **Identical shares, a round birth date and two party labels.** Every statewide term carries elected share 0.56, and every state senate term carries 0.635. Examples are `term:seat:US-NY:governor:2025-01-20` and `term:seat:US-NY:upper:003:0:2025-01-20:past:8`. Governor Joanne Wells has birthDate January 1, 1960. The same party is labeled "Democrat" on `seat:US-NY:us-senate:0` and "Democratic" on the governor's seat.

20. **Player starts under 18 and ends with no job and $0 cash.** The player was born January 25, 2007, so they were 17 at the January 20, 2025 start and turned 18 on January 25, 2025. AGENTS.md's golden path starts at turn 18. At year end the file records job=none and cash=$0.

## Counts

- Header (build): people 1903, orgs 120
- Year line: people 1976, alive 1972, orgs 148
- Records this year: 17130
- Top 10 record kinds:
  - person.acted: 14441
  - cause.shared: 645
  - news.read: 431
  - cause.donated: 278
  - cause.volunteered: 255
  - vote-recorded: 134
  - case.made: 126
  - speech.retold: 116
  - speech.heard: 87
  - office.approached: 74

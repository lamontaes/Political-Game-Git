# Warsaw, North Carolina — one year (seed d48ede07ab82)

This is a one-year trace of a generated town, read record by record. The player's local seat, the council and mayor races, the board's votes and the state and federal records all come from the engine. Several tallies, vacancies and counts do not reconcile, and the "Needs a why" list names them.

## The year

Jeffrey Williamson (person_779e9c04a4ad2068, born January 22, 2007) is the player. He is a server, alive at year end, with $2,146 cash.

Locally, four seats were recorded vacant on February 1, 2025: prosecutor, clerk, board seat 2 and council seat 3, each for "moved away." The council organized February 4 under council president person_996218c37462ee6c. On February 4 the board passed five measures, and ten laws took effect on March 6, 2025: five county and five city. On February 19 the board passed two measures (effective March 21) and failed three repeats; on March 6 it failed two more. On November 4, 2025, the mayor (person_3208139250c171a6, unopposed, 1,586 votes) and council seats 0, 2 and 4 were decided. Council seats 1 and 3 do not appear on that ballot.

The state legislature voted on June 30, 2025. Its lower-house vote on bill 2025-001 was 103 to 17, and the record marks the bill vetoed. The state budget was adopted July 1, 2025 (lower 114 to 6, upper 48 to 2). State seats were recorded vacant on September 1, October 1 and November 1, 2025.

Congress adopted the federal budget on October 1, 2025 (House 267 to 166, Senate 70 to 30). President John Rasmussen and Vice President Lisa Caldwell took office January 20, 2025. The 37 percent top income-tax rate and the 6.2 percent Social Security tax took effect January 1, 2026.

Recorded residents: no deaths, no births, 17 moves away.

## Needs a why

0. **The first North Carolina world stopped mid-year.** Scotland Neck, seed d48dca5fc9c0, stopped on September 29, 2025 with the error "Invalid meeting endpoints." raised while the press published an interview. This file is the replacement run. The stopped run is kept as `audit/north-carolina-crash-d48dca5fc9c0.txt`.

1. **Five board tallies are the reverse of their own position records.** February 19, 2025: `bill:office:gus2025:131680:board:2025-02-19:person_196ff34b4331de16:21` (measure 2025-015) shows yes 2, no 5, but its seven vote-recorded positions read 5 yes, 2 no. The same reversal appears on `...:22` (2025-016) and `...:23` (2025-017), all February 19. March 6, 2025: `bill:office:gus2025:131680:board:2025-03-06:person_196ff34b4331de16:25` (2025-019) shows yes 3, no 4 against positions reading 4 yes, 3 no; the same on `...:26` (2025-020).

2. **Same question voted twice; the repeat fails with a mirrored count.** Housing discrimination: 2025-003 passed 5-2 (February 4), 2025-015 failed 2-5 (February 19). Paid leave: 2025-004 and 2025-016. Civilian oversight: 2025-005 and 2025-017. Cannabis: 2025-001 passed 6-1 (February 4), 2025-019 failed 3-4 (March 6). Minimum wage: 2025-002 and 2025-020. The file gives no reason a passed measure was put to a second vote.

3. **Council votes have no bill record, and one measure number covers two questions.** February 4, 2025: council measures 2025-001 to 2025-005 each show 4 yes and no no votes (vote-recorded lines 63 to 82), with no legislative-vote line. The same day, measure 2025-001 is also the board's cannabis measure (lines 22 to 28). The council bill table lists seven bills for February 4, but only five council votes are printed.

4. **One seat vacated twice; four seats vacated on one day.** February 1, 2025: `seat:gus2025:131680:prosecutor:0`, `seat:gus2025:131680:clerk:0`, `seat:gus2025:131680:board:2` and `seat:gus2025:171189:council:3`, all "moved away," rule "appointment." Clerk seat 0 again March 1, 2025; board seat 2 again April 1, 2025; board seat 4 March 1; council seat 1 April 1 (`seat:gus2025:171189:council:1`). No appointment fills any of them.

5. **Board votes keep seven positions after recorded vacancies.** Each board vote on February 4, February 19 and March 6, 2025 has seven vote-recorded positions. Examples are lines 22 to 28 and 102 to 108. Board seats 2 and 4 were recorded vacant on February 1 and March 1. The file gives no board seat count to check against.

6. **Ballot totals exceed the town's population.** Mayor, November 4, 2025 (`contest:seat:gus2025:171189:mayor:0:2025-11-04`): 1,586 votes, unopposed. Council seat 2: 1,487 + 100 = 1,587. Council seat 4: 1,437 + 150 = 1,587. The header counts 1,852 people, children included, so the mayor's total is about 86 percent of everyone counted. Council seat 0 shows 1,031 so far, and its line stops mid-field after the third candidate, so the fourth candidate's total cannot be read.

7. **Constant election shares.** Every statewide term (lines 385 to 394) shows elected share 0.56 on November 5, 2024. Every legislative term (lines 397 to 409) shows share 0.635 on its election date.

8. **Population rose with no births and no deaths recorded.** Header: 1,852 people on January 20, 2025. Year line: 1,943 people, 1,939 alive, on January 20, 2026. Line 217 reads "deaths: 0," and no birth record kind appears in the counts. Four people are not alive with no death record.

9. **Organizations rose by 79 with no opening record.** Header 123, year line 202 on January 20, 2026. No opened or founded organization kind appears (cause-group.founded=7 is a cause group, not an organization). Two closures are recorded: `organization_1e6f37a62a39888e` on June 1, 2025 (losses-kept) and `organization_818a0b3cf1a804c9` on October 1, 2025, whose source is "opening."

10. **A bill vetoed after passing both chambers, with no veto record.** `bill:office:US-NC:legislature-lower:2025-06-30:official:term:seat:US-NC:upper:027:0:2025-01-20:27` (number 2025-001): lower 103-17 (line 178), upper 47-3 (line 181), status "vetoed" (line 454). Across the lower body, 12 bills are vetoed and 41 failed, with no governor action recorded. The state lower body's 12 vetoes are not printed.

11. **Council and board bills after the spring have no votes.** Council: seven bills on February 4, 2025 and one on July 1, 2025, with no council vote after February 4 printed. Board: one bill July 1, three September 2 and two September 17, 2025, each with a final status but no vote printed.

12. **Appointing official changes with no record of a change in office.** Official appointments on February 19, 2025 (lines 83 to 85) are by `person_779e9d04a4ad221b`; those on March 21, 2025 (lines 157 to 158) and April 20, 2025 (line 165) are by `person_be4195f37279ccb8`. The header counts took-office=4 and debate=3, but no such lines are printed. Seat-vacated is counted 12 and eight local plus three state lines are printed.

13. **Law values of 1 with a blank unit.** March 6, 2025: minimum wage (line 129), paid family leave (line 131) and universal preschool (line 136) show `"value":"1"`; line 136 has an empty unit. A second minimum-wage law took effect March 7, 2025 (line 156), citing law 2025-002, whose vote was February 4 and whose re-vote on March 6 failed.

14. **A federal bill introduced and adopted the same day.** `bill:office:US-NC:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:88` was introduced October 1, 2025 and is enacted (line 452). The federal budget was adopted October 1, 2025 (line 465). The state budget adopted July 1, 2025 and the federal budget adopted October 1, 2025 are both labeled fiscal year 2025.

15. **Large budget delta with no unit.** `budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15` shows `deltaMinor=-11082764246434` (line 311) on December 15, 2025. The file does not say whether the unit is dollars or cents. The sample federal bill (line 452) lists provisions in the same range.

16. **Error lines and an election the trace cannot show.** Eight module tables print "Unregistered module table" (lines 412 to 426, including vacancies, contests, filings, campaigns, offices, terms, governments and budgets). The elections table reads "0 of 38" (line 410), yet four election results print. No board seat contest appears on the ballot list, and council seats 1 and 3 are absent.

17. **Printed lines repeat.** Official-appointed records at lines 83 to 85, 157 to 158 and 165 are printed again, identically, at lines 219 to 223 and 225 (February 19, March 21 and April 20, 2025).

18. **Committee totals repeat across one hearing day.** All committee hearings are June 30, 2025. The same 7-4 total appears at lines 182, 188, 191, 213 and 216, and 9-2 at lines 185, 194, 204 and 207.

## Counts

- Header (January 20, 2025): people 1,852, orgs 123.
- Year line (January 20, 2026): people 1,943, alive 1,939, orgs 202.
- Records this year: 16,782.
- Top 10 record kinds: person.acted=13110, cause.shared=892, speech.retold=601, news.read=484, cause.donated=321, vote-recorded=194, campaign-message=194, speech.heard=146, drive.strengthened=118, cause-group.ad-ran=103.

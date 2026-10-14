# Lancaster, Pennsylvania — one year (seed ac4642017c51)

This audit covers one generated town for one simulated year. The trace records one player, a cashier. It also shows several local seats with no recorded filling, election totals far above the town's population, and close or repeated votes that need an explanation before the year can be trusted.

## The year

Jesus Elliott is the player: a cashier, 17 on January 20, 2025, alive at year end, with $2,218 in cash and a home in the town.

Locally, two council seats and the clerk's seat were vacated February 1, 2025, for moving away, and a board seat on April 1, 2025. The file records no filling of the council seat numbered 3, the clerk's seat or the board seat. On February 4, 2025, the council named a president and recorded 1 yes and 4 no on bills 2025-001 and 2025-002. On January 1, 2026, it adopted the 2026 budget by a 5-0 vote. On November 4, 2025, council seats 0, 2 and 4 and the mayor's seat were decided. The mayor's seat went unopposed to one candidate. The file records three births and one death. A county property-tax law of 1.32 percent of home value took effect January 1, 2026. A county law on partnering with federal immigration enforcement took effect March 6, 2025.

At the state level, the House and Senate voted on June 30, 2025. Of 55 House bills, six were enacted and 49 failed. The state budget was adopted July 1, 2025 (House 127-76, Senate 31-19). Four state seats were vacated on August 1, September 1 and December 1, 2025, each set for a special election. None of those elections appears in the file. Governor Teresa Sheppard and the other statewide officers appear only as serving.

Federally, Congress adopted the budget October 1, 2025 (House 258-175, Senate 74-26). Of 25 House bills, five were enacted and 20 failed. The top federal income-tax rate of 37 percent and the 6.2 percent Social Security tax took effect January 1, 2026. Carolyn Woodward is president.

## Needs a why

1. **Election totals are far larger than the town.** Seen: council seat 0 totals 145 and 12,358; council seat 2 13,518 (unopposed); council seat 4 2 and 11,667; mayor 13,396 (unopposed). The file's population is 1,985 people, 1,979 alive. Records: `contest:seat:gus2025:174001:council:0:2025-11-04`, `contest:seat:gus2025:174001:council:2:2025-11-04`, `contest:seat:gus2025:174001:council:4:2025-11-04`, `contest:seat:gus2025:174001:mayor:0:2025-11-04`. Date: November 4, 2025.

2. **Council voted 1 yes and 4 no, with two seats vacant, then adopted a budget 5-0.** Seen: legislative-vote yes "1", no "4" on each of two bills, five votes in all. Seats `council:3` and `council:4` were vacated February 1, 2025. The budget was "adopted by the council vote 5-0, 2026-001." Records: `bill:office:gus2025:174001:council:2025-02-04:person:press:outlet:newspaper:3:jurisdiction_7934f3d557e23c97:reporter:0:11` and `...:reporter:0:12`; `seat:gus2025:174001:council:3`; `seat:gus2025:174001:council:4`; `budget:place:4241216:2026`. Dates: February 4, 2025; February 1, 2025; January 1, 2026.

3. **Vacated seats with no filling record.** Seen: `council:3` has no contest in the file. Contests exist only for council seats 0, 2 and 4. The clerk and board seats have no appointment or contest. Records: `seat:gus2025:174001:council:3`, `seat:gus2025:173728:clerk:0`, `seat:gus2025:173728:board:1`. Dates: February 1, 2025 (council 3 and clerk 0); April 1, 2025 (board 1).

4. **A county law took effect on a question the council voted down.** Seen: the county law on partnering with federal immigration enforcement took effect March 6, 2025. The only council vote on measure 2025-001 for that question was 1 yes, 4 no, on February 4, 2025. Council bills show 1 enacted and 3 failed. The file does not say which bill was enacted. Records: `law:county:42071:county:us-policy-positions:justice-public-safety.partner-with-federal-immigration-enforcement:general:2025-03-06:2025-001`; the council bill ending `:reporter:0:11` in item 2. Dates: March 6, 2025 (law); February 4, 2025 (vote).

5. **State seats vacated for special elections, and none held.** Seen: four seat-vacated records with rule "special-election." `core2-elections-v1.contests` reads "0 of 33." No contest, filing or result appears for these seats. Records: `seat:US-PA:lower:056:0` (August 1, 2025), `seat:US-PA:upper:038:0` (August 1, 2025), `seat:US-PA:lower:125:0` (September 1, 2025), `seat:US-PA:lower:108:0` (December 1, 2025). The sponsor in the June 30 state bill IDs is `upper:038:0`, one of the seats vacated that August.

6. **Election tables are empty or unregistered.** Seen: `core2-elections-v1.contests` reads "0 of 33," while four election-result records exist for November 4, 2025. Eight tables read "Unregistered module table": vacancies, contests (voting), filings, campaigns, offices (executive), terms (executive), governments and budgets. Date: November 4, 2025 (results).

7. **The mayor made appointments before the mayor's election, and the police chief was appointed twice.** Seen: official-appointed records on February 19, 2025 (planning, police-chief, public-works) and April 20, 2025 (police-chief), all with `appointedBy` `person_47630e8097a90d41`. That person won the mayor's seat unopposed on November 4, 2025. The file does not show when she took office; took-office records (4) are counted but not listed. No removal of the first police chief appears. Records: `person_47630e8097a90d41`; `contest:seat:gus2025:174001:mayor:0:2025-11-04`. Dates: February 19, 2025; April 20, 2025; November 4, 2025.

8. **Same measure ID used for different questions.** Seen: measure 2025-001 was used on February 4, 2025 for partner-with-federal-immigration-enforcement and for limit-groundwater-withdrawal. Measure 2025-002 was used that day for groundwater and for right-to-counsel. Measure 2025-003 was used for right-to-counsel (February 4, 2025) and for ban-lobbying (June 30, 2025). Measure 2025-018 was used for universal-preschool (March 6, 2025) and for clean-air (June 30, 2025). Measure 2025-020 was used for minimum-reserve-balance (June 30, 2025) and for a federal vote (December 15, 2025). Records: `vote:2025-020:official:term:seat:US-PA:us-house:11:2025-01-20` and the measure IDs above.

9. **Lower-chamber votes tie within three.** Seen: nine of 17 lower-chamber votes on June 30, 2025 were decided by three or fewer votes. Examples: 2025-010 at 102-101, 2025-019 at 102-101, 2025-028 at 102-101, 2025-021 at 103-100, 2025-023 at 103-100, 2025-031 at 103-100, 2025-033 at 103-100, 2025-024 at 100-103, 2025-026 at 100-103. Every total is exactly 203. Records share the prefix `bill:office:US-PA:legislature-lower:2025-06-30:official:term:seat:US-PA:upper:038:0:2025-01-20:` with suffixes 29, 38, 47, 40, 42, 50, 52, 43 and 45. Date: June 30, 2025.

10. **All state floor action on one day.** Seen: 54 of 55 lower-chamber bills were introduced on June 30, 2025. One was introduced July 1, 2025. Hearings, votes and holds all fall on June 30. Each of the shown bill-held-in-committee records has yes 0 and no 0. Forty-nine of 55 bills failed. Example record: `bill:office:US-PA:legislature-lower:2025-06-30:official:term:seat:US-PA:lower:037:0:2025-01-20:21`. Date: June 30, 2025.

11. **A federal House tally recorded against a 17-seat delegation.** Seen: legislative-vote yes 184, no 249 (433 votes) for the federal House, recorded under `office:US-PA:us-house`, which has 17 seats. The October 1, 2025 federal budget vote, 258-175, also totals 433. Records: `bill:office:US-PA:us-house:2025-12-15:official:seat:US-MO:us-house:06:105:federal:us-house`; `office:US-PA:us-house`. Dates: December 15, 2025; October 1, 2025.

12. **A council president recorded as a federal House seat.** Seen: chamber-organized on December 15, 2025 lists "council-president" as `official:term:seat:US-PA:us-house:04:2025-01-20`. Earlier council presidents, recorded February 4, 2025 and April 5, 2025, are `person_47d385c4b60c9524`. Date: December 15, 2025.

13. **Board bills: 27 of 29 failed, and no board vote line appears.** Seen: board bills enacted 2, failed 27. Eleven were introduced on February 4, 2025. Public comment that day is "for 0, against 1" on board bills ending `:2`, `:3` and `:4`, and on council bill ending `:12`. No legislative-vote line for any board bill appears in the file. Records: `office:gus2025:173728:board`. Date: February 4, 2025.

14. **An ad ran with a $4.34 balance.** Seen: cause-group ad with `balanceBeforeMinor` 434 and `spentMinor` 325, reached 3. The same day, `organization_3640363055ca0bc4` closed. Record: `organization:cause-group:person_e3285efbff783fca:cause:us-policy-positions:technology-privacy.restrict-government-facial-recognition`. Date: June 1, 2025.

15. **Statewide executives and enacted bills show no action.** Seen: the governor, lieutenant governor, attorney general, auditor and treasurer appear only as serving terms. No veto, signing or enforcement record appears, though six state and five federal bills are enacted. Records: `term:seat:US-PA:governor:2025-01-20`; `office:US-PA:governor`. Date: none recorded; the terms begin January 20, 2025 or January 1, 2025.

16. **Filing lines missing for winners.** Seen: the candidate-filed count is 8, but only four local filing lines appear. The winners of council seat 2 (`person_1f252698013b5ba6`) and the 2-vote candidate in council seat 4 (`person_1f252798013b5d59`) have no filing line in the file. Records: `filing:contest:seat:gus2025:174001:council:0:2025-11-04:person_e05b9051963617b7` and the three other filings shown. Date: June 12, 2025.

17. **Repeated identical trace lines.** Seen: the same `learned:core.observe.perceived` entry repeats five times on line 234 and six times on line 243, with the same key each time. Records: `speech:party-meeting:party:US-PA:democratic:2026-01-15:retold:person_e3285cfbff783c64` and `speech:party-meeting:party:US-PA:democratic:2026-01-15`. Date: January 15, 2026.

18. **A property-tax law replaces a law that is not in the file.** Seen: `law:county:42071:county:property-tax:general:2026-01-01` replaces a law whose ID ends `:from-start`, at 1.32 percent of home value. The replaced record is not in the file. Date: January 1, 2026.

19. **The player is 17 at start.** Seen: `person_4a813841316bc128` was born January 24, 2007, and the year starts January 20, 2025. The file does not say whether this is intended. Date: January 20, 2025.

## Counts

- Header: people 1908, orgs 128 at start. Year end: people 1985, alive 1979, orgs 167.
- Records this year: 17486. No "!!" or "Error" lines appear in the file.
- Top 10 record kinds:
  - person.acted: 13444
  - cause.shared: 1069
  - news.read: 776
  - case.made: 395
  - cause.volunteered: 341
  - speech.retold: 287
  - vote-recorded: 208
  - speech.heard: 147
  - campaign-message: 94
  - office.approached: 88

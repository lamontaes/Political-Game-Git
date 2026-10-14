# Aynor, South Carolina — one year (seed 1391d978f6a2)

This is the one-year trace of Aynor, South Carolina. The player, Logan Gaines, is alive at year end with a server job. The year shows several counts that do not match each other or the people on file: election totals above the living population, identical vote splits, seats left empty, and enacted counts without matching votes. The file does not explain any of them.

## The year

Logan Gaines (born January 22, 2007) is the player. At year end Logan is alive, working as a server, with $278 in cash. The excerpt shows no filing, vote or campaign record for Logan.

Locally, a county assessor seat and a county board seat were vacated by moves on February 1, 2025. On February 4, the county board passed an immigration-enforcement measure 4 to 2 and failed two others 1 to 5. The council chose its president and mayor pro tem that day. Its groundwater measure became law, and the county immigration law and city groundwater law took effect March 6, 2025. Special elections for the two county seats on May 2, 2025 recorded no winner. A council seat was filled by special election on September 29, 2025. On November 4, 2025, the mayor race was recorded at 2,121 to 22. One child was born April 3, 2025. Two businesses closed, on June 1 and November 1, 2025.

At the state level, the legislature voted on June 5, 2025, and bill 2025-001 was enacted. The state budget was adopted July 1, 2025. Three state House seats were vacated: one by death on July 16, 2025, and two by moves on December 1, 2025. No special election is recorded for them. Governor Melissa Wheeler (Republican) holds office through January 1, 2027.

At the federal level, Kenneth Kim took office as president on January 20, 2025. Congress adopted the fiscal 2025 budget on October 1, 2025, with recorded votes of 263 to 170 and 71 to 29, and seven budget lines were dropped. A House vote on December 15, 2025 was recorded at 141 to 292. On January 1, 2026, the top federal income tax rate was recorded at 37 percent.

## Needs a why

1. **Election totals exceed the town's people.** All four November 4, 2025 contests total 2,143 votes: `contest:seat:gus2025:212109:mayor:0:2025-11-04` (2,121 + 22), `contest:seat:gus2025:212109:council:0:2025-11-04` (1,913 + 229 + 1), `contest:seat:gus2025:212109:council:2:2025-11-04` (1,349 + 794 + 0), and `contest:seat:gus2025:212109:council:4:2025-11-04` (2,119 + 24). The same 2,143 appears four times, and it is more than the 1,992 people alive at year end. Date: November 4, 2025.

2. **Council votes split the same way every time.** Council measures 2025-002 to 2025-005 (February 4, 2025) and 2025-011 to 2025-015 (February 19, 2025) each show four recorded positions: one "1" and three "-1" (nine measures, 36 records). Measure 2025-001 on February 4 shows three "1" and one "-1". The excerpt has no council legislative-vote line for any of them. The county board uses the same measure ids for different subjects. Dates: February 4 and February 19, 2025.

3. **Board tallies after a vacancy.** `seat:gus2025:134414:board:5` was vacated on February 1, 2025 (moved away). Yet each board measure on February 4, 2025 totals six votes: 4 to 2 (`bill:office:gus2025:134414:board:2025-02-04:person_020d1df64330560e:0`), 1 to 5 (same prefix, `:1`) and 1 to 5 (same prefix, `:2`). Date: February 4, 2025.

4. **Five people not alive, one death recorded; a vacancy missing.** The year shows 1,997 people and 1,992 alive, so five are not alive. Yet the year counts "deaths: 1" and life.death=1, and that death record is not in the excerpt. The year also says seat-vacated=6, but only five seat-vacated records appear. The September 29, 2025 council special (`contest:seat:gus2025:212109:council:2:2025-09-29:special`) has no vacancy line. Dates: year 1.

5. **People and organizations jump.** At build, 1,917 people and 129 orgs. At year end, 1,997 people and 203 orgs. That is +80 people with two person-birth records, and +74 organizations with one organization.founded record and two organization.closed records. The excerpt has no record ids for these counts. Dates: January 20, 2025 to January 20, 2026.

6. **Special elections recorded with no winner.** `contest:seat:gus2025:134414:assessor:0:2025-05-02:special` and `contest:seat:gus2025:134414:board:5:2025-05-02:special` both show winnerId "" and totals {}. Their seats (`seat:gus2025:134414:assessor:0` and `seat:gus2025:134414:board:5`) were vacated on February 1, 2025, and no later filling appears. Date: May 2, 2025.

7. **State seats left empty; no state special elections.** `seat:US-SC:lower:050:0` (death, July 16, 2025), `seat:US-SC:lower:007:0` and `seat:US-SC:lower:079:0` (moved away, December 1, 2025), each with rule "special-election". The year's election-result count is 7, and all seven are local. No fill is recorded for any of the three.

8. **Contests without results.** core2-elections-v1.contests reads "0 of 41": 41 contests exist, none are printed, and only seven election-result records exist (May 2, 2025 twice, September 29, 2025, and November 4, 2025 four times). That leaves 34 contests with no result line. Dates: year 1.

9. **Held bills with zero tallies; one sponsor on 12.** bill-held-in-committee=47 for the year. All 33 held records dated June 5, 2025 in the excerpt show yes "0" and no "0". Sponsor `official:term:seat:US-SC:lower:074:0:2025-01-20` appears on 12 of them (billIds ending `:40`, `:42`, `:45`, `:47`, `:49`, `:50`, `:51`, `:52`, `:55`, `:59`, `:61` and `:68`, after `bill:office:US-SC:legislature-lower:2025-06-05:official:term:seat:US-SC:lower:074:0:2025-01-20:`), and `lower:031:0` on eight. Date: June 5, 2025.

10. **Identical committee tallies, one chair, one day.** On June 5, 2025 the committee tally "8 to 3" appears at least 12 times in the excerpt. Every first-stage hearing names `official:term:seat:US-SC:lower:011:0:2025-01-20` as chair. The same day holds 119 excerpt records, and the bills-by-body count shows 53 lower-house bills introduced that day (`office:US-SC:legislature-lower`).

11. **Senate seats sponsor House-body bills.** On June 5, 2025, bills whose body is `office:US-SC:legislature-lower` name Senate seats as sponsors: `upper:003:0` (billId ending `:18`, enacted), `upper:019:0` (`:38`, held), `upper:030:0` (`:44`, held) and `upper:012:0` (`:67`, held). Date: June 5, 2025.

12. **Federal House record oddities.** The December 15, 2025 chamber-organized record uses the key "council-president" for `official:term:seat:US-SC:us-house:07:2025-01-20`. The federal bill `bill:office:US-SC:us-house:2025-12-15:official:seat:US-NE:us-senate:1:107` (number 2025-023, recorded 141 to 292) names a U.S. Senate seat as the sponsor of a House bill. Date: December 15, 2025.

13. **Federal budget dropped seven lines; veterans delta size.** The budget-adopted record of October 1, 2025 (governmentId US, fiscalYear 2025, record 2025-001) lists "nationalDefense, communityAndRegionalDevelopment, incomeSecurity, internationalAffairs, medicare, education, health dropped." On December 15, 2025, budget-line-changed for veterans records deltaMinor=-11083409816262 (`budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15`). The unit is not stated: as cents that is about -$110.8 billion, and as dollars it is about -$11 trillion.

14. **Enacted counts and a silent council.** Council is recorded as 2 enacted and 23 failed; the board as 2 enacted and 4 failed. The only council measure in the excerpt with mostly "1" positions is 2025-001 (February 4, 2025), and the only board measure split 4 to 2 is also 2025-001 (February 4, 2025). The council has no vote, hearing or status line in the excerpt after February 19, 2025, though nine council bills were introduced on August 18, 2025 (4) and September 2, 2025 (5). Dates: February 4, 2025 through September 2, 2025.

15. **Council public comments lopsided and tied to one id.** Nine council public-comment records (February 4 and February 19, 2025) show 0 or 1 "for" and 4 to 6 "against." All nine billIds carry `person_2474eae0fee74bf0`, for example `bill:office:gus2025:212109:council:2025-02-04:person_2474eae0fee74bf0:4` (for 0, against 4). Dates: February 4 and February 19, 2025.

16. **Identical shares for all statewide and state senate winners.** Every statewide term is recorded at elected share 0.56 on November 8, 2022 (eight terms, for example `term:seat:US-SC:governor:2025-01-20`). Every state senate term is recorded at 0.635 (for example `term:seat:US-SC:upper:001:0:2025-01-20:past:1`, elected November 6, 2018).

17. **Unregistered module tables.** Lines 401 to 415 of the file read "Unregistered module table" for core2-elections-v1.vacancies, core2-voting-v1.contests, core2-voting-v1.filings, core2-voting-v1.campaigns, core2-executive-v1.offices, core2-executive-v1.terms, core2-legislature-v1.governments and core2-legislature-v1.budgets. The executive office and budget rows cannot be read, and the 14 candidate-filed and 162 campaign-message records cannot be checked against filings. Dates: year 1.

18. **Repeated lines in the trace.** The trace for `speech:party-meeting:party:US-SC:republican:2026-01-15:retold:person_f4f36f9a95d039a0` repeats the same learned core.observe.perceived entry three times. The speech.heard trace for `speech:party-meeting:party:US-SC:republican:2026-01-15` repeats the same learned entry at least six times. The trace for `contest:seat:gus2025:212109:mayor:0:2025-11-04` repeats one learned entry twice. Dates: January 15, 2026 and November 4, 2025.

19. **Look-alike person ids.** The council seat 0 winner `person_2474eae0fee74bf0` and the mayor winner `person_2474ebe0fee74da3` differ by a few characters, and the player `person_dc693c10dc1c415e` shares a long prefix with the council seat 2 winner `person_dc693b10dc1c3fab`. The file does not say whether any of these ids is a collision. Date: November 4, 2025.

20. **Year took 195 seconds.** The year line reads "195s" against the two-minute target in AGENTS.md ("Speed"). No record id applies. Dates: year 1.

## Counts

- Header line: `Aynor, South Carolina seed 1391d978f6a2 start 2025-01-20 built in 49s people 1917 orgs 129`.
- Year-end line: people 1,997, alive 1,992, orgs 203.
- Records this year: 36,124.
- Top 10 record kinds:
  - person.acted=27358
  - cause.shared=3155
  - speech.retold=1466
  - news.read=1065
  - cause.donated=408
  - drive.strengthened=407
  - case.made=402
  - speech.heard=199
  - office.approached=198
  - office.replied=188

# Jefferson, Iowa: council bills failed in every vote shown, and vacancies have no recorded fill

Almost every council bill failed. A television reporter sponsored the council's bills and also ran for mayor. Seats emptied under a special-election rule were never filled, and no death was recorded while people died.

## The year

The council organized on February 4, 2025, and chose a council president and a mayor pro tem. Council seat 1 was vacated on February 1, 2025, when its member moved away. On February 4, 2025, the council voted on five bills, and all five failed. On February 19, 2025, it voted on four more bills, and all four failed. A city attorney was appointed on February 19, 2025. A planning director and a public works director were appointed on March 21, 2025. One more council bill failed on December 16, 2025, by 0 to 5.

On November 4, 2025, voters chose a mayor and three council members. The mayor won with 2,333 votes over a television reporter, who had 220. The file records no result for council seats 1 or 3.

The file records no deaths and no births. A business closed on November 1, 2025, for losses.

At the state level, 54 lower-chamber bills were introduced on May 2, 2025, and committees met the same day. State lower-chamber bills ended the year with 15 enacted and 40 failed. The state budget was adopted on July 1, 2025. Three state seats were vacated during the year. One was vacated by death on May 28, 2025.

Congress adopted the federal budget on October 1, 2025, after seven budget lines were dropped by amendment. The top federal income tax rate is 37 percent as of January 1, 2026. A county property tax law took effect on January 1, 2026. A candidate filed for a state House seat on January 12, 2026. At the end of the year, the player, Dominic McLean, had no job and $60,962 in cash.

## What needs a why

1. **Council votes all failed, with the same totals repeated.** Ten council bills were voted on in the shown records. February 4, 2025 gave 2-3, 2-3, 1-4, 2-3, 2-3. February 19, 2025 gave 2-3, 1-4, 2-3, 1-4. December 16, 2025 gave 0-5. The status count says 1 council bill was enacted, but the file does not show which one. Bill ids: `bill:office:gus2025:208017:council:2025-02-04:person:press:outlet:television:1:jurisdiction_297a4127d02a7dae:reporter:0:10` through `...:14` (lines 52, 58, 64, 70, 76); `...:24` through `...:27` (lines 113, 119, 125, 131); `bill:office:gus2025:208017:council:2025-12-16:person:press:outlet:television:1:jurisdiction_297a4127d02a7dae:reporter:0:129` (line 254).
2. **Every council bill id carries a television reporter.** The id segment `person:press:outlet:television:1:jurisdiction_297a4127d02a7dae:reporter:0` appears in all ten council bill ids shown. The same person is a mayoral candidate with 220 votes (`contest:seat:gus2025:208017:mayor:0:2025-11-04`, line 222) and appears in a campaign-message trace (line 301).
3. **Measures carry two different questions, and row counts do not match totals.** `measureId` 2025-001 has six vote rows on `paid-family-leave` (lines 16-21) and five rows on `ban-discrimination-in-housing-and-work` (lines 47-51). Its legislative-vote record shows 2 yes and 3 no (line 52). Measures 2025-002 and 2025-003 show the same split. For 2025-003, the rows show 2 yes and 4 no on `partner-with-federal-immigration-enforcement` (lines 28-33), against a legislative-vote total of 1 yes and 4 no (line 64).
4. **Council seat 1 was vacated, but five members voted on February 4, 2025.** `seat:gus2025:208017:council:1` was vacated on February 1, 2025 under the "appointment" rule (line 14). The file shows no appointment for that seat.
5. **Four election results exist, but the contest table is empty.** Result records: `contest:seat:gus2025:208017:council:0:2025-11-04`, `contest:seat:gus2025:208017:council:2:2025-11-04`, `contest:seat:gus2025:208017:council:4:2025-11-04`, and `contest:seat:gus2025:208017:mayor:0:2025-11-04`. The `core2-elections-v1.contests` table reads "0 of 36" (line 395). Council seats 1 and 3 have no result.
6. **Candidate counts do not match filings.** `candidate-filed` totals 31 (line 5). The four results name 11 candidates in all (3, 3, 3, and 2). The file shows only one filing: `filing:contest:seat:US-IA:lower:047:0:2026-11-03:person_a656e946eaf79e10` (line 464).
7. **Three special-election vacancies have no contest or result.** `seat:US-IA:upper:010:0` (death, May 28, 2025, line 448). `seat:US-IA:lower:074:0` (moved away, September 1, 2025, line 449). `seat:US-IA:lower:063:0` (moved away, October 1, 2025, line 450). The file shows no contest, result or took-office record for any of them. The year count lists `took-office=4` (line 5), but no detail appears.
8. **Deaths are recorded as zero, but the vacancy record says death.** The year summary reads "deaths: 0" (line 214), yet `seat-vacated` for `seat:US-IA:upper:010:0` gives cause "death" (line 448). The header shows 1,873 people, 1,869 alive (line 4). The file has no death record and no birth record.
9. **A U.S. House seat is recorded as the local council president.** On February 4, 2025, the council president is `person_f57052bad7f96c2a` (line 15). On December 15, 2025, the `chamber-organized` record names `official:term:seat:US-IA:us-house:02:2025-01-20` as `council-president` (line 461).
10. **A U.S. House bill names a Colorado Senate sponsor and a California committee chair.** `bill:office:US-IA:us-house:2025-12-15:official:seat:US-CO:us-senate:0:128` (line 275) has chair `official:seat:US-CA:us-house:23`, 0-0, and is held in committee. The sample House bill `bill:office:US-IA:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:106` (line 441) has the president as sponsor. The year lists 22 House bills introduced on December 15, 2025 (line 417).
11. **The federal budget amendment dropped seven lines, and only two of four budget adoptions are shown.** The record for `2025-001` (line 454) lists nationalDefense, communityAndRegionalDevelopment, incomeSecurity, internationalAffairs, medicare, education, and health as dropped. The year count lists `budget-adopted=4` (line 5). The file shows no city, county or school budget adoption.
12. **The state budget cites a bill number the bill list does not show.** The record of July 1, 2025 cites bill `2025-055` (line 453). The state bill numbers in the trace stop at `2025-014` (lines 134-213). The bill table lists 54 lower-chamber bills introduced on May 2, 2025 (line 414).
13. **Committee and floor totals repeat.** Of the 26 committee-hearing records shown, 14 are 7-4 (for example, lines 140, 158, 161). Two chair seats cover them: `official:term:seat:US-IA:lower:093:0:2025-01-20` and `official:term:seat:US-IA:upper:012:0:2025-01-20`. The lower-chamber total of 67-33 repeats on `2025-007` (line 170), `2025-010` (line 188), `2025-012` (line 200), and `2025-013` (line 206). Two bills were held in committee at 0-0: lines 167 and 213.
14. **Three federal policy positions show the same value on one date.** On December 15, 2025, `us-policy-positions:civil-family-community.restrict-abortion`, `us-policy-positions:fiscal.minimum-reserve-balance`, and `us-policy-positions:fiscal.balanced-operating-budget` all show value 1 (lines 9-11).
15. **A business closure cites the opening as its source.** `organization_fbd94667b9f2a82d` closed on November 1, 2025, with reason `losses-kept`. Its source is "opening" in `core2-officials-v1.loaded` (lines 326-331). The year count shows two business closures and two organization closures, and only one is shown.
16. **A county tax law replaces a "from-start" law that the file never shows.** `law:county:19073:county:property-tax:general:2026-01-01` replaces `law:county:19073:county:property-tax:general:2026-01-01:from-start` (line 246). No record with that id appears.
17. **Twenty-nine laws took effect, but one law effect is shown.** `law-took-effect` totals 29 (line 5). The one `law.effect-landed` record is for `retirement-claim:person_0e595d166a4a17a7` (lines 290-293), which fell from 155402 to 109735 in minor units.
18. **No governor or state executive act is recorded.** Tables `core2-executive-v1.offices` and `core2-executive-v1.terms` are unregistered (lines 405-407). The governor and state executive terms appear only as "in office at the opening" (lines 373-379). The legislature's `governments` and `budgets` tables (lines 409-411), the voting `contests`, `filings` and `campaigns` tables (lines 399-403), and the `vacancies` table (line 397) are also unregistered.
19. **The player has no candidate filing or job.** `person_73dcbcf96a4bc1ef` (Dominic McLean) was born January 22, 2007 (line 2), so he was 17 on January 20, 2025. The player's state at the end of the year shows `job=none` (line 223). The file shows no filing or player action.

## Counts

Records this year: 52,053.

| Record kind        | Count  |
| ------------------ | ------ |
| person.acted       | 35,336 |
| cause.shared       | 5,491  |
| cause.donated      | 2,754  |
| speech.retold      | 1,493  |
| drive.strengthened | 1,199  |
| case.made          | 1,057  |
| cause.volunteered  | 988    |
| office.approached  | 617    |
| office.replied     | 605    |
| cause-group.joined | 477    |

## Method

World seed `346122177e93`, one year from January 20, 2025 to January 20, 2026, through the trace viewer. Raw trace: `raw-trace-2/iowa.txt`.

## Verification

Every item above was checked against the code. The causes, and the items that turned out not to be defects, are in `README-TRACE-2.md`.

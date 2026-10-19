# Van Buren, Maine: a year of board votes, vacant seats and no elections

The local board voted all year with two empty seats that were never filled. Five state seats emptied under a special-election rule, and none got an election. No contest was held anywhere in the year.

## The year

The run began on January 20, 2025 with 1,894 people in Van Buren. It ended with 1,949 people, of whom 1,945 were alive.

The local board met on February 4, 2025 and passed five measures. Four passed 2-1 and one passed 3-0. Those five measures took effect as county law on March 6, 2025. A second local board passed one measure that day, and it took effect as city law.

Two board seats were vacated by moves, on March 1 and May 1, 2025. The file names no one appointed to fill them. The board named a new president on February 4, March 6 and May 5, 2025. It met again on June 19, 2025. On January 15, 2026 it voted 1-2 on universal preschool, a subject a county law had already covered since March 2025.

The state House and Senate acted on June 18, 2025. The House introduced 52 bills that day and held 39 bills in committee across the year. The state budget passed on July 1, 2025, by 77-73 in the House and 21-14 in the Senate.

Five state legislative seats were vacated. Two were vacated by death and three by moving away, the last on December 1, 2025. The file shows no special election for any of them.

Congress adopted the federal budget on October 1, 2025, with seven budget lines dropped by amendment. News items show the federal income tax top rate at 37 percent and the Social Security tax at 6.2 percent on January 1, 2026.

Two businesses closed, on June 1 and November 1, 2025. A resident also moved away on November 1. The year summary counts no births and no deaths.

The player, Mason Howell, is alive. The player works as a sales associate and has $6,284 in cash.

## What needs a why

1. **No election took place.** The file shows 4 candidate-filed records, but core2-elections-v1.contests reads "0 of 18" and the election kinds line is empty. Five state seats were vacated under the special-election rule with no special election in the file: `seat:US-ME:lower:101:0` (April 8, 2025), `seat:US-ME:upper:006:0` (September 4, 2025), `seat:US-ME:lower:020:0` (November 1, 2025), `seat:US-ME:lower:061:0` (December 1, 2025) and `seat:US-ME:upper:029:0` (December 1, 2025). The module table core2-elections-v1.vacancies is unregistered.

2. **Board seats vacated, yet the board votes with three members.** `seat:gus2025:105825:board:1` was vacated on March 1, 2025 and `seat:gus2025:105825:board:2` on May 1, 2025, both by moving away under the appointment rule. The file has no appointment record for either. Every board vote in the file still totals three voters, before and after the vacancies: `bill:office:gus2025:105825:board:2025-06-19:person_caed83706e7d5a47:59` (2-1, June 19, 2025) and `bill:office:gus2025:105825:board:2026-01-15:person_589cb08e1d850736:88` (1-2, January 15, 2026).

3. **Local measures took effect as county and city law.** The board's five February 4, 2025 measures took effect March 6, 2025 with jurisdiction county:23003: `law:county:23003:county:us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal:general:2025-03-06:2025-001`, `law:county:23003:county:us-policy-positions:housing-land-use.right-to-counsel-in-eviction:general:2025-03-06:2025-002`, `law:county:23003:county:us-policy-positions:education.universal-preschool:general:2025-03-06:2025-003`, `law:county:23003:county:us-policy-positions:justice-public-safety.civilian-oversight-of-police:general:2025-03-06:2025-004` and `law:county:23003:county:us-policy-positions:housing-land-use.rent-stabilization:general:2025-03-06:2025-005`. The measure from `office:gus2025:208208:board` became `law:place:2378535:city:us-policy-positions:housing-land-use.inclusionary-requirement:general:2025-03-06:2025-001`. The file shows no county vote record behind the county laws.

4. **Universal preschool was voted on again.** `law:county:23003:county:us-policy-positions:education.universal-preschool:general:2025-03-06:2025-003` took effect March 6, 2025. On January 15, 2026 the board voted on the same question as measure 2026-002 (`bill:office:gus2025:105825:board:2026-01-15:person_589cb08e1d850736:88`), and it failed 1-2. The file shows no repeal of the 2025 law.

5. **Lower-chamber totals always sum to 150 of 151 seats.** `office:US-ME:legislature-lower` has 151 seats, but every lower-chamber vote in the file sums to 150. Example: `bill:office:US-ME:legislature-lower:2025-06-18:official:term:seat:US-ME:lower:063:0:2025-01-20:7` (147-3). The 75-75 tie on `bill:office:US-ME:legislature-lower:2025-06-18:official:term:seat:US-ME:lower:024:0:2025-01-20:47` has no record of how it resolved.

6. **All state committee action falls on one day.** The 52 House bills were all introduced on June 18, 2025. All 60 committee hearings in the file are also dated June 18, 2025. The file shows no state legislative record between January 20 and June 18, 2025, apart from the January 20 organization. Why did the state bodies not meet before June 18?

7. **Committee hearings voted the bill down, with no later record.** Each of these hearings shows more no votes than yes votes, and the file shows no later record for the bill: `bill:office:US-ME:legislature-lower:2025-06-18:official:term:seat:US-ME:lower:063:0:2025-01-20:8` (5-6), `bill:office:US-ME:legislature-lower:2025-06-18:official:term:seat:US-ME:upper:024:0:2025-01-20:17` (5-6), `bill:office:US-ME:legislature-lower:2025-06-18:official:term:seat:US-ME:lower:086:0:2025-01-20:40` (5-6), `bill:office:US-ME:legislature-lower:2025-06-18:official:term:seat:US-ME:upper:024:0:2025-01-20:44` (2-9) and `bill:office:US-ME:legislature-lower:2025-06-18:official:term:seat:US-ME:lower:024:0:2025-01-20:57` (1-10).

8. **Held bills carry zero votes.** Every bill-held-in-committee record in the file shows yes 0 and no 0, while naming a committee chair. The year has 39 of them. Examples: `bill:office:US-ME:legislature-lower:2025-06-18:official:term:seat:US-ME:lower:063:0:2025-01-20:12`, `bill:office:US-ME:legislature-lower:2025-06-18:official:term:seat:US-ME:lower:063:0:2025-01-20:21` and the federal bill `bill:office:US-ME:us-house:2025-12-15:official:seat:US-OH:us-house:09:84`.

9. **The same tallies repeat on June 18, 2025.** The lower chamber passed six bills 77-73: `bill:office:US-ME:legislature-lower:2025-06-18:official:term:seat:US-ME:upper:024:0:2025-01-20:18` (2025-012), `...:upper:024:0:2025-01-20:27` (2025-021), `...:upper:024:0:2025-01-20:28` (2025-022), `...:lower:042:0:2025-01-20:31` (2025-025), `...:lower:024:0:2025-01-20:42` (2025-036) and `...:upper:024:0:2025-01-20:43` (2025-037). The upper chamber voted 21-14 on eight bills, including those six plus 2025-014 and 2025-019. The July 1 budget also passed 77-73 and 21-14 (budget-adopted, record 2025-053). Two other bills split 68-82: `...:upper:024:0:2025-01-20:39` and `...:upper:024:0:2025-01-20:41`.

10. **One measureId names different questions.** measureId 2025-001 is used for limit-groundwater-withdrawal (local board, February 4, 2025), inclusionary-requirement (`office:gus2025:208208:board`, February 4, 2025) and allow-multifamily-in-single-family-zones (state, June 18, 2025). measureId 2025-007 is used for restrict-government-facial-recognition (local board, June 19, 2025) and ban-lobbying-after-office (state, June 18, 2025). The file does not show how measure IDs are scoped by body.

11. **Vote position -1 sits beside yes majorities.** On June 18, 2025 the vote-recorded rows for measureId 2025-001 (allow-multifamily-in-single-family-zones) show position -1. The same bill, `bill:office:US-ME:legislature-lower:2025-06-18:official:term:seat:US-ME:lower:063:0:2025-01-20:7`, shows yes 147 and no 3 in the lower chamber and yes 27 and no 8 in the upper chamber. Measure 2025-004 (price-carbon) shows position -1 with a lower-chamber vote of 85-65. The file does not say what position -1 means.

12. **Council presidents changed without a vote record.** chamber-organized on February 4, 2025 appears twice, naming person_44fdaa2db1df6de6 and then person_a2184918b60deea8. It names person_44fdaa2db1df6de6 again on March 6, 2025 and person_caed83706e7d5a47 on May 5, 2025. None of these records names a body or a vote.

13. **No births or deaths, yet people are missing.** The summary reads "deaths: 0", and no birth kind appears in the year. The population ends at 1,949 with 1,945 alive, so four people are not alive. Two state seats were vacated by death: `seat:US-ME:lower:101:0` (April 8, 2025) and `seat:US-ME:upper:006:0` (September 4, 2025).

14. **November 1, 2025 cluster, and an eviction date that does not match.** On November 1, 2025 four records share the date: `person.moved-away:person_44fda92db1df6c33:2025-11-01`, `event:business.closed:organization_2390ac956bf9cf51` (closing reason losses-kept, source traced to opening data), `employer-closed:2025-11-01:organization_2390ac956bf9cf51` and `seat:US-ME:lower:020:0` (moved away). The workers of either closed business (`organization_2390ac956bf9cf51` and `organization_fe0bc84a457d185b`, closed June 1, 2025) have no job-loss or pay record. The eviction event for person_44fda92db1df6c33 is `event:housing.eviction:eviction:lease:household_c27861c5d655d573:2025-07-06`, but the trace dates it August 3, 2025.

15. **Federal budget lines dropped, and one veterans change is far larger than the rest.** The federal budget adopted October 1, 2025 dropped seven lines by amendment: nationalDefense, communityAndRegionalDevelopment, incomeSecurity, internationalAffairs, medicare, education and health. The file has no budget-line-changed record for any of them. The veterans line on December 15, 2025 has deltaMinor -11084722337259 (`law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15`). That is about 164 times the otherPrograms value of -67652538669 in `bill:office:US-ME:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:62`.

16. **Maine's federal House office is sponsored and chaired from other states.** `office:US-ME:us-house` has 2 seats, yet `bill:office:US-ME:us-house:2025-12-15:official:seat:US-OH:us-house:09:84` is sponsored by an Ohio seat and chaired by `official:seat:US-NC:us-house:10`. `bill:office:US-ME:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:62` is sponsored by the president. A chamber-organized record on December 15, 2025 uses the key "council-president" for `official:term:seat:US-ME:us-house:01:2025-01-20`.

17. **A minimum-wage law took effect with no bill.** `law:US-ME:state:minimum-wage:general:2025-01-21:law:US-ME:state:us-policy-positions:labor-workforce.raise-minimum-wage:general:starting` took effect January 21, 2025, the day after the run began, with value "1500" and unit "minor/hour". The file shows no bill for it.

18. **Executive records are missing and one veto has no record.** Eight module tables print "Unregistered module table": core2-elections-v1.vacancies, core2-voting-v1.contests, core2-voting-v1.filings, core2-voting-v1.campaigns, core2-executive-v1.offices, core2-executive-v1.terms, core2-legislature-v1.governments and core2-legislature-v1.budgets. `office:US-ME:governor` and `office:US:president` show no acts in the year, only inauguration=1 and president.address=1. The state bill count shows one bill "vetoed" (`office:US-ME:legislature-lower`), but the file has no veto record and no bill ID with that status.

19. **The player's year is not in the trace.** `person_3f3c709e5ce037f8` (Mason Howell, born January 22, 2007) appears only in the header and the summary (Sales associate, $6284, household_fb6218ef9347b998). No record in the file names the player. The file does not show whether the player filed, voted or met anyone.

20. **Senate vacancy rule is stored as text.** `office:US-ME:us-senate` has its vacancyRule stored as a JSON string, while the other offices store the rule as an object.

## Counts

Records this year: 19812. News items: 365 (federal 38).

Top 10 record kinds (from the file's summary):

| Kind               | Count |
| ------------------ | ----- |
| person.acted       | 18056 |
| news.read          | 633   |
| cause.shared       | 292   |
| speech.retold      | 214   |
| vote-recorded      | 89    |
| legislative-vote   | 63    |
| committee-hearing  | 60    |
| cause-group.ad-ran | 54    |
| cause.donated      | 50    |
| case.made          | 47    |

## Method

World seed `13744ef7bcc3`, one year from January 20, 2025 to January 20, 2026, through the trace viewer. Raw trace: `raw-trace-2/maine.txt`.

## Verification

Every item above was checked against the code. The causes, and the items that turned out not to be defects, are in `README-TRACE-2.md`.

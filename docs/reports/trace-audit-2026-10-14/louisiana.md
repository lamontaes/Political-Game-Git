# Lacassine, Louisiana: six local seats emptied with no appointments on record

Six local seats emptied in February and March 2025 with no appointment, yet the board kept recording six votes. Four state seats emptied under a special-election rule with no special election. No death or birth was recorded.

## The year

On January 20, 2025, federal and state officials were in office at the opening, and the federal and state chambers organized that day.

In February and March 2025, six local seats emptied because their holders moved away.
Those seats were three board seats, the clerk, the sheriff and the coroner.
Each seat was marked for appointment, and the file shows no appointment.
The board kept voting with six votes on every measure.

On February 4, 2025, the board organized with a council president and voted on five measures.
Measure 2025-001, on partnering with federal immigration enforcement, carried five to one.
Measures 2025-002 through 2025-005 each split three to three.

On February 19, 2025, the board voted six to zero against measures 2025-014 through 2025-018.
Public comment on those bills read zero for and six against.

On March 6, 2025, the county immigration law took effect.
The same day, two recall petitions named board seats 4 and 6.
Also that day, the board voted on measures 2025-022 through 2025-024, each five against and one for.

On June 1, 2025, one business closed, and on October 1, 2025, a second closed; both cited losses.

On June 12, 2025, the state House introduced 52 bills, held committee hearings and took floor votes.
The House voted 79 to 26 on measure 2025-001, banning lobbying after office, and the Senate voted 32 to 7.
The file lists that bill as enacted.
Bill 2025-008 passed the House 54 to 51 and was then held in committee.

On July 1, 2025, the state adopted its fiscal 2025 budget.

On October 1, 2025, Congress adopted the federal budget.

On December 1, 2025, one state House seat emptied.
On January 1, 2026, three more state seats emptied.
The file shows no special election for any of the four.

On December 15, 2025, the federal House voted 131 to 302 on bill 2025-020.
The same day, 22 federal House bills were introduced.

On January 1, 2026, the county adopted its 2026 budget by a seven to zero vote.
The same day, a county property tax of 0.293 percent of home value took effect, replacing a starting law.

On January 14, 2026, one candidate filing was recorded, for the U.S. Senate seat 0 contest on November 3, 2026.

The player, Ramon Lloyd, turns 18 on March 19, 2025.
He ends the year alive, with no job and $0 cash.
The file records no deaths and no births.

## What needs a why

1. **The board kept voting at six after three board seats emptied, and no appointment is on record.** Vacancies: `seat:gus2025:225523:board:5` and `seat:gus2025:225523:board:3` (February 1, 2025) and `seat:gus2025:225523:board:2` (March 1, 2025), each cause "moved away", rule "appointment". Votes still show six lines each on `2025-001` (February 4), `2025-014` to `2025-018` (February 19) and `2025-022` to `2025-024` (March 6). The clerk, sheriff and coroner seats also emptied (`seat:gus2025:225523:clerk:0`, `seat:gus2025:225523:sheriff:0`, `seat:gus2025:225523:coroner:0`) with no appointment record. The table `core2-elections-v1.vacancies` is reported unregistered, so the file cannot show appointments.

2. **No election is held in the year, though four state seats emptied under a special-election rule.** Vacancies: `seat:US-LA:lower:006:0` (December 1, 2025), `seat:US-LA:lower:088:0`, `seat:US-LA:upper:024:0` and `seat:US-LA:upper:034:0` (January 1, 2026). The "election-ish kinds" line is empty, and `core2-elections-v1.contests` shows 0 of 25 rows. `office:US-LA:us-house` has nextElectionYear 2026, but no House contest or filing appears. The only candidate filing is `filing:contest:seat:US-LA:us-senate:0:2026-11-03:official:term:seat:US-LA:us-senate:0:2025-01-20`, whose id carries the incumbent's term.

3. **Zero deaths and zero births in a town of 1,796 people, and four people are not alive with no death record.** The file reads "deaths: 0" (line 214), and the year's kinds include no birth record. People went from 1744 at the start to 1796 at the end, with 1792 alive. The 52 added people have no add record, and the four not alive have no death record.

4. **One budget line change is about 961 times the sample federal bill's agriculture line.** Record `budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15` shows deltaMinor -11082471301110 on December 15, 2025. The sample bill `bill:office:US-LA:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:89` has an agriculture line of 11533444483. The file does not state the unit, so check whether this is a unit error or a real cut.

5. **Year totals disagree with the per-body counts.** The year total for `chamber-organized` is 3 (line 5), but the file lists 7 records: four on January 20, 2025 (lines 434 to 437), February 4 and March 6, 2025 (local, council president `person_3ec78bb15936abd0`), and December 15, 2025 (line 438). The year total for `budget-line-changed` is 43 (line 5), but federal and state alone are 57 (line 421). The year total for `law-took-effect` is 27 (line 5), but federal and state alone are 26 (line 421), and the file shows at least two county laws, so the total should be at least 28.

6. **Local organizations rose by 26 with no opening record, and two closures give the same reason.** Organizations went from 127 to 151 with two closures, so 26 were added, and no organization-opened kind appears. The closures are `organization_0bbba89b795bd15b` (June 1, 2025) and `organization_c0b0f6a14041fa51` (October 1, 2025), both `losses-kept`. The trace for `organization_c0b0f6a14041fa51` sources its closure to `opening [core2-officials-v1.loaded loaded]`, not to a year event.

7. **Local vote patterns repeat exactly.** On February 4, 2025, `2025-002`, `2025-003`, `2025-004` and `2025-005` each show the same position sequence, three for and three against. On March 6, 2025, `2025-022`, `2025-023` and `2025-024` each show five against and one for. On February 19, 2025, `2025-014` through `2025-018` are each six against.

8. **Public comment is zero for and six against on all eight visible local bills.** The bills are `bill:office:gus2025:225523:board:2025-02-19:person_2336c1214d03e2fb:13` through `...:17` and `bill:office:gus2025:225523:board:2025-03-06:person_f4baabd91745279b:21` through `...:23`. The year's public-comment count is 19, and eight are shown.

9. **Tied votes have no recorded result, and the board shows more enacted bills than laws.** Measures `2025-002` to `2025-005` each tie three to three with no outcome record. The board shows 3 enacted bills (`office:gus2025:225523:board enacted: 3`), but the only local law that took effect in the file is `law:county:22053:county:us-policy-positions:justice-public-safety.partner-with-federal-immigration-enforcement:general:2025-03-06:2025-001`.

10. **Two recall petitions were filed the day the immigration law took effect, and the file does not say who triggered them.** The petitions are `recall:term:seat:gus2025:225523:board:4:2025-01-20:2025-03-06` and `recall:term:seat:gus2025:225523:board:6:2025-01-20:2025-03-06`, both March 6, 2025. Measure 2025-001 has one against position, and the file does not say which seat cast it. The year's recall-petition count is 7, and two are shown.

11. **The upper chamber recorded 29 yes and 10 no six times, and every floor vote totals full membership.** The bills are suffixes `:25` (2025-002), `:26` (2025-003), `:27` (2025-004), `:28` (2025-005), `:29` (2025-006) and `:34` (2025-011) under `bill:office:US-LA:legislature-lower:2025-06-12:official:term:seat:US-LA:lower:012:0:2025-01-20:`. Every lower-chamber vote shown (13) totals 105, and every upper-chamber vote shown (10) totals 39.

12. **Bills that passed the floor were held in committee, and 31 held records show zero votes.** Bill `bill:office:US-LA:legislature-lower:2025-06-12:official:term:seat:US-LA:lower:023:0:2025-01-20:38` had a House vote of 90 to 15 (line 184), then a held record with chair `official:term:seat:US-LA:upper:027:0:2025-01-20` (line 185). Bill `bill:office:US-LA:legislature-lower:2025-06-12:official:term:seat:US-LA:lower:023:0:2025-01-20:31` (2025-008) had a House vote of 54 to 51 (line 157), then a held record with the same upper chair (line 158). All 31 held records (lines 158 to 213) are dated June 12, 2025 and show 0 yes and 0 no. Twenty-nine of them name chair `official:term:seat:US-LA:lower:054:0:2025-01-20`.

13. **Every committee hearing totals 11 votes, and only two chairs appear.** All 24 hearing lines total 11, and 13 of them are 8 to 3. The only chairs are `official:term:seat:US-LA:lower:054:0:2025-01-20` and `official:term:seat:US-LA:upper:027:0:2025-01-20`.

14. **The state budget tally copies bill 2025-002's floor votes.** The budget-adopted record for governmentId US-LA (July 1, 2025) reads "73-32, 29-10, 2025-053". Bill 2025-002 (`...:25`, June 12, 2025) had a House vote of 73 to 32 (line 121) and a Senate vote of 29 to 10 (line 124). The file does not name a budget bill numbered 2025-053. The only bill introduced July 1, 2025 is not named in the file.

15. **A six-seat House office records a 433-vote House vote, and its officers and chairs sit in other states.** Bill `bill:office:US-LA:us-house:2025-12-15:official:seat:US-ID:us-senate:0:108` (number 2025-020) had 131 yes and 302 no. `office:US-LA:us-house` has 6 seats. The federal House speaker is `official:seat:US-PA:us-house:09` (January 20, 2025). The committee chair on bill `bill:office:US-LA:us-house:2025-12-15:official:seat:US-NV:us-house:03:111` is `official:seat:US-IA:us-house:02`. The December 15, 2025 chamber record names a council president for the federal House: `official:term:seat:US-LA:us-house:01:2025-01-20` (line 438).

16. **Measure and bill numbers repeat across bodies.** `2025-001` is the local measure of February 4, 2025 (immigration). The same number is the state bill of June 12, 2025 (ban on lobbying after office, bill suffix `:24`). It is also the federal bill number on the sample budget bill (suffix `:89`). `2025-002` through `2025-005` repeat across the local board and the state. The local numbers also skip: the file shows none between `2025-005` and `2025-014`, and none for `2025-019` to `2025-021`.

17. **Statewide results and state senate shares are constant.** All seven statewide seats are Republican, and every statewide elected share is 0.56 (for example `term:seat:US-LA:governor:2025-01-20`, and the past terms `term:seat:US-LA:attorney-general:2025-01-20:past:1` and `...:past:2`). All 12 senators shown have an elected share of 0.635, from `term:seat:US-LA:upper:001:0:2025-01-20` through `term:seat:US-LA:upper:012:0:2025-01-20`. Six statewide offices are marked as estimates with a generic citation ("generic rule; not verified per office").

18. **The player's own record is not in the file, and the speaker's id is nearly the same.** The player, `person_2336c2214d03e4ae` (Ramon Lloyd), appears only in the header lines (2 and 216). The speech trace (line 221) and the public-comment bill ids use `person_2336c1214d03e2fb`. The player ends with job "none" and cash $0. The file does not show whether the player made any of the 7547 `person.acted` records.

19. **Several engine tables are unregistered, the shown office rows include no local executive, and one terms heading repeats.** Unregistered tables: `core2-elections-v1.vacancies`, `core2-voting-v1.contests`, `core2-voting-v1.filings`, `core2-voting-v1.campaigns`, `core2-executive-v1.offices`, `core2-executive-v1.terms`, `core2-legislature-v1.governments` and `core2-legislature-v1.budgets`. Thirteen of 19 office rows are shown, and none is a local executive. The heading `core2-offices-v1.terms` appears twice, once as "12 of 201" and once as "144 of 201". The federal president is the sponsor of a House bill (`bill:office:US-LA:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:89`).

## Counts

Records this year: 9090 (news items: 447).

| Record kind            | Count |
| ---------------------- | ----- |
| person.acted           | 7547  |
| cause.shared           | 311   |
| vote-recorded          | 219   |
| news.read              | 180   |
| speech.heard           | 116   |
| speech.retold          | 104   |
| cause.volunteered      | 96    |
| legislative-vote       | 64    |
| bill-held-in-committee | 51    |
| drive.strengthened     | 47    |

## Method

World seed `ceb1b7c7f016`, one year from January 20, 2025 to January 20, 2026, through the trace viewer. Raw trace: `raw-trace-2/louisiana.txt`.

## Verification

Every item above was checked against the code. The causes, and the items that turned out not to be defects, are in `README-TRACE-2.md`.

# Cavetown, Maryland: a board whose tallies contradict its votes, and a year with no deaths

Cavetown's county board passed four measures on February 4, 2025, and the county laws took effect March 6, 2025. Three later board tallies disagree with the individual votes behind them, so the file cannot say which of those measures passed. The year also shows no deaths, no births, no governor action on eight state measures and no recorded choice by the player, which needs an explanation before this run is treated as a playable year.

## The year

Cavetown's county board organized on February 4, 2025, under a council president.
That day it recorded four votes: rent stabilization, an inclusionary requirement, multifamily homes in single-family zones, and universal preschool.
All four passed, and the county laws took effect on March 6, 2025.
On February 19, 2025, two more measures failed by recorded tally, 2 to 5 each.
The treasurer seat was vacated on February 1, 2025, and the file records no appointment.
A board seat was vacated on August 1, 2025, and the board organized again on August 3, 2025, under the same president.
On September 2, 2025, two more measures failed by tally.
The county adopted its 2025 budget 7 to 0 on July 1, 2025.
On November 1, 2025, the board recorded two votes on a right-to-counsel measure with no tally.
At the state level, 54 House of Delegates bills came up on April 7, 2025.
Seven passed both chambers, five failed in committee, and 42 were held without a vote.
Those seven laws took effect on June 1, 2025.
The state legislature adopted its budget on July 1, 2025.
A state senate seat was vacated on December 1, 2025.
Federal records show a budget adopted on October 1, 2025, and a top income tax rate of 37 percent from January 1, 2026.
The U.S. Senate recorded an 82 to 18 vote on a House bill on December 15, 2025.
Two Cavetown businesses closed, on June 1 and November 1, 2025.
No deaths were recorded.
The player, Jason Shields, has no records after the header, with a job as a dishwasher and $0 in cash.
A treasurer candidate sent a campaign message on January 9, 2026, for the November 3, 2026, contest.

## What needs a why

1. **Three board tallies are the reverse of their individual votes.** On February 19, 2025, measures 2025-005 and 2025-006 each have five "1" and two "-1" vote records, but the bill records say yes 2, no 5. On September 2, 2025, measure 2025-008 has the same five-to-two split, but its bill record says yes 2, no 5. Measure 2025-009 the same day agrees with its votes (3 to 4). Ids: `bill:office:gus2025:208244:board:2025-02-19:person_edb6babdb48f71ac:4`, `bill:office:gus2025:208244:board:2025-02-19:person_edb6babdb48f71ac:5`, `bill:office:gus2025:208244:board:2025-09-02:person_edb6babdb48f71ac:62`.

2. **Seven votes recorded after a board seat was vacated.** Seat `seat:gus2025:208244:board:3` in `office:gus2025:208244:board` was vacated on August 1, 2025. Measures 2025-008 and 2025-009 on September 2, 2025 each have seven vote records. The file records no appointment or replacement for that seat.

3. **Three seats vacated, zero appointments.** All three `seat-vacated` records use the rule "appointment": `seat:gus2025:208244:treasurer:0` (February 1, 2025), `seat:gus2025:208244:board:3` (August 1, 2025), and `seat:US-MD:upper:007:0` in `office:US-MD:legislature-upper` (December 1, 2025). No appointment record appears for any of them. The vacancy table is unregistered (`core2-elections-v1.vacancies`).

4. **The same vote pattern repeats across five measures.** Measures 2025-001, 2025-002, 2025-005, 2025-006 and 2025-008 each show the same position sequence, 1,1,1,1,1,-1,-1. Measures 2025-003 and 2025-004 show 1,1,1,1,1,1,-1. The vote records carry no voter id, so the file cannot show who voted.

5. **Measure 2025-010 has no tally and no law.** On November 1, 2025, the board recorded two votes (both position "1") on `us-policy-positions:housing-land-use.right-to-counsel-in-eviction`. There is no `legislative-vote` row and no `law-took-effect` row for it. The board's status counts show 6 enacted and 4 failed, and the file does not say which bills are which.

6. **State counts do not match the rows.** The year summary says `bill-held-in-committee=54` and `committee-hearing=38`. The April 7, 2025 rows show 42 distinct held bills and 19 committee-hearing rows. Of the 54 bills, 12 had hearings, so 42 were held. Example held id: `bill:office:US-MD:legislature-lower:2025-04-07:official:term:seat:US-MD:lower:42C:0:2025-01-20:7`.

7. **Every state floor vote passed, and six of the seven enacted bills share one sponsor.** The seven state bills that reached the floor passed both chambers. Six of them are sponsored by `official:term:seat:US-MD:lower:014:0:2025-01-20` (bill indexes :9, :11, :16, :21, :23, :34). The same sponsor's other bills (indexes :17, :18, :28, :41) failed in committee, with votes of 4 to 7, 5 to 6, 1 to 10 and 1 to 10. Example id: `bill:office:US-MD:legislature-lower:2025-04-07:official:term:seat:US-MD:lower:014:0:2025-01-20:9`.

8. **All committee hearings share one chair each.** All 12 lower-chamber hearings have chair `official:term:seat:US-MD:lower:021:2:2025-01-20`. All seven upper-chamber hearings have chair `official:term:seat:US-MD:upper:017:0:2025-01-20`. Every lower-chamber bill sits in committee "general."

9. **The state budget's vote tallies match earlier bill votes.** `budget:US-MD:2025` was adopted "the legislature vote 107-31, 34-13, 2025-055." The 107-31 is the lower-chamber tally of `bill:office:US-MD:legislature-lower:2025-04-07:official:term:seat:US-MD:lower:006:1:2025-01-20:6`. The 34-13 is the upper-chamber tally of the 2025-006 bill (index :11 in the same chamber). The budget bill itself is one lower-chamber bill introduced July 1, 2025.

10. **County money with no visible records.** `county:24043` adopted its 2025 budget 7 to 0 (measure 2025-007) on July 1, 2025. No `budget-line-changed` row for `county:24043` appears in the file. The county property-tax law `law:county:24043:county:property-tax:general:2026-01-01` (value 0.838) replaced `law:county:24043:county:property-tax:general:2026-01-01:from-start` on the same day it took effect. The file has no board bill or vote for it.

11. **No governor action on enacted state bills.** Eight state measures were enacted (seven laws effective June 1, 2025, plus the July 1 budget). The file has no signing, veto or other executive record for any of them. The executive tables are unregistered (`core2-executive-v1.offices`, `core2-executive-v1.terms`). Office: `office:US-MD:governor`.

12. **A pension law is undone on its effective day, and its row is cut off.** On June 1, 2025, `law:US-MD:state:us-policy-positions:fiscal.fund-pensions-to-schedule:general:2025-06-01:2025-004` took effect with value "0." The same day, `retirementContributions` changed by -43842540000 under `law:US-MD:state:us-policy-positions:fiscal.fund-pensions-to-schedule:general:2025-06-01:2025-004#2025-06-01#undo`. The law row is cut off in the file, so its change field cannot be read.

13. **No deaths or births in a town of about 1,941.** The file records `deaths: 0` and no birth kind. People went from 1894 to 1941, and alive went to 1940. That is a net gain of 47 with no birth or in-migration record, and the one person not alive has no death record. Six `person.moved-away` records exist; one is traced, `person_ad852d6ff542bf18` on August 1, 2025.

14. **About 50 organizations appear with no founding record.** Organizations went from 120 at build to 170 at year end. The file shows two closures (`organization_7b6955e3bf29f3ce`, `organization_79c574dbce940d43`) and two founding records (`cause-group.founded=2`). That leaves about 50 organizations (170 minus 120, plus 2 closures, minus 2 founded) with no record.

15. **The player has no records.** The player, `person_0e3a90aaf8ccbe7c` (Jason Shields, born January 22, 2007), appears only in the file header. There is no filing, vote, pay or spending row for the player. The header shows job Dishwasher and cash $0.

16. **Cause-group balances are near zero.** On October 1, 2025, the balances before the ads were 27 and 14 (minor units). The totals reconcile from ad to ad. The council president's inclusionary group, `organization:cause-group:person_afe68034140d6f3c:cause:us-policy-positions:housing-land-use.inclusionary-requirement`, reached nobody in its two ads. The rent-stabilization group, `organization:cause-group:person_df76cbac90884820:cause:us-policy-positions:housing-land-use.rent-stabilization`, reached someone once, in its August 1, 2025 ad.

17. **A chamber record uses the wrong role key, and the board organized twice.** On December 15, 2025, a `chamber-organized` record for the U.S. House carries the key `council-president` with value `official:term:seat:US-MD:us-house:08:2025-01-20`. The county board also recorded a second `chamber-organized` on August 3, 2025, with the same person as council president.

18. **Year totals do not match the rows.** The year total is `chamber-organized=3`, but the federal and state rows show five, and the board shows two. The year total is `legislative-vote=38`, but the federal and state rows show 29 and the board shows 8, which is 37. The file does not say which scope each summary uses.

19. **No election data, and many module tables are unregistered.** `core2-elections-v1.contests` shows "0 of 22," so no contest rows print. The year shows `candidate-filed=14`, yet "election-ish kinds" is blank. The one contest named is `filing:contest:seat:gus2025:208244:treasurer:0:2026-11-03:person_ddeae8edd7d70f06`. These tables are unregistered: `core2-voting-v1.contests`, `core2-voting-v1.filings`, `core2-voting-v1.campaigns`, `core2-executive-v1.offices`, `core2-executive-v1.terms`, `core2-legislature-v1.governments`, `core2-legislature-v1.budgets`.

20. **Numbers and labels to check.** The federal balanced-budget law `law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15` cut veterans by -11084402930947 (minor units), the largest line in the file. Senate seats use the party label "Democrat" (`seat:US-MD:us-senate:0`), while governor seats use "Democratic" (`seat:US-MD:governor`). State executive offices have `governmentName` "US-MD" instead of a name. The file records 138 House of Delegates seats; the published Maryland figure is 141, which is outside this file and should be checked against the seat source.

## Counts

Records this year: 21392.

| Record kind       | Count |
| ----------------- | ----- |
| person.acted      | 19061 |
| cause.shared      | 516   |
| news.read         | 390   |
| speech.retold     | 364   |
| case.made         | 249   |
| cause.donated     | 105   |
| vote-recorded     | 98    |
| office.approached | 64    |
| office.replied    | 64    |
| cause.volunteered | 63    |

Method: seed 1254cc0932d2, run January 20, 2025 to January 20, 2026, read from `audit/maryland.txt` only.

## Verification

Every item above was checked against the code. The causes, and the items that turned out not to be defects, are in `README-TRACE-2.md`.

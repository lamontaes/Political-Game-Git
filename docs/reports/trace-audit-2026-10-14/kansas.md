# Vermillion, Kansas: the council failed 23 of 24 bills, and most election tallies sum to 1,912

The council failed nearly every bill it voted on, and the vote and election tallies repeat so often that the year needs explaining before anyone plays it.

## The year

The council and county board both met on February 4, 2025. The council voted on five bills that day, and each one failed 1 to 4. The county board's bill 2025-001 drew 4 yes votes and 3 no votes. A county law on federal immigration enforcement took effect on March 6, 2025. Recall petitions against three board seats were dated the same day.

On April 2, 2025, eight candidates filed for council seats and mayor. On May 1, 2025, a council seat was vacated when its member moved away. Three state House seats and one state Senate seat were vacated during the year. One Senate seat was vacated by death on September 16, 2025.

The state House introduced 52 bills on May 6, 2025. By year end, 7 of its 53 bills were enacted, 41 failed, 3 were overridden and 2 were vetoed. The records show no deaths in town.

On November 4, 2025, the town held its council and mayor races. The mayor's race and one council race each had a single candidate. On December 15, 2025, the council recorded a new council president. On January 1, 2026, the council adopted the 2026 budget by a 3 to 2 vote.

Congress adopted its budget on October 1, 2025, by 255 to 178 in the House and 70 to 30 in the Senate. The U.S. House voted 223 to 210 on bill 2025-026 on December 15, 2025. The state legislature adopted its budget on July 1, 2025.

The player, Jaden Guzman, was alive at year end, working as a server with $4,638 in cash. The file shows no vote, filing or campaign action by the player. The town's count rose from 1,766 people to 1,841 and from 118 organizations to 173. The news feed carried 493 items, 43 of them federal.

## What needs a why

1. **Council votes repeat one split, and most council bills failed.** Nine council votes each total 1 yes and 4 no, and each shows the same position list, -1,-1,-1,1,-1. Five were on February 4, 2025 and four on February 19, 2025. Council bills show 23 failed and 1 enacted. Nine council bills are counted as introduced on February 4, 2025, but votes appear only for indexes 4 to 8. Records: legislative-vote billIds `bill:office:gus2025:212017:council:2025-02-04:person_4a11424dacd9a39b:4` through `:8`, and `bill:office:gus2025:212017:council:2025-02-19:person_4a11424dacd9a39b:13` through `:16`.

2. **The council president is a U.S. House seat.** The chamber-organized record dated December 15, 2025 reads `"council-president":"official:term:seat:US-KS:us-house:02:2025-01-20"`. The February 4, 2025 record names `person_02f9f788fe45f82b` as council president. The file shows no record that changed that office for that person.

3. **Every public comment is against.** The file shows 11 of 24 public-comment records. All 11 read `"for":"0"`, with `"against"` from 1 to 6. Records: `bill:office:gus2025:164646:board:2025-02-04:person_547a6e19cd721155:1` and `:3`; council `bill:office:gus2025:212017:council:2025-02-04:person_4a11424dacd9a39b:4` through `:8`; and council `bill:office:gus2025:212017:council:2025-02-19:person_4a11424dacd9a39b:13` through `:16`.

4. **State totals repeat, and every vote has full attendance.** Lower-chamber votes on `bill:office:US-KS:legislature-lower:2025-05-06:official:term:seat:US-KS:lower:004:0:2025-01-20:18` through `:22` each total 88 yes and 37 no. Upper-chamber votes on the same bills each total 31 yes and 9 no. Of the 27 committee hearings shown, 20 read 8-3 (lower chair `official:term:seat:US-KS:lower:030:0:2025-01-20`) or 9-2 (upper chair `official:term:seat:US-KS:upper:016:0:2025-01-20`). Every shown lower vote sums to 125 and every upper vote sums to 40, so no seat was absent.

5. **Held bills show no committee votes.** The file shows 13 of 48 bill-held-in-committee records. Each reads yes 0 and no 0 under the same chair, `official:term:seat:US-KS:lower:030:0:2025-01-20`. Records: `bill:office:US-KS:legislature-lower:2025-05-06:official:term:seat:US-KS:lower:004:0:2025-01-20:27` (line 188) and the bills ending in `:33` through `:44` on lines 204 to 215.

6. **Vetoes and overrides have no record.** The state lower chamber shows 2 vetoed and 3 overridden bills. No veto, override or governor act appears in the record kinds or the detail lines. The governor's only record is the term `term:seat:US-KS:governor:2025-01-20`.

7. **Five vacated seats have no appointment record.** Each vacancy names appointment as its rule: `seat:gus2025:212017:council:0` (May 1, 2025, moved away), `seat:US-KS:lower:023:0` (June 1, 2025, moved away), `seat:US-KS:upper:025:0` (September 16, 2025, death), `seat:US-KS:lower:044:0` and `seat:US-KS:lower:054:0` (both November 1, 2025, moved away). No appointment or replacement record appears. `seat:US-KS:lower:044:0` was the House minority-leader seat on January 20, 2025 (`official:term:seat:US-KS:lower:044:0:2025-01-20`).

8. **Election totals repeat 1,912.** `contest:seat:gus2025:212017:council:0:2025-11-04` totals 515, 332 and 1,065, which sums to 1,912. `contest:seat:gus2025:212017:council:2:2025-11-04` totals 6, 440 and 1,465, which sums to 1,911. `contest:seat:gus2025:212017:council:4:2025-11-04` and `contest:seat:gus2025:212017:mayor:0:2025-11-04` each have one candidate with 1,912 votes, so no ballot went blank or to another name.

9. **City offices were filed with the county.** All eight candidate-filed records say `"filedWith":"County election officer"`, including the council and mayor filings. Example: `filing:contest:seat:gus2025:212017:mayor:0:2025-11-04:person_58d06b874b7b706c`.

10. **Recall petitions have no result.** Three recall petitions dated March 6, 2025 cite the county immigration law: `recall:term:seat:gus2025:164646:board:0:2025-01-20:2025-03-06`, `recall:term:seat:gus2025:164646:board:1:2025-01-20:2025-03-06` and `recall:term:seat:gus2025:164646:board:2:2025-01-20:2025-03-06`. The file has no recall vote, outcome or vacancy for these seats. The board's shown votes each count seven members.

11. **One measure id stands for three questions.** `measureId` "2025-001" appears for `us-policy-positions:justice-public-safety.partner-with-federal-immigration-enforcement` (county board, February 4, 2025), `us-policy-positions:agriculture-natural-resources.protect-farmland-from-development` (council, February 4, 2025) and `us-policy-positions:agriculture-natural-resources.limit-groundwater-withdrawal` (state House, May 6, 2025).

12. **Winning shares are identical.** Each of the six current statewide terms shown has `"share":0.56`, including `term:seat:US-KS:governor:2025-01-20`, `term:seat:US-KS:treasurer:2025-01-20` and `term:seat:US-KS:insurance-commissioner:2025-01-20`. Each state Senate term shown has `"share":0.635`, including `term:seat:US-KS:upper:002:0:2025-01-20:past:1` and `term:seat:US-KS:upper:013:0:2025-01-20:past:3`.

13. **Budget years do not match adoption dates.** The state budget labeled fiscal year 2025 was adopted on July 1, 2025 (`"governmentId":"US-KS","fiscalYear":"2025"`). The federal budget labeled fiscal year 2025 was adopted on October 1, 2025 (`"governmentId":"US","fiscalYear":"2025"`). Under the usual calendars (Kansas July to June, federal October to September), those dates open the next fiscal year.

14. **Some balances look far too large or too small.** The federal sample bill `bill:office:US-KS:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:83` has an `otherPrograms` value of -153085564483, with no unit stated. Its agriculture value is 12374354545. The town's welfare and Medicaid change is `deltaMinor=-426` (`budget-line-changed:budget:place:2073525:2026:welfareAndMedicaid:adopted`).

15. **Population and organization counts move without a source.** People rose from 1,766 at build to 1,841 at year end, with 1,836 alive. No birth record appears in the record kinds, and the file reports `deaths: 0`. The 5 `person.moved-away` records match the 5 people not counted as alive. Organizations rose from 118 to 173 with no founding record in the kinds list. The file shows 2 `business.closed` and 2 `organization.closed` records and 1 `work.job-lost`. The one closure in the detail is `organization_3443baed495c7412` (losses-kept, October 1, 2025).

16. **The player's age and record.** The header gives `person_dc6b76634f9e2688` a birth date of January 23, 2007. The player is 17 at the January 20, 2025 start and turns 18 on January 23, 2025. No birthday record appears. No vote, filing, speech or campaign record names `person_dc6b76634f9e2688`.

17. **Learned entries repeat in traces.** The speech trace `speech:party-meeting:party:US-KS:democratic:2026-01-15:retold:person_547a6b19cd720c3c` lists the same `learned:core.observe.perceived` entry four times. The trace `speech:party-meeting:party:US-KS:democratic:2026-01-15` does the same. The campaign-message trace `filing:contest:seat:gus2025:212017:mayor:0:2025-11-04:person_58d06b874b7b706c:2025-11-04` repeats its entry at least six times on one line, which is cut off.

18. **Federal officials appear by seat, not by term.** Federal officials show as `official:seat:US-TX:us-house:36` (House speaker, January 20, 2025) and `official:seat:US-MT:us-senate:0` (committee chair on `bill:office:US-KS:us-house:2025-12-15:official:seat:US-TX:us-house:20:108`). State officials use term ids that have term records. The Senate majority leader on January 20, 2025 is `official:term:seat:US-KS:us-senate:0:2025-01-20`, a Kansas seat.

19. **Initiatives and petitions have no outcome.** The file records 13 `initiative.organizing-started` events and 24 public comments. It shows no initiative petition, qualification or ballot record. The recalls in item 10 also have no result.

20. **Tables and offices are missing.** The contests table prints 0 of 33 rows. Eight module tables print as unregistered: vacancies, voting contests, filings, campaigns, executive offices, executive terms, legislature governments and legislature budgets. The 12 offices printed are all federal or state, so the local council, mayor and board offices are not in the office list.

## Counts

Records this year: 16,138 (from the file header; the detail lines are a partial sample).

| Record kind        | Count |
| ------------------ | ----- |
| person.acted       | 12682 |
| cause.shared       | 1108  |
| speech.retold      | 599   |
| news.read          | 235   |
| vote-recorded      | 196   |
| cause.donated      | 158   |
| case.made          | 143   |
| campaign-message   | 131   |
| cause-group.ad-ran | 111   |
| speech.heard       | 102   |

Method: seed 32e4998ec48b, run January 20, 2025 to January 20, 2026.

## Verification

Every item above was checked against the code. The causes, and the items that turned out not to be defects, are in `README-TRACE-2.md`.

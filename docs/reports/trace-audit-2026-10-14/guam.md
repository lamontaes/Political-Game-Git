# Mangilao, Guam: taxes changed, businesses closed, and no legislature voted

The run changed territorial taxes with no recorded vote, closed five businesses, and produced a population count that does not reconcile.

## The year

On January 20, 2025, Mangilao had 1,603 people and 118 organizations.

On January 21, 2025, the player, Makayla McCarthy, turned eighteen. The same day, the territory's minimum-wage law took effect.

The player ended the year alive, with no job and $0 in cash.

Five organizations closed during the year. Three closed when their cash and credit ran out, on May 26, 2025, July 21, 2025, and January 14, 2026. Two closed for losses kept, on June 1, 2025, and October 1, 2025.

Five single-unit homes were completed, each on the sixth of the month, from September 6, 2025 through January 6, 2026.

No territorial budget was voted. The territory's 2025 budget carried forward under the budget rule.

On October 20, 2025, a state pension budget line changed. The file shows no vote for that change.

The territorial legislature has zero seats. The file shows no legislative act all year.

On December 1, 2025, Consolidated Commission on Utilities member David Frazier moved away. The term record names Jonathan Bell as the appointee.

On January 15, 2026, one candidate filed for the March 1, 2026 special election for that seat.

On January 1, 2026, a state income tax with a 37 percent top rate took effect. A 4.5 percent state sales tax also took effect. The file names no body that enacted either one.

Federal activity ran alongside. Congress adopted the federal budget on October 1, 2025.

On December 15, 2025, six federal policy laws took effect. The same day, 25 federal bills were introduced. Thirteen bills got committee hearings. Twelve were held with no vote.

The chamber record names the Guam Delegate, Peggy Stein, as council president on December 15, 2025.

Seven federal bills were enacted, and 19 failed.

The file records no deaths and no births. Eight people moved away.

## What needs a why

Line numbers refer to `audit/guam.txt`.

1. **The territorial legislature has no seats and no record of acting.** `office:US-GU:legislature-unicameral` shows `"seats":0` (line 171). The file has no territorial bill, vote, committee hearing or legislative term. The "sample state bill" (line 232) is the same record as the "sample federal bill" (line 230): `bill:office:US-GU:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:0`, body `office:US-GU:us-house`. The tables `core2-legislature-v1.governments` and `core2-legislature-v1.budgets` read "Unregistered module table" (lines 219-221).

2. **Three state laws took effect with no enacting body in the file.** `law:US-GU:state:minimum-wage:general:2025-01-21:law:US-GU:state:us-policy-positions:labor-workforce.raise-minimum-wage:general:starting` (line 17). `law:US-GU:state:income-tax:general:2026-01-01` (line 68, replaces an id truncated in the file). `law:US-GU:state:sales-tax:general:2026-01-01` (line 69, replaces `law:US-GU:state:sales-tax:general:2026-01-01:from-start`). The file shows no bill, vote or governor act for any of them. The state income-tax top rate of 37 percent (line 68) matches the federal top rate in line 7 exactly.

3. **The territory's 2025 budget was never voted, yet a budget line changed.** `budget-adopted` for `US-GU` (line 26; trace `budget:US-GU:2025`, line 146) says "carried forward by the budget rule until the council or legislature votes it." On October 20, 2025, `budget-line-changed` moved the state `retirementContributions` line by `deltaMinor 1076852000` under `law:US-GU:state:us-policy-positions:fiscal.fund-pensions-to-schedule:general:starting#2025-10-20` (line 29). The file shows no vote on that measure.

4. **No Mangilao or other local government appears.** The offices table reads "9 of 9" (lines 163-171), and none of the nine is local: `office:US:president`, `office:US:vice-president`, `office:US-GU:us-house`, `office:US-GU:governor`, `office:US-GU:lieutenant-governor`, `office:US-GU:attorney-general`, `office:US-GU:public-auditor`, `office:US-GU:consolidated-commission-on-utilities`, `office:US-GU:legislature-unicameral`. The tables `core2-executive-v1.offices` and `core2-executive-v1.terms` read "Unregistered module table" (lines 215-217). The file has no mayor, council, local election or local law.

5. **Population does not reconcile, and there are no births or deaths.** The build reports 1603 people (line 1). The year end reports 1609 people, 1602 alive (line 4). `deaths: 0` (line 74). No birth record kind appears in the counts (line 5). `person.moved-away=8` (line 5), sample `person.moved-away:person_3bbb148a2eaeebe8:2025-07-01` (line 153). The file gives no alive count at build. At year end, 1609 people minus 1602 alive leaves seven not alive, yet zero deaths are recorded.

6. **Organizations grew by 10 with no founding records.** Organizations went from 118 at build (line 1) to 128 at year end (line 4). `organization.closed=5` (line 5). No organization-founding kind appears in the counts. `organization.owner-changed=1` and `drive.formed=1` (line 5) have no ids or sample lines in the file.

7. **The counts disagree inside the file.** (a) Line 234 gives `budget-line-changed=17` and `chamber-organized=3`. Line 5 gives 16 and 1 for the same kinds. A subset cannot exceed the total. (b) `inauguration=1` and `president.address=1` appear only on line 234, not in the 9304-record total. (c) `news.read=130` (line 5) against "news items: 100" (line 6). (d) `core2-offices-v1.terms` reads "12 of 12" (line 183) and "0 of 12" (line 197).

8. **Trace records repeat, and one chain loops.** The learned fact for `speech:party-meeting:party:US-GU:republican:2026-01-15:retold:person_606322960cc9ac63` appears five times, identical, in line 85. The learned fact for `employer-closed:2026-01-14:organization_5f1d61fdd9a549eb` appears twice, identical, in line 103. The chain `official:seat:US-AK:us-senate:0` and `job:office:seat:US-AK:us-senate:0:official:seat:US-AK:us-senate:0` point at each other through `saved-trace.job` and `core.jobs.personId` (lines 128-131). The bill-vote trace lists `core.log.personIds` through at least index 47, and the line is truncated (line 133).

9. **Nine bills got two committee hearings each on December 15, 2025, under two different chairs.** Each pair uses committee "general" and chairs `official:seat:US-NY:us-house:23` and `official:seat:US-OH:us-senate:1`. Four pairs show different tallies: `bill:office:US-GU:us-house:2025-12-15:official:seat:US-PA:us-house:01:2` (lines 36-37, 10-1 and 11-0); `bill:office:US-GU:us-house:2025-12-15:official:seat:US-PA:us-house:01:4` (lines 40-41, 10-1 and 9-2); `bill:office:US-GU:us-house:2025-12-15:official:seat:US-NY:us-house:20:6` (lines 44-45, 10-1 and 9-2); `bill:office:US-GU:us-house:2025-12-15:official:seat:US-OR:us-house:05:7` (lines 46-47, 6-5 and 7-4). Five pairs match: `...:official:seat:US-TX:us-house:27:1` (11-0), `...:official:seat:US-TX:us-house:27:3` (6-5), `...:official:seat:US-NY:us-house:20:5` (10-1), `...:official:seat:US-TX:us-house:27:8` (6-5), `...:official:seat:US-TX:us-house:27:9` (6-5). Every one of the 22 hearings totals 11 votes. The 6-5 tally appears seven times and 5-6 appears four times (lines 56, 57, 62, 66).

10. **Twelve bills were held with no vote, after 25 bills were introduced on one day.** 25 of 26 bills were introduced on December 15, 2025 (line 225), and the other on October 1, 2025 (line 224). The twelve held bills each show yes 0 and no 0, with chair `official:seat:US-NY:us-house:23`: `bill:office:US-GU:us-house:2025-12-15:official:seat:US-OR:us-house:05:10`, `...:official:seat:US-WA:us-house:10:11`, `...:official:seat:US-CT:us-house:05:12`, `...:official:seat:US-OR:us-house:03:13`, `...:official:seat:US-OR:us-house:05:16`, `...:official:seat:US-OR:us-house:05:17`, `...:official:seat:US-OR:us-house:05:18`, `...:official:seat:US-OR:us-house:05:19`, `...:official:seat:US-OR:us-house:05:21`, `...:official:seat:US-OR:us-house:05:22`, `...:official:seat:US-OR:us-house:05:23`, `...:official:seat:US-WA:us-house:10:25` (lines 52-55, 58-61, 63-65, 67). Status counts are enacted 7 and failed 19 (lines 227-228). The file does not say which status the twelve held bills carry.

11. **Every federal bill sits in the Guam Delegate's body.** All 26 bills name `office:US-GU:us-house` as body (lines 165, 224-225, 230). The bill ids name seats in other states, including US-TX, US-PA, US-NY, US-OR, US-WA, US-CT, and US-AK (line 128). The first chair on most hearings is `official:seat:US-NY:us-house:23`, and the second is `official:seat:US-OH:us-senate:1`. The file gives no reason a Guam office hears these bills.

12. **A chamber record names the Guam Delegate "council-president."** `chamber-organized` on December 15, 2025 (lines 33 and 246) gives `"council-president":"official:term:seat:US-GU:us-house:at-large:2025-01-20"`, the Delegate's term (Peggy Stein, line 189). No council for the territory or for Mangilao appears anywhere in the file.

13. **Six federal laws took effect on the day of the hearings, each with value 1 and no bill id.** All dated December 15, 2025 (lines 9-14): `us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties`, `us-policy-positions:government-operations.ban-lobbying-after-office`, `us-policy-positions:fiscal.fund-pensions-to-schedule`, `us-policy-positions:civil-family-community.restrict-abortion`, `us-policy-positions:fiscal.minimum-reserve-balance`, `us-policy-positions:fiscal.balanced-operating-budget`. The federal veterans line moved by `deltaMinor -11083034200920` under `budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15` (line 137). The file does not say which of the seven enacted bills carry these measures.

14. **The Consolidated Commission on Utilities shows one seat, not five, and two 2026 contests for it.** `office:US-GU:consolidated-commission-on-utilities` is titled "5, islandwide, nonpartisan" but has `"seats":1` (line 170), with one seat row, `seat:US-GU:consolidated-commission-on-utilities` (line 181). The seat was vacated on December 1, 2025, cause "moved away" (line 31). Its term `term:seat:US-GU:consolidated-commission-on-utilities:2025-01-20` ended then, with `endEstimated: false` (line 194). The appointee term `term:seat:US-GU:consolidated-commission-on-utilities:2025-12-01` says "appointed by governor until a special election" (line 195), but no appointment record exists. Two contests cover the same seat in 2026: `contest:seat:US-GU:consolidated-commission-on-utilities:2026-03-01:special` (line 205) and `contest:seat:US-GU:consolidated-commission-on-utilities:2026-11-03` (line 204). The November contest's `incumbentTermId` is the term that ended on December 1, 2025. The one filing, `filing:contest:seat:US-GU:consolidated-commission-on-utilities:2026-03-01:special:official:term:seat:US-GU:consolidated-commission-on-utilities:2025-12-01` (line 73), was made on January 15, 2026, the same day as the special's `filingDeadline` (line 205). Its filer is the appointee. The file shows no other filer.

15. **The contests table shows 6 of 7.** `core2-elections-v1.contests` reads "6 of 7" (line 199). The six shown are `contest:seat:US-GU:us-house:at-large:2026-11-03`, `contest:seat:US-GU:governor:2026-11-03`, `contest:seat:US-GU:lieutenant-governor:2026-11-03`, `contest:seat:US-GU:attorney-general:2026-11-03`, `contest:seat:US-GU:consolidated-commission-on-utilities:2026-11-03`, and `contest:seat:US-GU:consolidated-commission-on-utilities:2026-03-01:special`. The file does not show the seventh. No contest appears for the legislature, which has zero seats.

16. **The player has no record of acting.** `person_71cf105fb6f07530` appears only on line 2 (born January 21, 2007) and line 76 (`alive=true job=none cash=$0 home=household_788c23ad5e10301c`). The player turned eighteen on January 21, 2025, the same day the minimum-wage law took effect. The file shows no candidacy, job, income, speech or choice for the player.

17. **Five housing completions fall on the sixth of each month.** `housing.completed` on September 6, 2025 (line 24), October 6, 2025 (line 28), November 6, 2025 (line 30), December 6, 2025 (line 32), and January 6, 2026 (line 70). All five read `kind: single`, `units: 1`, `affordableUnits: 0`.

18. **The governor's seat has no party, and the state rules are unverified estimates.** `seat:US-GU:governor` (line 177) and `term:seat:US-GU:governor:2025-01-20` (line 190) have no party field. The lieutenant governor is Democratic (lines 178 and 191), and the attorney general is Republican (lines 179 and 192). The vacancy rules for `office:US-GU:lieutenant-governor`, `office:US-GU:attorney-general`, `office:US-GU:public-auditor`, `office:US-GU:consolidated-commission-on-utilities`, and `office:US-GU:legislature-unicameral` are marked `estimate: true` and cite "generic rule; not verified per office" (lines 167-171).

## Counts

Records this year: 9304.

| Rank | Record kind            | Count                                                   |
| ---- | ---------------------- | ------------------------------------------------------- |
| 1    | person.acted           | 9048                                                    |
| 2    | news.read              | 130                                                     |
| 3    | committee-hearing      | 22                                                      |
| 4    | legislative-vote       | 18                                                      |
| 5    | budget-line-changed    | 16                                                      |
| 6    | law-took-effect        | 13                                                      |
| 7    | speech.retold          | 13                                                      |
| 8    | bill-held-in-committee | 12                                                      |
| 9    | person.moved-away      | 8                                                       |
| 10   | organization.closed    | 5 (tied with business.closed 5 and housing.completed 5) |

## Method

World seed `22cf0e5b9d81`, one year from January 20, 2025 to January 20, 2026, through the trace viewer. Raw trace: `raw-trace-2/guam.txt`.

## Verification

Every item above was checked against the code. The causes, and the items that turned out not to be defects, are in `README-TRACE-2.md`.

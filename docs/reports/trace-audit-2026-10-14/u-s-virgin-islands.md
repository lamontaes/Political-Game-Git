# Cruz Bay, U.S. Virgin Islands: Federal Votes Only, Territory Budget Carried Forward

The year's government activity was almost all federal: the U.S. House recorded 26 bills, a federal budget and 21 committee hearings. The territory held no election, adopted no budget and has no seated legislature, and the player never reached a filing or a campaign.

## The year

Cruz Bay opened on January 20, 2025, with Carl Murray as president, Matthew Mack as the territory's delegate in the U.S. House, and Tammy Cortez as governor. The player, Katelyn McNeil, was 17 and worked as a warehouse worker. A territorial minimum wage took effect on January 21, 2025, at 1,500 minor units an hour. A business closed for losses on June 1, 2025.

On September 6, 2025, the first of five single-unit housing completions was recorded. The other four came on the sixth of each month through January 6, 2026.

On October 1, 2025, Congress adopted the 2025 federal budget by a House vote of 256 to 177 and a Senate vote of 68 to 32. Seven spending lines were dropped in amendment. The same day, the territory's 2025 budget was recorded as carried forward, because no council or legislature had voted on it. A second business closed that day, and its owner closed the organization.

On December 15, 2025, 25 bills were introduced in the House. Committees held hearings on 13 of them and left 12 with no vote. One House floor vote failed 212 to 221. A record from that day names Matthew Mack as council president, although the file shows no territorial council.

On January 1, 2026, the territory's income tax changed to a 37 percent top rate and its sales tax to 5 percent. Unemployment rules changed the same day. The Board of Education seat was vacated because its member moved away, and the seat was filled by appointment.

No election was held in the year. No territorial legislature voted. The population grew from 1,585 at the build to 1,596 with no deaths. The player turned 18 on January 22, 2025, and ended the year with $17,277 in cash and no filing or campaign on record.

## What needs a why

1. **No territorial legislature.** `office:US-VI:legislature-unicameral` shows `"seats":0`, and the seats table has no legislature seat. `core2-legislature-v1.governments` and `core2-legislature-v1.budgets` both print "Unregistered module table." No legislature record appears in the year.

2. **Territory budget never voted.** `budget-adopted` dated October 1, 2025, for `governmentId` `US-VI` reads "carried forward by the budget rule until the council or legislature votes it" (`budget:US-VI:2025`). No council or legislature vote record appears anywhere in the file.

3. **No election, filing or campaign.** The `election-ish kinds:` line is empty. `core2-elections-v1.contests` shows "0 of 5" with no rows. `core2-elections-v1.vacancies`, `core2-voting-v1.contests`, `core2-voting-v1.filings` and `core2-voting-v1.campaigns` all print "Unregistered module table." Every territory office (`office:US-VI:governor`, `office:US-VI:lieutenant-governor`, `office:US-VI:board-of-education`, `office:US-VI:board-of-elections`, `office:US-VI:us-house`) has `nextElectionYear` 2026, after the year's end. No filing record names person_571fe28560cf9f19.

4. **Executive branch has no records.** `core2-executive-v1.offices` and `core2-executive-v1.terms` print "Unregistered module table." The governor's term `term:seat:US-VI:governor:2025-01-20` is "serving" with no act recorded. The Board of Education appointment `term:seat:US-VI:board-of-education:2026-01-01` reads "appointed by governor (until next general election)," but no appointment record kind appears in the year's counts.

5. **Board of Education vacancy and move dates disagree.** `seat-vacated` dated January 1, 2026, gives `"cause":"moved away"` and `"rule":"appointment"`. The term `term:seat:US-VI:board-of-education:2025-01-20` ends January 1, 2026, with `"endedBy":"moved away"` and runs from January 1, 2023, to January 1, 2026, three years against `termYears` 4. The only traced move is `person.moved-away:person_e00b54a59a33db24:2025-09-01`, dated September 1, 2025. The file does not tie person_e00b54a59a33db24 to the term holder. The same record also sets `person:person_e00b55a59a33dcd7:residence=jurisdiction_ad4f3bc31274b5fe` alongside `person:person_e00b54a59a33db24:residence=jurisdiction_ad4f3bc31274b5fe`. The year shows four `person.moved-away` records; only this one is traced.

6. **Council president on a federal delegate seat.** `chamber-organized` dated December 15, 2025, reads `{"council-president":"official:term:seat:US-VI:us-house:at-large:2025-01-20"}`. The 8-office table has no council office, and that term is the Delegate's federal term.

7. **House votes recorded under a one-seat Delegate office.** `office:US-VI:us-house` has `"seats":1` and kind `us-house-delegate`. All 26 bills have `bodyOfficeId` `office:US-VI:us-house`. The vote `bill:office:US-VI:us-house:2025-12-15:official:seat:US-KS:us-house:02:25` (number 2025-026) records `yes=212 no=221` with `chamber=federal:us-house`, which is a full-House count (433 votes) under a one-seat office.

8. **Chairs from another chamber and other states.** Of the 33 committee records, 25 name `official:seat:US-LA:us-house:04` as chair and 8 name `official:seat:US-TX:us-senate:0`. A Senate seat chairs a House committee, and no `us-senate` office appears in the 8-office table. Senate officers exist only in the `chamber-organized` record dated January 20, 2025.

9. **Every hearing totals 11 votes.** All 21 `committee-hearing` records have yes plus no equal to 11. Examples: `bill:office:US-VI:us-house:2025-12-15:official:seat:US-MN:us-house:03:1` (5 to 6) and `bill:office:US-VI:us-house:2025-12-15:official:seat:US-KS:us-house:02:2` (11 to 0).

10. **Eight bills heard twice, by both chairs, on one day.** Each pair is on committee "general" dated December 15, 2025. Identical totals: `...:US-KS:us-house:02:2` (11/0 both), `...:US-KS:us-house:02:3` (11/0 both), `...:US-KS:us-house:02:6` (9/2 both), `...:US-MO:us-house:03:15` (6/5 both). Different totals: `...:US-KS:us-house:02:4` (LA 9/2, TX 10/1), `...:US-KS:us-house:02:5` (LA 8/3, TX 10/1), `...:US-MO:us-house:03:9` (LA 7/4, TX 8/3), `...:US-MO:us-house:03:18` (LA 6/5, TX 7/4). Full ids begin `bill:office:US-VI:us-house:2025-12-15:official:seat:`.

11. **All 12 held bills: LA chair, 0/0, never heard by the TX chair.** `bill-held-in-committee` ids: `...:US-FL:us-house:09:7`, `...:US-IL:us-house:10:8`, `...:US-IL:us-house:10:10`, `...:US-FL:us-house:09:11`, `...:US-IL:us-house:10:12`, `...:US-FL:us-house:09:13`, `...:US-FL:us-house:09:14`, `...:US-FL:us-house:09:16`, `...:US-FL:us-house:09:17`, `...:US-FL:us-house:09:19`, `...:US-MN:us-house:03:20`, `...:US-FL:us-house:09:21`. Each is a full id beginning `bill:office:US-VI:us-house:2025-12-15:official:seat:`.

12. **Vote counts do not match bill statuses.** The year has 26 bills, with 7 "enacted" and 19 "failed." There are 18 `legislative-vote` records, but only 14 bills (13 heard plus the budget bill) could reach a floor vote. The file does not show a status for the sample vote `bill:office:US-VI:us-house:2025-12-15:official:seat:US-KS:us-house:02:25`, so the 7 enacted bills cannot be traced to votes.

13. **Chamber-organized count and kind list disagree.** The year's kind list (line 5) gives `chamber-organized=1` and omits `inauguration` and `president.address`. The federal log section gives `chamber-organized=3`, `inauguration=1` and `president.address=1`. Three `chamber-organized` records are listed (two dated January 20, 2025, one dated December 15, 2025). The 13058 total matches only the line 5 kind counts.

14. **Growth with no births or deaths, plus housing on the sixth.** People went from 1585 at build to 1596 alive, with deaths 0, four `person.moved-away` records and no birth kind in the list. Organizations went from 117 to 125 while `business.closed=2` and `organization.closed=2`. Five `housing.completed` records fall on the sixth of each month (September 6, 2025; October 6, 2025; November 6, 2025; December 6, 2025; January 6, 2026), each `"kind":"single","units":"1","affordableUnits":"0"`.

15. **Business closure traced to the opening load.** `event:business.closed:organization_adf6b63efb636e8c` lists its source as `opening [core2-officials-v1.loaded]`, and the same organization's `employer-closed:2025-10-01:organization_adf6b63efb636e8c` shows `closure-source=owner-closed`. The earlier `business.closed` on June 1, 2025, for `organization_2482c522e15e81ef` has no trace in the file.

16. **Minimum wage without a territorial vote.** `law:US-VI:state:minimum-wage:general:2025-01-21:law:US-VI:state:us-policy-positions:labor-workforce.raise-minimum-wage:general:starting` took effect January 21, 2025, with value "1500" and unit "minor/hour." Its id is built from a federal policy position, and no territorial vote or legislature seat exists (item 1). Two `pay-raised-to-minimum-wage` records appear, but the file names neither.

17. **Territory income tax equals the federal top rate.** `law:US-VI:state:income-tax:general:2026-01-01` takes effect at 37 percent top rate on January 1, 2026. The federal `income-tax` news item is also 37 percent top rate, same date. The replaced law id is cut off in the file.

18. **Federal budget bill and policy items.** In `bill:office:US-VI:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:0` (number 2025-001), the provision `otherPrograms` is -111644096330, and all ten `authority` entries read `"allowed":true,"reason":"within-own-power","source":""`. The "sample state bill" section repeats this same record and id, so no state bill sample is shown. The budget line `budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-003#balance#2025-12-15` has `deltaMinor=-11083402556195`. Six federal news items dated December 15, 2025, each read value=1: `us-policy-positions:civil-family-community.restrict-abortion`, `us-policy-positions:environment-energy.clean-air-plan-for-polluted-counties`, `us-policy-positions:fiscal.fund-pensions-to-schedule`, `us-policy-positions:government-operations.ban-lobbying-after-office`, `us-policy-positions:fiscal.minimum-reserve-balance` and `us-policy-positions:fiscal.balanced-operating-budget`.

19. **Trace and format defects, plus player and person activity.** In the retold-speech trace, `event:speech:party-meeting:party:US-VI:republican:2026-01-15:retold:person_522f17a11b4bd0c7:experienced` is learned five times with identical content. The bill-vote trace loops between `job:office:seat:US-AK:us-house:00:official:seat:US-AK:us-house:00` and `official:seat:US-AK:us-house:00`. Party labels are inconsistent: `seat:US-VI:us-house:at-large` says "Democrat," its terms say "Democratic," and `term:seat:US-VI:governor:2025-01-20` and `term:seat:US-VI:board-of-elections:2025-01-20` carry no party. The governor, lieutenant governor, Board of Education and Board of Elections `vacancyRule` values are JSON strings, while federal rules are objects. The `core2-offices-v1.terms` header appears twice ("12 of 12" and "0 of 12"). `person.acted` is 12739 of 13058 records (97.6 percent) with no breakdown, and the player `person_571fe28560cf9f19` appears only in the header, so no pay or cash change is traced for the player's $17277.

## Counts

Records this year: 13058

- person.acted=12739
- news.read=139
- speech.retold=48
- speech.heard=22
- committee-hearing=21
- legislative-vote=18
- law-took-effect=15
- budget-line-changed=15
- bill-held-in-committee=12
- case.made=10

## Method

World seed `cc170e511472`, one year, January 20, 2025 to January 20, 2026, through the trace viewer.

## Verification

Every item above was checked against the code. The causes, and the items that turned out not to be defects, are in `README-TRACE-2.md`.

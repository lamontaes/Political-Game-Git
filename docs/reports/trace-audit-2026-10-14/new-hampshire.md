# New Hampshire: Bartlett, seed ac0d6ae13d8f

This is a trace audit of one game year in Bartlett, run in dev mode. The year shows the town board, the county, the state House and the federal government all acting, but several records need an explanation before the year can be trusted.

## The year

Bartlett's town board passed some of its own bills. The file shows 11 board bills enacted and 24 failed on one board record, and one more enacted on a second board record. Most of the enacted town bills did not show up as town laws. They took effect as county laws in county 33003: five on March 6, 2025, one on March 7, 2025 and three on April 5, 2025. One city-level law took effect on March 6, 2025.

Three Selectman contests ran on November 4, 2025. In the second board race the winner had 1,766 of 2,003 votes. The winner was also the council president chosen on February 4, 2025.

The state House met on June 30, 2025. It sent 54 bills to committee, and every one was held with no recorded votes. Its floor votes that day totaled 326 members each time. The file shows 9 state House bills enacted, 42 failed and 4 vetoed. The state budget was adopted on July 1, 2025 on a 178-148 House vote and a 16-8 Senate vote.

Eleven House seats were vacated during the year: 8 by moving away, 3 by death. One Senate seat was vacated by moving away. The file shows no special election for any of them.

Federal: the U.S. House seats for this state had 25 bills introduced on December 15, 2025. The file shows 7 enacted and 19 failed for that body. Congress adopted the federal budget on October 1, 2025. The top income-tax rate of 37 percent and the Social Security tax of 6.2 percent of wages took effect on January 1, 2026.

Ten business closures are recorded. The ones the file shows came in April, May and January 2026, and cite cash and credit exhaustion. The file records no deaths, but it records three deaths as causes of House seat vacancies.

The player, Alexander Wall, was alive at year end with no job and $0 cash.

## Local / State / Federal at a glance

- Local: works with gap: the town board voted and enacted bills, and the Selectman election ran; gap: the elections module lists 0 contests, two board office IDs are in use, and town enactments show up as county laws.
- State: works with gap: the House met, voted and enacted bills, and the budget was adopted; gap: 11 seats were vacated and no special election appears, and 54 bills were held with no votes.
- Federal: works with gap: the budget was adopted, bills were introduced and voted, and tax changes took effect; gap: a New York member sponsors a New Hampshire House bill, and the president sponsors a House bill.

## Needs a why

1. **Same vote pattern on every measure.** Every six-vote measure in the file has positions 1, -1, 1, -1, -1, 1 in that order, from February through June. Record: `vote-recorded {"measureId":"2025-001",...,"position":"1"}` and the later measures 2025-009, 2025-017 and 2025-022. Why does every measure split the same way?
2. **Board size changed.** The town board vote in February was 3 yes, 0 no. The vote in December was 3 yes, 4 no. Record: `legislative-vote {"chamber":"office:gus2025:130734:board","yes":"3","no":"0"}` and `legislative-vote {"chamber":"office:gus2025:193707:board",...,"yes":"3","no":"4"}`. Why do the board votes total 3 in February and 7 in December?
3. **Two board office IDs.** The Selectman contests and one enacted bill use `office:gus2025:130734:board`. Eleven enacted and 24 failed bills use `office:gus2025:193707:board`. Why does one town have two board offices?
4. **Two council presidents on one day.** Record: `chamber-organized {"council-president":"person_7d5f0e3bee2cde10"}` and `chamber-organized {"council-president":"person_4389ddda5515d9e0"}`, both on February 4, 2025. Why are there two council presidents on the same day?
5. **A federal official runs the town council.** Record: `chamber-organized {"council-president":"official:term:seat:US-NH:us-house:02:2025-01-20"}`, on December 15, 2025. Why does a U.S. House member hold the town council presidency?
6. **Lopsided second board race.** Winner `person_7d5f0e3bee2cde10` had 1766 of 2003 votes against 189 and 48. Record: `election-result:contest:seat:gus2025:130734:board:2`. Why was the margin 88 percent?
7. **Two candidates with one vote each.** Record: `election-result:contest:seat:gus2025:130734:board:0` with totals `"person_159e9a765e2e0826":1, "person_159e9b765e2e09d9":1`. Why did two candidates get exactly one vote each?
8. **No contests in the elections module.** The viewer shows `core2-elections-v1.contests: 0 of 26`, while three `election-result` records exist for November 4, 2025. Why does the elections module show no contests?
9. **Vacancies with no contests.** Twelve seats were vacated under the `special-election` rule, for example `seat:US-NH:lower:411:0` on May 1, 2025. Only the three local Selectman elections appear. Why was no special election held for any of them?
10. **Deaths count says zero.** The file says `deaths: 0`, but three House seats were vacated by death: `seat:US-NH:lower:513:0` on July 2, 2025, `seat:US-NH:lower:105:0` on October 23, 2025, and `seat:US-NH:lower:502:6` on December 29, 2025. Why does the deaths count say 0?
11. **Vote totals always 326.** Each House vote on June 30, 2025 totals 326 (for example `"yes":"203","no":"123"`). That equals 331 seats minus the five vacancies that occurred before that date. Why are those five seats never filled?
12. **Every state bill introduced on one day.** The file shows 54 House bills introduced on June 30, 2025 (`office:US-NH:legislature-lower 2025-06-30: 54`). Why were all 54 introduced on the same day?
13. **Holds with no votes and one chair.** All 54 `bill-held-in-committee` records show `"yes":"0","no":"0"` and the chair `official:term:seat:US-NH:lower:716:3`. Why does one chair hold every bill with no votes?
14. **Budget vote matches other bills.** Record: `"adoptedBy":"the legislature vote 178-148, 16-8, 2025-055"`. The same 178-148 total appears on measures 2025-012 and 2025-013, and measure 2025-055 is not among the House measures in the file. Why does the budget vote reuse another bill's count?
15. **Enacted town bills became county laws.** The board shows 11 enacted bills, but the laws that took effect are at county 33003, for example `law:county:33003:county:us-policy-positions:justice-public-safety.civilian-oversight-of-police:general:...:2025-004`. Why did the town board's enacted bills become county laws?
16. **Laws clustered on three dates.** Eight county laws take effect on March 6, 2025 and April 5, 2025, and the minimum wage on March 7, 2025. Why do they all take effect on the same days?
17. **Sponsor from another state.** Record: `bill:office:US-NH:us-house:...:official:seat:US-NY:us-house:03:114`. A New York member sponsors a New Hampshire House bill, and its chair is `official:seat:US-TX:us-house:19`. Why does a New York member sponsor a New Hampshire bill?
18. **President sponsors a House bill.** Record: `"sponsorId":"official:term:seat:US:president:2025-01-20"` on `bill:office:US-NH:us-house:...:87`, with status enacted. Why does the president sponsor a House bill?
19. **Unit of a federal budget change.** Record: `budget-line-changed ... line=veterans deltaMinor=-11084427153837`. Why is one veterans line change this size, and in what unit is it measured?
20. **Trace reasons repeat and one is a field name.** Each trace repeats `learned:core.observe.perceived` five to seven times with the same value. The vote trace gives its reason as `{"key":"billId","learnedAt":"2025-12-31","access":"perceived"}`. Why is the same reason listed many times, and why is a field name the reason for a vote?
21. **Property tax replaced on its first day.** Record: `law:county:33003:county:property-tax:general:...:2026-01-01` with `replacesLawId=...:2026-01-01:from-start`. The file has no vote or notice for it. Why was the law replaced on the day it took effect, and what caused it?
22. **Same vote share every time.** Every upper-chamber winner from 2012 through 2022 has `"share":0.635`. Record: `term:seat:US-NH:upper:001:0:2025-01-20:past:6`. Why is every election share exactly 0.635?
23. **Closures trace to the opening payroll.** Ten business closures cite `finance.unfunded-obligation-cash-and-credit-exhausted`. The January 11, 2026 closure traces to an `opening` load record. Why does a closure trace back to the opening payroll load?
24. **Population may be off.** The year line reads `people 2152 alive 2146`. Why does the modeled count for Bartlett differ from the place's census figure?
25. **Player with no income.** Record: `player: alive=true job=none cash=$0`. Why does the player have no job and no cash after a full year?
26. **Unregistered tables.** The file names missing tables for vacancies, contests, filings, campaigns, executive offices and terms, governments and budgets. Why do these tables not exist?

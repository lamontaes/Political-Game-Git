# Northern Mariana Islands: Susupe, seed e239259b8609

This one-year run of Susupe shows a federal government that acted and a territory that mostly did not. The town has no local government in the file, the Commonwealth legislature has no seats, and no election was held. The items below need an explanation before the run can be trusted.

## The year

In 2025 the federal government did most of the visible work in Susupe. Congress adopted the fiscal 2025 budget on October 1, 2025, by a 256-177 House vote and a 60-40 Senate vote, after seven budget lines were dropped in amendment. The territory's own budget was never voted. It was carried forward by the budget rule.

Tax law changed on January 1, 2026. The federal top income-tax rate of 37 percent and the Social Security tax of 6.2 percent took effect. The same day, the territory's state law recorded a 37 percent top income-tax rate that replaced an earlier law. A 0 percent sales tax was recorded as new, replacing another earlier law.

Executive seats are filled. James Cox is governor, George Sinclair is lieutenant governor, Sheila Holloway is attorney general, and Jonathan Powers is on the board of education. Jacqueline Sharp holds the territory's federal House seat. On December 15, 2025, she is recorded as council president of the territory's House body. That body had 25 bills introduced on December 15, 2025. Its general committee held 23 hearings that day, and 12 bills were held with no vote. Five bills were enacted and 21 failed.

No election was held. The offices next face voters in 2026, and no contest was opened. No mayor, council or local budget appears in the file. The Commonwealth legislature has no seats.

Town life moved slowly. One child was born on January 13, 2026. No one died. Six people are recorded as moved away. Two businesses closed, both with the reason "losses-kept": one on June 1, 2025, and one on October 1, 2025. Five single-family houses were completed, one unit each, none affordable.

The player, Jasmine Jimenez, is alive. Her job is server, her cash is $1,343, and her household is household_94378797697176c3. The file records no act, filing, vote or meeting that names her.

## Local / State / Federal at a glance

- Local: doesn't. No mayor, council, local budget or local election appears. The only council-president record is the federal delegate.
- State: works with gap: executive seats are filled and two state tax laws took effect, but the Commonwealth legislature has zero seats and no votes, the territory budget was carried forward unvoted, and no executive act or election is recorded.
- Federal: works with gap: Congress adopted the 2025 budget and held 22 House votes, but the territory's bills have sponsors and chairs from other states' seats, and 21 of 26 bills failed.

## Needs a why

1. Zero deaths and one birth among about 1,630 people in a year. Record: `deaths: 0`; `2026-01-13 person-birth {"childId":"person_d29e230461f305d4"...}`. Why no deaths and only one birth? Also, `people 1634 alive 1630` with no death record: why are four people not alive?
2. Population. Build line: `people 1627`. Year line: `people 1634`. Why did seven people appear with only one birth? Does 1,627 match the real Susupe count (2020 Census or the latest estimate)? Why this figure?
3. Businesses. `orgs 115` at build, `orgs 123` at year end, with two closures (`organization.closed 2025-06-01`, `organization.closed 2025-10-01`). Why did organizations rise by eight? What happened to the workers of the two closed businesses? The October 1 trace lists 12 people.
4. Housing dates. `2025-09-06`, `2025-10-06`, `2025-11-06`, `2025-12-06` and `2026-01-06` are all `housing.completed`, each with units=1 and affordableUnits=0. Why does every completion fall on the sixth of the month, and why none affordable?
5. Shared dates. Many events fall on `2025-10-01` (budget-adopted x2, business.closed, bill 2025-001) and `2025-12-15` (chamber-organized, 23 committee-hearing, 12 bill-held-in-committee, 25 bills, four policy positions). Why do these clusters fall on the first of the month and on one mid-December day?
6. Territory budget. `2025-10-01 budget-adopted {"governmentId":"US-MP"..."adoptedBy":"carried forward by the budget rule until the council or legislature votes it"}`. Why did no body vote on a territory budget in the whole year?
7. Legislature seats. `office:US-MP:legislature-upper` seats 0; `office:US-MP:legislature-lower` seats 0. `chamber-organized` appears only for the federal chambers and the delegate's council-president record. Why does the Commonwealth legislature have no seats and no sessions?
8. Council president. `2025-12-15 chamber-organized {"council-president":"official:term:seat:US-MP:us-house:at-large:2025-01-20"}`. Why does a federal delegate hold a council presidency, and which council is this?
9. Out-of-state sponsors. `bill:office:US-MP:us-house:2025-12-15:official:seat:US-IN:us-house:09:1` and similar bills are sponsored from seats in IN, FL, CA, OH, AL, VA, WA, MD, GA and OR. Why do a territory's House bills carry sponsors from other states?
10. Out-of-state chairs. Every hearing record names chair `official:seat:US-FL:us-house:27` or `official:seat:US-WV:us-senate:0` in committee "general". Why do two members from other states chair this territory's committee on every bill?
11. Repeated 6-5 tallies. Twelve hearings show yes 6, no 5, on bill ids ending `:09:2`, `:09:7`, `:GA:us-senate:0:8`, `:09:9`, `:09:10`, `:09:11`, `:09:14` and `:09:17`. Why does the same split appear on so many different bills?
12. Held bills with no vote. Twelve `bill-held-in-committee` records show yes 0, no 0, for example `bill:office:US-MP:us-house:2025-12-15:official:seat:US-MD:us-house:07:25`. Why were these held on the same day that other bills in the same committee got votes?
13. Federal vote and traces. `bill-vote:...:09:17:federal:us-house` shows yes 210, no 223 for a territory bill (number 2025-018). Why was a territory House bill voted in the national House, and did the delegate vote? The trace for that vote also loops between `official:seat:US-AK:us-house:00` and its job record, and lists 48 personIds. The speech traces repeat one learned key three to twelve times. Why?
14. Enacted bills. The file counts five enacted bills in the territory's body but prints only one (budget 2025-001). Which five became law, and what did each change in this territory?
15. Sample bill. Bill `...:official:term:seat:US:president:2025-01-20:0` (number 2025-001) is sponsored by the President, enacted, and carries "otherPrograms" at -93357739752. Why is a national budget bill in the territory's House body? The "sample state bill" line is the same record. Why is there no separate state bill?
16. Veterans line. `budget-line-changed:budget:US:2025:veterans... deltaMinor=-11083951177050` is placed on the territory's place record (`jurisdiction_b3de6b943b33eaf3`). Why does a national veterans change land on the territory, and what unit is "minor" here?
17. Policy positions. Four `us-policy-positions` records dated December 15, 2025, each show value 1 (ban-lobbying-after-office, fund-pensions-to-schedule, minimum-reserve-balance, balanced-operating-budget). Why all value 1, and what do they change for people here?
18. Tax laws. `law:US-MP:state:income-tax:general:2026-01-01` at 37 percent replaces `...:from-start`. `law:US-MP:state:sales-tax:general:2026-01-01` is 0 percent, marked `change=new`, and replaces `...:from-start`. Why does a new 0 percent sales tax replace a from-start law, and why does the territory's top income rate match the federal 37 percent on the same day?
19. Medicaid. `FED 2025-10-01 medicaid-match value=83 percent`. Why 83 percent for this territory?
20. Missing contests. `core2-elections-v1.contests: 0 of 5`, while five offices (governor, lieutenant governor, attorney general, board of education and the delegate seat) show nextElectionYear 2026. Why was no contest opened for the 2026 cycle?
21. Unregistered tables. Nine tables print "Unregistered module table": core2-elections-v1 vacancies, core2-voting-v1 contests, filings and campaigns, core2-executive-v1 offices and terms, and core2-legislature-v1 governments and budgets. Why can the viewer not see filings, campaigns, executive acts or territorial budgets?
22. Terms table counts. `## core2-offices-v1.terms: 17 of 17` (line 187) and later `## core2-offices-v1.terms: 0 of 17` (line 206). Which is right, and why would the same table report both?
23. Attorney general. Title "Attorney General (elected since 2014)", but the current term starts January 1, 2023, with no earlier term record. Why does the title say 2014?
24. Volume. 17,052 of 17,337 records are `person.acted` for about 1,630 people. Why are there about ten acts per person in a year, and which acts are these?
25. Player. The player record shows alive, Server, $1,343. No record names the player in a case, filing, meeting, vote or news item. Why did the player do nothing the file shows in a full year?

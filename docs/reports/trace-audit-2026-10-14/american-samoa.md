# American Samoa: Tafuna, seed 2dfdf07a2bc5

This is one simulated year in Tafuna. The federal government did most of the visible work, the territory's own government shows almost nothing, and there is no local government at all.

## The year

Tafuna had one game year, from January 20, 2025 to January 20, 2026. Most of the visible action was federal. Congress adopted the federal budget on October 1, 2025 by a 261-172 House vote and a 69-31 Senate vote. Of 26 bills in the territory's U.S. House body, three were enacted, 19 failed and four were vetoed. Twenty-five of them were introduced on December 15, 2025. On January 1, 2026 a 37 percent federal top income tax rate and a 6.2 percent Social Security tax took effect.

The territory's own government shows little. Kimberly Reyes is governor and Kelly Watson is lieutenant governor, both taking office on January 1, 2025. No governor's act appears in the file. The territorial legislature has zero seats in the file. The 2025 territorial budget was never voted; it was carried forward. Even so, a state income tax with a 39.6 percent top rate and a 0 percent sales tax took effect on January 1, 2026. A state pension budget line rose by 347,970,000 on October 20, 2025.

No town, county or local government appears. No local election was held, and the election tables are empty or unregistered.

Two businesses closed, on July 1, 2025 and November 1, 2025, both recorded as losses-kept. Five single-unit homes were completed, none affordable. Seven people moved away. One person died on August 17, 2025 of diabetes. The town ends the year with 1,731 living people.

The player, Diego Marquez, is alive. He works as a housekeeper, has $15,803 in cash and lives in household_0e584590702c4c5b.

## Local / State / Federal at a glance

- Local: doesn't. No town, county or council office, body, budget or election appears in the file.
- State: doesn't. The legislature has zero seats and no state bill or vote appears, and the state budget was only carried forward. The governor and lieutenant governor are seated, and state tax laws and a budget line still changed.
- Federal: works with gap: the budget was adopted and bills were voted, but the bills sit in a territorial body with sponsors and chairs from other states, and nearly all federal activity falls on one date.

## Needs a why

1. **Zero territorial legislature seats.** Both chambers show no seats: `office:US-AS:legislature-upper` and `office:US-AS:legislature-lower` each have `"seats":0`. Why does the Fono have no members when state tax laws and a state budget line changed this year?
2. **State tax laws with no enacting body.** `law:US-AS:state:income-tax:general:2026-01-01` (value 39.6, replaced) and `law:US-AS:state:sales-tax:general:2026-01-01` (value 0, new) both took effect January 1, 2026. Which body or official enacted each, and why is the state top rate above the federal 37 percent?
3. **State budget line moved without a budget vote.** `budget-line-changed` on October 20, 2025, governmentId US-AS, line retirementContributions, deltaMinor 347970000, measureId `law:US-AS:state:us-policy-positions:fiscal.fund-pensions-to-schedule:general:starting#2025-10-20`. Why did a line move when the same year's record says the budget was only carried forward?
4. **Budget logged as adopted by carry-forward.** `budget-adopted` on October 1, 2025, governmentId US-AS, `"adoptedBy":"carried forward by the budget rule until the council or legislature votes it"`. Why is a budget with no vote logged as adopted?
5. **Federal Delegate as council president.** `chamber-organized` on December 15, 2025, `{"council-president":"official:term:seat:US-AS:us-house:at-large:2025-01-20"}`. Why is the federal Delegate the council president when the file has no council seats?
6. **No local government, and unregistered tables.** The offices table is "7 of 7" and holds only federal and territorial offices. Unregistered: `core2-legislature-v1.governments`, `core2-legislature-v1.budgets`, `core2-elections-v1.vacancies`, `core2-voting-v1.contests`, `core2-voting-v1.filings`, `core2-voting-v1.campaigns`. Why are there no mayor, council, county, local budget or local election records for Tafuna?
7. **No executive acts.** `term:seat:US-AS:governor:2025-01-20` starts January 1, 2025, yet `core2-executive-v1.offices` and `core2-executive-v1.terms` are "Unregistered module table". Why does the governor record no order, veto, appointment or budget act in the year?
8. **Contest count with no contests, and conflicting term counts.** "core2-elections-v1.contests: 0 of 3" lists no rows. "core2-offices-v1.terms: 8 of 8" is followed later by "core2-offices-v1.terms: 0 of 8". Why are three contests counted and none shown, and why does one table give two counts?
9. **Identical vote shares across cycles.** `term:seat:US-AS:us-house:at-large:2025-01-20:past:2` (elected November 3, 2020, share 0.64), `...:past:1` (elected November 8, 2022, share 0.64) and the current term (elected November 5, 2024, share 0.64). The governor and lieutenant governor both show 0.56 in 2020 and 2024. Why does each share repeat exactly?
10. **No party for territorial executives.** The governor and lieutenant governor terms have no party field, while every federal seat is "Republican". Why does the territory's executive have no party?
11. **Bills sponsored and chaired from other states.** Bills in `office:US-AS:us-house` have sponsors such as `official:seat:US-WY:us-senate:1` (bill `...:2025-12-15:official:seat:US-WY:us-senate:1:1`), and US-NY, US-MN, US-AZ and US-WV seats. Committee "general" is chaired by `official:seat:US-TN:us-house:03` and `official:seat:US-LA:us-senate:1`, both. Why do members of other states sponsor and chair a territorial delegate's body, and why are there two chairs?
12. **Same committee tallies repeat.** 6-5 for bills `...:US-WY:us-senate:1:8`, `:9`, `:14`, `:20` and `:21`; 11-0 for `...:US-NY:us-house:15:2` and `:4`, all on December 15, 2025. Why do the same tallies recur on different bills?
13. **Thirteen bills held with no vote.** `bill-held-in-committee` on December 15, 2025, e.g. `bill:office:US-AS:us-house:2025-12-15:official:seat:US-AZ:us-senate:0:25`, shows `"yes":"0","no":"0"`. Why did a committee hold 13 bills without a vote, and who asked for the hold?
14. **One day holds the year's federal action.** Introductions (25), committee hearings (20), holds (13), the chamber organization and the Senate vote all fall on December 15, 2025. Why is nothing recorded on any other date from October 1 to December 15, 2025?
15. **Vetoes with no pass.** Bills by status: vetoed 4, but the file shows no floor pass for any of them. Who vetoed them, and what passed first?
16. **Senate vote on a House bill.** `bill-vote:bill:office:US-AS:us-house:2025-12-15:official:seat:US-WY:us-senate:1:9` records "chamber=federal:us-senate yes=53 no=47" on a bill whose body is `office:US-AS:us-house`. Why did the Senate vote on it, and why does the trace give no reason for any single senator's vote?
17. **Trace defects.** The same bill-vote trace loops `official:seat:US-AK:us-senate:0` to `job:...` and back. The life.death trace repeats one `learned:core.observe.perceived` key about eight times. The sales-tax law trace shows no person who learned of it. Why do these traces stop at a loop or repeat, and who learned of the 0 percent sales tax?
18. **Unit and size of a veterans cut.** `budget:US:2025:veterans:...:2025-12-15:2025-002#balance#2025-12-15` has deltaMinor -11084425448201. The sample bill 2025-001 has otherPrograms -77548963239. Is deltaMinor in cents or dollars, and why is one veterans line cut by this amount?
19. **Medicaid match for a territory.** "FED 2025-10-01 medicaid-match value=83 percent". Why does a U.S. territory get an 83 percent state-style match here, and which rule produced it?
20. **Positions with no unit.** "FED 2025-12-15 us-policy-positions:civil-family-community.restrict-abortion value=1" and "fiscal.balanced-operating-budget value=1", both with a blank unit. What does value 1 mean, and what did a resident of Tafuna see or pay because of the abortion position?
21. **One death in a year.** "life.death=1" and "deaths: 1" among 1,733 people; `person_54329af40283b002` died August 17, 2025. Why one death, and is 1,728 the right population for Tafuna against its census count?
22. **Seven moved away, no reason shown.** "person.moved-away=7"; the one trace is `person.moved-away:person_c5c33fd35d6169b4:2025-03-01` with residence=jurisdiction_ae6ce74aba911cf7. Why did seven people leave, and why is residence a jurisdiction id rather than a place?
23. **Owner change and closures with no figures.** `organization.owner-changed` on March 1, 2025 has an empty payload `{}`. Businesses `organization_617250401b22e8f7` (July 1, 2025) and `organization_d4f6e46751c996b5` (November 1, 2025) closed "losses-kept" with no loss figure, and the trace stops at "opening". Which owner changed, what were the losses, and why does the trace stop at the opening record?
24. **Housing completed on the sixth.** `housing.completed` on September 6, October 6, November 6 and December 6, 2025, and January 6, 2026, each kind single, units 1, affordableUnits 0. Why the same day every month, and why no affordable unit in the year?

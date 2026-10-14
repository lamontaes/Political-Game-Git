# District of Columbia: one year traced

This reader followed one generated year in Washington, D.C. The council and the U.S. House bills mostly failed or were held, and the player ended the year working as a cook with $2859.

- Town: Washington, District of Columbia (place 1150000).
- Seed: b4bfbf9faa9e.
- Start date: January 20, 2025. Build took 44 seconds.
- People: 1630 at build (the alive count at start is not in the file). 1658 at year end, 1655 alive.
- Organizations: 115 at build, 126 at year end.
- Year runtime: 49 seconds, heap 1249 MB.
- Player: Shannon Reese (`person_2f58906223220c84`), born January 23, 2007, so 17 on the start date.

## The year in this place

On June 30, 2025, the council (12 seats, unicameral) introduced 39 bills. It held 9 in committee with a 0-0 tally and took 18 to a floor vote. Floor tallies were 12-0 for 004 and 005, 10-2 for 006, 009, 010, 012, 013, 015, 017 and 024, 11-1 for 007, 008, 011 and 016, 9-3 for 014 and 019, 7-5 for 022, and 6-6 for 020.
Every council committee event that day named the same chair, `official:term:seat:US-DC:unicameral:007:0:2025-01-20`.
On July 1, 2025, the minimum-wage law took effect at 1795 minor per hour, replacing a law dated July 1, 2024 that is not in the file. One organization also closed that day for losses.
On September 29, 2025, fourteen state policy laws took effect (bills 004, 005, 006, 007, 008, 009, 011, 012, 014, 015, 016, 017, 019 and 022).
The same day, a retirement-contributions budget line changed by -4915750000 under a measure ending in "#undo". That undid the pension law, bill 019.
On October 1, 2025, three budget-adopted records were written. The U.S. record cites a Congress vote of 260-173 and 61-39 on bill 2025-001. The D.C. record cites a legislature vote of 12-0 on bill 2025-040. The place record was "carried forward by the budget rule" with no vote.
Six organizations closed in the year. Four closed for running out of cash and credit (April 19, May 31, October 15 and October 23, 2025). Two closed for losses (July 1 and December 1, 2025).
On October 21, 2025, one housing eviction was recorded with an empty payload. Its id is dated September 6, 2025.
The mayor appointed a public-works official on February 19, 2025, and a planning official on November 16, 2025. The dump also lists two appointments dated January 20, 2025 that have no records.
On December 15, 2025, 23 U.S. House bills were introduced under the D.C. House office. Three were enacted and 21 failed. The same day, chamber organization recorded a U.S. House member as council president.
Federal laws dated December 15, 2025 include two policy items with value 1, restrict-abortion and balanced-operating-budget.
Federal laws dated January 1, 2026 set the income tax top rate at 37 percent and the social security tax at 6.2 percent of wages.
On January 1, 2026, a county property-tax law took effect at 0.585 percent of home value.
On January 17, 2026, a candidate filed for At-Large seat 1 with the D.C. Board of Elections for the November 3, 2026 contest. The file has no contest row for it.
At year end the player is alive, works as a cook, has $2859 in cash, and lives in `household_6afbd3cc70d3f810`. Seven people moved away, and one move is traced (February 1, 2025). Deaths: 0. The file shows no births.

## Needs a why

1. Deaths are 0 in the records, yet 1655 of 1658 people are alive at year end, so three are not alive with no death record. People rose from 1630 at build to 1658 with no birth kind in the records. `person.moved-away=7` is the only exit kind shown.
2. The election-ish line reads only `official-appointed=2`. The records also hold `candidate-filed=1` (`filing:contest:seat:US-DC:unicameral:At-Large:1:2026-11-03:person_a7779ea43a35c1f0`, January 17, 2026), and that is missing from the line. No seat-vacated record is in the file.
3. Records and the federal-and-state log disagree. `law-took-effect` is 27 in records and 25 in the log. `budget-line-changed` is 16 vs 17. `official-appointed` is 2 vs 4, the two January 20, 2025 appointments appearing only in the dump. `budget-adopted` is 3 vs 2, the place record appearing only in records. `chamber-organized` is 1 vs 4, the three January 20, 2025 rows appearing only in the dump. The log also shows `inauguration=1` and `president.address=1`, which are not in the records kinds.
4. `bill-held-in-committee` is 28 in records, but the file shows 21 such lines: 9 council on June 30, 2025 and 12 U.S. House on December 15, 2025. The 23 U.S. House bills of December 15, 2025 are numbered 41 to 63. The record lines show 41 to 56, and the trace shows 63. Bills 57 to 62 are not in the file.
5. Nine council bills were held in committee with yes 0 and no 0, all on June 30, 2025, all with the same chair. The ids are `bill:office:US-DC:legislature-unicameral:2025-06-30:official:term:seat:US-DC:unicameral:` followed by `004:0:2025-01-20:25`, `004:0:2025-01-20:34`, `At-Large:1:2025-01-20:35`, `At-Large:0:2025-01-20:36`, `At-Large:0:2025-01-20:37`, `At-Large:1:2025-01-20:38`, `At-Large:0:2025-01-20:2` and `At-Large:0:2025-01-20:1`. None of the nine lines carries a measure number.
6. One chair for every council committee: all 30 council committee hearings and all 9 held bills name `official:term:seat:US-DC:unicameral:007:0:2025-01-20`, the same person named speaker in `chamber-organized` on January 20, 2025.
7. Constant election shares: every statewide elected term has share 0.56 (mayor in 2014, 2018 and 2022; attorney general in 2018 and 2022; council chair in 2018 and 2022). Every council term has share 0.635. Examples are `term:seat:US-DC:unicameral:002:0` in 2014, 2018 and 2022, `At-Large:3` in 2018, and `007:0` in 2008, 2012, 2016, 2020 and 2024.
8. Every statewide seat with a party is Democratic: mayor, attorney general and council chair. The state board of education president has no party field. On the council, 10 seats are Democratic and 2 are Independent (At-Large:2 and At-Large:3).
9. Three council bills passed 10-2 with no law line: 010, 013 and 024. Bill 020 tied 6-6 and has no law line either. The file does not say which bills were vetoed (3) or which enacted bill (15 enacted) took no law, since only 14 policy laws took effect.
10. Bill status shares: state bills show 15 enacted, 22 failed and 3 vetoed out of 40, so 55 percent failed. U.S. House bills in the D.C. office show 3 enacted and 21 failed out of 24, so 88 percent failed.
11. One date for many things: all 14 state policy laws took effect on September 29, 2025. All 39 council bills were introduced on June 30, 2025. All 3 budget-adopted records are dated October 1, 2025. All 23 U.S. House bills are dated December 15, 2025 and share one chair on most events, `official:seat:US-PA:us-house:16`.
12. Federal policy items with value 1: `us-policy-positions:civil-family-community.restrict-abortion` and `us-policy-positions:fiscal.balanced-operating-budget`, both December 15, 2025. The same `us-policy-positions` series also appear as D.C. state laws.
13. Large money values, in the units the file gives: the veterans budget line on December 15, 2025 has `deltaMinor=-11084876196763`. The pension undo on September 29, 2025 is -4915750000. The sample U.S. House bill 2025-001 has provisions of 5053976881 (agriculture), 14935681874 (transportation) and -62523738179 (otherPrograms). The file does not define "minor" for budget lines. Player cash is $2859.
14. Odd sponsor: `bill:office:US-DC:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:39` (number 2025-001) is sponsored by the president, filed under the D.C. House office, and marked enacted by the October 1 Congress vote. The file does not say how a D.C. House office carries a federal budget bill.
15. Out-of-state House bills under the D.C. office: `bill:office:US-DC:us-house:2025-12-15:official:seat:US-FL:us-house:25:41` (held, 0-0), `...:official:seat:US-KY:us-house:01:42` (committee 11-0), `...:official:seat:US-NC:us-house:01:63` (held, 0-0, traced) and `...:official:seat:US-WA:us-house:07:44` (held, 0-0). Sponsor seats are in FL, KY, NC and WA, not D.C.
16. One bill, two chairs, same day: the committee hearing on `bill:office:US-DC:us-house:2025-12-15:official:seat:US-KY:us-house:01:42` names `official:seat:US-PA:us-house:16` as chair, then names `official:seat:US-OH:us-senate:0` as a separate record. The same split appears for bills 50 and 51. A U.S. Senate seat chairs House bills.
17. Bill number collision: measure 2025-012 is the council's independent-redistricting bill (10-2 on June 30, 2025). The trace `bill-vote:bill:office:US-DC:us-house:2025-12-15:official:seat:US-KY:us-house:01:51` also carries 2025-012, with chamber `federal:us-senate` and a 53-47 vote. Its chamber format differs from the council's `office:US-DC:legislature-unicameral`.
18. The Senate-vote trace stops at `official:seat:US-AK:us-senate:0` through `core.log.personIds.0`. It does not explain the 53-47 result or how a D.C. House bill reached the Senate.
19. Attorney general, council chair and state board of education president have no recorded act in the year. Their vacancy rules are marked estimate true, citing a generic rule "not verified per office".
20. The council shows sittings only on June 30 and October 1, 2025. The president and vice president show only inauguration-type log kinds (`inauguration=1`, `president.address=1`), none in records.
21. The mayor has two appointments in records (February 19 and November 16, 2025) and two in the dump (January 20, 2025). The mayor's vacancy rule is stored as an escaped JSON string, while other offices store it as an object.
22. Seats and terms: the seats table reads "18 of 19", and no seat row exists for `office:US-DC:us-house`. `chamber-organized` on December 15, 2025 uses `seat:US-DC:us-house:98`, which is not in the seats table. The terms section reads "33 of 38" and then "0 of 38".
23. Term end years disagree with election years. `seat:US-DC:unicameral:004:0` has electionYear 2026, but its current term ends January 1, 2027. The same happens for At-Large:0 and for the mayor (nextElectionYear 2026, term end January 1, 2027). Every term has endEstimated true.
24. Contests: "core2-elections-v1.contests: 0 of 11". The candidate filing for `contest:seat:US-DC:unicameral:At-Large:1:2026-11-03` points to a contest with no row.
25. Eight dumps read "Unregistered module table": `core2-elections-v1.vacancies`, `core2-voting-v1.contests`, `core2-voting-v1.filings`, `core2-voting-v1.campaigns`, `core2-executive-v1.offices`, `core2-executive-v1.terms`, `core2-legislature-v1.governments` and `core2-legislature-v1.budgets`. The budget-adopted trace cites `core2-budgets-v1.governments`, a module name the dump does not show as registered.
26. Budget adopted with no vote: place 1150000 is "carried forward by the budget rule until the council or legislature votes it", yet it is counted as budget-adopted. The trace runs to the region and stops there.
27. The D.C. budget-adopted line cites "the legislature vote 12-0, 2025-040". The file does not show bill 2025-040 among the sample bills.
28. Organizations rose from 115 to 126, with six closures and no opening records in the file. That leaves 11 organizations unexplained.
29. Business closed December 1, 2025 (`organization_13b073a93d99712c`, losses-kept): the trace chain goes to an "opening" entry from `core2-officials-v1.loaded` and stops there. Business closed July 1, 2025 (`organization_b4d7ef60b57a9d1e`, owner-closed, losses-kept) has no trace.
30. The housing eviction is dated October 21, 2025, but its id is dated September 6, 2025, and its payload is `{}`. The trace chain stops at a perceiving person.
31. Traces that stop at one step or explain nothing: the speech trace (one perceived observer); the county property-tax law of January 1, 2026 (law record only); the committee trace for bill 063 (bill, office and chair only); the Senate-vote trace (one senator); the veterans budget-line trace (place only, the law measure not followed); the employer-closed trace (perceiving person only); the planning appointment trace (witness is a newspaper owner, no reason); the vote-recorded trace for 2025-024 (member only); and the moved-away trace (observer only).
32. Laws that took effect and then ended: law 2025-014 (minimum reserve balance) took effect September 29, 2025 with value 0, and its change field is cut off in the file at "ende". Law 2025-019 (pensions) took effect the same day with value 0, and its budget effect was undone that day.
33. Federal news: the count shows 243 news items and 29 FED items, but the file shows 6 FED lines. The other 23 and any local news lines are not in the file.
34. `person.acted=3195` records appear, with no detail for any of them in the file.
35. Player pay: no wage, job start or cash-change record is in the file. Cash is $2859 at year end, with no starting value.
36. The county property-tax law of January 1, 2026 is traced, but the file does not show whether it is in the `law-took-effect` count.
37. The candidate filed January 17, 2026 is `person_a7779ea43a35c1f0`, not the player (`person_2f58906223220c84`).

## Raw facts for the report

- Bills by body and introduction date (64 bills):
  - `office:US-DC:legislature-unicameral` on 2025-06-30: 39
  - `office:US-DC:legislature-unicameral` on 2025-10-01: 1
  - `office:US-DC:us-house` on 2025-10-01: 1
  - `office:US-DC:us-house` on 2025-12-15: 23
- Bills by body and status:
  - `office:US-DC:legislature-unicameral` enacted: 15
  - `office:US-DC:legislature-unicameral` failed: 22
  - `office:US-DC:legislature-unicameral` vetoed: 3
  - `office:US-DC:us-house` enacted: 3
  - `office:US-DC:us-house` failed: 21
- Budget-adopted lines:
  - 2025-10-01, governmentId US, fiscalYear 2025, adoptedBy "Congress vote 260-173, 61-39 (amended: nationalDefense, communityAndRegionalDevelopment, incomeSecurity, internationalAffairs, medicare, education, health dropped), 2025-001"
  - 2025-10-01, governmentId US-DC, fiscalYear 2025, adoptedBy "the legislature vote 12-0, 2025-040"
  - 2025-10-01, governmentId place:1150000, fiscalYear 2025, adoptedBy "carried forward by the budget rule until the council or legislature votes it"
- Seat-vacated lines: not in the file.
- Federal law lines (FED):
  - 2026-01-01 income-tax value=37 percent-top-rate
  - 2026-01-01 social-security-tax value=6.2 percent-of-wages
  - 2025-12-15 us-policy-positions:civil-family-community.restrict-abortion value=1
  - 2025-12-15 us-policy-positions:fiscal.balanced-operating-budget value=1
  - 2025-10-01 medicaid-match value=70 percent
  - 2025-10-01 snap-maximum value=298 USD/month
- Candidate filing: January 17, 2026, filingId `filing:contest:seat:US-DC:unicameral:At-Large:1:2026-11-03:person_a7779ea43a35c1f0`, office Legislator, election date November 3, 2026, filed with the District of Columbia Board of Elections.

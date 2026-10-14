# State lawmakers lose their seats to false moves, and nobody sees a neighbor die

**The owner's call:** one federal vote on December 15 cut every federal program except interest by the same share, and one retiree's Social Security payment by 29 percent (defect 5). Should one vote be able to do that? Twelve places ran for one game year each: ten states, Washington, D.C., and Puerto Rico. Local bodies changed local law in 10 of them, and state and federal laws reached people's payments. Four more defects break what the owner will play. 35 officials lost their seats to moves the game cannot place. Deaths in town leave no record. Each legislature does its year in one day. Six of twelve players end their first adult year with no job and $0.

## How each level did

Grades: **works**, **works with a gap** (the gap named), or **doesn't**.

| Level                          | Grade            | What the twelve worlds show                                                                                                                                                                                                                                                                                                    |
| ------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Town council and county board  | works with a gap | They voted and their laws took effect in 10 of 12 places. Alaska's town (Flat) and D.C. have no local body in the data. Every member votes from one left-right lean, so tallies repeat: 4-3 on all five Alabama county board bills of February 4, 2025, and 5-0 on all eight Arizona council bills.                            |
| Local elections                | works with a gap | One town of twelve held a local race in the year. Puerto Rico elected its 14 municipal legislators and its mayor on November 4, 2025, not in its real presidential-year cycle. Two of the 14 seats ended with no candidate and no winner.                                                                                      |
| State legislature              | works with a gap | Every state adopted a budget and enacted some laws. Each legislature drafts, hears and votes its whole year's bills on one day, in the lower chamber only. Of about 52 bills per state, 20 to 45 end "held in committee" with no vote counted.                                                                                 |
| Governor and statewide offices | doesn't          | No governor, attorney general, treasurer or other statewide officer acts in the year except through vetoes. Appointments to empty seats leave no record.                                                                                                                                                                       |
| State and federal vacancies    | doesn't          | 35 seats were lost to false moves (defect 1). A special election is opened only for a seat that covers the player's town; that happened once in twelve worlds (California's U.S. Senate seat). Every other vacancy is filled on a set date with no race and no record.                                                         |
| Congress                       | works with a gap | Congress passes the federal budget on October 1 and its other bills on December 15, the same two days in every world. Each world builds its own Congress, so the national result differs: the federal budget passed 253-180 in Alabama and 433-0 in Arkansas. On December 15 a U.S. House member is named "council president." |
| Federal law reaching people    | works            | Federal laws on Medicaid match, SNAP, minimum wage, income tax and Social Security reach the town and change payments.                                                                                                                                                                                                         |
| The player                     | works with a gap | 6 of 12 players hold a job at year end (server, cook, sales associate, finance director). The other 6 end with no job and $0. No player filed for office.                                                                                                                                                                      |

## The defects, worst first

Defects 1 to 5 change what the owner sees in an ordinary year. Defects 6 to 14 are real but show only in the records or at the edges. Each cause is marked **measured** (seen in a run) or **inferred** (read in the code, not run).

### 1. Officials lose their seats to moves the game cannot place

Measured: 35 state and federal seats were vacated as "moved away" across 9 of 12 places, every one on the first of a month. Alabama (seed `7833956016e6`) lost five, on May 1, June 1, November 1 and December 1, 2025, and January 1, 2026. They include `seat:US-AL:us-house:07` and `seat:US-AL:upper:004:0`. California (seed `aece8c59df0d`) lost U.S. Senate seat `seat:US-CA:us-senate:1` on August 1, 2025.

Inferred cause: once a month the game asks every full person whether to move, and officials count as full people (`src/core2/modules/moves.ts:932`). An official's home is stored as the state, such as "US-AL", not as a town. When one moves, the seat check cannot find "US-AL" on the map and treats an unknown place as outside the district (`src/core2/modules/offices.ts:183`). So any move, even across town, ends the term.

### 2. Six of twelve players end their first adult year with no job and $0

Measured: the player ends the year with no job and $0 in Arizona (`50614edd9c55`), California (`aece8c59df0d`), Colorado (`49072b6a4ffa`), Connecticut (`3bbe67fc58f9`), Delaware (`98cea258e221`) and Puerto Rico (`a54382d60bdb`).

Inferred cause: the player is the resident closest to 18, and a household member in the "child" role starts with $0 and no living costs of their own (`src/core2/population.ts:1106`). People without work decide to look by how many days their household's money lasts (`src/core2/modules/jobs.ts:859`). With no costs of their own, these players feel almost no push. Not found: why these six chose to wait every month.

### 3. Deaths in town leave no record

Measured: in 11 of 12 places no death record was kept, though people died. Alabama ended with 1,913 people and 1,908 alive, so 5 died. Only one of the 5 is visible, and only as an empty seat: `seat-vacated:seat:US-AL:lower:074:0:2025-09-02`, cause "death." Ten seats across the twelve places were vacated for death with no death record, among them `seat:US-AK:lower:030:0` (October 1, 2025). Delaware's one recorded death was someone close to the player.

Inferred cause: the health engine marks the person dead and sends a death event (`src/core2/modules/health.ts:438`). The event is not marked as public or as news, so the log keeps it only for the player's own circle (`src/core2/state.ts:703`). No obituary, news item or conversation can carry a death outside that circle, so the player never hears of it.

### 4. Each legislature does its whole year in one day

Measured: Alabama drafted 53 bills on May 19, 2025; Alaska 52 on May 21; Arizona 52 on April 22; California 54 on September 12. Puerto Rico drafted 52 on June 30 and 47 on November 18. Every bill was filed in the lower chamber, and every hearing that day was in one committee under one of two chairs. In Alabama, 32 of 53 bills ended held in committee with no vote counted, for example `bill:office:US-AL:legislature-lower:2025-05-19:official:term:seat:US-AL:lower:103:0:2025-01-20:48`.

Inferred cause: the session's closing step drafts and votes every bill on the floor day, always in the lower chamber (`src/core2/modules/world-legislating.ts:550`). A bill that is never heard gets no count, so it reads 0-0 (`src/core2/modules/legislature.ts:1909`). A player who wins a state seat would get one day a year to legislate.

### 5. One federal vote cuts every program and a retiree's payment

Measured: in every world, Congress enacted the "balanced operating budget" question on December 15, 2025. The same day, in Alabama, the veterans line fell by $110.8 billion (`budget-line-changed:budget:US:2025:veterans:law:US:federal:us-policy-positions:fiscal.balanced-operating-budget:general:2025-12-15:2025-002#balance#2025-12-15`). The line's total before the cut is not in the record. One Alabama retiree's Social Security payment fell from $1,605.45 to $1,133.70 (`event:law.effect-landed:2025-12-15:retirement-claim:person_3aae76d70f91a9cb`).

Inferred cause: the balanced-budget rule closes the deficit by cutting every line except interest by the same ratio (`src/core2/law-reach/group-b-money.ts:439`). Social Security payments are then shrunk to match the smaller line (`src/core2/budgets-treasury.ts:720`). The retiree felt the cut, and nothing in the record shows they learned a law caused it. The owner decides whether one yes-or-no vote should be able to do this.

### Further defects

6. **Each world builds its own Congress.** Measured in all twelve. Federal bills are filed under the home state's U.S. House office, so an Alabama world's Congress has a bill sponsored by a Washington member (`bill:office:US-AL:us-house:2025-12-15:official:seat:US-WA:us-house:03:133`). The president sponsors the federal budget in the House (`bill:office:US-AL:us-house:2025-10-01:official:term:seat:US:president:2025-01-20:106`). Inferred cause: the national House is looked up by the town's state, and members' views come from each world's own seed (`src/core2/modules/world-legislating.ts:266`). Apart from the budget, adopted October 1 at the start of the federal fiscal year, Congress takes up its whole agenda on one day, December 15 (day 349 of the year).
7. **A U.S. House member is named "council president."** Measured in all twelve on December 15, 2025. In D.C. it is `official:term:seat:US-DC:us-house:98:2025-01-20`, D.C.'s delegate seat. Inferred cause: the chamber-rules lookup knows only the national House's id, so a state's House office falls through to the town-council rules, whose one post is council president (`src/core2/modules/leadership.ts:113`).
8. **Vacancies are filled silently.** Measured. Arizona's three empty legislative seats, filled by appointment as Arizona law says, got new holders and no appointment record. One of them, `seat:US-AZ:lower:023:1`, was emptied by a death (defect 3). Inferred cause: the appointment step writes a new term and sends no event (`src/core2/modules/offices.ts:861`). Special elections for seats outside the player's town are filled on a set date with no race (`offices.ts:949`). That date is 90 days after the vacancy in every state but California, an estimate.
9. **Every officeholder's past wins are the same number.** Measured in all twelve. Every past statewide win shows a 56 percent share and every past legislative win 63.5 percent, and every statewide seat in a state holds one party (all 12 Republican in Alabama, every statewide seat Democratic in California). Inferred cause: the history builder uses two fixed shares and copies the holder's party (`src/core2/modules/offices.ts:669`).
10. **Puerto Rico's election left two seats empty.** Measured (seed `a54382d60bdb`). `contest:seat:municipio:72051:board:3:2025-11-04` and `contest:seat:municipio:72051:board:10:2025-11-04` have no winner and no votes. Inferred cause: Puerto Rico has no row in the election-calendar data, so it falls back to a November general election (`src/core2/elections-calendar.ts:472`). A seat nobody files for stays empty (`src/core2/modules/voting.ts:1976`).
11. **Two town bodies use the same measure number.** Measured. In Alabama on February 4, 2025, measure 2025-001 is immigration enforcement on the county board and a housing-discrimination ban on the council. Inferred cause: each body numbers its own measures, and a recorded vote does not name the body (`src/core2/modules/legislature.ts:750`).
12. **Recall petitions go nowhere.** Measured. California logged 129 recall petitions in the year and Arizona 5, with no recall vote. Inferred cause: a petition finds its bill by number alone, so a state or federal bill can match a local measure, and the recall step records no outcome (`src/core2/modules/recalls.ts:183`).
13. **People and businesses appear without a record.** Measured. Alabama grew from 1,811 to 1,913 people with one birth, and from 120 to 175 organizations with no founding record. Inferred cause: officials become full people the first time their chamber lists its members (`src/core2/modules/officials.ts:604`). Not found: which engines create the 55 organizations.
14. **D.C.'s budget is carried forward, not voted.** Measured (seed `b4bfbf9faa9e`). The city budget reads "carried forward by the budget rule until the council or legislature votes it." Inferred cause: the data has no D.C. city council, so no body can vote the city budget (`src/core2/modules/budgets.ts:883`).

Inferred from the verifier's reading of the code: no seeded roll decides what any person, official or body does. Four fixed numbers shape outcomes. Every member's view of a budget gets a fixed 0.3 added toward yes, a duty to keep the government funded (`budgetAdoptionDuty`, `src/core2/modules/legislature.ts:328`). That is why Arkansas's federal budget passed 433-0 and 100-0, and Puerto Rico's budget 53-0 and 28-0, every member of both Puerto Rico chambers. Every world's U.S. House tally totals 433, not 435; not found: which two seats do not vote. The others are Congress's one working day (349), the 90-day special-election estimate, and the 56 and 63.5 percent history shares. Inferred from a search of the code: no state, city or place id is named in the logic; the only hit was a comment.

## What happens next

The five to fix first, with the area that owns each:

1. **Officials' moves** (OPUS-PEOPLE for moves, OPUS-GOV for seats): give officials a real home place, or test a move against the district, so a seat ends only when the holder leaves it.
2. **The player at 18** (OPUS-PLAY with OPUS-WORLD): an adult player needs their own costs and a reason to look for work.
3. **Deaths as a public record** (OPUS-PEOPLE): a death in town should reach the news and the people who knew the person.
4. **A session that lasts a session** (OPUS-GOV): spread bills over the session's days, file in both chambers, and count held bills.
5. **One national Congress** (OPUS-GOV): one federal chamber with its own office and leadership rules, meeting through the year, the same in every world. This also clears defects 6 and 7.

Defects 8 to 12 and 14 belong to OPUS-GOV and defect 13 to OPUS-CORE. All fourteen are open; this audit fixed nothing. The owner's call on defect 5 goes to the CTO's open list.

## Method

Each place ran once, for one game year from January 20, 2025, through the trace viewer, three worlds at a time in a cloud session. Each run took 1.6 to 4.4 minutes. One Haiku agent per place read its viewer report and wrote the place file. One Sonnet agent checked 18 grouped claims against the code; its findings are in `verification-TRACE-1.md`. The raw viewer reports are in `raw/`. Nothing in the game was changed.

The viewer itself hid some records. Its election summary skipped vacancy and filing records, so that summary line reads empty in most places. Its table dumps asked the wrong engines for vacancies, filings, executive offices and budgets, so they read "unregistered." Its trace walker can loop on federal vote records. These are faults in the viewer script, not the game (`scripts/trace/viewer.ts:101`).

| Place                | Town                      | Seed           |
| -------------------- | ------------------------- | -------------- |
| Alabama              | Steele                    | `7833956016e6` |
| Alaska               | Flat                      | `3f17ac8aef02` |
| Arizona              | Orange Grove Mobile Manor | `50614edd9c55` |
| Arkansas             | Haynes                    | `5d36f2c5c304` |
| California           | Rancho Palos Verdes       | `aece8c59df0d` |
| Colorado             | Moffat                    | `49072b6a4ffa` |
| Connecticut          | Mechanicsville            | `3bbe67fc58f9` |
| Delaware             | Highland Acres            | `98cea258e221` |
| Florida              | Homosassa Springs         | `265e27711c34` |
| Georgia              | Moreland                  | `c5991bae370e` |
| District of Columbia | Washington                | `b4bfbf9faa9e` |
| Puerto Rico          | Río Lajas                 | `a54382d60bdb` |

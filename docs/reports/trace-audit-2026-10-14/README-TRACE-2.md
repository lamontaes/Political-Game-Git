# Guam and the Virgin Islands have no government, and local races are blowouts

The owner has one question to decide: may a working reporter hold or run for office? In three of the ten states a reporter sat on the council. In ten states, local councils, state legislatures and Congress all ran for a full year, passing and killing bills and adopting budgets. Guam and the U.S. Virgin Islands ran with no legislature, no local government and no vote of any kind. In Caldwell, Idaho and Kokomo, Indiana, the mayor won by more than 10,000 votes to fewer than ten. State legislators moved away and were replaced with no news. Deaths happened but never reached the town's record.

## Owner decision needed

**May a working reporter hold local office, appoint officials or run for mayor?** In Idaho, Iowa and Kentucky a newsroom employee sat on the council. In Iowa one ran for mayor. The owner's press decisions say reporters are people in the world with their own records (`docs/coordination/OWNER-DECISIONS.md:75`). They do not say whether reporters may also govern. The engine lets them today: it chooses officeholders from every resident aged 25 to 80, with no job check (`src/core2/modules/offices.ts:256`).

## What works, by level

"Works" means the engine did the job in every place. "Works, with gaps" names the defect it did the job with.

| Level   | Ten states                                                                                                                                                         | Guam, U.S. Virgin Islands                                |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Local   | Works, with gaps: reporters in office, landslide results, vacancies refilled with no record, deaths missing from the record                                        | Doesn't: no council, mayor, board or local budget exists |
| State   | Works, with gaps: each session's 51 to 54 bills all land on one day; legislators move away and are silently replaced; Idaho and Maryland houses have too few seats | Doesn't: the legislature has 0 seats and never sits      |
| Federal | Works, with gaps: Congress passes its laws on one day, December 15; a U.S. Representative is named "council president"                                             | Works, with the same gaps as the states                  |

Measured across 12 worlds: every state legislature sat, and every state and federal budget was adopted. Local elections were held in Idaho, Indiana, Iowa and Kansas. Hawaii, Illinois, Kentucky, Louisiana, Maine and Maryland held no local contest; whether their local seats were due in 2025 was not checked.

## The places

Bill counts are the lower house's bills for the year by final status.

| Place               | Town         | Local                                 | State house                               | First thing the owner would notice                        |
| ------------------- | ------------ | ------------------------------------- | ----------------------------------------- | --------------------------------------------------------- |
| Hawaii              | Kaunakakai   | Board enacted 11, failed 5            | 53 bills: 17 enacted, 34 failed, 2 vetoed | No election, filing or contest all year                   |
| Idaho               | Caldwell     | Mayor won 10,283 to 1                 | 35 seats, not 70                          | A reporter on the council named the police chief          |
| Illinois            | Inverness    | Board enacted 8                       | Four seats emptied by moves               | Every roll call counts every member present               |
| Indiana             | Kokomo       | Mayor won 10,626 to 6                 | 7 enacted, 45 failed                      | Ten people gone, no death in the record                   |
| Iowa                | Jefferson    | Reporter lost mayor 2,333 to 220      | 3 seats emptied, no election              | A reporter on the council sponsored its bills             |
| Kansas              | Vermillion   | Three races total exactly 1,912 votes | 5 vetoes, 3 of them overridden            | Unopposed and contested races draw the same electorate    |
| Kentucky            | St. Matthews | A reporter is mayor pro tem           | 6 seats emptied, none elected             | Legislators leave and are replaced with no news           |
| Louisiana           | Lacassine    | Board failed 34 of 37                 | 4 seats emptied, no election              | Six local seats emptied in February and March, unrecorded |
| Maine               | Van Buren    | Board enacted 7                       | 5 seats emptied, no election              | No election anywhere in the year                          |
| Maryland            | Cavetown     | Board enacted 6                       | 138 seats, not 141                        | The player works as a dishwasher and holds $0             |
| Guam                | Mangilao     | None exists                           | 0 seats, never sat                        | Nobody in the territory ever votes on anything            |
| U.S. Virgin Islands | Cruz Bay     | None exists                           | 0 seats, never sat                        | Same as Guam                                              |

Three of these headlines have no cause found yet. Kentucky's council logged 12 bills as overridden in one year. Louisiana's six local seats emptied without a vacancy record that explains them. Maryland's player was a dishwasher all year and ended with $0.

## Defects, ranked by how much they break play

Each line gives the place in the code that causes it. "Measured" means it shows in the trace; "inferred" means it was read from the code without a run.

1. **The territories have no government.** Measured. Guam and the U.S. Virgin Islands open with a legislature of 0 seats, so no member files a bill. Their budgets read "carried forward by the budget rule until the council or legislature votes it". The office is `office:US-GU:legislature-unicameral` in Guam (seed `22cf0e5b9d81`) and the same office kind in the Virgin Islands (seed `cc170e511472`). The seat list is built only from Census districts and the party roster, and neither has the territories. The research file lists Guam's 15 seats, but the code sets the count from the list it built (`src/core2/offices-state.ts:610`). No council, mayor or board opens either. The local-office search reads the Census government-units listing by place (`src/core2/gov-rules/local-governments.ts:61`); that the listing lacks these two territories is inferred. The owner requires distinct bills in all five inhabited territories (`docs/coordination/DECISION-REGISTER.md:108`).
2. **Reporters govern.** Measured. A reporter seated on the Caldwell council appointed the police chief on February 19, 2025 (record `official-appointed`, appointer `person:press:outlet:radio:0:jurisdiction_bc86e017f9ae60d2:reporter:0`, seed `b6b680d034f8`). A television reporter ran for mayor of Jefferson, Iowa, and lost 2,333 to 220 (contest `contest:seat:gus2025:208017:mayor:0:2025-11-04`, seed `346122177e93`). Press staff count as ordinary residents in the search for officeholders (`src/core2/modules/offices.ts:256`) and for candidates (`src/core2/modules/candidacy.ts:699`). Whether this is allowed is the owner question above.
3. **Local races are landslides.** Measured. The Caldwell mayor won 10,283 to 1 (`contest:seat:gus2025:162060:mayor:0:2025-11-04`). The Kokomo mayor won 10,626 to 6 (`contest:seat:gus2025:163557:mayor:0:2025-11-04`, seed `e1fd7c7878e8`). Each counted voter group gives every vote to its top candidate and none to the rest (`src/core2/electorate.ts:274`). That is a threshold flip, which the sliding-scales rule forbids. Every contest on one day also draws the same voters, because turnout is decided once per voter per day (`src/core2/modules/voting.ts:1511`). That is why three Vermillion races total exactly 1,912 votes (seed `32e4998ec48b`).
4. **State legislators move away and are replaced in silence.** Measured. Nine of the ten states lost 1 to 6 legislative seats to a move or a death in the year. Idaho lost three of its 35 house seats, each on the first day of a month (for example `seat:US-ID:lower:026:0` on June 1, 2025). Kentucky lost six of its 138 legislators. State and federal officials are full people (`src/core2/modules/officials.ts:604`). So they go through the same monthly move review as residents (`src/core2/modules/moves.ts:956`). The replacement is seated with no record (`src/core2/modules/offices.ts:896`). Where the rule calls for a special election, an appointed placeholder takes the seat on election day instead. That is registered stopgap `SG-GOV-special-election-appointee`.
5. **Idaho's and Maryland's houses are too small.** Measured. Idaho's house has 35 seats instead of 70, so its votes total 35, not 70. Maryland's has 138 instead of 141. Roster districts named `10A` and `10B` never match the Census district `10`, so each such district falls back to one seat (`src/core2/offices-state.ts:230`, fallback at line 585). A members-per-district table exists, but only the old core imports it (`src/simulation/legislature-game-profile.ts:60`).
6. **Deaths never reach the town's record.** Measured. All 12 worlds report "deaths: 0", yet Indiana ended with 1,941 people and 1,931 alive. A death is written without a public or news flag (`src/core2/modules/health.ts:362`). The log keeps it only if the dead person is in the player's circle (`src/core2/state.ts:691`). The death still empties seats: an Indiana state senate seat went to "death" on September 14, 2025. Inferred from that: the news engine, which reads the same log, never sees a neighbor's death.
7. **Every state and federal member files bills on the player's town's views.** Inferred. Officials are full people, so a member's "home" lean is the player's town, not the member's district (`src/core2/modules/world-legislating.ts:353`). The comment there calls it a stand-in until district views exist. Its effect on what passes was not measured. The national abortion law took effect in 11 of 12 worlds, and this is one candidate cause for the 12th.
8. **Congress gets a "council president".** Measured. On December 15, 2025, every world logs a leadership record naming its U.S. Representative council president (in Idaho, `official:term:seat:US-ID:us-house:01:2025-01-20`). The state's House delegation office stands in for Congress. The leadership engine does not recognize it and organizes it like a city council (`src/core2/modules/leadership.ts:137`).
9. **Legislatures work one day a year.** Measured. Each state's 51 to 54 bills were filed, heard and voted on one floor day (Idaho on April 26, 2025; Maryland on April 7, 2025). Congress passed its laws on December 15, 2025, day 349 of the year. Both are as designed (`src/core2/modules/world-legislating.ts:613`). Inferred: a player in office would see months of nothing, then a flood.
10. **Nobody is ever absent.** Measured. Every roll call counts every seated member, as in Illinois 118 to 0. There is no attendance model (`src/core2/modules/legislature.ts:1676`).

## Claims in the place files that are not defects

Each place file lists observations that need a "why". The ones below have a cause in the code that is working as intended. Read the place files with these in mind:

- **Vote totals above the head count** (Idaho, Indiana) are the counted wider population voting, as the two-tier rule intends. Caldwell has 1,766 full people; everyone else in town is counted, not filled in, and still votes.
- **"Reversed" roll calls** (Indiana, Maryland, Illinois): the trace's vote lines print the policy position, not yes or no (`src/core2/modules/legislature.ts:1718`). The tallies are consistent.
- **The same measure number for different questions** repeats across different bodies, never within one: each body numbers from 001 every year (`src/core2/modules/legislature.ts:750`).
- **Kentucky's "law before its bill"** was a governor's order on February 19, 2025 (`src/core2/modules/executive.ts:450`). The bill on March 28, 2025 was a separate act on the same question.
- **Hawaii's "double closure"** is two records from two engines for one closure (`src/core2/modules/business.ts:1527`).
- **The $11 trillion cut to veterans' spending** comes from the national balanced-budget law. It cuts every federal program by the same share of its size (`src/core2/law-reach/group-b-money.ts:427`).
- **Guam's tax laws with no vote** are starting laws dated January 1, 2026, which need no bill (`src/core2/data/laws/starting-law.json`).
- **Bills "held" 0 to 0** are bills the committee chair chose never to hear (`src/core2/modules/legislature.ts:1861`).
- **Players with no job and $0** (Idaho, Indiana, Louisiana, Guam) are 17- and 18-year-olds the trace never plays (`src/bench/world.ts:97`). Maryland's player is the exception noted above.

## Fix first

1. Seat the territorial legislatures from the research seat count and open the territories' local governments (defect 1).
2. Get the owner's ruling on reporters in office, then add the job check or record the permission (defect 2).
3. Make a counted group split its votes across candidates by appeal, not all to the top one, and let turnout differ by contest (defect 3).
4. Take state and federal officials out of the residents' monthly move review and the town-lean filing reason, and record each replacement (defects 4 and 7).
5. Read members per district for the state houses, so Idaho seats 70 and Maryland 141 (defect 5).

Defect 6, deaths missing from the record, is next. It decides whether the town can talk about its own dead.

## The trace tool's own gaps

These are in the trace viewer, not the game, and they cost the audit data. The viewer counts deaths from the town's record, so it misses them. It asks for several tables under the wrong module and prints "Unregistered module table" for them. Its state-contest filter printed 0 of 32 contests, for a reason not found. It labels a federal bill's House and Senate committee hearings identically.

## Method

Each place ran once for one year, January 20, 2025 to January 20, 2026, through the trace viewer on branch `audits/trace-2`, three worlds at a time. Seeds: Hawaii `d26da2cdad16`, Idaho `b6b680d034f8`, Illinois `86d630fba9a0`, Indiana `e1fd7c7878e8`, Iowa `346122177e93`, Kansas `32e4998ec48b`, Kentucky `ea10d2e9ff8c`, Louisiana `ceb1b7c7f016`, Maine `13744ef7bcc3`, Maryland `1254cc0932d2`, Guam `22cf0e5b9d81`, U.S. Virgin Islands `cc170e511472`. A year took 51 to 192 seconds. One Haiku agent wrote each place file from its trace. One Sonnet agent traced every claim to a line of code; its verdicts are the causes above. The raw traces are in `raw-trace-2/`. Nothing in the game was changed.

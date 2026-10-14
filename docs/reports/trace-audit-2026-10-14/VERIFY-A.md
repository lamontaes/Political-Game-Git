# Most of the odd year records are real, and a few are defects

Of the 176 items in the seven place lists, 118 trace to behavior the engines really have. The other 58 are viewer artifacts (30) or misreadings (28). Four real findings matter most. Special elections for state and federal seats never run as races. Federal House business is filed under the state's delegation office, which the leadership engine then organizes as a town council. Press-outlet people are seated as county and city officials. Every legislature's whole year happens on one day.

## How to read this

Places: Massachusetts (Southbridge Town), Michigan (Ahmeek), Minnesota (Ellendale), Mississippi (Fayette), Missouri (Benton), Montana (Craig), New Hampshire (Bartlett).

Verdict words. **Cause found**: the item is real and the producing code is cited. **Viewer artifact**: the viewer, the log retention or the trace tool shows less than the world holds. **Reader error**: the item misreads a record. **Not found**: no cause located.

## Shared causes

### C1. Seats open only by move-away, death or a won recall, and officeholders move like any other resident

- The only vacancy events are death and a move away. `src/core2/modules/offices.ts:132-143` lists them. A won recall adds the cause "recalled" at `src/core2/modules/recalls.ts:349`.
- The monthly move review covers every person in `core.people`, officials included. See `src/core2/modules/moves.ts:956-1000`.
- The ties that hold a person in town have no office, seat or term entry. See `moves.ts:275-330`.
- A leaver stays in `core.people` as tier `husk` (`moves.ts:675`).

```
eventKinds: ["life.death", MOVED_AWAY_EVENT],
if (event.kind === "life.death") vacateSeat(api, term.seatId, "death");
else if (!livesWithin(...)) vacateSeat(api, term.seatId, "moved away");
```

- Probe: some departing persons hold or held a term. The counts are 8 of 71 in Massachusetts, 6 of 51 in Michigan and 14 of 44 in Minnesota. They are 11 of 65 in Mississippi, 2 of 50 in Missouri, 2 of 54 in Montana and 9 of 48 in New Hampshire.
- Seats are filled from the top "fit" residents (`offices.ts:256-284`), so officeholders are a small group with a large share of leavers. I did not find why these people rank high on the pull (`moves.ts:773-808`). That needs a per-person pull dump.
- Stopgap: SG-P15-moves-weights (open) covers the weights only. Nothing registers the missing office hold or the missing resignation, scandal and term-limit causes.
- Explains: MA 1, MN 8 and the Massachusetts council churn.

### C2. Appointments and interim fills are real, but silent

- A fill writes a new serving `terms` row with `reached` set to "appointed by ..." and marks the vacancy filled. It emits no log record. See `offices.ts:849-905`.
- `vacateSeat` emits only `seat-vacated` (`offices.ts:793-846`).
- The viewer drops local terms because their ids contain `gus2025` (`scripts/trace/viewer.ts:209-211`). It never dumps the vacancies table.

```
const term = holder
  ? seatResident(api, office, seat, holder.person.id, date, reached)
  : seatNamedOfficial(api, `${town.worldSeed}:${date}`, office, seat, date, reached);
```

- Probe, Massachusetts: council seats 3, 0, 4, 1 and 2 were refilled on February 1, March 1, March 1, March 1 and April 1, 2025.
- Probe, Mississippi: board seat 2, the assessor and the sheriff were refilled on February 1, 2025.
- Probe, Minnesota: board seat 1 on February 1 and the clerk on March 1, 2025. Michigan council seat 3 was refilled on September 1, 2025. Montana board seat 0 on November 1, 2025, and state seats 075 and 098 the day they opened.
- Defect not in any list: `suitedResidents` (`offices.ts:256-284`) does not exclude the press engine's outlet people. A newspaper head holds Massachusetts council seat 3 and sponsors its bills. Television heads hold Mississippi board seat 2 and the assessor seat, and Minnesota board seat 1.
- Stopgap: none covers the silent fill or the outlet people. SG-GOV-official-identity-only is resolved.

### C3. State and federal special elections are not races, and a stand-in fills the seat silently

- A special race opens only for a seat the town covers. `src/core2/modules/elections.ts:399-400` returns null for any other seat. `src/core2/offices-state.ts:575` sets `coversTown` for the town's own district only.
- For any other seat, `offices.ts:949-957` schedules a calendar item. `offices.ts:1000-1052` fires it 90 days later and seats a stand-in through `fillVacancy`. No contest, vote or record is written.

```
const entry = townSeats(api).find((s) => s.seat.id === race.seatId);
if (!entry || !entry.office.elected) return null;
```

- Until the stand-in date the seat has no serving term, so the chamber votes short.
- Probe, New Hampshire: five seats were vacant on June 30, 2025. Three were vacated May 1 (fill due July 30) and two June 1 (fill due August 30).
- Probe, Michigan: state lower seat 060 was vacant from September 1 to November 30, 2025. The October 1 budget vote totals 109 of 110.
- Probe vacancy tables: Massachusetts 5 special-election seats (2 filled, 3 awaiting), Minnesota 11 (5 filled, 6 awaiting), Mississippi 4 (2 and 2), Missouri 4 (3 and 1), New Hampshire 12 (7 and 5).
- Stopgaps: SG-GOV-special-election-appointee (open) and SG-GOV-special-election-timing (open, the 90-day estimate). The first one's text says "where the voting engine isn't running". It does not say it also stands in for every seat the town does not cover.

### C4. A legislature's whole agenda happens on one day

- Each session has one `session-end` day. `src/core2/modules/world-legislating.ts:184-190` sets it to the adjournment date, or to the end of month 6 for a year-round body.
- On that day `holdSession` files every bill and takes each through committee and the floor (`world-legislating.ts:433-560`). Every bill is introduced on the session day (`legislature.ts:810-824`).
- Congress's day is December 15 and the year-round month is 6. Both are TUNABLE (`src/core2/data/campaigns/parameters.json:292-304`).

```
const floorTime = Math.round(input.floorDays * input.billsPerFloorDay);
introduced: api.state.date,
```

- Local bodies meet every 15 days (`world-legislating.ts:811-822`). An ordinance takes effect 30 days later (`legislature.ts:2385-2392`). Laws therefore cluster on meeting dates plus 30.
- Federal acts take effect the day they pass (`legislature.ts:2361-2367`). State acts follow the state's rule (`legislature.ts:2377`).
- Probe session days: Massachusetts, Michigan and New Hampshire June 30 (53 to 54 bills); Minnesota May 19; Mississippi April 6; Missouri May 16; Montana May 2. Congress sat December 15 in every place with 23 to 25 bills.
- Floor time (for example 594 bills) far exceeds the bill count, so no bill dies for lack of time.
- Stopgap: none. The two dates are TUNABLE parameters, not registered placeholders.

### C5. Federal House business is filed under the state's delegation office, which the engines treat as a council

- `houseOffice` returns the first office whose kind starts with "us-house", the state's own delegation office (`world-legislating.ts:258-270`).
- The federal filers are every member of the House and Senate, from any state. Sponsors and chairs therefore come from other states (`world-legislating.ts:658-667`).
- `world-legislating.ts:648` asks `leaderOf` to organize that office. `src/core2/modules/leadership.ts:113-136` has no template for it and falls through to "council-manager", whose presiding post is `council-president`.
- `legislature.ts:953-975` lists members state by state in alphabetical order, so Alaska appears first.

```
const elected = lower ? leaderOf(api, lower.id, "majority-leader") : null;
return office?.kind === "council" && mayor ? "mayor-council" : "council-manager";
```

- Probe: the bodies are `office:US-MA:us-house` and the same for each state, with 23 to 25 bills on December 15. The `chamber-organized` record that names a House seat as `council-president` is that office organized as a council.
- Stopgap: none.

### C6. Committees: the chair buries bills, there is one committee name, and every bill starts in the lower chamber

- `committeeFor` returns "general" for any policy question (`legislature.ts:1768-1778`).
- The committee roster is the most senior members by party ratio, and the chair is the most senior of the majority. A chair who opposes a bill holds no hearing, and then no member votes, so the tally stays 0-0 (`legislature.ts:1791-1960`).
- A bill passes each chamber's committee in turn. The upper chamber's chair therefore appears on lower-chamber bills (`legislature.ts:1640-1665`).
- Filers are every chamber's members and the body is always the lower chamber. An upper-chamber member can sponsor a lower bill, and the upper chamber never introduces one (`world-legislating.ts:658-667`).

```
const heard = chairPosition.total +
  traitLean(api, memberKey(chair), "legislature.hold-hearing", ["hear", "bury"]) >= 0;
```

- Stopgap: SG-GOV-committee-structure (open).

### C7. One left-right axis sets nearly every position, so tallies repeat

- A person's stance on a question is their lean times the question's axis (`src/core2/campaign-views.ts:231-233`). A member's position adds a sponsor weight and a few small terms (`legislature.ts:1242-1330`).
- A fixed roster in a fixed order therefore votes the same way on every bill with the same axis sign. No random number is involved.
- Stopgap: SG-GOV-views-stand-in (open).

### C8. Measure numbers restart in every body, and the vote record id has no body in it

- The counter key is the office id plus the year (`legislature.ts:750-758`). The council's 2025-001, the county board's 2025-001 and the state House's 2025-001 are different measures.
- The vote record id is built from the measure number and the person only (`src/core2/modules/record.ts:73`).

```
id: `vote:${vote.measureId}:${vote.personId}`,
```

- Law ids end in the bill number, so a county law ending 2025-002 is the county board's bill, not the council's.
- Stopgap: none.

### C9. Budgets are bills the executive proposes, a body negotiates down, and no roll call is logged

- The sponsor is the executive. Lines the chamber objects to are dropped one at a time until it passes (and until the Senate reaches 60 percent). Votes go to the `votes` table and the bill row is written `enacted`. No `legislative-vote` is emitted (`legislature.ts:288-420`).
- The executive's change per line is the amount times a priority share times the executive's lean on that line (`legislature.ts:467-520`).
- Only surviving lines become `budget-line-changed` records (`src/core2/modules/budgets.ts:895-947`).

```
const sponsor = priorities?.setBy ?? memberKey(members(api, chambers.chambers[0]!)[0]!);
```

- `deltaMinor` is a change to an annual line in minor units, which are cents.
- Stopgap: SG-GOV-budget-adopted-by-rule (open) covers the carry-forward fallback only.

### C10. The balanced-budget law cuts every non-interest line pro rata and reaches Social Security awards

- `balancePlan` cuts each line by (spending minus revenue) over the cuttable spending (`src/core2/law-reach/group-b-money.ts:427-445`, called at `group-b.ts:284-299`).
- A cut to the Social Security line lowers each award. `landOn` records `fromMinor` and `toMinor` and keeps the law id only in the `landed` table (`src/core2/budgets-treasury.ts:566-600`).
- Mississippi (152830 to 107921) and Montana (170832 to 120636) show the same 29.4 percent drop.
- Stopgap: none found for the balanced-budget mechanic.

### C11. Starting-law rows are data, not votes

- A phase that begins after January 20, 2025 is carried back as an estimate and then shown as "replaced" when the real phase starts (`src/core2/modules/laws.ts:219-250`).

```
id: `${row.id}:from-start`, effectiveDate: today, endDate: first,
```

- The January 1, 2026 property-tax, income-tax and Social Security rows are such first phases. No vote or notice exists, and the "replaced" rate equals the carried-back rate.
- Stopgap: SG-GOV-start-law-carried-back (open).

### C12. Minimum wage: a flat $15 estimate for every "yes" state, and a repeal restores the remembered prior wage

- `setLevelWage` writes the state target from tomorrow (`src/core2/law-reach/group-a-wages.ts:46-82`). The target is 1500 minor units, tagged ESTIMATED (`src/core2/data/laws/reach-group-a-parameters.json:54-59`).
- `restoreWages` writes the remembered prior wage back when the policy is repealed (`group-a-wages.ts:84-110`).
- Stopgap: none. The target is a parameter tagged ESTIMATED.

### C13. Election calendar and ballots

- Seats take turns: `offices.ts:201-229` computes each term end from the seat's next regular election. Only some seats are up in a given year. The seat's `electionYear` is that next regular election.
- Contests exist for the town's seats only (`elections.ts:289-345`). A seat with no one elected holds over (`elections.ts:332-336`).
- The incumbents are the opening officeholders, marked "in office at the opening" (`offices.ts:404-505`). A November election is their re-election.
- The incumbent files unless they already weighed running. Only state and federal seats get a stand-in challenger, so a local seat can end with no filing (`voting.ts:937-1050`).
- A filing is dated the day the engine placed it on the ballot (`voting.ts:974-980`).
- Probe, Massachusetts: council seats 0, 2 and 4 and the mayor were up on November 4, 2025. Seats 1 and 3 are up on November 2, 2027. The mayor filed August 1.
- Probe: Minnesota, Missouri and Montana have no local contest until 2026 or 2027. Mississippi filings are dated January 21, 2025. Michigan and New Hampshire filings are dated June 12, 2025.
- Stopgaps: SG-GOV-who-runs-stand-in, SG-GOV-term-end-estimate and SG-GOV-filing-deadline-estimate (all open).

### C14. Votes include the counted population and the rest of the town, and the viewer's "people" is the full-person tier only

- A count adds named ballots, counted residents' ballots and the rest of the town's electorate (`voting.ts:1883-1966`). `restOfTown` reads the census count (`voting.ts:2152`).
- The world is built from a target of 10,000 generated people (`src/core2/data/parameters.json:147-151`). The bench keeps a small circle as full people (`src/bench/world.ts:124-163`).
- The viewer prints `core.people.size` (`scripts/trace/viewer.ts:46, 67`).
- Probe, census count and full people at build: Massachusetts 18105 and 1951, Michigan 120 and 1836, Minnesota 658 and 1919, Mississippi 1315 and 1816, Missouri 919 and 1849, Montana 172 and 1856, New Hampshire 312 and 2083.
- Probe: the Massachusetts mayor's 3,894 votes are 21 named, 2,271 counted and 1,602 from the rest of the town. Mississippi's 1,458 are 10 named and 1,448 counted.
- Stopgap: none.

### C15. Full-person and organization counts grow from fill-ins and from non-business organizations

- `core.people` grows only through fill-ins, promoted records and births (`src/core2/state.ts:1836, 2092, 2171, 869`). Candidates, campaign openers and staff are filled in on first contact (`candidacy.ts:695`, `campaigns.ts:756`, `staff.ts:538`).
- Cause groups, interest groups, campaign committees and employers add organizations (`drives.ts:1380-1395`, `interest-groups.ts:203, 469`, `campaigns.ts:362`, `business.ts:1173`).
- Probe organization rise, with the kinds that add up to it: Massachusetts +18 (interest 13, cause 4, committee 1). Michigan +60 (interest 25, cause 22, committee 10, employer 3). Minnesota +30 (interest 19, cause 10, employer 1).
- Probe, continued: Mississippi +45 (cause 20, interest 16, committee 8, seller 1). Missouri +16 (interest 14, employer 1, cause 1). Montana +32 (interest 14, cause 11, committee 7). New Hampshire +75 (interest 32, cause 32, committee 11).
- Stopgap: SG-P10-group-name-key (open) covers the cause-group name only.

### C16. The log keeps only circle, public and news records, so most deaths never reach the file

- `retainLog` keeps a record only for the circle, public records and news (`src/core2/state.ts:691-702`). The death event has none of those flags (`src/core2/modules/health.ts:421-440`).
- The viewer counts death records from that log (`scripts/trace/viewer.ts:98`).
- Probe, dead people against death records: Massachusetts 4 and 0, Michigan 1 and 0, Minnesota 1 and 1, Mississippi 0 and 0, Missouri 5 and 0, Montana 3 and 1, New Hampshire 6 and 0.
- Mississippi's zero is real. A death only follows a scheduled illness case (`health.ts:421-440`).
- Stopgap: none.

### C17. Viewer limits and filters

- Local news is cut to 200 items (`viewer.ts:96`). Election-ish records are cut to 40, and the pattern omits `candidate-filed` (`viewer.ts:101-108`). One trace is kept per record kind, 12 at most (`viewer.ts:119-127`).
- Children print kind and link only, not the person (`viewer.ts:154-160`). The state dump prints `facts` only, so `organization.owner-changed` and `organization.founded` show `{}`. Their payload is in `personIds`, `topic` and `source` (`business.ts:429-446, 1366-1376`).
- `high` tests the first 400 characters of each row's JSON, which never reach `level`. Every state and federal contest drops out (probe: `high` was false for all 22 Massachusetts contests). See `viewer.ts:178-211`.
- The dump asks for tables under the wrong module ids (`viewer.ts:233-241`). The real homes: vacancies in `core2-offices-v1` (`offices.ts:128`); contests and filings in `core2-elections-v1` (`elections.ts:117-128`); campaigns in `core2-campaigns-v1` (`campaigns.ts:213`).
- Also real: executive offices and terms are `core2-offices-v1.offices` and `.terms`. The executive module's own tables are `appointments`, `orders`, `desk` and `review` (`executive.ts:96-99`). Governments and budgets are in `core2-budgets-v1` (`budgets.ts:166-167`).
- Stopgap: none. The viewer is a tool, not a game placeholder.

### C18. The trace tool resolves any string to any record id and prints fact keys as reasons

- `findRecord` looks in every module table, and `namedIds` tries every string longer than six characters (`src/bench/dev-trace.ts:42-105`). The literal "opening" in a closure source matches the officials row whose id is "opening" (`src/core2/modules/officials.ts:526`). That gives "opening [core2-officials-v1.loaded]".
- `learnedOf` returns the fact's key, such as `measureId`, `billId` or `campaignId`, once per person (`dev-trace.ts:202-222`). The viewer drops the person, so one observation looks repeated three to seven times.
- The chain follower can walk from a household to a person and back.
- Stopgap: none.

### C19. The executive's desk review refills a post whose holder left town

- `deskReview` refills any department post whose holder is dead or no longer in town (`src/core2/modules/executive.ts:575-590`). `fillTownPost` emits `official-appointed` (`executive.ts:211-270`). The same post appears twice when the first appointee moved.
- Stopgap: SG-GOV-staff-hire-out-of-work (open) covers who is chosen.

### C20. Recalls start from a cause, and the outcome is only in the recalls table

- Every ordinance that takes effect triggers a petition against each member who voted, started by the most aggrieved resident (`src/core2/modules/recalls.ts:167-260`).
- `recallWork` writes `failed`, `on-ballot`, `kept` or `removed` with no log record. A removal vacates the seat as "recalled" (`recalls.ts:284-350`).
- Probe: Mississippi had 6 failed petitions (96 of 182 signatures) and 1 removal (board seat 0, refilled July 19, 2025). Michigan had 7 recall votes, all kept (2 remove, 7 keep). Massachusetts has none.
- Stopgap: SG-GOV-recall-signature-groups (open).

### C21. Public comment is the residents who feel most strongly about the question

- The speakers are the top residents by the size of their view times a civic factor. "For" counts speakers whose view agrees with the bill (`src/core2/modules/meetings.ts:244-275`).

### C22. A county or state officeholder who moves inside the office's jurisdiction keeps the seat

- A county seat survives a move within the county, and a state or federal seat a move within the state (`offices.ts:172-199`).
- Probe, Mississippi: `person_743642ac80687d34` holds county board seat 6 (term serving to January 3, 2028). They moved on January 1, 2026 to another county-level jurisdiction and still voted on January 15, 2026.

### C23. The player starts at 17 with no job and no cash, and the viewer never acts for them

- `entrantOf` picks the resident nearest 18, the oldest 17-year-old first (`src/bench/world.ts:97-117`, with `cohortAge` set at `:222`).
- The viewer selects the player and never sends a command (`viewer.ts:23-27, 112-117`).
- Probe at build, every place: job none, cash 0.
- Stopgap: none.

### C24. Business closures, owner changes and foundings

- A forced closure carries the reason `finance.unfunded-obligation-cash-and-credit-exhausted` (`src/core2/data/finance.json:13`). Its closure source is the receipt of the unfunded obligation, such as an opening payroll flow (`src/core2/finance-state.ts:1470-1495`).
- A closure by choice uses `owner-closed:<date>:<org>` as the receipt id (`finance-state.ts:1496-1525`). The owner's reason `losses-kept` comes from `src/core2/data/business/business.json:51` and is emitted at `business.ts:1520-1545`. The two fields are different things, not two reasons.
- Stopgap: SG-CORE-voluntary-closure-final-pay (open) covers final pay only.

### C25. An eviction record is dated the removal day, and the case id carries the day the case opened

- The case id is built at `src/core2/modules/housing.ts:990`. `remove` emits the record on the removal date, after notice, filing, hearing and judgment (`housing.ts:1455-1485`).

### C26. A starting-law policy books its budget move at the first monthly review after a budget exists

- `moveBudget` stamps the move and writes an `#undo` stamp when the policy is repealed (`src/core2/law-reach/group-b-money.ts:366-421`). A monthly review re-runs every active policy (`group-b.ts:528-566`).
- Probe line, Missouri: `retirementContributions` rose by 43718262000 on July 20, 2025, stamped with the starting law's id. The August 14 law (measure 2025-013, value 0) is the repeal.

### C27. A tied chamber is broken by the presiding officer, and the roll-call record shows the count before the break

- `tieBreaker` picks a lieutenant governor where the state's data gives the vote (`legislature.ts:1129-1166`).
- The break is stored as a `votes` row with `tieBreak: true` (`legislature.ts:1989-2003`). The emitted yes and no counts are before the break (`legislature.ts:1725-1740`).

### C28. A bill's status is its last state, and the governor's choice is a `votes` row

- A vetoed bill that is overridden ends as `overridden`. One that is not overridden ends as `vetoed`. The sign or veto is stored as `vote:<bill>:<executive>` (`legislature.ts:2087-2187`).
- `enact` then overwrites `signed` with `enacted` (`legislature.ts:2339-2440`).

### C29. Special-election candidates come from the officeholder ladder, and a special winner takes office the same day

- `officialCandidate` picks an officeholder one step down the ladder, or a newcomer (`src/core2/modules/officials.ts:1166-1260`). The challenger comes from the other party's pool (`voting.ts:1036-1050`).
- A special winner takes office on the election day (`voting.ts:2000-2003`).
- An "appointment-then-special" seat gets an interim appointee who stands as "incumbent stands again" (`offices.ts:861-905, 920-940`).

### C30. Past elections' shares are two constants

- `electionBehind` reads one share per office family (`offices.ts:669-695`). The values are 0.56 for statewide executives and 0.635 for state legislators, both ESTIMATED (`src/core2/data/offices/tenure.json:52-60`).

### C31. A recorded position is the member's vote times the bill's direction

- The recorded position is the stance's position for a yes and its negative for a no (`legislature.ts:1712-1722`). A bill that repeals a policy has direction -1 (`world-legislating.ts:545-560`), so a yes on it is recorded as -1.

### C32. A town and its county are separate governments with separate bodies, numbers and laws

- `localOfficesForPlace` builds both (`src/core2/offices-local.ts:183`). A county board's ordinance is county law (`legislature.ts:2319-2335`).
- Probe, New Hampshire: `office:gus2025:130734:board` is the three-seat Selectman board of the town. `office:gus2025:193707:board` is the seven-seat county board.

## Per item

Item numbers follow each place file's "Needs a why" list.

### Massachusetts (Southbridge Town)

| item | verdict         | cause    | note                                                                                                                       |
| ---- | --------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1    | viewer artifact | C2, C1   | probe: all five seats refilled by appointment, February 1 to April 1; one appointee is a newspaper head (C2 defect)        |
| 2    | reader error    | C2       | seats were refilled, so five members vote                                                                                  |
| 3    | reader error    | C2, C9   | the voters are the appointees; budget votes are in the `votes` table, not the log                                          |
| 4    | cause found     | C7, C2   | same five members, same axis                                                                                               |
| 5    | reader error    | C28      | overridden means vetoed then overridden: 4 + 1 = 5 vetoes                                                                  |
| 6    | cause found     | C5       | the delegation office organized as a council                                                                               |
| 7    | reader error    | C14      | 3,894 = 21 named + 2,271 counted + 1,602 rest of town; census count 18105                                                  |
| 8    | cause found     | C13      | seats 0, 2, 4 had no filing; seats 1 and 3 are up November 2, 2027; "0 of 22" is C17                                       |
| 9    | reader error    | C13      | the mayor held office from the opening and was re-elected November 4                                                       |
| 10   | reader error    | C13, C17 | the id is a campaign-message record; the filing is dated August 1; one candidate because locals get no stand-in challenger |
| 11   | reader error    | C14, C15 | 1,951 is the full-person tier; census count 18105                                                                          |
| 12   | viewer artifact | C16      | probe: 4 dead, 0 death records                                                                                             |
| 13   | cause found     | C15      | +18 = interest 13, cause 4, committee 1; no business founded                                                               |
| 14   | viewer artifact | C18      | "opening" matches the officials row                                                                                        |
| 15   | cause found     | C3       | probe: lower:131 stand-in on August 30; others awaiting                                                                    |
| 16   | cause found     | C4, C6   | one session day; `committeeFor` returns "general"                                                                          |
| 17   | cause found     | C6       | the chair buries, so no hearing and no vote                                                                                |
| 18   | cause found     | C6       | bills are filed only in the lower chamber                                                                                  |
| 19   | cause found     | C5       | body is the first us-house office; filers are all of Congress                                                              |
| 20   | cause found     | C9, C10  | Senate cloture drops lines; `deltaMinor` is cents; the balance cut is pro rata                                             |
| 21   | cause found     | C30      | two constants                                                                                                              |
| 22   | viewer artifact | C18, C17 | learned key is a fact key; the chain loops household and person                                                            |
| 23   | viewer artifact | C17      | wrong module ids; `high` drops state and federal contests                                                                  |
| 24   | reader error    | C25      | the id date is the case opening; the record is the removal day                                                             |
| 25   | cause found     | C23      | job none, cash 0 at build; the viewer never acts                                                                           |

### Michigan (Ahmeek)

| item | verdict         | cause    | note                                                                                                                     |
| ---- | --------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1    | cause found     | C15      | only fill-ins and births add full people; 234 movers stay as husks                                                       |
| 2    | viewer artifact | C16      | probe: 1 dead, 0 records                                                                                                 |
| 3    | cause found     | C15      | +60 = interest 25, cause 22, committee 10, employer 3                                                                    |
| 4    | cause found     | C23      | by design: the entrant is the oldest 17-year-old                                                                         |
| 5    | cause found     | C23      | job none, cash 0 from the opening                                                                                        |
| 6    | cause found     | C7       |                                                                                                                          |
| 7    | cause found     | C6, C7   |                                                                                                                          |
| 8    | cause found     | C6       |                                                                                                                          |
| 9    | cause found     | C4, C5   | federal acts are effective the day they pass                                                                             |
| 10   | cause found     | C8       | different bodies                                                                                                         |
| 11   | cause found     | C3       | state: seat 060 vacant on October 1; federal 433 of 435 not resolved (abstentions or roster, `legislature.ts:1688-1699`) |
| 12   | reader error    | C13      | 2030 is the next regular election; the term ends January 3, 2031 after it                                                |
| 13   | reader error    | C2, C29  | probe: interim term `...us-senate:0:2025-06-01` stood as "incumbent stands again"; winner seated at once                 |
| 14   | cause found     | C29      | the ladder; no resignation rule is modeled                                                                               |
| 15   | cause found     | C5       |                                                                                                                          |
| 16   | cause found     | C5       | all senators and representatives may file                                                                                |
| 17   | viewer artifact | C28      | the decision is a `votes` row                                                                                            |
| 18   | cause found     | C9       | budget bill, no own roll call                                                                                            |
| 19   | cause found     | C13, C14 | seats 1 and 3 are up in 2027; 2,902 = 23 named + 2,879 counted                                                           |
| 20   | reader error    | C13      | the mayor held office from the opening                                                                                   |
| 21   | cause found     | C9, C10  | cents; `otherPrograms` is the executive's priority change                                                                |
| 22   | viewer artifact | C18, C17 | one trace per record kind                                                                                                |
| 23   | cause found     | C20      | probe: all seven kept (2 remove, 7 keep)                                                                                 |
| 24   | viewer artifact | C17      |                                                                                                                          |
| 25   | viewer artifact | C18      | different people, same fact key                                                                                          |

### Minnesota (Ellendale)

| item | verdict         | cause    | note                                                                                   |
| ---- | --------------- | -------- | -------------------------------------------------------------------------------------- |
| 1    | cause found     | C7       |                                                                                        |
| 2    | cause found     | C21      |                                                                                        |
| 3    | cause found     | C8       | council against county board                                                           |
| 4    | viewer artifact | C2       | probe: board seat 1 refilled February 1 (a television head), clerk March 1             |
| 5    | cause found     | C5       |                                                                                        |
| 6    | cause found     | C13      | probe: no local contest until November 3, 2026; filings 0, results 0; "0 of 28" is C17 |
| 7    | cause found     | C3       | 13 vacancies, 5 filled by stand-in                                                     |
| 8    | cause found     | C1       | only move-away, death and recall exist                                                 |
| 9    | cause found     | C4       |                                                                                        |
| 10   | cause found     | C6       |                                                                                        |
| 11   | cause found     | C6, C7   |                                                                                        |
| 12   | cause found     | C6       | the upper chair buries                                                                 |
| 13   | cause found     | C9       | dropped lines never change; cents                                                      |
| 14   | cause found     | C9       | budget votes are not logged as `legislative-vote`                                      |
| 15   | cause found     | C11      |                                                                                        |
| 16   | cause found     | C24, C17 | the count of 12 against 8 is the 200-item news cut                                     |
| 17   | viewer artifact | C24, C17 | the payload is in `source` and `personIds`                                             |
| 18   | cause found     | C4, C5   | value 1 is the enacted answer (`legislature.ts:2421`)                                  |
| 19   | cause found     | C5       |                                                                                        |
| 20   | cause found     | C9       |                                                                                        |
| 21   | cause found     | C12      | a flat $15 estimate, not Minnesota's published rate                                    |
| 22   | reader error    | C14, C15 | census count 658; 1,919 is the full-person tier                                        |
| 23   | viewer artifact | C18      |                                                                                        |
| 24   | viewer artifact | C17      |                                                                                        |
| 25   | cause found     | C23      |                                                                                        |

### Mississippi (Fayette)

| item | verdict         | cause    | note                                                                          |
| ---- | --------------- | -------- | ----------------------------------------------------------------------------- |
| 1    | reader error    | C13      | seat 1's sitting member held over; five serve                                 |
| 2    | reader error    | C13      | the pro tem was an opening officeholder re-elected June 3 (filed January 21)  |
| 3    | cause found     | C13      | no filing for seat 1; locals get no stand-in challenger                       |
| 4    | cause found     | C14      | 10 named + 1,448 or 1,451 counted                                             |
| 5    | reader error    | C8       | the county board's own 2025-002, 001 and 005 (13 bills on February 4)         |
| 6    | cause found     | C20      | probe: 6 failed, board seat 0 removed                                         |
| 7    | viewer artifact | C2       | all three refilled February 1 (two by television heads)                       |
| 8    | cause found     | C19      | refill after the first holder left                                            |
| 9    | cause found     | C16      | probe: genuinely 0 dead; deaths only follow an illness case (`health.ts:421`) |
| 10   | cause found     | C5       |                                                                               |
| 11   | cause found     | C6       |                                                                               |
| 12   | cause found     | C7       |                                                                               |
| 13   | cause found     | C4       |                                                                               |
| 14   | cause found     | C6       |                                                                               |
| 15   | cause found     | C3       | 2 filled at +90 days, 2 awaiting                                              |
| 16   | cause found     | C30      |                                                                               |
| 17   | cause found     | C9, C5   | budget bill sponsored by the president                                        |
| 18   | cause found     | C10      | cents                                                                         |
| 19   | cause found     | C10      | the law id is in the `landed` table only                                      |
| 20   | cause found     | C11      |                                                                               |
| 21   | cause found     | C22      | probe: county seat 6 holder moved within the county                           |
| 22   | cause found     | C24, C15 | +45 = cause 20, interest 16, committee 8, seller 1                            |
| 23   | cause found     | C4, C5   | value 1 is the enacted answer                                                 |
| 24   | cause found     | C5       |                                                                               |
| 25   | viewer artifact | C17      |                                                                               |

### Missouri (Benton)

| item | verdict         | cause               | note                                                                                      |
| ---- | --------------- | ------------------- | ----------------------------------------------------------------------------------------- |
| 1    | cause found     | C12                 | the repeal restores the remembered $13.75                                                 |
| 2    | cause found     | C8                  |                                                                                           |
| 3    | reader error    | C26                 | a starting law booked it; the August 14 law is the repeal (value 0)                       |
| 4    | cause found     | C27                 | tie broken by the lieutenant governor; the record shows the pre-break 17-17               |
| 5    | cause found     | C4, C6              |                                                                                           |
| 6    | cause found     | C7                  |                                                                                           |
| 7    | cause found     | C6, C7              |                                                                                           |
| 8    | cause found     | C6                  |                                                                                           |
| 9    | cause found     | C3                  | probe: 3 of 4 filled by stand-in, 1 awaiting; "no appointment" is not an appointment seat |
| 10   | viewer artifact | C16                 | probe: 5 dead, 0 records                                                                  |
| 11   | cause found     | C9                  |                                                                                           |
| 12   | cause found     | C9                  | 11 lines dropped to pass; one surviving change                                            |
| 13   | reader error    | C8                  | seven records = council and county board, both numbered 2025-001                          |
| 14   | cause found     | C5                  |                                                                                           |
| 15   | cause found     | C5                  |                                                                                           |
| 16   | cause found     | C5                  | Alaska is first in the roster order                                                       |
| 17   | cause found     | C30                 |                                                                                           |
| 18   | reader error    | C17                 | the viewer lists the first rows; the roster data is real                                  |
| 19   | cause found     | C4, C5              |                                                                                           |
| 20   | cause found     | C24                 |                                                                                           |
| 21   | viewer artifact | C24, C17            |                                                                                           |
| 22   | reader error    | `speech.ts:140-170` | the retold record's speaker is the listener who retold it                                 |
| 23   | cause found     | C23                 | filing eligibility reads minimum age (`elections.ts`); the player turns 18 two days in    |
| 24   | viewer artifact | C17                 |                                                                                           |
| 25   | cause found     | C11                 |                                                                                           |
| 26   | reader error    | C14, C15            | census count 919                                                                          |

### Montana (Craig)

| item | verdict         | cause                     | note                                                                                                   |
| ---- | --------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1    | cause found     | C15, C14, C16             | census count 172; +32 orgs = interest 14, cause 11, committee 7; 3 dead, 1 retained                    |
| 2    | viewer artifact | C16                       | the third vacancy is county board seat 0 (November 1)                                                  |
| 3    | reader error    | C2                        | both seats were filled the day they opened                                                             |
| 4    | cause found     | C4                        |                                                                                                        |
| 5    | cause found     | C6, C7                    |                                                                                                        |
| 6    | cause found     | C6                        |                                                                                                        |
| 7    | reader error    | C6                        | the upper chamber's committee stage on lower bills; upper sponsors from C6                             |
| 8    | cause found     | C31                       | -1 is a yes on a repeal                                                                                |
| 9    | cause found     | C8                        |                                                                                                        |
| 10   | cause found     | C9                        |                                                                                                        |
| 11   | cause found     | C10                       | balanced-budget law on December 15; cents                                                              |
| 12   | cause found     | C5                        |                                                                                                        |
| 13   | cause found     | C5                        |                                                                                                        |
| 14   | cause found     | C10                       | the law id is in the `landed` table only                                                               |
| 15   | cause found     | C11                       |                                                                                                        |
| 16   | cause found     | C24, C18                  |                                                                                                        |
| 17   | viewer artifact | C24, C17                  |                                                                                                        |
| 18   | cause found     | C23                       |                                                                                                        |
| 19   | reader error    | C21, `legislature.ts:817` | the id suffix is the bill table size, not the number                                                   |
| 20   | viewer artifact | C20                       | outcomes are in the recalls table                                                                      |
| 21   | viewer artifact | C13, C17                  | the coroner contest exists (November 3, 2026); filings dated January 3, 2026; no local contest in 2025 |
| 22   | viewer artifact | C17                       |                                                                                                        |
| 23   | cause found     | C12                       | the value is the state target; the "FED" label comes from the viewer's pattern, level not confirmed    |
| 24   | viewer artifact | C18                       |                                                                                                        |

### New Hampshire (Bartlett)

| item | verdict         | cause                 | note                                                                                                               |
| ---- | --------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1    | cause found     | C7                    |                                                                                                                    |
| 2    | reader error    | C32                   | three-seat town board against seven-seat county board                                                              |
| 3    | reader error    | C32                   |                                                                                                                    |
| 4    | reader error    | C32                   | one per body                                                                                                       |
| 5    | cause found     | C5                    |                                                                                                                    |
| 6    | cause found     | C14, C13              | 1,766 of 2,003: the incumbent against unknown challengers among 1,964 counted ballots; per-voter appeal not traced |
| 7    | cause found     | `voting.ts:1834-1840` | a candidate votes for themselves; counted voters gave them nothing                                                 |
| 8    | viewer artifact | C17                   | probe: 26 contests, 3 local results                                                                                |
| 9    | cause found     | C3                    |                                                                                                                    |
| 10   | viewer artifact | C16                   | probe: 6 dead, 0 records                                                                                           |
| 11   | cause found     | C3                    | 5 vacant on June 30                                                                                                |
| 12   | cause found     | C4                    |                                                                                                                    |
| 13   | cause found     | C6                    |                                                                                                                    |
| 14   | cause found     | C7, C9                | same roster and axis; the budget number is the next in the House's counter                                         |
| 15   | reader error    | C32                   | the county board's bills are county law                                                                            |
| 16   | cause found     | C4                    | meetings every 15 days plus 30                                                                                     |
| 17   | cause found     | C5                    |                                                                                                                    |
| 18   | cause found     | C9                    |                                                                                                                    |
| 19   | cause found     | C10                   | cents                                                                                                              |
| 20   | viewer artifact | C18, C17              |                                                                                                                    |
| 21   | cause found     | C11                   |                                                                                                                    |
| 22   | cause found     | C30                   |                                                                                                                    |
| 23   | viewer artifact | C18, C24              |                                                                                                                    |
| 24   | reader error    | C14, C15              | census count 312                                                                                                   |
| 25   | cause found     | C23                   |                                                                                                                    |
| 26   | viewer artifact | C17                   |                                                                                                                    |

## Method

I read the seven "Needs a why" lists, the raw `audit/<place>.txt` files and the code. Where code alone could not settle an item, I rebuilt each world (same place, same seed as the raw file's header, one game year in dev mode) in scratch scripts outside the repository and read the tables directly. The rebuilt worlds match the raw files on people, alive and organization totals, vote totals and vacancy dates, so I cite them as "probe". No game code was changed. The verdict counts above come from the tables in this file.

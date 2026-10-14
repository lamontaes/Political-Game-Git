# TRACE-1 verification (Sonnet verifier, read-only)

All 18 claims are confirmed in the raw files and traced to code. Sixteen are game behavior (ENGINE), two are artifacts of the viewer script (C3 and C17, where C17 also has tracer gaps), and none is NOT FOUND. C5, C16 and C18 rest partly on reading code that I did not run.

Summary of verdicts:

| Claim | Verdict                          | Cause                                                                                                                                       |
| ----- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| C1    | ENGINE (and VIEWER counter)      | `retainLog` state.ts:703 drops the official's `life.death`; viewer counts kept log rows only                                                |
| C2    | ENGINE                           | `members()` legislature.ts:920 -> `holderOf` officials.ts:833 -> `fillInIdentity` officials.ts:604; orgs made in many handlers; no log rows |
| C3    | VIEWER                           | viewer.ts:101 regex, :209-211 `high` slice, :233-241 wrong module ids                                                                       |
| C4    | ENGINE (hypothesis partly wrong) | `fillVacancy` offices.ts:849; stand-in calendar fill offices.ts:949-956 and :1000                                                           |
| C5    | ENGINE                           | `monthlyReview` moves.ts:956 + `livesWithin` offices.ts:172-183 (inferred)                                                                  |
| C6    | ENGINE                           | `endOfSession` world-legislating.ts:613 -> `holdSession` :433                                                                               |
| C7    | ENGINE                           | `houseOffice` world-legislating.ts:258-267; `budgetChambers` legislature.ts:545-549                                                         |
| C8    | ENGINE (bug)                     | world-legislating.ts:648 passes an office id; `templateOf` leadership.ts:113-138                                                            |
| C9    | ENGINE                           | `electionBehind` offices.ts:669-693 + tenure.json:53,59                                                                                     |
| C10   | ENGINE (data)                    | laws.ts:93-95; starting-law.json; legislature.ts:2385-2386                                                                                  |
| C11   | ENGINE                           | group-b.ts:284-292, group-b-money.ts:427-445; budgets-treasury.ts:682-749                                                                   |
| C12   | ENGINE                           | `personStance` campaign-views.ts:231; `chamberVote` legislature.ts:1690-1698                                                                |
| C13   | ENGINE (record shape)            | `nextNumber` legislature.ts:750-757; record.ts:98-107                                                                                       |
| C14   | ENGINE (data gap)                | elections-calendar.ts:472 -> :143; voting.ts:1976-1982                                                                                      |
| C15   | ENGINE (by design plus stopgap)  | offices-state.ts:484-489; legislature.ts:294; budgets.ts:883-893                                                                            |
| C16   | ENGINE                           | population.ts:1106-1110; jobs.ts:821-866                                                                                                    |
| C17   | VIEWER plus tracer               | viewer.ts:136-149; dev-trace.ts:89 and :68-76                                                                                               |
| C18   | ENGINE (bug plus missing log)    | recalls.ts:183-185 and :284-349                                                                                                             |

Dice and constants noted across the audit are at the end.

## C1 deaths: 0 although people die and seats are vacated for "death"

Verdict: ENGINE. The hypothesis is right. The viewer's counter also only sees kept log rows.

Evidence:

- `alabama.txt:4` shows people 1913, alive 1908, so five full people died. `alabama.txt:216` says `deaths: 0`.
- `alabama.txt:451` shows seat:US-AL:lower:074:0 vacated September 2, 2025, cause "death". `alaska.txt:205`, `arizona.txt:418`, `connecticut.txt:188`, `florida.txt:421-422`, `georgia.txt:448-451`, `puerto-rico.txt:432` show more.
- Delaware is the one place with `deaths: 1` (`delaware.txt:217`). That death has witnesses in the player's circle (`delaware.txt:221-228`).

Cause, who kills a legislator: `createHealthModule` onDay in `src/core2/modules/health.ts`. Officials are full people, so they get a health record. The death day comes from a seeded per-person resilience line (health.ts:181-225, `found.deathDate = addDays(date, days)` at :418). On that day:

```
api.updatePerson(id, { alive: false });   // health.ts:438
api.emit(event);                          // kind "life.death" (data/health.json:6)
```

Who vacates the seat: `OFFICES_MODULE.onEvent` offices.ts:132-136 (`eventKinds: ["life.death", MOVED_AWAY_EVENT]`):

```
if (event.kind === "life.death") vacateSeat(api, term.seatId, "death");
```

Why the log has no death: the event built in `caseEvent` (health.ts:372-390) sets `witnessIds: hearers(...)` but no `publicRecord` and no `news`. `retainLog` (state.ts:691-703) returns early:

```
if (!core.observer && !circle && !publicRecord && !news) return;   // state.ts:703
```

An official far from the player is not in the circle, so the record is dropped. `seat-vacated` is kept because `vacateSeat` sets `publicRecord: true, news: true` (offices.ts, emit in `vacateSeat`).

Viewer part: `scripts/trace/viewer.ts:98` counts `fresh` durable-log rows whose kind matches death. That cannot see dropped rows.

Dice note: the death date is a seeded hash line (generation of who exists), not a roll on an act. The mortality parameters are data.

## C2 people and organizations grow with no matching records

Verdict: ENGINE. Growth is real, comes from several code paths, and none writes a log row.

Evidence: `alabama.txt:1` people 1811, orgs 120; `alabama.txt:4` people 1913, orgs 175. `arkansas.txt:1` orgs 111; `arkansas.txt:4` orgs 166. Alabama logged one `person-birth` and two `person.moved-away` (`alabama.txt:5`).

People added, with no log row in `fillInIdentity` (state.ts:2092) or `fillInPerson` (state.ts:1836):

1. Lazy officials, the biggest source I can see. `members(api, officeId)` loops every seat and calls `holderOf(api, term)` (legislature.ts:920). `holderOf` (officials.ts:833) calls `seatOfficial` (officials.ts:854), which calls `seatAll` and `fillInIdentity` (officials.ts:604) for a holder who is not yet a person. Any bill vote, committee or budget that reads a whole chamber turns every member into a full person. Alabama's two chambers are 105 + 35 seats, which is the right size for +102. I could not prove the exact split without running.
2. Candidates: `fillInPerson(... id)` candidacy.ts:695; the officials' challenger `fillInIdentity` officials.ts:1275.
3. Door-knock fill-in campaigns.ts:756; staff hires staff.ts:538-539.
4. Births and moves: `person-birth` and `person.moved-away` are logged.

Organizations added through `api.addOrganization` (state.ts:1604) in handlers that mostly emit nothing: lazy government treasuries (budgets.ts:244, :606), interest groups (interest-groups.ts:203, :469), campaign committees (campaigns.ts:362), ad sellers (campaigns.ts:870), media outlets (press.ts:418, campaigns.ts:1500), parties (parties.ts:191). Cause groups are logged (`cause-group.founded=21`, `alabama.txt:5`; drives.ts:1383). So "no founding records" is only partly true.

## C3 "election-ish kinds:" empty, "0 of N", "Unregistered module table"

Verdict: VIEWER for every part.

1. Regex. `viewer.ts:101` is `/elect|ballot|result|sworn|term|vacan|appoint/`. The kind is `seat-vacated` ("vacat", not "vacan") and `candidate-filed` has no match. So they never count. `election-ish kinds:` is empty in Alabama (`alabama.txt:217`) because no `election-result` row was kept that year. Puerto Rico shows `E` lines (`puerto-rico.txt:215-218`) because `election-result` matches "elect".
2. "contests: 0 of 33" (`alabama.txt:395`). The `high` filter (`viewer.ts:209-211`) tests `JSON.stringify(r).slice(0, 400)`. A regular contest is built as `{ ...dates, id, officeId, ... }` (elections.ts:360-362) and `dates.sources` holds long citation strings, so `officeId` falls past character 400. The only high contest found is California's special one (`california.txt:394-396`), which is built with `id` first (elections.ts:433). That fits.
3. "Unregistered module table" (`alabama.txt:397-411`). The viewer asks the wrong module for each table (`viewer.ts:233-241`):
   - `vacancies` lives in `core2-offices-v1` (offices.ts:128), not elections.
   - `contests` and `filings` live in `core2-elections-v1`, not `core2-voting-v1`. Voting's tables are chosen, ballots, results and others.
   - `campaigns` lives in `core2-campaigns-v1`.
   - Executive `offices` and `terms` are in `core2-offices-v1`; executive owns appointments, orders, desk, review.
   - `governments` and `budgets` live in `core2-budgets-v1`, not legislature.

## C4 vacancies get no special election or appointment

Verdict: ENGINE. The hypothesis is only partly right: seats are filled, but silently, and the dump hides it.

Evidence: `alabama.txt:448-454` (six vacancies, rule special-election); `arizona.txt:73, 417-419` (three "appointment" vacancies); `california.txt:394-396` (one real special contest, October 30, 2025).

What fills a vacancy, `fillVacancy` offices.ts:849:

- `remains-vacant`: nothing.
- `successor` and `appointment`: `appoint()` (offices.ts:861) writes a new term with `seatNamedOfficial`/`seatResident` and `reached: "appointed by ..."`. It emits nothing. `official-appointed` is emitted only by executive.ts:278 for the town's department heads. So Arizona's three appointments have terms but no log row.
- `special-election`: the date is `specialElectionDate` (elections-calendar.ts:651-685). Only California has a state row (`special-election-law.json`, `states` has just `US-CA`), and it has no senate row. Everything else uses `specialElectionDaysEstimate` = 90 days (parameters.json:16, an ESTIMATED value). So California's Aug 1 vacancy gives Oct 30 (matches the contest id).

Why most have no contest: a real race opens only if `specialContestFor` (elections.ts:390, :399) finds the seat among `townSeats`, which keeps only `seat.coversTown` seats (offices.ts:782). A state-house or U.S. House seat in another district is not one. Then offices.ts:949-956 schedules a calendar item and `officesCalendarWork` (offices.ts:1000, stand-in at :1041) fills the seat on the date with a stand-in appointee ("the special election (stand-in)", registered `SG-GOV-special-election-appointee`). It writes no log row.

- Alabama: vacated 05-01, 06-01 and 09-02 get dates 07-30, 08-30 and 12-01, so those seats were filled in-year, silently. The 11-01, 12-01 and 01-01 vacancies land after the viewer's end date (01-20).

## C5 officials "moved away" on the 1st of the month

Verdict: ENGINE. Not a dice roll. The "move" itself looks like a bug (inferred from the code, not run).

Evidence: `alabama.txt:123` and `448-454` (05-01, 06-01, 11-01, 12-01, January 1, 2026); `california.txt` us-senate:1 08-01.

Cause, why the 1st: `scheduleReview` (moves.ts:932-952) books `moves-review` for the 1st of each month; `onCalendarWork` (moves.ts:1083-1086) runs `monthlyReview` (moves.ts:956).

Why officials: `monthlyReview` takes every living person at or over the minimum age whose tier is not `husk` (moves.ts:958-964). Officials are full people with tier `"calendar"` (officials.ts:614, data/officials/officials.json:272), so they are included.

How it decides, with no dice: each month `accumulate` (moves.ts:793-) adds a pull from the ACS rate for the person's age band (`lifeStageRate` moves.ts:162), scaled by their pushes and ties. Then `decide` (moves.ts:866-912) scores stay vs move through `decisionFromScores` (choice.ts:292), a plain highest-score pick with a key tie-break. The ACS rate is "leaving the county" and is applied to officials as if they were town residents.

Why it vacates the seat (the likely bug): an official's `placeId` is the state key, for example `"US-AL"` (officials.ts:609, `stateKey` from officials.ts:360 and :416). `destinationFor` finds no county or relative, then:

```
const place = lifePlaceByJurisdictionId(person.placeId as EntityId);   // null for "US-AL"
...
destinationId: state ?? person.placeId,                                 // moves.ts:546 -> "US-AL"
```

The event carries `person:<id>:residence = "US-AL"`. In `livesWithin` (offices.ts:172-183):

```
const to = destination ? lifePlaceByJurisdictionId(destination as EntityId) : null;
if (!to) return false;       // offices.ts:183
```

Jurisdiction ids are hashed ids, so `"US-AL"` should not resolve (life-places.ts:862-880 looks up by `context.jurisdiction.id`). So the check returns false and `onEvent` calls `vacateSeat(api, termSeat, "moved away")` (offices.ts:137-143). Every official who "moves" therefore loses the seat, even when the destination is still inside the state. I did not run it, so please confirm by checking one official's `person.moved-away` row.

## C6 ~50 bills on one day, all in the lower chamber

Verdict: ENGINE, by design of the session model.

Evidence: `alabama.txt:414` (53 on May 19, 2025), `alaska.txt:366` (52), `arizona.txt:394` (52), `california.txt:415` (54), `puerto-rico.txt:403,405` (52 and 47). Lower holds all (`alabama.txt:414-417` shows no upper rows). Committee "general", `yes=0 no=0`: `arkansas.txt:306-309`, `puerto-rico` rows.

Cause:

- One day: `openWorldLegislating` schedules a `session-end` on the state's recorded floor day (`agendaDate` world-legislating.ts:184-189 uses `adjournAt`, or for a full-year body the end of `fullYearSessionAgendaMonth` = 6). `endOfSession` (world-legislating.ts:613) then calls `holdSession` (:433), which drafts every bill for the session in one go (`draftBill` at :549, `introduced = api.state.date`).
- Only lower: `holdSession` is given `body: lower` (world-legislating.ts:638) and drafts with `bodyOfficeId: input.body!.id` (:550). `filers` are all members of every chamber, so a sponsor can be an upper-chamber member (see the Arizona bill ids, `arizona.txt:90, 113`). The upper chamber votes the same bill later via `chambersOf` (legislature.ts:1640-1665).
- Same two chairs: `committeeStage` (legislature.ts:1791) seats members by seniority and chairs with the most senior majority member (:1846). `committeeFor` (:1768) returns "general" unless the first provision is a budget line, tax or minimum wage.
- Holds record 0-0: `heard` is chair position plus trait lean >= 0 (:1861). The yes/no tally is computed only `if (heard)` (:1909). A held bill gets kind `bill-held-in-committee` with `yes=0 no=0` (:1932). In `holdVote`, a bill not reported fails in its first chamber (:1980).
- How many: one bill per question and direction where some member's reasons favor a change (`holdSession`, world-legislating.ts:433-500); bills past `floorTime` die (`dieOnCalendar` :563, `reached` :560).

Constants (not dice): `floorBillsPerLegislativeDay` = 6, `fullYearSessionAgendaMonth` = 6, in `data/campaigns/parameters.json`.

## C7 Congress inside each world

Verdict: ENGINE.

Evidence: `alabama.txt:417` (24 federal bills on December 15, 2025 under `office:US-AL:us-house`), `alabama.txt:442` (president sponsors the budget bill), `alabama.txt:457` and `arkansas.txt:444` (253-180, 68-32 versus 433-0, 100-0).

Cause:

- Body id: `houseOffice` (world-legislating.ts:258-267) takes the first office whose kind starts with `us-house` from the offices table, which holds only the town state's House office. The budget does the same: `budgetChambers` (legislature.ts:545-549, `introducedIn: house.id`).
- Everyone files and votes: filers are all House and Senate members (world-legislating.ts:660). `members(FEDERAL_HOUSE)` builds the whole of Congress (`congressMembers` legislature.ts:953). That is why a Washington member can sponsor.
- The president as sponsor: `councilBudget` (legislature.ts:305-306) uses `priorities?.setBy`.
- Same day: `congressAgendaDate` (world-legislating.ts:167-173) is day-of-year 349 = Dec 15 (`congressAgendaDayOfYear` TUNABLE, parameters.json:298-299), scheduled at world-legislating.ts:82.
- Why votes differ by world: a member's vote is the sign of `positionOn` (legislature.ts:1242) which adds views, constituents, sponsor, party, wing, ambition, press. For the budget `total = position.total - position.sponsor + budgetAdoptionDuty` (legislature.ts:328, value 0.3). Each member's ideal and wing are drawn from the world seed (`drawOfficial` officials-roster.ts:160). So the roll call changes per world, and 433-0 is where the 0.3 duty beats everyone's views.

## C8 "council-president" in a U.S. House chamber-organized row

Verdict: ENGINE bug.

Evidence: `alabama.txt:464` (December 15, 2025, `council-president: official:term:seat:US-AL:us-house:06:...`), `district-of-columbia.txt:192, 446` (`...us-house:98`).

Cause: `endOfSession` (world-legislating.ts:648):

```
const elected = lower ? leaderOf(api, lower.id, "majority-leader") : null;
```

For Congress `lower` is `houseOffice(...)`, so `lower.id` is an office id like `office:US-AL:us-house`, not `FEDERAL_HOUSE`. `leaderOf` calls `organize` (leadership.ts:559-565, :288), which uses `templateOf` (leadership.ts:113-138). That function only maps the string `federal:us-house` to the federal template (:114). An office id of kind `us-house` falls past the `legislature-` checks (:120-122) and ends at `council-manager` (:135-137). That template has one post, `council-president` (`chamber-leadership.json`, `council-manager:posts`). `organize` then emits `chamber-organized` (leadership.ts:403) for the state's House delegation. The template has no `majority-leader`, so `elected` is null and the leader falls back to the senior majority member (world-legislating.ts:649-655).

## C9 constant past-election shares and one-party statewide history

Verdict: ENGINE. Constants, not draws. Recorded history only.

Evidence: `alabama.txt:361-` terms. Counts in `alabama.txt`: 17 rows at `"share":0.56`, 12 at `0.635`, no other value; `california.txt` the same (15 and 12).

Cause: `pastTerms` (offices.ts:562) writes earlier terms that copy the sitting holder (`...term`, offices.ts:650-655) with `won(from)` = `electionBehind` (offices.ts:669-693), which returns `share: tenureYears(key)`. The values are in `data/offices/tenure.json`: `stateLegislatorWinnerShare` 0.635 (line 53), `statewideExecutiveWinnerShare` 0.56 (line 59), both tagged ESTIMATED.

One party: past terms copy the holder's party. The holder's party comes from real roster data (`statewidePartyOf` offices-state.ts:468; governor from NGA) and, where unrecorded, from the state's lean (`unrecordedParty` officials.ts:326: Republican if the state leans right, else Democratic, a registered stopgap). So California all-Democratic and Alabama all-Republican are consistent with sourced data.

Seeded career length: offices.ts:604-608 (hash of world seed and seat). That is generation of who exists, so allowed.

## C10 federal laws take effect on the same dates in every world

Verdict: ENGINE (data and rule). Correct for sourced law, simplistic for Congress-made law.

Evidence: `alabama.txt:7-15` (January 1, 2026 income-tax 37 and social-security-tax 6.2; December 15, 2025 policy questions; October 1, 2025 medicaid-match and snap-maximum).

Cause:

- January 1, 2026 and October 1, 2025: sourced rows in `src/core2/data/laws/starting-law.json` (income-tax 37 effective January 1, 2026 at line ~47; SNAP FY26 effective October 1, 2025). `openLaws` schedules each row with a future date as a `law-takes-effect` item (laws.ts:93-95).
- December 15, 2025: Congress's floor day (see C7). A federal act with no date takes effect when enacted: `const defaultDate = (federal ? api.state.date : null) ?? ...` (legislature.ts:2385-2386), then `lawTookEffect` runs at once (laws.ts:479-480).

## C11 balanced-operating-budget cuts every federal line; one retiree's check falls 29%

Verdict: ENGINE.

Evidence: `alabama.txt:285-288` (veterans line, `deltaMinor=-11082535724668`, measure ends `#balance#December 15, 2025`); `alabama.txt:294-301` (retirement claim 160545 -> 113370).

Cause, the handler: `case "balanced-budget"` in `src/core2/law-reach/group-b.ts:284-292` calls `moveBudget` with `lawId: \`${input.lawId}#balance\``and`plan: (_gov, budget) => balancePlan(budget)`. `balancePlan` (group-b-money.ts:427-445):

```
const ratio = Math.min(1, (spending - revenue) / cuttable);   // :439
out[line] = -Math.ceil(minor * ratio);                        // :443
```

So every line except interest is cut by the same ratio. Veterans is just the line the viewer picked; the others have rows too. `moveBudget` (group-b-money.ts:366) amends each line (`amendBudget`, :405) with `measureId: stamp` (:385).

Why in every world: Congress enacts the federal "balanced-operating-budget" policy question on December 15, 2025 in each world (C7), and the federal starting answer and budget are the same.

The retiree: `applySocialSecurityLevel` (budgets-treasury.ts:701) is called after the budget changes (budgets.ts:211). `socialSecurityLevel` (budgets-treasury.ts:682-690) is the federal socialSecurity line now over its base. It sets each retirement obligation to `Math.round(baseOf(id, amount) * level)` (:720) with `accounts.setObligationAmount` (:744), then `landOn` (:566) writes `law.effect-landed` (:582). 113370 / 160545 = 0.706, so the line fell 29.4%.

## C12 repeated tallies

Verdict: ENGINE. Deterministic, not a fixed rule, but low-dimensional.

Evidence: `alabama.txt:45, 53, 61, 69, 77` (board 4-3 five times); `alabama.txt:138, 144, 156` (lower 76-29 three times) and `141, 170, 153` (upper 27-8 three times); `arizona.txt:25-52` (board 5-0, all recorded positions "1" in the first block; the file also has 23 `-1` rows elsewhere).

Cause: `chamberVote` (legislature.ts:1676, vote at :1690-1698): yes if `position.total > 0`, no if `< 0`, else abstain. For a town member without an officials row, `positionOn` (legislature.ts:1242) uses `viewOn(...) * stance.position` (:1264) and `personStance(home, ...)`. `personStance` is `lean * questionAxis(question)` (campaign-views.ts:231-233): one number per member on a single left-right axis. So every bill splits the members the same way and only the question's sign flips the sides. A board with a fixed lean order shows the same 4-3 each time. State chambers repeat when the party and wing terms from `officialParts` dominate. Bills reach the floor only when some member's own reasons favor them (`holdSession`), and the sponsor term adds to the sponsor's side, so 5-0 boards are expected.

No dice. Party-line is the result of the single-axis model, not a coded rule.

## C13 same local measure number for different questions

Verdict: ENGINE (record shape). By design the number is per body.

Evidence: `alabama.txt:17` (measure 2025-001, partner-with-federal-immigration-enforcement, board) and `alabama.txt:38` (measure 2025-001, ban-discrimination-in-housing-and-work, council).

Cause: `nextNumber` (legislature.ts:750-757) keys its counter by `${officeId}:${year}`, so each body numbers from 2025-001. `recordVote` puts the body only in the source citation (record.ts:98) and the log facts hold `measureId`, `question`, `position` and no body (record.ts:103-105). The vote row id is `vote:${measureId}:${personId}` (record.ts:74), unique only because a person sits in one body. So the log cannot say which body voted.

## C14 Puerto Rico: Nov 2025 municipal election, empty seats

Verdict: ENGINE (data gap).

Evidence: `puerto-rico.txt:205-218` (filings June 12, 2025, results November 4, 2025); `puerto-rico.txt:218, 225` (`board:3` and `board:10` with `winnerId ""` and `totals {}`); `puerto-rico.txt:415-418` (74 failed, 2 enacted, 10 vetoed); `puerto-rico.txt:438` (budget 53-0, 28-0).

Cause, the date: the municipio board is a county-level office. `nextFrom` (elections-calendar.ts:433) asks `nextCountyElection`; with no read calendar for Puerto Rico it falls to `stateAndFederal(office, stateKey, from)` (elections-calendar.ts:472), which uses `novemberGeneralElectionDay(year)` (:143) for the first year at or after today. That is Nov 4, 2025. The municipal law corpus has 51 rows (50 states and D.C.): `municipalRulePackFor("PR")` returns null (municipal-ballot-rules.ts:70, municipal-election-rule-packs.ts:175), so nothing could say Puerto Rico votes in presidential years.

Cause, empty seat: `holdElection` totals only the people who filed. With none, `winnerId` is null (voting.ts:1976-1982) and the row is emitted with `winnerId: ""` (voting.ts:2041); the seat keeps its holder and `openNextCycle` runs (voting.ts:2062). Filing is by the holder's trait-based decision (`fileStandingCandidates` voting.ts:937; incumbent is "whoever holds the seat", :948) and by residents deciding to run. For `board:3`, the seat had been vacated on 03-01 (`puerto-rico.txt:180`) and refilled by appointment, and no one filed.

Unopposed totals near 2440 are the full electorate count for a lone candidate (voting.ts holdElection counted-voter loop).

## C15 District of Columbia

Verdict: ENGINE (by design plus a registered stopgap).

Evidence: `district-of-columbia.txt:333` (`office:US-DC:mayor`, level "state"); `:183-184` (`US-DC` legislature vote 12-0; `place:1150000` "carried forward by the budget rule...").

Cause:

- Mayor level: `stateOffices` (offices-state.ts:484-489) builds every executive in `data/research/offices/state-offices.json` as `level: "state"`, and D.C. is listed there with executive key "mayor". So D.C. is treated as its own state.
- 12-0: the legislature office has 12 seats (`district-of-columbia.txt:346`+); the chair is a separate office `council-chair` (`:335`). The vote uses `budgetAdoptionDuty` 0.3 (legislature.ts:328).
- Carry-forward: the city government `place:1150000` has no city-level `council` office, so `budgetChambers` finds no body (legislature.ts:565-566) and `councilBudget` returns null (legislature.ts:294). `adoptBudget` then calls `carriedBudget` with the fixed text (budgets.ts:883-893), registered `SG-GOV-budget-adopted-by-rule` (budgets.ts:888). D.C. therefore has two governments (a state-level one and a city-level one), and the city one never votes.

## C16 unattended player ends with job none and $0

Verdict: ENGINE.

Evidence: `arizona.txt:219`, `california.txt:219`, `colorado.txt:232`, `connecticut.txt:217`, `delaware.txt:219`, `puerto-rico.txt:230` show `job=none cash=$0`. The other six show a job and cash.

Why $0: the player is the resident nearest 18 (`entrantOf` bench/world.ts:97-117, used at :237). Opening cash is set by household role: `cash.set(id, adultIndex >= 0 ? share(reserve) : 0)` and the same for living cost (population.ts:1106-1110). A household member in the "child" role gets 0 cash and 0 living cost, so nothing is spent and nothing is earned. A player with an opening job (Server, Cook, Sales associate) is paid wages. I read the role split from the code but did not check each place's household skeleton. Georgia's $29,215 and Finance Director are an adult-role member.

Why no job later: `reviewJobless` (jobs.ts:821) lets full people aged 18 to 65 (`workingAge` data/jobs/jobs.json:1839; check at jobs.ts:848) choose "look" or "wait". The pull is `jobsUnemployedNeedWeight` divided by one plus the days the household's money covers (jobs.ts:859-866). A household with cash-days to spare, or a zero-cost player, gets little push. Not found: a place that gives an unattended player income other than an opening job or this search. I did not trace why these six chose "wait".

## C17 trace chains stop before a reason

Verdict: VIEWER first, with two gaps in the tracer and in the records. `traceNode` is at `src/bench/dev-trace.ts:221`.

Evidence: `arkansas.txt:315-324` (vote chain bounces between the job and the person), `arkansas.txt:255-264` (budget line to treasury to region), `arkansas.txt:277-286`, `arkansas.txt:326-331` (vote-recorded has only perceived).

Causes:

1. The viewer's walker (`viewer.ts:136-149`) takes the first "reason", else "learned", else the first record child not named placeId/personIds/witnessIds/householdId/memberIds, else `children[0]`. It has no visited set, so a person <-> job pair repeats (job -> person via `core.jobs.personId`, person -> job via `saved-trace.job`). For `budget-line-changed` it follows `governmentId` (treasury -> region) and skips the `measureId` child that the node does list (`arkansas.txt:262`).
2. The tracer's child cap. `namedIds` stops at `MAX_CHILDREN` = 80 (dev-trace.ts:38, :89). A federal `legislative-vote` row lists every member in `personIds` (hundreds) before `facts.billId`, so `facts.billId` is never reached. The log row therefore shows no link to the bill, and the bill holds the votes and their `position` reasons (reverse link dev-trace.ts:172).
3. `vote-recorded` facts hold only `measureId` (a bare number like "2025-023"), `question` and `position` (record.ts:103-105). The vote row is `vote:<measure>:<person>` in the record module (record.ts:74), but nothing in the log row names that id, and `reverseLinks` handles only `core2-legislature-v1.votes` (dev-trace.ts:172), not the record module's table.
4. `findRecord` (dev-trace.ts:68-76) returns the first module whose table holds the id. In Arkansas `lawId` resolved to `core2-outcome-web-v1.laws` (`arkansas.txt:281`), so the law branch that finds the enacting bill (dev-trace.ts:128, which tests the laws module id) did not run. That law is a starting-law row anyway (no `enactedBy`), so there is no vote to find.

## C18 recall petitions never reach a vote

Verdict: ENGINE. Two real defects: a wrong-body lookup and no log rows for outcomes.

Evidence: `arizona.txt:76-80` (five petitions March 6, 2025), `arizona.txt:5` (`recall-petition=5`), `california.txt:5` (129) and `california.txt:435` (119 matched as federal or state).

Path: `weighOrdinance` (recalls.ts:167) runs on `law-took-effect` for city and county laws. It finds the enacting bill, then for each member who voted yes or no it picks an organizer and signers by grievance plus a trait lean (recalls.ts:210-244) and emits `recall-petition` (:255). A `petition-due` calendar item runs `recallWork` (recalls.ts:284): enough signatures set status "on-ballot" and schedule `recall-vote` after `recallElectionDays`; otherwise "failed". `recall-vote` counts and calls `vacateSeat(..., "recalled")` (:349).

Defects:

1. The bill lookup is `b.number === measure && provisions match series` (recalls.ts:183-185). Bill numbers are per body (see C13), so a city or county ordinance "2025-001" also matches a state or federal bill with the same number and question. `votesOn` then returns state legislators, and petitions are filed against state seats. That is the likely reason California has 119 federal or state petitions. Inferred from the code, not shown in the raw file (no petition rows are printed for California).
2. `recallWork` never calls `api.emit`; the only `emit` is the petition (recalls.ts:255). A failed petition, ballot or result changes a table row and writes no log row, so the viewer cannot show an outcome. Circulation time (`rule.circulationDays`, recalls.ts:247) can also run past the year's end.

## Dice, constants and named places seen

- No seeded roll decides what an actor does in the code I read. Seeded hashes decide who exists: career length (offices.ts:604-608), health conditions and resilience lines (health.ts:153-196), officials' ideals (officials-roster.ts:160), newcomers (officials.ts:1256-1262). Those fit the "generation of who exists" allowance.
- Fixed constants that shape outcomes: `budgetAdoptionDuty` 0.3 (decides unanimous budgets, C7, C15); `congressAgendaDayOfYear` 349 (Congress acts only on Dec 15, C7, C10); `specialElectionDaysEstimate` 90 (C4); winner shares 0.56, 0.635 (history only, C9); `floorBillsPerLegislativeDay` 6 and `fullYearSessionAgendaMonth` 6 (C6). All are tagged TUNABLE or ESTIMATED in data.
- Fixed percent by rule: `balancePlan` cuts every line by one ratio (C11).
- No state, city or GEOID is named in the logic I read. The only hit was a comment at `population.ts:1310`. D.C. and Puerto Rico behavior comes from data gaps (C14, C15), not from named code.

## Method

I read the raw files in the trace-audit raw folder and the code by hand. Nothing was run. Where a cause is an inference from reading code, the section says so.

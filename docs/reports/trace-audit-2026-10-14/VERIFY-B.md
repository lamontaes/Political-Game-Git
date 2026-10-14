# Verification, batch B

Most of what the five place reports call missing or odd is the viewer's own doing; a smaller set are real defects, listed at the end.

Each cause is stated once as C1 to C40. The tables then give a verdict for every item.

Verdicts: cause found (CF), not found (NF), viewer artifact (VA), reader error (RE). "Stopgap" means a row in the stopgap file; "none" means no registered stopgap covers it.

## Shared causes

### Viewer and log artifacts (the file is not the world)

**C1. The viewer's local news list is the oldest 200 items only, and leaves out records the player's circle witnessed.**

`scripts/trace/viewer.ts:96`, `src/bench/calendar.ts:84-93`, `src/core2/state.ts:690-715`.

```
newsItems(): [...durableLog.values()].filter(visibility "public"|"news").reverse()   // newest first
viewer: local.slice().reverse().slice(0, 200)                                        // oldest 200 printed
```

Raw proof: Nebraska prints 200 of 259 local items and ends at October 1, 2025 (the year runs to January 20, 2026); Nevada 200 of 325; New Jersey 200 of 354 and ends at June 30, 2025 (`new-jersey.txt:214`). Records whose visibility is "circle" are never listed (calendar.ts:85). Stopgap: none (tool defect).
Explains: everything "not in the file" after the cut date, e.g. NE 21, NV 2, NV 4, NJ 3, NJ 1's results, MP 5.

**C2. The viewer prints federal news only for `law-took-effect`.**

`scripts/trace/viewer.ts:92`: `fed.filter((n) => n.kind === "law-took-effect").slice(0, 25)`. Federal votes, budget lines and bills are not printed, only counted. The bill dump prints one sample federal bill and one "sample state bill" chosen by regex (`viewer.ts` bills block, `/US-[A-Z]{2}:/` also matches `office:US-MP:us-house`), so the "state bill" is the federal bill. Stopgap: none.
Explains: AS 15, MP 14, MP 15.

**C3. The viewer asks for tables under module ids that do not hold them.**

`scripts/trace/viewer.ts:233-241` versus the real tables:
`filings` and `contests` live in `core2-elections-v1` (`elections.ts:116-128`); `vacancies` in `core2-offices-v1` (`offices.ts:128`); `campaigns` in `core2-campaigns-v1` (`campaigns.ts:213`); `governments` and `budgets` in `core2-budgets-v1` (`budgets.ts:166-167`); `core2-executive-v1` has only `appointments, orders, desk, review` (`executive.ts:95-99`), so no `offices` or `terms`; the executive's sign or veto record is `desk` (`executive.ts:505-512`). Stopgap: none.
Explains: NE 4, NV 21, NV 22, NJ 24, AS 6, AS 7, MP 21, and every "no veto record" claim (NV 11).

**C4. The viewer's dump filter tests only the first 400 characters of a row, and the second terms dump only shows state lower and upper seats.**

`scripts/trace/viewer.ts:209-210` (`isHigh(JSON.stringify(r).slice(0, 400))`), `viewer.ts:221-232`, `viewer.ts:185` (long fields cut at 200).
Contest rows start with `electionDate, primaryDate, filingDeadline, basis, sources` (a long string, `nevada.txt:387`), so the `id`, `seatId` and `level` that the regex needs usually fall past character 400. That is why "contests: 0 of 30" and "1 of 20" print while filing ids name 2026 contests (NE filing `...coroner:0:2026-11-03`). The later `terms: 0 of N` is the second filter (`/US-XX:(lower|upper)/`, limit 12), which matches nothing in a unicameral state or a territory. Stopgap: none.
Explains: NE 4, NV 21, NV 23, AS 8, MP 20, MP 22.

**C5. The viewer's yearly counts leave out records that already existed at build, and its federal/state dump counts a different scope.**

`viewer.ts:53` (`seenIds` = the log at build) and `viewer.ts:69` (`fresh`), against the dump's regex over id and facts (`viewer.ts:276-283`).
Opening-day records (chamber organization on January 20, 2025) are in the dump but not in "this year"; local records (a town seat vacancy, council and board votes) are in "this year" but not in the federal/state dump. Stopgap: none.
Explains: NE 21, NE 25, NV 3, NV 4.

**C6. Trace display defects.**

`src/bench/dev-trace.ts:202-218` makes one `learned` child per person who learned a fact (same key and date for each); `viewer.ts:154-160` prints `kind:via=value` without the person id, so identical lines are different people. The chain walker (`viewer.ts:138-146`) follows the first `record` child with no visited set, so person to job to person loops. `legislative-vote` lists every member who is a person in `personIds` (`legislature.ts:1727-1730`), hence 48 ids. The per-vote reason is in the `votes` table (`legislature.ts:1701-1711`), which no trace child links to. Stopgap: none.
Explains: NE 26, NV 24, AS 17, MP 13.

**C7. A record the player's circle does not witness is dropped from the log.**

`src/core2/state.ts:690-705`, `src/core2/focus.ts:5-21`.

```
circle = personIds/witnessIds in focusPersonIds (player, family, known, household, coworkers) ...
if (!core.observer && !circle && !publicRecord && !news) return;   // not kept
```

`life.death` events set no `publicRecord` or `news` (`health.ts:362-386`), so a death among strangers is never in the file, though `alive` flips (`health.ts:438`, the only place `alive` is set false). Raw proof: NE people 1793, alive 1790, one death record; NV 1876 / 1871 / 2; AS 1733 / 1731 / 1; MP 1634 / 1630 / 0. Stopgap: none.
Explains: NV 5, AS 21, MP 1.

**C8. The wider population changes by tally, not by record, and full people are created by fill-in.**

`src/core2/modules/counted-drift.ts:1-20` (deaths, births and moves among counted people accrue as `DriftTally`, no events), `src/core2/state.ts:1836` (`fillInPerson`, called from `campaigns.ts`, `candidacy.ts`, `staff.ts`, `officials.ts`). `moves.ts:661-664` sets `tier: INACTIVE_TIER` for movers, so they stay in `core.people`. So `people` can rise with one logged birth and 23 logged move-aways. Stopgap: SG-CORE-fill-in-pooled-money, SG-CORE-counted-moves, SG-PLAY-doors-fill-in cover pieces; the log gap itself: none.
Explains: NV 5, NJ 22, AS 21, MP 2.

**C9. The viewer never acts as the player.**

`viewer.ts:41-47, 59`: it builds a `BenchPlayer`, selects it and calls `dev.advance`; no act is issued. The legislature also never votes for the player (`legislature.ts:1695`: "the player is never voted for"). Stopgap: none.
Explains: NV 9 (no action), MP 25.

**C10. Many events keep their ids in `personIds` or `topic`, not in `facts`, and the viewer prints `facts` only.**

`business.ts:429-442` (`organization.owner-changed`: no `facts`; org id in `topic`), `record.ts:90-107` (`vote-recorded`: facts are measure, question, position; person in `personIds`). The viewer prints `n.facts` (`viewer.ts:96`), so these show as `{}` or as unattributed lines. Stopgap: none.
Explains: NV 8, NV 16, AS 23, NJ 6.

### Legislature, committees, votes

**C11. Every bill in a body is filed on one floor day.**

`world-legislating.ts:184-189` (a session's floor day is its adjournment, or for a full-year legislature the end of month 6), `world-legislating.ts:167-173` (Congress: day 349, Dec 15, `campaigns/parameters.json:298`), `world-legislating.ts:544-560` (`draftBill` for every filed item on that day; items past `floorTime` die).

```
filed.forEach((item, index) => { const drafted = draftBill(api, {...});
  const reached = index < floorTime; ... holdVote(...) : dieOnCalendar(...)
```

Local bodies meet 24 times a year (`world-legislating.ts:811-813`, parameter 24). Stopgap: parameters are TUNABLE with sources; no stopgap.
Explains: NE 8, NE 15, NV 15, NV 20, NJ 23, AS 14, MP 5, MP 17.

**C12. Congress is run through the town's state's House office, with every member of both chambers.**

`world-legislating.ts:258-272` (`houseOffice` = first office whose kind starts `us-house`), `legislature.ts:539-552` (budget introduced there), `world-legislating.ts:660` (filers are all of the House and Senate), `legislature.ts:1646-1649` (a House bill goes through `federal:us-house` then `federal:us-senate`), `legislature.ts:953-967` and `925-927` (all states' members; delegates do not vote), `legislature.ts:305-306` (`sponsor = priorities.setBy`, the President, for the budget bill).

```
const office = ...rows().find((o) => o.kind.startsWith("us-house"));
return office ? { id: office.id, members: members(api, FEDERAL_HOUSE) } : null;
```

So a bill's body id carries the town's state, its sponsors and chairs are other states' members, a Senate vote follows a House bill, 4 seats show against 433 voters, and the President sponsors the budget bill. Stopgap: none (a code comment says "bills are introduced there"). Explains: NE 16, NE 17, NV 15, NV 17, NV 18, NJ 14, AS 11, AS 16, MP 9, MP 10, MP 13, MP 15.

**C13. A federal body is organized with the council template, so its holder is a "council-president".**

`world-legislating.ts:648` calls `leaderOf(api, lower.id, ...)` with `lower.id` = `office:US-XX:us-house`; `leadership.ts:113-137` (`templateOf`) matches only `FEDERAL_HOUSE`, unicameral and `legislature-*` kinds, and falls through to `"council-manager"`; `organize` (`leadership.ts:288`) then emits `chamber-organized` with key `council-president`. Dec 15 is the first Congress session end. The real federal chambers are organized on January 20, 2025. Stopgap: none.
Explains: NE 18, NV 3, NJ 15, AS 5, MP 8.

**C14. One subject committee per body, a fixed roster of about 11 and one chair; a "held" bill is a chair who declines a hearing.**

`legislature.ts:1768-1778` (`committeeFor` returns "general" unless the bill is a budget line, income or sales tax, or minimum wage), `legislature.ts:1791-1860` (roster = most senior by party ratio; chair = most senior of the majority; stopgap marker at 1798), `legislature.ts:1861-1866` (`heard`), `legislature.ts:1907-1913` (yes and no are counted only `if (heard)`), `legislature.ts:1932` (`kind: heard ? "committee-hearing" : "bill-held-in-committee"`), `legislature.ts:1980` (an unreported bill fails). A two-chamber bill has a committee stage in each chamber (`legislature.ts:1976-1984`), each with its own chair record.
Stopgap: SG-GOV-committee-structure. Explains: NE 9, NE 8, NV 14, NV 13, NJ 5, NJ 9, AS 13, MP 12.

**C15. Votes are the sum of each member's parts, and the party part makes tallies equal party counts.**

- Sum: `positionOn` (`legislature.ts:1242-1326`) adds views, constituents, sponsor, deal, lobby, trait, party, wing, ambition and press.
- Party: `officials.ts:1054-1063` sets the party part as `pull * loyalty * lead * care`.
- One dimension: `campaign-views.ts:231-233` makes a stance `lean * questionAxis` (SG-GOV-views-stand-in, `campaigns.ts:290-292`).
- Committees: seats follow the party ratio (`legislature.ts:1823-1840`).
  Data check against the party counts file (`data/research/offices/legislature-party-counts-2026.json`): Nevada's Senate is 13 D and 8 R, and the raw votes repeat 13-8. New Jersey's Senate is 25 and 15, and the raw votes repeat 25-15 five times. New Jersey's Assembly is 57 and 23, and the raw votes repeat 57-23 twice. An 11-seat committee at those ratios is 7-4 for Nevada (27 of 42) and 8-3 for New Jersey (57 of 80), which are the raw committee splits. Stopgap: SG-GOV-views-stand-in (for town members).
  Explains: NV 1, NV 12, NV 13, NJ 7, NJ 8, AS 12, MP 11.

**C16. "Overridden" means vetoed then overridden; the veto lives in the executive desk table.**

`legislature.ts:2141-2175` (`status = overrideVote(...) ? "overridden" : "vetoed"`; a sustained veto returns without `enact`), `legislature.ts:2162-2165` writes the `votes` row and calls `deskHooks`; `executive.ts:505-512` writes `desk:<billId>`. No log record is emitted for a veto or a signature (kinds `bill-signed`, `bill-vetoed`, `veto` in `viewer.ts` do not exist). A mayor vetoes only where state law gives the office a veto (`legislature.ts:2101`). Stopgap: SG-GOV-veto-override-rule.
Explains: NE 2, NE 3, NV 11, AS 15.

**C17. A state act takes effect by its state's own rule.**

`legislature.ts:2377` calls `stateActEffectiveDate` (`src/core2/state-effective-date.ts:60-70`); Nebraska's rule is "three calendar months after the session adjourns, plus a day" (`data/research/laws/local-starting-law/state-effective-dates.json`, `US-NE`), so June 9 gives Sept 10. Nevada's is Oct 1, New Jersey's July 4. Stopgap: none (sourced).
Explains: NE 10.

**C18. Budgets: executive priorities, a negotiation that drops lines, the fiscal-year name, local lines.**

- Priorities: `legislature.ts:467-520`. Each line moves by `amount * share * personStance(lean, line)`, with no balancing.
- Negotiation: `legislature.ts:361-388`. A failing budget drops the line its opponents object to most, until it passes ("amended: ... dropped").
- No executive: `legislature.ts:471-488`. A county board with no county executive has no priorities and no line changes.
- Year name: `budgets.ts:331-335`. A year is "named by the year it starts", and the federal year starts October 1, so fiscal year 2025 begins October 1, 2025.
- Local lines: `budgets.ts:296-312`. County and city split by function from Census finance data.
- Zero changes: `budgets.ts:926`. Zero deltas are not emitted.
  Stopgap: SG-GOV-local-budget-split, SG-GOV-local-fiscal-year. Explains: NE 12, NE 13, NE 22, NV 19, NJ 16.

**C19. A balanced-budget law cuts every non-interest line in proportion; "minor" is cents.**

`law-reach/group-b-money.ts:427-445` (`ratio = (spending - revenue) / cuttable`, each line `-ceil(minor * ratio)`), `law-reach/group-b.ts:284-295` (applied once a fiscal year, lawId `#balance`), `budgets.ts:264` (`minor = dollars * residents * factor * 100`). Federal veterans -11,08x,xxx,xxx,xxx minor = about $110.8 billion. The record's place is the town because `budgets.ts:897-930` and the law-reach emits use `lawChain(api).townPlaceId`. Stopgap: none.
Explains: NE 14, NV 18, NJ 17, AS 18, MP 16.

**C20. A monthly law-reach review books a budget move once per fiscal year, and a repeal undoes it.**

`law-reach/group-b-store.ts:293-311` (`scheduleReview` = `addMonths`, so the 20th of each month from Jan 20), `law-reach/group-b-money.ts:366-421` (`moveBudget`: skipped while `prior.budgetId === budget.id`; a new fiscal year's budget gets booked at the next review; `inForce:false` writes `#undo`), `law-reach/group-b.ts:269-283` (`pension-funding`). Nebraska and Nevada: state budget adopted Jul 1, booked Jul 20. American Samoa: budget carried forward Oct 1, booked Oct 20. Nebraska's undo on Sept 10 is bill 2025-012 (a repeal, position -1, passed 40-9 in raw) taking effect (`law-took-effect ... "value":"0","change":"ended"`). Stopgap: none.
Explains: NE 11, NV 19, AS 3.

**C21. Starting-law rows that begin after day one are carried back, so a later "replaced" law replaces a copy of itself; territory tax rows are sourced data.**

`modules/laws.ts:225-251` (`${row.id}:from-start`, `effectiveDate: today`, same value, `estimate: true`), `laws.ts:122-123`. The Jan 1, 2026 `law-took-effect` with `change: replaced` or `new` therefore replaces the carried-back copy of the same phase; the value "before" equals the value after. Data: `data/laws/starting-law.json` American Samoa income tax 39.6 (line 1495, source asbar.org A.S.C.A. 11.0403, estimate true), sales tax 0 (line 1526); Northern Marianas income tax 37 (6985), sales tax 0 (7018); Medicaid match 83 percent for AS, MP, Guam and the Virgin Islands (lines 1544, 7036; Federal Register FMAP notices, sourced). No body enacted them. Stopgap: SG-GOV-start-law-carried-back.
Explains: NE 24, NV 25, AS 2, AS 19, MP 18, MP 19.

**C22. "Raise the minimum wage" jumps to a flat $15 target.**

`law-reach/group-a-wages.ts:134-152` (`raiseMinimumWage` sets `stateMinimumWageTargetMinor` where the state's starting answer is yes), `group-a-wages.ts:57` (skipped only if the state's wage is already at or above the target), `group-a-wages.ts:64` (`effectiveDate: tomorrow(opening date)`, so Jan 21), `data/laws/reach-group-a-parameters.json:55-60` (1500, ESTIMATED, "$15 in California, New York, ..."). The state's own wage history rows exist (`laws.ts:172`) and are overridden by this jump. No check against the real 2025 rate was run here. Stopgap: none (a tagged ESTIMATED parameter, not a registered stopgap).
Explains: NE 20, NV 10.

**C23. Recalls start when a law takes effect, from the members' votes, and find the bill by number and series only.**

`recalls.ts:68-69` (`eventKinds: ["law-took-effect"]`), `recalls.ts:167-260` (each member who voted, an organizer with enough grievance, a petition and a `recall-petition` record), `recalls.ts:178-190` and `recalls.ts:~330` (the bill is `find(b => b.number === measure && provision matches series)`, no body check; bill numbers repeat across bodies, C30), `recalls.ts:284-347` (the vote result is written to the recalls table; only a removal emits, through `seat-vacated`). No petition exists between the vote and the effective date because none can. Stopgap: SG-GOV-recall-signature-groups (signatures only).
Defect lead: Nebraska's petitions name city council seats 2 and 3 (`gus2025:108424:council`) but cite a county law (`law:county:31091:...:2025-001`); a county law numbered 2025-001 can be matched to the city council's own 2025-001 on the same question. Not provable from raw (the council bill is not printed), but the symptom is in the raw record.
Explains: NE 5, NJ 1.

**C24. Candidates: a stand-in files incumbents when filing closes; a party with one filer has no primary.**

`voting.ts:937-1030` (`fileStandingCandidates`: "the incumbent stands again" if alive, `announce` emits `candidate-filed` on the closing day), `voting.ts:1317` (`if (field.length < 2) continue;`, so a party with one filer counts no votes), `voting.ts:1360-1375` (`primary-result` is emitted anyway, `votes: JSON.stringify(votes)` = `{}`), `elections.ts:703-730` (`announce`). Stopgap: SG-GOV-who-runs-stand-in.
Explains: NE 4, NJ 3, NJ 10.

**C25. A candidate's death is handled by nothing.**

- Subscribers: only `offices.ts:132-136` (to vacate a held seat) and `moves.ts:1027` subscribe to `life.death`. The elections, candidacy, campaigns and voting modules subscribe to nothing.
- Withdrawal: `elections.ts:106` has a `withdrawn` status, but it is written only for a primary loss (`voting.ts:1293-1297`).
- Campaign: `campaigns.ts:2246-2250` runs a turn for every filing that is `on-ballot`, with no aliveness check, and `campaigns.ts:2146-2150` emits `campaign-message` with the candidate as speaker. `campaigns.ts:2054` skips only the candidate's own donation and doors.
- Stopgap: none.
  Explains: NE 1.

**C26. A vacancy is filled the same day, and the fill writes a term row, not a log record.**

`offices.ts:793-847` (`vacateSeat` emits only `seat-vacated`), `offices.ts:849-933` (`fillVacancy`: `appoint` creates a term and a vacancy row marked filled; "appointment-then-special" seats an interim and schedules a special election), `offices.ts:132-146` (a mover who no longer lives in the office's area vacates it). The viewer lists no terms for local or non-lower/upper seats (C4) and no `vacancies` (C3). Stopgap: SG-GOV-special-election-appointee, SG-GOV-official-identity-only.
Explains: NV 4, NJ 4, NE 21.

**C27. Past-history estimates: a constant winner share per office kind, a uniform minimum age of 21, terms that end on Jan 1.**

`offices.ts:669-693` (`electionBehind` returns `tenureYears(key)` per kind: 0.64 House, 0.635 state legislator, 0.56 statewide, 0.57 Senate, 0.6 local; values at `data/offices/tenure.json:40-62`), `offices.ts:612-615` (`firstYear(prior) - born < tenureYears("minimumAgeAtFirstTerm")`, value 21 for every office, `tenure.json:34-39`), `offices.ts:572` (`start = shiftYears(term.endDate, -years)`: a term read as ending January 1, 2025 ends there). Past terms are seeded from a hash of the world seed and seat id (`offices.ts:607`; allowed seeded generation). Stopgap: SG-GOV-term-end-estimate covers the end dates; the share constants and the age rule: none.
Explains: NE 23, NV 23, NJ 12, AS 9, MP 23 (title text only, see its row).

**C28. Territories: no legislators and no local government.**

Legislature: `offices-state.ts:546-575` builds seats only from Census Gazetteer districts and the party-roster file. `src/districts/identities.generated.json` holds 0 records for AS, MP, GU and VI (7,283 in all; NE 52, NV 67, NJ 92). `legislature-party-counts-2026.json` has no row for them. So `office:US-AS:legislature-upper` is created with `seats: 0`, even though `data/research/offices/state-offices.json` lists the Fono (Senate 18, House 20) and the Commonwealth Legislature (Senate 9, House 20). Local: `offices-local.ts:183-194` takes units from `placeLocalGovernmentUnits`. The territory villages (`data/places/territory-places.json`: key, displayName and stateUsps only; `places.ts:110`) have no `sourceGeoid`. So `local-governments.ts:103-106` gives no municipality and `local-governments.ts:139-143` returns none. Stopgap: SG-CORE-territory-places covers only the village list; the missing seats and local bodies: none.
Explains: AS 1, AS 6, MP 7, MP 20 (no local contests).

**C29. A government with no voting body has its budget carried forward and logged as adopted.**

`budgets.ts:875-916` (`budgetCouncilVote` null so `carriedBudget(... "carried forward by the budget rule ...")`, then a `budget-adopted` record with that text). The law-reach review still books moves on a carried-forward budget (C20). Stopgap: SG-GOV-budget-adopted-by-rule.
Explains: AS 3, AS 4, MP 6.

### Local bodies and other engines

**C30. Public comment is the six most moved residents; bill numbers repeat across bodies.**

`meetings.ts:244-271` (residents ranked by `|view| * (1 + civic)`, those over `commentBar`, first `publicCommentSpeakers` = 6, `parameters.json:4-9`), `meetings.ts:306-330` (`public-comment` with for and against counts). Numbers: `legislature.ts:750-758` (`nextNumber` counts per body and year), so `2025-017` exists in a state chamber and in Congress. Stopgap: none (ESTIMATED and TUNABLE parameters).
Explains: NE 7, NJ 19.

**C31. Businesses close by the owner's choice; losses are in the business module; "unfunded obligation" is the counted residents' wages.**

`business.ts:490-524` (`closeByChoice` writes a `choices` row with `reasonKey` and `values`; the log event carries only `closing-reason`), `data/business/business.json:51` (`losses-kept`), `data/finance.json:13` (`finance.unfunded-obligation-cash-and-credit-exhausted`), `residents.ts:396-414` (`residents:wages:<employer>` flows, payer `residents:<place jurisdiction>:0`). New Jersey's closure source `residents:wages:opening-payroll-calendar:...|residents:jurisdiction_f7be...:0` is the place's residents' payroll, not a government's debt. The trace ends at `opening` because the organization's `source.estimatedFrom` is `opening`. Stopgap: SG-P8-finance-settlement-policy.
Explains: NV 7, NJ 20, AS 23, MP 3.

**C32. Most organizations are created with no founding record.**

`campaigns.ts:361-372` (a `campaign-committee` per filing), `drives.ts:1380-1395` (cause groups, logged as `cause-group.founded`), `press.ts:418`, `interest-groups.ts:203, 469`, `parties.ts:191`, `budgets.ts:244, 606` (treasuries); only firms emit `organization.founded` (`business.ts:1366-1375`). Raw: New Jersey `cause-group.founded=14` plus about 30 filings. Stopgap: SG-P10-group-name-key covers the cause-group name; no stopgap for the missing record.
Explains: NV 6, NJ 21, MP 3.

**C33. Positions whose mechanic is "none" change nothing.**

`data/laws/reach-group-a.json:762-766` (`restrict-abortion`: `"mechanic": "none"`; records an eligibility on women and a duty on providers, no stopgapId) and `:794-796` (age verification, also none). AGENTS.md ("An effect is a read, not a record") calls this an unregistered placeholder. Stopgap: none for these two rows.
Explains: NE 15, AS 20, MP 17 (the others, such as `fund-pensions`, `minimum-reserve`, `balanced-budget`, do have mechanics).

**C34. Housing completions come from the monthly housing review.**

`housing.ts:553` (monthly `housing-review`), `housing.ts:1262-1330` (`finish` emits `housing.completed`; `affordableUnits` is set only for an apartment building under an inclusionary law, so single homes show 0). Why the 6th specifically: not found.
Explains: AS 24, MP 4 (partial).

**C35. A local body refiles a defeated question after 180 days, and a body can repeal a law it just passed.**

`world-legislating.ts:764-765` and `773-805` (`recentlyDefeated`, `defeatedMeasureWaitDays` = 180, `parameters.json`), `world-legislating.ts:376-409` (`lawStanding` / `filingReason`: reversal reluctance is `reversalReluctance * margin * (1 - settled) / 2`, a sliding cost, not a bar), `world-legislating.ts:753-757` (a repeal is needed when `ownRow(...) === 1`). Same members and same question give the same positions (no dice). Stopgap: SG-GOV-reconsideration-rule.
Explains: NE 6, NJ 2.

**C36. An uncontested race counts everyone who turns out as a vote for the one candidate.**

`voting.ts:2256-2300` (`racePlaces`: the town's named and counted voters plus the rest of the place), `voting.ts:2372-2420` (`electorateSample`: readiness is set apart from the race). The counts are near-equal because the electorate and the readiness are the same for each race; the exact 24,791 versus 24,789 difference was not traced. Stopgap: SG-GOV-voter-groups-stand-in covers the unnamed voters.
Explains: NJ 11 (partial).

**C37. `vote-recorded` exists only for members who are people in the world, and its position is vote times the bill's direction.**

`record.ts:85-89` (no event for an identity-only official or for votes that are not town news), `legislature.ts:1712-1720` (`position: vote === "yes" ? stance.position : -stance.position`, where `stance.position` is the sign of the bill's provision). A yes vote on a repeal bill is position -1. Stopgap: SG-GOV-official-identity-only.
Explains: NE 19, NJ 6.

**C38. Two spellings of one party are normalized.**

`appointments.ts:52-55` (`partyName` maps `Democrat` and `Democratic` to `Democratic`), `appointments.ts:78-81` (`partySide` looks both up), `data/elections/party-sides.json` lists both labels; the Congress roster says "Democrat" (`legislature-party-counts-2026.json`, `congress` block). Stopgap: none.
Explains: NJ 13.

**C39. A change to an award lands on a person without naming the law.**

`budgets-treasury.ts:556-564` ("Nothing here says why"), `budgets-treasury.ts:566-611` (`landOn` emits `law.effect-landed` with only obligation, from, to; the law id and measure go to the `landed` table), then `attributeLanded` records who learned. Stopgap: SG-GOV-opening-award-level and SG-GOV-counted-social-security-level cover which awards follow the line.
Explains: NJ 18.

**C40. Territory executives have no party.**

`offices-state.ts:528-531`: `governor` takes `governorParty.get(stateKey) ?? null`, other statewide offices `statewidePartyOf(...)`; American Samoa and the Northern Marianas have no party row, so the terms print without a party. Stopgap: SG-GOV-statewide-parties-unverified (partly).
Explains: AS 10.

## Per item

Verdicts: CF = cause found, NF = not found, VA = viewer artifact, RE = reader error.

### Nebraska (Mullen, 26 items)

| #   | Verdict | Cause    | Note                                                                                                                                                    |
| --- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CF      | C25      | No module handles a candidate's death; the filing stays `on-ballot` and `campaignTurn` keeps sending (`campaigns.ts:2246`, `2146`). Defect.             |
| 2   | RE      | C16      | "Overridden" is a vetoed bill that was then overridden: 3 overridden plus 2 sustained vetoes is 5 vetoes. Which bills: in the `desk` table, not dumped. |
| 3   | CF      | C16, C3  | The mayor's `position + signLean < 0` (`legislature.ts:2141`); the desk row is not dumped.                                                              |
| 4   | VA      | C3, C4   | Filings are in `core2-elections-v1`; the six filings' contests (November 3, 2026) are hidden by the 400-character filter.                               |
| 5   | CF      | C23      | Petitions are written when the law takes effect. Possible body mismatch (county law, city council members), see C23.                                    |
| 6   | CF      | C35      | Same board, same question; Feb 4 + 180 days = Aug 3, so the Aug 18 refiling was allowed. Same members give the same six positions.                      |
| 7   | CF      | C30      | Six speakers is the cap (`parameters.json:4-9`); same residents on the same question.                                                                   |
| 8   | CF      | C11, C14 | Filed on the session's floor day (Nebraska adjourns Jun 9); holds are chairs declining hearings (`legislature.ts:1861, 1932`).                          |
| 9   | CF      | C14      | `committeeFor` returns "general"; one roster and chair per body.                                                                                        |
| 10  | CF      | C17      | Three months plus a day after the Jun 9 adjournment = Sept 10 (`US-NE` rule).                                                                           |
| 11  | CF      | C20      | Booked Jul 20 by the monthly review after the Jul 1 budget; undone Sept 10 when bill 2025-012 (repeal, 40-9) took effect.                               |
| 12  | CF      | C18      | Each line moves by the governor's lean times the line's axis; no balancing rule.                                                                        |
| 13  | RE      | C18      | Fiscal years are named by their start year; the federal year starting Oct 1, 2025 is "2025".                                                            |
| 14  | CF      | C19      | Proportional cut to cover the deficit; minor units are cents ($110.8 billion).                                                                          |
| 15  | CF      | C11, C33 | Congress's one floor day is Dec 15; value 1 is a "yes" answer; `restrict-abortion` has mechanic "none".                                                 |
| 16  | CF      | C12      | House bills sit in the town's state's House office; sponsors are any member; the President sponsors the budget bill.                                    |
| 17  | RE      | C12      | The Senate vote is recorded as `chamber=federal:us-senate`; the bill table shows only the introducing body.                                             |
| 18  | CF      | C13      | Template fallthrough gives "council-president".                                                                                                         |
| 19  | RE      | C37      | -1 is a yes vote on a bill whose provision is -1 (the sample bill's value is -1); the position is vote times direction.                                 |
| 20  | CF      | C22      | Flat $15 target on the state's starting "yes"; real 2025 rate not checked; no source in the file for it.                                                |
| 21  | VA      | C5, C1   | The second vacancy is a local seat outside the federal/state dump regex or in the cut news tail.                                                        |
| 22  | CF      | C18      | Local lines are a county/city split of Census functions; the county board has no executive, so no line changes.                                         |
| 23  | CF      | C27      | Constant share per office kind: 0.56 statewide, 0.635 legislator.                                                                                       |
| 24  | CF      | C21      | The "replaced" row is the carried-back copy; the value before equals the value after.                                                                   |
| 25  | VA      | C5       | 48 counts all legislative votes; 43 is the federal/state regex.                                                                                         |
| 26  | VA      | C6       | One `learned` child per person; the viewer hides the person id.                                                                                         |

### Nevada (Mina, 25 items)

| #   | Verdict      | Cause    | Note                                                                                                                                     |
| --- | ------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CF           | C15      | One-dimensional stance on a three-member board; the same member order gives 1-2 on every bill.                                           |
| 2   | VA           | C1       | 200 of 325 local items printed; which two passed is not in the raw file (statuses are set at `legislature.ts:1970`).                     |
| 3   | CF           | C5, C13  | Opening-day records excluded from "this year"; the council key is the template fallthrough.                                              |
| 4   | VA           | C26, C5  | The seat is filled by appointment the same day (term row, no log record); the vacancy table is under another module.                     |
| 5   | CF (partial) | C7, C8   | Dead strangers are not logged; movers stay in `people`; +35 is mostly fill-in. Census check: NF.                                         |
| 6   | CF           | C32      | Campaign committees and cause groups have no founding record.                                                                            |
| 7   | CF           | C31      | `losses-kept` is the owner's choice; the losses are in the business module; trace ends at `opening`.                                     |
| 8   | VA           | C10      | Org id is in `topic`, not `facts`.                                                                                                       |
| 9   | VA           | C9       | The viewer never acts as the player; why the job is none and cash $0: NF.                                                                |
| 10  | CF           | C22      | Flat $15 from the starting answer; the real Nevada rate was not checked here.                                                            |
| 11  | VA           | C3, C16  | Veto sustained; the record is in `core2-executive-v1.desk`, which the viewer does not read.                                              |
| 12  | CF           | C15      | 13-8 is Nevada's Senate party split (13 D, 8 R).                                                                                         |
| 13  | CF           | C15, C14 | An 11-seat committee at 27 D to 15 R is 7-4.                                                                                             |
| 14  | CF           | C14      | A "held" bill is a chair who declines a hearing; yes and no stay 0.                                                                      |
| 15  | CF           | C12, C11 | Any member may sponsor; the body is the lower chamber; all bills are filed on the floor day Jun 2.                                       |
| 16  | VA           | C10      | Different members; the viewer omits the person.                                                                                          |
| 17  | CF           | C12      | Federal House run through the town's state's House office.                                                                               |
| 18  | CF           | C19, C12 | Cents; the President sponsors the budget bill.                                                                                           |
| 19  | CF           | C18, C20 | Priorities and a negotiation drop; the Jul 20 date is the monthly review.                                                                |
| 20  | CF           | C11      | One Congress floor day (Dec 15).                                                                                                         |
| 21  | VA           | C4, C3   | Contests and filings exist but the dump hides them; six filings prove it.                                                                |
| 22  | VA           | C3       | Wrong module ids (see C3 for the real ones).                                                                                             |
| 23  | RE           | C27      | The printed rows are the past terms; ids carry the opening date (January 20, 2025); current terms are not printed. Shares are constants. |
| 24  | VA           | C6       | Viewer chain loop and fact-key display.                                                                                                  |
| 25  | CF           | C21      | The replaced law is the carried-back copy; no earlier rate exists.                                                                       |

### New Jersey (Asbury, 24 items)

| #   | Verdict      | Cause    | Note                                                                                                                                                                 |
| --- | ------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CF           | C23      | A petition per member whose vote conflicts with the law, written when it takes effect (Mar 6). The results are in the recalls table; the list is cut at Jun 30 (C1). |
| 2   | RE           | C35      | The Feb 19 bill is a repeal (positions -1, 1, 1, yes 1, no 2), not a second vote to pass.                                                                            |
| 3   | VA           | C24, C1  | The stand-in filed the incumbent when filing closed; that record falls after the Jun 30 cut.                                                                         |
| 4   | RE           | C26      | "Appointment-then-special" seats an interim the same day, so 80 voted.                                                                                               |
| 5   | RE           | C14      | The 79-1 vote is the lower chamber; the hold is the upper chamber's committee (different chair, `upper:007`).                                                        |
| 6   | RE           | C37      | `vote-recorded` appears only for members who are people; position is vote times direction.                                                                           |
| 7   | CF           | C15      | Position is a sum of parts; bills reach the floor because members file them; cross-party agreement gives 79-1.                                                       |
| 8   | CF           | C15      | 25-15 and 57-23 are the party counts; 8-3 is an 11-seat committee at 57 of 80.                                                                                       |
| 9   | CF           | C14      | 0-0 is how a held bill is recorded.                                                                                                                                  |
| 10  | CF           | C24      | A party with one filer has no primary; `votes` stays `{}`.                                                                                                           |
| 11  | CF (partial) | C36      | Same electorate and readiness for each uncontested race; the 2-vote difference was not traced.                                                                       |
| 12  | CF           | C27      | The age floor is a uniform 21 for every office; New Jersey's state senate minimum is not read. Defect.                                                               |
| 13  | CF           | C38      | Normalized by `partyName` and `partySide`.                                                                                                                           |
| 14  | CF           | C12      | Same as other federal body items.                                                                                                                                    |
| 15  | CF           | C13, C11 | Template fallthrough on the first Congress session end.                                                                                                              |
| 16  | CF           | C18      | The negotiation drops the most-objected lines; the enacted lines then feed budget-line events and law-effects handlers.                                              |
| 17  | CF           | C19      | Proportional cut; cents. Who is paid less: the line feeds the budgets module (not traced to a person).                                                               |
| 18  | CF           | C39      | The law id is in the `landed` table; the event omits it.                                                                                                             |
| 19  | CF           | C30      | Numbers are per body and year.                                                                                                                                       |
| 20  | RE           | C31      | The payer is the town's residents' payroll, not a government.                                                                                                        |
| 21  | CF           | C32      | Campaign committees (about 30) and 14 cause groups.                                                                                                                  |
| 22  | CF (partial) | C7, C8   | No births in the log; fill-in grows `people`; census check: NF.                                                                                                      |
| 23  | CF           | C11      | Full-year legislature: floor day is the end of month 6; Congress Dec 15.                                                                                             |
| 24  | VA           | C3       | Real modules: offices (vacancies), elections (contests, filings), campaigns, budgets (governments, budgets).                                                         |

### American Samoa (Tafuna, 24 items)

| #   | Verdict      | Cause    | Note                                                                                                                                                              |
| --- | ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CF           | C28      | No Gazetteer districts and no roster for the territory, so `seats: 0`.                                                                                            |
| 2   | CF           | C21      | Data rows (A.S.C.A., estimate true), no enacting body; 39.6 is the territory's own tax code.                                                                      |
| 3   | CF           | C20, C29 | The monthly review books the pension line on a carried-forward budget (Oct 20).                                                                                   |
| 4   | CF           | C29      | Registered stopgap; the record says "carried forward".                                                                                                            |
| 5   | CF           | C13      | Template fallthrough.                                                                                                                                             |
| 6   | CF           | C28, C3  | No local government units; wrong tables.                                                                                                                          |
| 7   | CF (partial) | C3       | Orders and desk records exist only where an executive decides on a bill or an order the engine can carry (`executive.ts:1-20`); the territory has no legislature. |
| 8   | VA           | C4, C5   | Two different dump filters; the three contests are hidden by the 400-character filter.                                                                            |
| 9   | CF           | C27      | Constant shares (0.64, 0.56).                                                                                                                                     |
| 10  | CF           | C40      | No party row for territorial executives.                                                                                                                          |
| 11  | CF           | C12      | Other states' members sponsor and chair; the House and Senate committees are two chairs.                                                                          |
| 12  | CF           | C15      | An 11-seat committee on party-line votes.                                                                                                                         |
| 13  | CF           | C14      | Same as above.                                                                                                                                                    |
| 14  | CF           | C11      | Congress's single floor day.                                                                                                                                      |
| 15  | VA           | C2, C16  | Federal votes are not printed; a vetoed bill passed both chambers and was vetoed (desk table).                                                                    |
| 16  | CF           | C12      | `chambersOf` sends a House bill to the Senate.                                                                                                                    |
| 17  | VA           | C6       | Loop and repeated lines are viewer artifacts; who learned of the 0 percent tax: NF.                                                                               |
| 18  | CF           | C19      | Cents.                                                                                                                                                            |
| 19  | CF           | C21      | Sourced Federal Register FMAP row, 83 percent.                                                                                                                    |
| 20  | CF           | C33      | Mechanic "none": an eligibility record with no reader.                                                                                                            |
| 21  | CF (partial) | C7, C8   | Deaths outside the circle are not logged. Census check: NF.                                                                                                       |
| 22  | CF           | C8       | Moves come from the moves engine; the residence is the destination place id (`moves.ts:688-690`).                                                                 |
| 23  | VA           | C10, C31 | Empty payload is a viewer artifact; losses are in the business module.                                                                                            |
| 24  | CF (partial) | C34      | Monthly housing review; why the 6th: NF.                                                                                                                          |

### Northern Mariana Islands (Susupe, 25 items)

The report file exists (`northern-mariana-islands.md`) and the raw file is `audit/northern-mariana-islands.txt`; both were read.

| #   | Verdict      | Cause    | Note                                                                                                                                          |
| --- | ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | CF           | C7       | Four dead and no death record: deaths outside the circle are not logged.                                                                      |
| 2   | CF (partial) | C8       | Fill-in and counted tallies; census check: NF.                                                                                                |
| 3   | CF (partial) | C32      | Organizations without founding records; workers of closed firms: NF.                                                                          |
| 4   | CF (partial) | C34      | See C34.                                                                                                                                      |
| 5   | CF           | C11      | Oct 1 is the federal fiscal year's start (`budgets.ts:380`); Dec 15 is Congress's floor day.                                                  |
| 6   | CF           | C29      | No voting body for the territory budget.                                                                                                      |
| 7   | CF           | C28      | Zero seats (Senate 9, House 20 in the research file are not used).                                                                            |
| 8   | CF           | C13      | Template fallthrough.                                                                                                                         |
| 9   | CF           | C12      | Any member may sponsor.                                                                                                                       |
| 10  | CF           | C12, C14 | Two chairs: one per chamber.                                                                                                                  |
| 11  | CF           | C15      | Party-line committee.                                                                                                                         |
| 12  | CF           | C14      | See C14.                                                                                                                                      |
| 13  | CF           | C12, C6  | The national House votes the bill; the delegate does not vote (`legislature.ts:925-927`); traces: viewer artifacts.                           |
| 14  | VA           | C2       | The viewer prints only a sample bill; which five: NF.                                                                                         |
| 15  | CF           | C12, C2  | The "state bill" sample matches the same federal bill by regex.                                                                               |
| 16  | CF           | C19      | Cents; the place is the town's place id.                                                                                                      |
| 17  | CF           | C11, C33 | One floor day; value 1 is a yes answer; the others have mechanics.                                                                            |
| 18  | CF           | C21      | Carried-back rows and sourced values.                                                                                                         |
| 19  | CF           | C21      | Sourced 83 percent.                                                                                                                           |
| 20  | VA           | C4, C28  | Contests are hidden by the filter; no local contests exist because there is no local government.                                              |
| 21  | VA           | C3       | Wrong module ids.                                                                                                                             |
| 22  | VA           | C4       | Two different dump filters.                                                                                                                   |
| 23  | CF           | C27      | The title text comes from `data/research/offices/state-offices.json:13766`; past terms are a seeded estimate and none was drawn.              |
| 24  | NF           | C7       | The kinds are `person.acted`; the game kept these through the circle rule (`state.ts:690-705`, focus); no per-kind breakdown in the raw file. |
| 25  | VA           | C9       | The viewer never acts as the player.                                                                                                          |

## Highest-priority defects found (as opposed to viewer artifacts)

1. C25: a dead candidate's campaign keeps running and the filing stays on the ballot (NE 1).
2. C23: recall petitions can target the wrong body's members because the bill is looked up by number and series only (NE 5).
3. C28: American Samoa and the Northern Marianas have no legislature seats and no local government (unregistered).
4. C12 and C13: federal bills live in the town's state's House office and the House is organized with the council template (unregistered).
5. C33: `restrict-abortion` and `age-verification` have mechanic "none" and no stopgap, against the owner's rule that an effect is a read.
6. C22 and C27: a flat $15 minimum wage jump and a uniform minimum age of 21 are not registered stopgaps (NV 10, NJ 12).
7. C7 and C26: deaths and appointments leave no log record outside the player's circle, so the file cannot answer "who died" or "who was appointed".

## Method

Places: Nebraska (Mullen), Nevada (Mina), New Jersey (Asbury), American Samoa (Tafuna) and the Northern Mariana Islands (Susupe). I read each place report, its raw viewer file and the code. Nothing was run and no game code was changed. VERIFY-A.md did not exist when this was written, so the ids are this batch's own; if A uses different ids, map them by the one-line statements.

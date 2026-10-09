# Three fifths of the old political engines is plumbing; about one sixth is rules worth keeping

The CTO needs to settle three things before any engine moves to the new core: how votes are counted, which additions the core's interface gets, and whether old saves are dropped. The old political engines hold about 244,000 lines of code. Measured, about 60% of that is plumbing: world copies, history scans, validators and schedulers. Between 14% and 22% is decision logic and math worth carrying over as is; another 3% follows designs the owner rejected and must be redesigned. 16% is research data, and 4% is dead. Elections and executive offices unlock the most life-replay steps: 16 of 44. The economy port stays provisional, because 23 of 27 firms closed once wages had to come from sales.

## Decisions for the CTO

1. **How elections are decided.** Today two models coexist. One counts each voter's ballot from their recorded beliefs (src/simulation/election-contests.ts:211). The other splits a "support" share among candidates when the player runs (src/simulation/campaigns.ts:1929). Recommended: count real voters in the player's county and focus places, and use place cohorts everywhere else, with the same ballot rule. A cohort is a group of voters with the real turnout and lean spread.
2. **Interface additions for the new core (its next interface version).** Every port needs six things the published prototype's interface (version 5) lacks; they are listed under "What the new core's interface lacks." SOL-1258 would build them. The CTO, the core's one architecture owner, approves them.
3. **Old saves.** Seat holders, court cases, bill positions and campaign state are stored today as tagged history entries that the new core will not read. Recommended: no save conversion, following the standing "saves don't matter" ruling. Each port writes its tables fresh from world generation.

## Terms used here

- **P3, P6, P8, P9, P10**: the CTO's work packages for the English engine loop, the story director, the new core ("core2"), the life-replay harness and event-born drives.
- **KEEP, REDESIGN, DATA, PLUMBING, DEAD, TOOLING, VIEW**: the classes every function, constant and class falls into.
  - KEEP is decision logic or math worth carrying into core2 as is.
  - REDESIGN is decision logic built on a design the owner rejected. It covers three things. First, the five designs named in the CTO's review: the 80 labeled decision types scored as importance times confidence, fixed scene-selection weights, one everyday goal per person, speeches only on election night, and the one-day pre-start run. Second, any other function that sets up one of those labeled decision types for the old evaluator. Third, named functions where a seeded draw decides an outcome.
  - DATA is research rows and tables.
  - PLUMBING is old-core reads and writes, history copies, validators, schedulers, queries and prose.
  - DEAD is code that neither the game nor any tool reaches, or that nothing references.
  - TOOLING is code reached only from the development scripts that `package.json` runs; it is outside the port totals.
  - VIEW is screen logic: screens are clients of the core and do not port into it.
- **Readers**: eleven read-only reviewing agents, one per engine group. Each read the code and hand-classified a sample of about 30 declarations.
- **Five standing lines**: the five relationship measures every pair of people carries (warmth, trust, respect, commitment and tension).
- **Person landing**: a law's effect reaching a named person, such as a raise from a new minimum wage.
- **Focus places**: the places the core runs at full daily detail. These are the player's town and county, plus any place the player is acting in that day. Everyone else runs weekly, monthly or on calendar dates.
- **Offer**: an act the core puts in front of one person, such as filing for office; the shared chooser picks among offers.

## The split, engine by engine

Measured on October 9, 2026, on main. "Code lines" counts functions, constants and classes, without imports, comments or type declarations. Percentages are of code lines. Screens are left out of this table; their split is in their own section.

| Engine                                    |   Files |  Code lines |             KEEP |       REDESIGN |             DATA |          PLUMBING |            DEAD |      TOOLING |
| ----------------------------------------- | ------: | ----------: | ---------------: | -------------: | ---------------: | ----------------: | --------------: | -----------: |
| Elections                                 |      89 |      28,459 |      6,192 (22%) |     1,398 (5%) |       1,784 (6%) |      18,347 (64%) |        738 (3%) |       0 (0%) |
| Legislatures                              |     107 |      36,701 |      6,532 (18%) |       846 (2%) |      5,043 (14%) |      22,205 (61%) |      1,991 (5%) |      84 (0%) |
| Laws                                      |     159 |      40,024 |      5,660 (14%) |         0 (0%) |      8,759 (22%) |      24,039 (60%) |      1,325 (3%) |     241 (1%) |
| Courts and justice                        |      64 |      17,035 |      2,637 (15%) |     1,368 (8%) |      1,681 (10%) |      10,526 (62%) |        823 (5%) |       0 (0%) |
| Economy                                   |     110 |      37,909 |     11,137 (29%) |       617 (2%) |       3,071 (8%) |      21,278 (56%) |      1,534 (4%) |     272 (1%) |
| Press                                     |      47 |      15,251 |      1,477 (10%) |     1,049 (7%) |       1,013 (7%) |      11,420 (75%) |        292 (2%) |       0 (0%) |
| Campaigns and civic groups                |      53 |      18,752 |      2,280 (12%) |     1,033 (6%) |         747 (4%) |      13,388 (71%) |      1,304 (7%) |       0 (0%) |
| Governing and executive                   |     135 |      49,836 |      5,238 (11%) |       705 (1%) |     15,959 (32%) |      25,142 (50%) |      2,783 (6%) |       9 (0%) |
| **Eight political engines**               | **764** | **243,967** | **41,153 (17%)** | **7,016 (3%)** | **38,057 (16%)** | **146,345 (60%)** | **10,790 (4%)** | **606 (0%)** |
| Story director (consumer)                 |      44 |      20,391 |      3,405 (17%) |       184 (1%) |      3,947 (19%) |      11,976 (59%) |        832 (4%) |      47 (0%) |
| English engine (consumer)                 |      26 |       6,751 |        857 (13%) |       194 (3%) |      3,246 (48%) |       1,872 (28%) |        257 (4%) |     325 (5%) |
| Life substrate (replaced by core2 itself) |     248 |      76,315 |     12,978 (17%) |     1,055 (1%) |     15,560 (20%) |      43,459 (57%) |      3,147 (4%) |     116 (0%) |

Measured: large functions that mix math with plumbing are counted whole under their stronger signal. Splitting each of those in half gives the political engines between 34,863 and 53,609 KEEP lines, or 14% to 22% of code lines.

Measured: the readers hand-classified 342 sampled declarations into rule, data, plumbing and dead, and the script agrees on 279 (82%). KEEP and REDESIGN split the rules by the owner's list; TOOLING and VIEW split by the import graph and the screen folders. Those splits are exact rules, not estimates. The 63 disagreements are: 18 rules the script called plumbing, 11 plumbing it called rules, 17 data it called plumbing, 13 plumbing it called data, 2 data it called rules, 1 rule it called data, and 1 live function it called dead. The script therefore counts 6 too few rules among 342 sampled declarations. The first version agreed on only 211 (62%), because it called every helper that never touched the world a rule. Story and English were labeled after the script's last change. They agree on 51 of 62 (82%), the same rate as the samples used to fix the script, so the fixes did not just fit those samples.

Measured: 16,211 lines in the eight political engines are whole-world validators that the new core does not have (26,498 across the game: the other 10,287 are in the life substrate, 9,299; screens, 797; the story director, 143; and source tools, 48). Another 9,596 lines across the game are per-place research tables written as TypeScript instead of data files. The old core keeps 159 add-only history tables. Each political engine reaches them through whole-list scans, from 95 scans in courts to 246 in the economy.

Measured: REDESIGN holds 7,016 lines in the political engines. 6,687 of them build decisions as labeled decision types, scored as importance times confidence through the old evaluator. The owner replaced that design with one shared chooser that scores offers from traits, needs, goals and drives. Another 317 lines decide outcomes by seeded draws, and 12 build election-night-only speeches. Outside the political engines, REDESIGN holds 2,406 lines. The life substrate has 1,055: 34 of decision scoring, 367 of the one everyday goal per person and 654 of labeled decision types. Screens have 973: 881 of the one-day pre-start run and 92 of labeled decision types. The story director has 184: 89 of fixed scene-selection weights and 95 of labeled decision types. The English engine has 194 of labeled decision types.

Inferred: what the labeled decision types weigh (party cues, commitments, sponsor ties, harm to a victim) is still worth having, as data rows for the chooser's reason providers rather than as code.

Inferred: in the old core, each line of rule worth keeping comes with about three and a half lines of plumbing that feeds it. Most of each port is new wiring: plain tables keyed by id, indexes, typed events and offers to people.

## Porting order

Each engine becomes one or more core2 modules: state it owns, offers it makes to people, effects it applies, events it emits. The order follows what each needs from the others and how many life-replay steps it unlocks.

| Order | Module                                                                                   | Needs first                                   |     Life-replay steps it unlocks | Risk                                                                    |
| ----: | ---------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------: | ----------------------------------------------------------------------- |
|     0 | Next interface version (below)                                                           | P8 core                                       |                                0 | Medium: every port waits on it                                          |
|     1 | Law in force (law rows, enactments, effective dates, amount evaluator)                   | next interface                                |             0 directly, 2 with 5 | Low                                                                     |
|     2 | Economy remainder (labor market, rent and housing, loans, public budgets, macro)         | SOL-1258's business books, interface accounts |                                5 | High, provisional: 23 of 27 firms closed in the latest funded-wage year |
|     3 | Offices and seats, then elections (calendars, filing, nominations, counting, succession) | 1, people's political views in core2          |                               10 | High                                                                    |
|     4 | Governing and executive (desks, staffing, appointments, programs, continuity)            | 3                                             |                                6 | High                                                                    |
|     5 | Legislatures (bodies, measures with a stored phase, votes, bargaining, executive desk)   | 3, 4                                          |                                3 | High                                                                    |
|     6 | Law consequences and outcome web (enactment fan-out, person landings)                    | 1, 2, 5                                       |                       supports 6 | Medium                                                                  |
|     7 | Campaigns and civic groups                                                               | 2, 3                                          |                       supports 4 | Medium                                                                  |
|     8 | Courts and justice                                                                       | 1, 4                                          | 0 (blocks candidacy when jailed) | Medium                                                                  |
|     9 | Press                                                                                    | events from 3 to 8                            |                     0 (consumer) | Medium                                                                  |
|    10 | Story director and English engine                                                        | typed events from every module                |                    voices all 44 | Medium                                                                  |
|    11 | Screens, one adapter family per module as it lands                                       | each module                                   | lets the player choose each step | High                                                                    |

The other 17 steps belong to the core's own life loop: moves, schooling, deaths in the family, marriage, illness and drive-born causes (P8 and P10). Military service has no engine anywhere. Three steps wait on one, and a fourth, the authorization request, needs it beside the legislatures port.

The riskiest work, measured across all reports:

1. **State kept as tagged history.** Seat holders, court cases, campaign state, scene bindings and bill positions live in history events found by tag. A bill's position is rebuilt by replaying its whole action log on every read. Each needs a real table before anything else in that engine can move.
2. **26,498 lines of whole-world validators** hold invariants that are written down nowhere else. Each port turns the ones that matter into write-time checks and tests.
3. **Rules living in screen code.** The legislative bargaining sitting, bill drafting, 16 scene producers and a reply-meaning decision live in presentation code. They move into modules as offers, or the player loses those choices.
4. **One file composes the old scheduler.** `campaigns.ts` registers 22 handler families for other engines (src/simulation/campaigns.ts:2560). The new calendar replaces it, but the hidden order between handlers must be reproduced on purpose.
5. **Dice and place names.** Disaster damage, deaths and injuries come from a seeded draw (src/simulation/crisis/disaster.ts:148). Smaller cases are listed per engine. Kentucky, Minnesota, Nevada, Alaska, Maine and D.C. branches sit in logic, and per-place tables sit in TypeScript.
6. **Whole-population scans.** Voter counts, newspaper readers, monthly person landings, civic contact and service requests loop over everyone. They need indexes and tiers or they break the speed budget.

## Life-replay steps by engine

Measured: the three life files on the P9 branch hold 44 documented steps: 10 for Alexandria Ocasio-Cortez, 20 for Lyndon Johnson, and 14 for Wes Moore.

| Step kind                      | Steps | Engine that must supply it      | Today                                                                      |
| ------------------------------ | ----: | ------------------------------- | -------------------------------------------------------------------------- |
| Election result                |     6 | Elections                       | Counts recorded voters; no historic-era rules, write-ins or top-two splits |
| Candidacy                      |     3 | Elections, campaigns            | Only the player files a campaign; NPC candidates are scheduled, not chosen |
| Re-election decision           |     1 | Elections                       | Rules for governors and Congress; nothing for a president who declines     |
| Office service                 |     2 | Governing, legislatures         | Incumbents are invented; no act seats a recorded person on a date          |
| Office succession              |     1 | Governing                       | Vice president to president works; governor succession is a placeholder    |
| Public appointment             |     1 | Governing                       | Staff and Supreme Court only; no agency director with confirmation         |
| Law signature                  |     2 | Governing, legislatures, laws   | Governor desk works; no presidential desk for a named bill                 |
| Legislative proposal           |     1 | Legislatures                    | Members file bills; no resolution kind                                     |
| Chamber leadership             |     1 | Legislatures                    | Missing: no majority leader, whip or chair role                            |
| Military authorization request |     1 | Legislatures, a military engine | Missing: no such measure kind                                              |
| Employment                     |     4 | Economy                         | Openings, applications and pay work; employers are not yet funded in core2 |
| Business formation             |     1 | Economy                         | Openings and closures by cash; no founding by choice with a loan           |
| Residence move                 |     4 | Core2 life loop                 | Not in the prototype yet                                                   |
| Education completion           |     7 | Core2 life loop                 | Not in the prototype yet                                                   |
| Education enrollment           |     1 | Core2 life loop                 | Not in the prototype yet                                                   |
| Family loss                    |     2 | Core2 life loop                 | Not in the prototype yet                                                   |
| Partnership                    |     1 | Core2 life loop                 | Not in the prototype yet                                                   |
| Health shock                   |     1 | Core2 life loop                 | Not in the prototype yet                                                   |
| Cause participation            |     1 | P10 drives, campaigns           | Law-interest groups exist; drive-born joining is P10's proof               |
| Military service               |     2 | None                            | No engine                                                                  |
| Military deployment            |     1 | None                            | No engine                                                                  |

## What the new core's interface lacks

The prototype's interface (version 5) has the right shape: modules offer acts, a shared chooser picks, effect handlers apply, events go out, and everything passes through one versioned facade. Six additions recur in every port. They need a version bump; none needs a rewrite.

1. **Module state.** The core's state is a fixed set of tables. Each engine needs its own registered tables with indexes and a schema version, so it does not hide data in organization facts.
2. **Accounts and postings.** `transfer` moves cash between two people or organizations. Laws, taxes, budgets, bail and campaign money need named accounts (a government's general fund), postings with a reason, and obligations that come due. SOL-1258 answered in the shared work [log](https://docs.google.com/document/d/1DpVG1S39-SY7ZrJ38_3HEnd7QxYBqcaVFs-D5nh7k-M/edit) on October 9, 2026: the planned interface adds one atomic, balanced journal writer beyond `transfer`. It admits registered accounts, actual paid amounts and dated source record ids, and it rejects duplicate, unbalanced or future-dated entries. Taxes, laws and public budgets post through it; the work writer stays the only wage writer, and `transfer` becomes a wrapper. It is planned, not yet built. The laws, governing and economy specs here post through it rather than a second writer.
3. **Reason providers in the chooser.** Old decisions weigh party cues, constituent views, commitments, favors owed and sponsor ties. The chooser needs a hook through which a module adds named, data-weighted terms to an offer's score. Drives from P10 already need the same hook, and it is where the REDESIGN decisions' reasons land as data rows.
4. **Subscriptions by event kind.** `onEvent` now sends every event to every module. The press, story and law-consequence modules need to subscribe by kind, with an index, to stay inside the speed budget.
5. **Dated institutional work.** Election days, session sittings, filing deadlines and court dates need modules to place work on dates. That work belongs to institutions, not people. `requestCallback` covers one event; a module calendar with keys is needed.
6. **Cohorts.** State and national outcomes cannot tick every voter. A cohort row (place, age band, lean, turnout, size) checked against real spreads lets elections, mood and readership run at coarse tiers. Named people stay individual.

Inferred: the prototype also has no recorded political views or principles per person. Votes, opinions and member decisions all read them, so they come before the elections port.

## Elections

Measured from code unless marked; the elections audit note (`docs/design/core2-porting-plan/audit/elections.md`) gives the file and line for each claim.

**Split.** KEEP 22%, REDESIGN 5%, DATA 6%, PLUMBING 64%, DEAD 3%; 1,589 lines of validators. Stopgap markers: 19 PLACEHOLDER, 9 NOT MODELED, 2 GAME ASSUMPTION.

**What it does today.** Contests are scheduled as future-due items. Counting builds one decision per eligible voter from saved beliefs and tallies by precinct. Candidacy joins office packs, qualification rows, district residence, filing terms and term limits. Party primaries and runoffs are split by recorded standing, with ties left unbroken. Congress, state legislatures, governors, the president and local seats each have their own turnover cycle. Seat holders are stored as `seat:<key>` history events.

**Stopgaps worth naming.** Presidential state results are the certified 2024 share plus a mood shift; no presidential campaign exists. Local election days, staggering and filing leads are game defaults. Two nominees of one party are not split, and there are no write-ins. A presidential nominee's home state is a seeded draw weighted by electors (src/simulation/nationwide-world/presidential-turnover.ts:400). Maine is named in logic (src/simulation/national-elections.ts:643), and so is D.C.

**Keep.** The primary and runoff split, statutory date rules, municipal ballot and recall rules, term-limit bars, qualification rules, ward cuts, House apportionment, vacancy timing, and petition signer rules. Most are pure over data rows; term limits need indexes instead of history.

**Module spec.**

- State: contests (by place and date, by office), seats (holder, term, party; by body, by person), candidacies, filings and petitions, nominations, parties and chapters, precinct membership by person and by precinct, each person's office-service list, recall petitions.
- Offers: register a party, sign or circulate a petition, vote, file, withdraw, request a runoff, run again or decline, appoint to a vacancy, call a special election, certify.
- Effects: seat holder and term, tallies and winner, vacancy, recall removal, ward maps; fees through accounts.
- Events: election scheduled, candidate filed or refused, nomination result, contest result with tallies, seat vacated, seat filled, term started. Results and seats are public record and news; petition signatures are private.
- Calendar and tier: election, filing and term-start dates on the module calendar; daily only for the player's race and focus places; cohorts elsewhere.
- Data: the elections research files (nomination rules, filing terms, filing offices, petition terms, initiative rules, qualifications), municipal baselines, county calendars, apportionment and district tables.

**Risks.** Seat truth in tagged history; voter scans; per-place tables in TypeScript; `party-evolution.ts` (2,030 lines) and `recall.ts` (1,775 lines) mix rules with writes; invented officeholders change identity when keys change.

**Life-replay.** Supplies election result (6), candidacy (3) and re-election decision (1). It needs era-specific rules for 1937 to 1968, and a presidential campaign.

**Redesign.** Measured: 1,398 lines. Candidate intake, local filing, petition signing, party initiatives and the voter count build labeled decision types; the voter count (src/simulation/election-contests.ts:211) is the largest. Their reasons become chooser data, and the count moves to decision 1's ballot rule. The nominee's home-state draw is dice.

## Legislatures

Measured from code unless marked; the legislatures audit note (`docs/design/core2-porting-plan/audit/legislatures.md`) gives the file and line for each claim.

**Split.** KEEP 18%, REDESIGN 2%, DATA 14%, PLUMBING 61%, DEAD 5%; 2,263 lines of validators. Stopgap markers: 46 PLACEHOLDER, 14 GAME ASSUMPTION, 13 SET BY HAND, 7 NOT MODELED.

**What it does today.** A bill's position is not stored; it is replayed from its action log on every read (src/simulation/legislation.ts:792). A legislative clock moves each bill by who owns the next step. Rule packs give chambers, committees, floor stages and thresholds for 9 researched states, with the rest estimated from their spread. Each member's vote runs through the shared decision evaluator, weighing party cues, leader strain, constituents, the executive, principles, beliefs, commitments and relationships. Members file bills on the questions their principles press hardest. Favors fade over time. The bargaining sitting itself lives in screen code.

**Stopgaps worth naming.** Congress takes one bill per House per month (src/simulation/governing/congress-lawmaking.ts:60). Vote weights and the "slight" trust reason are hand-set. Favor scores and half-lives are set by hand. Only five candidates run for Speaker, with no repeated ballots. Nevada's charter route (src/simulation/constitutional-process.ts:451) and the Kentucky, Kansas and Nebraska term rules are named in logic.

**Keep.** Required-vote math, tallies, override thresholds and veto windows, session dates, filing caps, germaneness and single-subject tests, favor standing with its half-life math, reliance, and agenda, Speaker and committee seating.

**Module spec.**

- State: bodies (rule pack, place, level, seats, session state), members, measures with a stored phase and position, roll calls, commitments and favors by person and pair, constitutional measures. Rule packs stay read-only data.
- Offers: file, cosponsor, amend, vote, ask or grant a favor, state a commitment, seek a committee seat or leadership, refer, schedule, bring to the floor, override, adjourn. Executives sign, return or item-veto. Residents call or write a member, testify or attend a meeting.
- Effects: enactment hands off to law in force; roll calls change official views, standing and favors; adjournment kills open bills; vacancies go to elections.
- Events: bill filed, referred, reported, amended, passed a chamber, vote taken, vetoed, overridden, enacted, died, session opened or closed. Enactment and final votes are public record and news.
- Calendar and tier: sittings, filing days and session years on the module calendar; daily for the player's circle and sitting bodies, per sitting elsewhere.
- Data: legislature research, procedure research, session calendars, veto windows, legislators, override readings, local-government rows.

**Risks.** Replay as state; four validators of 171 to 497 lines; bargaining and drafting in screen code; per-place tables in TypeScript, including 1,202 lines of bill-numbering styles; packs embedded in saves; member votes rebuilt for every member on every question.

**Life-replay.** Supplies legislative proposal (1). Chamber leadership (1) needs a leader, whip and chair role table with an act to seek it. Military authorization (1) needs a measure kind and a military engine.

**Redesign.** Measured: 846 lines. The member vote reasons (src/simulation/legislative-member-decisions.ts) are the largest, followed by the governor's bill decision, joint-assembly ballots and appointee choice. Inferred: the member vote weighs eight kinds of reasons with smooth weights and no dice, the richest catalog of reasons the readers found. It carries over as chooser data rows, not as code.

## Laws

Measured from code unless marked; the laws audit note (`docs/design/core2-porting-plan/audit/laws.md`) gives the file and line for each claim.

**Split.** KEEP 14%, REDESIGN 0%, DATA 22%, PLUMBING 60%, DEAD 3%, TOOLING 1%; 4,230 lines of validators, the most of any political engine. Stopgap markers: 11 NOT MODELED, 6 PLACEHOLDER, 1 GAME ASSUMPTION.

**What it does today.** Law in force is derived on read: the highest-level enacted answer is checked for authority, effective date, expiry and court strike-down. If none exists, the 2026 starting law applies. Enactment fans out to taxes, appropriations, duties, eligibility, rule changes and program terms, then to consequence modules. Those modules scan every proposition on each call (src/simulation/enacted-law-effects.ts:802). The outcome web holds 221 links. Person landings loop over every person each month. Policy packs are about 9,000 lines of TypeScript.

**Stopgaps worth naming.** An act's own effective date and emergency clauses are not modeled. Floor preemption uses a blanket rule. County minimum wages are not modeled. How big a non-money law change feels, and the three-day reflection delay, are placeholders that drive opinion. No game path writes a permit; only a test calls the permit writer (src/simulation/permits.ts:41).

**Keep.** The law-amount evaluator, which refuses missing facts instead of using zero. Also the outcome-link shapes, law in force with the law hierarchy, income tax and withholding math, effective-date rules, the minimum-wage chain, the landing predicate, coverage and sunset rules, felt size and benefit formulas.

**Module spec.** This is two modules. Law in force comes first; consequences come later.

- State: propositions, enactments by proposition and place, tax proposals and policies by place and series, tax bases by payer and year, programs and appropriations, duties and eligibility, office rule overrides, monthly place outcomes, exposures by person, permit applications.
- Offers: apply for a permit or benefit, appeal, file and pay taxes. Officials adopt a levy, set a rate, appropriate, issue an order, or enforce or decline.
- Effects: on enactment, run the fan-out through the consequence rows. On paydays and assessment days, post taxes through accounts. Each month, place outcomes and landings for the people indexed by each link.
- Events: law enacted, law took effect, rate changed, program started or ended, duty breached (public record and news); tax assessed, benefit decided, exposure noticed (private).
- Calendar and tier: effective dates, January 1, assessment days, paydays, monthly outcome pass, sunsets.
- Data: outcome-web links and bases, starting law, tax schedules, minimum-wage matrix, local tax authority, public programs; the policy packs move from TypeScript to data rows with their keys unchanged.

**Risks.** The consequence driver scans all propositions on each call; validators hold undocumented invariants; WeakMap caches keyed on the old world; pack keys are baked into consequence rows and links; the monthly every-person loop.

**Life-replay.** Supplies the aftermath of law signature (2) and pay terms for employment (4). Neither step is primary here.

**Redesign.** Measured: none. Law rules are amounts, dates and conditions, not actor decisions.

## Courts and justice

Measured from code unless marked; the courts audit note (`docs/design/core2-porting-plan/audit/courts.md`) gives the file and line for each claim.

**Split.** KEEP 15%, REDESIGN 8%, DATA 10%, PLUMBING 62%, DEAD 5%; 868 lines of validators. Stopgap markers: 2 PLACEHOLDER; 24 estimates are labeled ESTIMATED FROM AVERAGE.

**What it does today.** Crime is rate-first. A monthly pass accumulates exposure from national victimization rates for four offenses, then attributes an offender (src/simulation/crime/producer.ts:242). Victims decide whether to report. Charging, pleas, juries and sentences run through the decision evaluator with no randomness. Each case is a chain of tagged events, found by scanning. Clemency gates come from sourced rows. Only the U.S. Supreme Court and the Chief Justice get appointments; state and lower-court terms, retention and elections are not built. Appeals, bail posting, judicial challenges and clemency advancement have no game caller.

**Stopgaps worth naming.** Twelve jurors everywhere (src/simulation/justice/court-reasoning.ts:277). A jailed officeholder is always removed. An employer always holds a jailed worker's job. Only unemployment is wired as a crime cause; poverty, policing and law are not.

**Keep.** Sentencing ranges and their applicability gates; clemency gates; exposure accumulation; reporting and offender weights; voting standing; the jury pool area; juvenile age; bail from law; judicial review votes.

**Module spec.**

- State: cases by defendant, court and prosecutor; holds and jail terms by person; courts, seats and tenures by place; clemency petitions; crime exposure clocks by target; voting and citizenship standing.
- Offers: report a crime, plead, serve on a jury, post bail, petition for clemency, appeal. Police refer; prosecutors charge or decline; judges set bail, detain and sentence; governors and boards grant clemency; presidents nominate and senators confirm.
- Effects: jail leave from jobs, removal from office, voting suspension and restoration, bail through accounts, fines, absence from relationships.
- Events: offense, report, charge, plea, verdict, sentence, release, clemency, appeal, seat filled. Charges, verdicts, sentences and rulings are public record and news.
- Calendar and tier: monthly exposure per place; charge and trial dates; sittings; the day a law takes effect for judicial review.
- Data: bail, sentencing, time-to-disposition, clemency and precedent research; judiciary tables move from TypeScript to data.

**Risks.** Case state as scanned tags; rate-first crime against the core's actor-first acts, which must keep the real totals as a check; versioned tag formats; heavy reads of law in force.

**Life-replay.** None primary. It supplies the blockers on candidacy and the jail effect on employment.

**Redesign.** Measured: 1,368 lines, the largest share of any engine (8%). Appeals, custody terms, the choice to ask for clemency, detention, sentencing reasons and senators' confirmation reasons are labeled decision types. Their reasons become chooser data; the sourced sentencing ranges and clemency gates stay KEEP.

## Economy

Measured from code unless marked; the economy audit note (`docs/design/core2-porting-plan/audit/economy.md`) gives the file and line for each claim.

**Split.** KEEP 29%, REDESIGN 2%, DATA 8%, PLUMBING 56%, DEAD 4%, TOOLING 1%; 2,555 lines of validators. Stopgap markers: 19 GAME ASSUMPTION, 13 PLACEHOLDER, 3 NOT MODELED.

**What it does today.** A monthly macro step moves growth, unemployment, inflation and credit; it is already world-free. A central bank sets the policy rate. Each quarter, town business and bank books run sales, costs, cash, credit, closure, bank capital and runs. A labor market handles openings, applications, quits, layoffs and hiring. Pay comes from Bureau of Labor Statistics wages by occupation and area. Rent, leases, evictions, home prices, mortgages and household loans each have their own calendar. Public budgets settle monthly and adopt each year.

**What SOL-1258's port covers.** SOL-1258's answer, relayed by the CTO in the [pull request review](https://github.com/lamontaes/Political-Game-Git/pull/3921#issuecomment-6085312770) on October 9, 2026: the current port is the business books, opening finance and a finance module. SOL-1258 numbers that unpublished work interface and schema version 6. None of decision 2's six additions is in it yet. It covers conserving contracts, finite credit, costs, wage funding before work settles, and closure and debt service after each day. It has no labor market, banks or public budgets yet, and claims no complete economy. So still to port: the labor market, rent and evictions, home prices and purchase, mortgages and household loans, the bank half of town finances, public budgets and treasuries, the macro economy and central bank, wealthy donors and the cost of living. Whether the interface gains named accounts with postings is still open.

**Provisional.** The economy port is not settled. In SOL-1258's latest measured year, reported in the same [review](https://github.com/lamontaes/Political-Game-Git/pull/3921#issuecomment-6085312770), once wages had to come from business income, 23 of 27 firms closed within the year. SOL-1258's per-firm cash audit, published on the P8 pull request (#3918), adds that the year ended 1,264 jobs, that no customers from outside the town or public purchases were recorded, and that owners' opening capital is unresolved. The CTO's target for the repair is the real rate: under 10% of establishments close in a year (Bureau of Labor Statistics, Business Employment Dynamics). No cash route may top firms up just so they survive.

Inferred: two of the missing cash routes belong to modules in this plan. Public purchases by schools, counties and states come from the public-budget module, and outside customers come from the macro and place economy. The module spec below assumes the finance module's contracts and credit. SOL-1258 and the CTO should explain the closures before the economy remainder is ported, and this spec should be revised then.

**Stopgaps worth naming.** Bank capital lines are thresholds, which go against the sliding-scale rule. Local minimum wages and back pay are not modeled. Club and congregation openings and closings are a seeded draw against a yearly chance (src/simulation/living-world/town-businesses.ts:761). A hash picks which committee a wealthy donor approaches (src/simulation/moguls.ts:550). Each central-bank member's inflation lean is drawn.

**Keep.** The macro monthly step and credit step, the job-rate lookup, home price levels, and market rent and eviction decisions. Also the business and bank quarter math split into two steps, hiring room, hiring rank, mortgage and purchase terms, budget shortfall decisions, and loan servicing.

**Module spec.** Separate modules: labor market, housing, credit, public budgets, macro.

- State: accounts; obligations by payer and payee; leases by household and dwelling; loans by borrower; openings by place and employer; applications; bank books; macro series by scope; budgets by government and fiscal year.
- Offers: look for work, apply, accept, quit; hire, lay off, raise pay; pay rent, move out, buy a home, borrow and repay; landlords file an eviction; board members vote a rate; officials adopt, amend or cut a budget.
- Effects: transfers, job start and end, tenure changes, closures, price and rent levels, budget lines.
- Events: job started or ended, eviction, business closed or bank failed (public record and news), recession began, rate decided, budget adopted.
- Calendar and tier: paydays, rent day, monthly loan servicing and macro step, quarterly reviews, fiscal years, rate meetings.
- Data: wage, rent, employment and bank tables (about 2.1 MB of generated TypeScript to move to data), and the money and housing research.

**Risks.** The town-finance step (518 lines) and the government month (613 lines) mix math with writes; money conservation now rests on add-only flows; per-place tables in TypeScript; four dice-shaped picks to redesign.

**Life-replay.** Supplies employment (4) and business formation (1); founding a business by choice with a loan is missing.

**Redesign.** Measured: 617 lines. The wealthy donors' approach and deal reviews and the central bank's rate reasons are labeled decision types. So is a sitting member of Congress deciding whether to run again; the script filed it here because it sits in the careers folder, and it belongs to the elections port. An employer's pay period drawn from national shares is dice. Of the other three draws under Stopgaps, the donor-committee hash sits inside the donor approach, already REDESIGN. Club and congregation churn and the central-bank lean sit inside functions the script classes as plumbing, so they are rewritten with that plumbing rather than counted here.

## Press

Measured from code unless marked; the press audit note (`docs/design/core2-porting-plan/audit/press.md`) gives the file and line for each claim.

**Split.** KEEP 10%, REDESIGN 7%, DATA 7%, PLUMBING 75%, DEAD 2%; 1,055 lines of validators. Stopgap markers are rare (2 GAME ASSUMPTION, 3 NOT MODELED). The engine uses its own labels instead: 6 HAND-SET, 42 authored intervals and 7 recorded game rules.

**What it does today.** Outlets open by place size. A weekly desk reads every new event past a cursor, judges coverage and newsworthiness, assigns a reporter, waits for responses, decides to publish, narrow, hold or decline, and publishes. Ownership reviews cut staff or buy outlets from the books. Misconduct becomes a matter, then a proceeding with dated steps, then a public finding that costs support. Inquiries and subpoenas are written but not used. Word of mouth reaches household, kin and close ties.

**Stopgaps worth naming.** Every state has the same statehouse newsroom. Every unresearched state follows the federal election commission's calendar. Finding penalties are marked in code as game rules that research does not validate (src/simulation/press/findings.ts:37). National mood counts only the president's party, only in midterm years. Seven decisions pass near-ties to a seeded tie-break (src/simulation/press/desk.ts:397 is one). Kentucky's ethics commission is defined in code (src/simulation/press/procedures.ts:214).

**Keep.** Coverage and newsworthiness, story corroboration rules, reporter choice and beats, reporter workload, local outlet size, the proceeding step machines (as data plus one interpreter), finding effects, outlet purchase terms, who hears news, news habits, mood and memory strength.

**Module spec.**

- State: outlets by place and owner; reporters; owners and holdings; leads by outlet and matter; matters; proceedings and findings by person; source agreements; a rolling mood aggregate; news habits.
- Offers: pitch or give an interview, leak under ground rules, answer a story, file a complaint, read, tell a neighbor. Reporters take, publish, narrow, hold or drop a story. Owners cut staff, buy or order sharing.
- Effects: readers learn facts by habit and tie; findings cut support; restitution and referral go to the money and courts modules.
- Events: story published or corrected, matter opened, finding issued, outlet sold, newsroom cut. Publications are public; leads keep only results.
- Calendar and tier: weekly desk per outlet group, monthly owner review, proceeding step dates, annual law anniversaries.
- Data: subpoena rules, the ethics-body table and ownership pack moved to data, misconduct families, story effort estimates.

**Risks.** The desk depends on one global event list, so every module must emit typed newsworthy events and the desk must subscribe by kind. Four whole-population scans; a 20-kind record format; per-place tables.

**Life-replay.** None primary. It carries coverage, findings and mood that shape results.

**Redesign.** Measured: 1,049 lines. Outlet purchases, interview answers, the editorial decision, story assignment, complaints and other people's responses to stories are labeled decision types, several with seeded near-tie breaks.

## Campaigns and civic groups

Measured from code unless marked; the campaigns audit note (`docs/design/core2-porting-plan/audit/campaigns.md`) gives the file and line for each claim.

**Split.** KEEP 12%, REDESIGN 6%, DATA 4%, PLUMBING 71%, DEAD 7%; 1,595 lines of validators. Stopgap markers: 7 PLACEHOLDER, 1 SET BY HAND.

**What it does today.** Only the player files a campaign; the only callers are two screen files (src/presentation/nationwide-candidacy.ts:203 is one). No other candidate creates one. A campaign's outcome splits support shares among candidates; no voter is simulated in that path. Support gains come from formulas for ads, field hours and door conversations. Donor asks, staff and helpers are decisions with reasons. An invented rival takes a weekly step. Speeches get reactions from each witness. Every grown resident gets a quarterly civic contact and attendance review. Law-interest groups form when a law exposure is recorded. Nothing in an ordinary world starts a protest (src/simulation/living-world/protests.ts:85 is called only by tests), and endorsement requests have no producer.

**Stopgaps worth naming.** Every candidate starts at a support weight of 850. Ad gain is spend divided by 500. Six of eight money sources are not built. Pressure amounts are all estimates. The anger line, attempt line and polling tiers are thresholds.

**Keep.** The diminishing support gain, the largest-remainder split, gain formulas, recognition, door conversations, canvass pacing, contribution rules, pressure contributions, and civic stake.

**Module spec.**

- State: campaigns by candidate and contest, committees, support by contest, asks, purchases, rivals, filings, groups by cause and town, movement leaders, protests, pressure readings.
- Offers: ask a donor, hire, canvass, phone, hold a fundraiser or town hall, buy ads, give a speech, file a statement, endorse, write an official, attend, found or join a group, organize or attend a protest, lead or step down. NPC candidates get the same offers as the player.
- Effects: support among candidates, transfers, favors, ties from shared events, membership and leadership, pressure on migration.
- Events: campaign filed, statement filed, speech given, result, protest held, group founded, leadership changed. Most are public.
- Calendar and tier: weekly for NPC teams, daily for the player, filing dates before election day, quarterly pressure and civic contact.
- Data: campaign research (action catalog, calibration, contribution limits, unit prices), compliance packs by place, filing offices, protest places.

**Risks.** The support-share model conflicts with voter counting (decision 1). The scheduler hub lives in this engine's file. Per-resident scans; scratch copies of the world for door walks; thresholds.

**Life-replay.** Supports candidacy (3) once NPCs file, and cause participation (1) with P10.

**Redesign.** Measured: 1,033 lines. Donor asks, the rival's weekly step, protest attendance, helper asks and speech reactions are labeled decision types; 12 lines build election-night-only speeches.

## Governing and executive offices

Measured from code unless marked; the governing audit note (`docs/design/core2-porting-plan/audit/governing.md`) gives the file and line for each claim.

**Split.** KEEP 11%, REDESIGN 1%, DATA 32%, PLUMBING 50%, DEAD 6%; 2,056 lines of validators. Stopgap markers: 9 PLACEHOLDER, 3 GAME ASSUMPTION, 2 NOT MODELED, plus 92 "game-profile" readings.

**What it does today.** Executive desks handle the agenda, chief of staff, bills presented, budget and agency reports; that is 4,038 lines in one file. Executive authority comes from rule packs and the powers catalog. Governors sign or veto by weighing principles, party, votes, relationships, override odds and advice. Office staffing, civil-service procedures, pay and transitions follow sourced rows. Office continuity handles death and incapacity: vice-presidential succession, House specials, Senate appointments. Public programs run from appropriation through installments. Crisis work covers storms, disasters, international tension and War Powers clocks.

**Stopgaps worth naming.** Governor succession and Senate appointment pace are placeholders (src/simulation/governing/office-continuity.ts:1347). Every legislator gets two staff positions. There is no clemency deadline for governors. Disaster damage, deaths and injuries come from a seeded draw (src/simulation/crisis/disaster.ts:148); storms are a monthly Poisson draw. Kentucky, Minnesota and Nevada service profiles and an Alaska-only transit path (src/simulation/transit-funding.ts:79) are special cases.

**Keep.** Term calendar math, term limits, executive action authority, question authority, budget stakes, constituent views, estimated state pay, disaster warrant tests (made continuous), staff evidence, committee rosters, civil-personnel procedures, and program installment math.

**Module spec.**

- State: offices (place, holder, term, powers pack), matters by office, programs, commitments and installments, positions and incumbencies, pay, crisis episodes, personnel matters; residents indexed by service area.
- Offers: sign, veto or return; delegate or defer; appoint staff; issue an order or regulation; commit funds; request a public service; open a constituent case; discipline, appeal or reinstate; request or grant a disaster declaration; respond to a crisis.
- Effects: public-account transfers, employment starts, program capacity, damage and repair, knowledge.
- Events: office vacated or succeeded, term began, bill signed or vetoed, funds committed, service delivered, disaster declared. Office and bill events are public record and news.
- Calendar and tier: term commencements, fiscal years, session timetable, paydays, installment dates, War Powers clocks; daily for the player's circle.
- Data: powers catalog, civil-personnel rules, county offices, local institutions, population and income rows; the 3,886-line civil-personnel table and other generated tables move to data.

**Risks.** The 4,038-line desk file and a 3,612-line kernel bank, linked by tags; adapters that read legislative lineages; validators; disaster dice; per-place special cases.

**Life-replay.** Supplies office succession (1). Office service (2), public appointment (1) and law signature (2) are partial. It needs an act that seats a recorded person on a date, and a presidential bill desk.

**Redesign.** Measured: 705 lines. The international crisis response and resident service requests are labeled decision types. Disaster damage, deaths and injuries, and the monthly storm count, are dice (src/simulation/crisis/disaster.ts:148).

## Story director (consumer)

Measured from code unless marked; the story audit note (`docs/design/core2-porting-plan/audit/story.md`) gives the file and line for each claim.

**Split.** KEEP 17%, REDESIGN 1%, DATA 19%, PLUMBING 59%, DEAD 4%. Stopgap markers: 3 PLACEHOLDER, 1 SET BY HAND; most of its real stopgaps carry no marker, such as fixed callback delays of 96 to 314 days.

**What it does today.** Moments are scored from a cursor over all history (src/simulation/story/moments.ts:809): 17 kinds, weighted by closeness, first of kind, traits and stakes. Threads hold per-pair importance, tone and turns. Situation types cast roles from records and pick moves through the decision evaluator. The story voice has no banks (src/presentation/story-voice.ts:50), so situations get no lines today. Prose is stored in old events and read back by the journal.

**Keep.** Closeness and trait factors, stakes, age rows, thread tie and tone, move reasons, the aftermath rule, childhood agency bands, and the four story data files.

**Module spec.** It subscribes to typed events by kind, instead of using a cursor. It owns moments, threads and scene bindings for the player's circle, and offers situation moves as acts to the people in the roles. It emits only circle and observer events and holds no prose. It needs knowledge reads and the five-line standing.

**Risks.** Cursor intake and de-duplication across stores; prose in old events; history scans; 16 scene producers in screen code; the old childhood bank and backstory generator, which core2's deep past replaces and should not be ported.

**Life-replay.** It surfaces every step. Of the 21 step kinds, 14 have no moment kind yet: every political, military, health and business kind.

**Redesign.** Measured: 184 lines. Fixed scene-selection weights (src/simulation/situation-selection.ts) and the callback decision of whether the other person raises it.

## English engine (consumer)

Measured from code unless marked; the english audit note (`docs/design/core2-porting-plan/audit/english.md`) gives the file and line for each claim.

**Split.** KEEP 13%, REDESIGN 3%, DATA 48%, PLUMBING 28%, DEAD 4%, TOOLING 5%. No stopgap markers; two banks are marked "not yet reviewed."

**What it does today.** A grounded realizer refuses any line whose fact is missing or unknown to the speaker. A line composer joins parts by speech act, standing and mood. Owner grades hold back parts graded BAD or FIX. About 3,200 lines of banks still live in TypeScript. Wording picks are keyed to the history sequence (src/presentation/scene-conversation.ts:134), so the wording changes whenever anything is added.

**Keep.** The grounded realizer and its knowledge rule, the composer, grammar, the grade ledger, bank composition, register cards (as checks only), and all of `data/english`.

**Module spec.** No core state. It reads retained-log records, and answers on-demand requests for one event, viewer and surface, as pure reads. It needs typed facts (ids, money in cents, dates, enum keys) with source record ids, knowledge with access and source, the five standing lines, mood and traits as voice cues, the chosen speech act, and an event-id key. The reply-meaning decision moves into a core2 act.

**Risks.** Prose stored in old events; banks in TypeScript must keep their part keys so grades still match; thin coverage outside conversation and press.

**Life-replay.** Voices results only. Military, health, appointment, succession and business steps have no wording yet.

**Redesign.** Measured: 194 lines, the reply-meaning decision, which belongs in a core2 act.

## Screens via adapters

Measured from code unless marked; the screens audit note (`docs/design/core2-porting-plan/audit/screens.md`) gives the file and line for each claim.

**Split.** VIEW 60%, PLUMBING 24%, DEAD 7%, TOOLING 5%, DATA 4%, REDESIGN 1%, of 155,056 code lines. Screens are clients of the core and do not port into it, so their view logic (92,587 lines) is outside the port totals. The 36,502 PLUMBING lines read or write the old world directly; those reads become adapters. TOOLING here is art and appearance code run only by scripts.

**What they do today.** Measured: 451 of the 585 files in the presentation and player folders import the simulation (the screens group also counts the interface, map, developer and authoring folders, 636 files in all). They hold 751 `world.history` references across 103 history tables, 475 direct person reads and 124 view-model builders. About 50 files gate what they show by the player's knowledge; the person dossier is the model. A click builds a next world and hands it to the game shell through a stale-request guard; 45 screen files call writers directly.

**Adapter spec.** A view model is a pure function of core2 state, the player's id, the moment and a request. It reads only the player's knowledge, public record they can see, and their own records. It never passes time, writes, or invents facts. About a dozen adapters replace 124 builders: people, calendar, money, work, education, politics, legislation, campaigns, press, places, health and developer traces.

**Controller spec.** The player is a person like any other. The life loop asks the player's controller for a pick from the same offers anyone gets. The screen submits an offer with a state version, and a stale version is refused. Time runs through one advance command that stops at the player's known commitments, press requests, offer deadlines, deaths and results.

**Risks.** History scans; screens that now show everything will show only what the player knows, which changes displays and tests; whole-world saves; writers in screen code; "Lexington time" (src/player/CalendarWorkspace.tsx:105) and a Lexington-only economic context in player screens.

## Engines outside the list

The life substrate (people, households, minds, relationships, schooling, health and the old clock) is what core2 replaces directly; its split is in the table for reference. Source tools are 95% TOOLING: research and acquisition code run from `scripts/`, outside the port totals.

## What happens next

- SOL-1258 and the CTO: explain why 23 of 27 firms closed in the latest funded-wage year before the economy remainder is ported; the economy spec is provisional until then.
- CTO: rule on the three decisions at the top, then order the next interface version before any port.
- Ports follow the order table, one module per pull request. Each proves itself in core2's own runs: people, money or places visibly move.
- P6 and P3 keep their engines; their sections here say what core2 events they need.

## Method

The classifier script and all evidence are in `docs/design/core2-porting-plan/` and `scripts/core2-port-inventory/`. The script parses every non-test TypeScript file under the source folder. It builds the import graph from the three game entry points and counts identifier references. It scores each declaration on plumbing signals (world copies, history scans, appends, validators, key builders, screen views) against rule signals (arithmetic, comparisons, decision calls).

The evidence folder holds a summary, a file-to-engine list, and one row per declaration with the reason for its class. It also holds the eleven reader reports with the hand-labeled samples, maps, stopgap lists and file-level citations behind each section. No engine code was changed, and no game was run.

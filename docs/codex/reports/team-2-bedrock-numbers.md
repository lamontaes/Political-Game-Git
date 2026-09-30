# Team 2 bedrock numbers: governing and election response

This first ledger finds explicit placeholders in principle strength, filing, governing cadence and election response. Legal thresholds, mathematical boundaries and researched observations are recorded separately. No numeric parameter changed, and no new calibration is proposed.

## MERGED

Inventory source: branch `codex/wave1-state-governing`, PR #1136, exact source head `1122e0a627467223db37615b02f8e321f8e5b11f`. This is the published draft, not current-main acceptance. The inspected main snapshot was `719b91b86978189ed975eed6f6722fb2af78158d`. The majority agenda, sponsor and cosponsor integrations were verified on that main; no watched outcome is inferred.

Team 1 owns life formation and CTO's continuous-strength design. Team 2 inventories the existing interface and downstream consumers without changing that writer. Team 3 owns its released population-reader test repair. Shared source paths below were inspected, not newly claimed for modification.

## WHAT EMERGED

HARDWIRED: 451 numeric-literal occurrences were extracted from 18 core source files. Repeated literals are not 451 independent parameters. Dates inside strings, category arrays and imported rule/data values were inspected separately. The appendix retains every extracted location, including mechanics, so an excluded zero or array index remains reviewable.

PLACEHOLDER means explicitly declared as a game setting in source. UNVERIFIED means this audit did not establish supporting research; it does not supply a guessed justification. LEGAL means the source names an authority, with the application limits stated below. MODEL RULE means an assigned game contract, not an empirical estimate. OBSERVATION means a sourced research value that does not establish a response coefficient. MECHANIC means counting, indexing, units or an order boundary; meaningful timing and selection boundaries are still listed.

All locations below are relative to `src/simulation/`. Line numbers refer to the exact source head above.

| Number or range                                                                                            | Location                                                                                                      | Evidence/status                                                                                                                                            | Downstream effect                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endorse 3/10; reject 2/10; absent 5/10                                                                     | `governing/officeholder-principles.ts:45,114`                                                                 | PLACEHOLDER independent seeded draw. Exclusive integer upper bound 10. The remainder gives 5/10 absence.                                                   | Writes initial recorded principles; their signs and strengths feed filing, backing, votes, consent and governor considerations. Team 1 replacement is separate.                                                                                                  |
| Four equally selected conviction categories; strength 1,2,3,4                                              | `governing/officeholder-principles.ts:46,62–65`                                                               | PLACEHOLDER; category selection is a seeded pick, not measured conviction prevalence.                                                                      | Signed summation determines pressure; cancellation can produce zero despite multiple held principles. These fixed steps are the interface CTO assigned Team 1 to redesign.                                                                                       |
| Summed strength cutoffs 3,6,9                                                                              | `governing/officeholder-principles.ts:71`                                                                     | PLACEHOLDER moderate/strong/decisive vote importance.                                                                                                      | Converts the person's net principle score into a shared decision consideration. Distinct from the shared 1,2,4,6 importance scale below.                                                                                                                         |
| Filing and cosponsor strength at least 3                                                                   | `governing/member-agenda.ts:80`; `governing/congress-lawmaking.ts:105`                                        | Preserved model setting; no researched propensity or universal legal filing minimum.                                                                       | A member's best eligible proposal or cosponsor can be excluded below 3. Direction is adjusted to enact/repeal. Strongest qualifying pressure wins, with stable ID/catalog tie rules.                                                                             |
| Strictly more than half largest caucus and chamber; positive score greater than 0 backs                    | `governing/majority-agenda.ts:52,56`; `governing/member-agenda.ts:326`; `governing/congress-lawmaking.ts:356` | MODEL RULE from assigned majority agenda. Division by 2 defines half. Largest caucus can be a plurality; nonpartisan fallback uses person members.         | Gates which proposal is filed; a tie fails. Backing does not require filing strength 3. Player is excluded from automatic backing but remains in the group's denominator. This is not a legislative floor-vote rule.                                             |
| Day 1 monthly intake; one selected proposal per chamber/intake                                             | `governing/congress-lawmaking.ts:104,615–628`                                                                 | PLACEHOLDER cadence; one follows the selected-candidate route.                                                                                             | Caps filing opportunities, not eventual enactment. Committee/floor/executive routes and pending questions further constrain output.                                                                                                                              |
| Default one quarterly intake; three months per quarter; quarter day 01                                     | `governing/member-agenda.ts:77,427–431,894`                                                                   | Game cadence with calendar arithmetic; imported place settings can supply other quarter counts.                                                            | Controls local agenda opportunities. Local unmapped-law ordering still uses seeded Fisher–Yates at 751–752; indices 0 through i are an ordering mechanism, not a filing probability.                                                                             |
| Tuesday/Thursday, UTC weekday values 2,4; next date starts after +1 day                                    | `governing/congress-chambers.ts:267–275`                                                                      | PLACEHOLDER congressional sitting calendar; not a researched legislative-day schedule.                                                                     | Determines when ordinary and consent chamber steps can occur; no independent daily bill-processing clock was added.                                                                                                                                              |
| Requester positive score; any senator negative score objects; exactly one passage requester/reference      | `governing/congress-procedure.ts:73–86,177–225`                                                               | MODEL RULE, CTO September 30 12:40 a.m. decision plus canonical evidence constraints. Missing records refuse consent.                                      | Named request and chair passage with null vote ID, or ordinary roll call when objection exists. Historical prefix/date/order checks keep later records from rewriting past consent. No probability or unanimous tally.                                           |
| Budget instruction present greater than half; yeas greater than nays                                       | `governing/congress-procedure.ts:381–391`                                                                     | Draft MODEL RULE. Compact instruction event, not a recorded concurrent budget-resolution measure or full statutory window.                                 | Can select the draft reconciliation pack; incomplete legal evidence remains a blocker to fiscal acceptance.                                                                                                                                                      |
| Fiscal delta zero rejected; receipt decrease or outlay increase rejected                                   | `governing/congress-procedure.ts:281–288`                                                                     | Conservative draft sign filter. Zero/sign are arithmetic boundaries; the rule is incomplete, not full Byrd compliance.                                     | Keeps unscored, mixed and worsening fiscal provisions on ordinary cloture. Missing committee netting, outyear and incidental-purpose tests cannot be inferred.                                                                                                   |
| Three days between steps; seven days to hearing                                                            | `governing/legislative-clock.ts:158,160`                                                                      | PROVISIONAL game profile awaiting sourced rules.                                                                                                           | Controls hearing/floor throughput and exposure time; no annual law-output calibration established.                                                                                                                                                               |
| Member notice at 16:00 previous day, duration 60 minutes; late notice 30 minutes                           | `governing/legislative-clock.ts:1506–1509,1534`                                                               | UNVERIFIED game scheduling. 60 minutes/hour is a unit; 16:00, duration and previous-day choice are settings.                                               | Changes the player's opportunity to respond before a vote; not an empirical member response rate.                                                                                                                                                                |
| Next day after committee hearing; next year January 1 after closed session                                 | `legislation.ts:500`; `governing/legislative-clock.ts:556,630,636`                                            | Calendar admission/fallback conventions; no universal legal next-day or January reopening claim.                                                           | Changes earliest permissible action and when a deferred measure resumes. Imported real session dates still matter.                                                                                                                                               |
| Search through current year plus 4, inclusive                                                              | `governing/legislative-clock.ts:1045`; `governing/governing-calendar.ts:47`                                   | Operational horizon, UNVERIFIED sufficiency.                                                                                                               | Limits future-session/season search; beyond the horizon a qualifying date may not be found. Not the statutory reconciliation budget window.                                                                                                                      |
| Sponsor birth-year offset 34–69; month 1–12, day 1–28                                                      | `governing/legislative-clock.ts:1686,1695`                                                                    | UNVERIFIED seeded generated-person profile, exclusive bounds 70/13/29.                                                                                     | Writes canonical birth date when a generated sponsor is needed. Actual age can be one lower before the birthday. Excluding days 29–31 distorts birthdays; no measured age distribution. A seated-sponsor pick at 1683 is a separate seeded selection dependency. |
| Trust ranks none/slight/marked/strong = 0,1,2,3                                                            | `governing/chamber-votes.ts:638`                                                                              | UNVERIFIED ordinal model scale.                                                                                                                            | Selects strongest applicable relationship cue on each side; not a measured persuasion coefficient.                                                                                                                                                               |
| Shared importance 1,2,4,6 times confidence 1,2,3                                                           | `decisions.ts:46–54`; `governing/chamber-votes.ts:722–725`                                                    | UNVERIFIED shared decision scale. Chamber helper also uses it to choose decisive explanation.                                                              | Sets relative influence of qualitative cues and the recorded rationale. Sponsor-party and governor cues inherit these values without an extra numeric party-propensity draw.                                                                                     |
| Close-choice window 2; optional integer noise −1,0,+1                                                      | `decisions.ts:56,176–188`                                                                                     | PLACEHOLDER decision machinery, only for requested `close-choices` and multiple options within the window.                                                 | Can change a close choice. Chamber voting and governor bill evaluation explicitly request `randomness: none`, so this noise is not their voting/signing rule. Other callers need their own scope audit.                                                          |
| Preference cuts at −8,0,+8                                                                                 | `decisions.ts:381–384`                                                                                        | UNVERIFIED categorical report scale.                                                                                                                       | Labels recorded base-score preference as strong opposition, opposition, mixed, support or strong support. Does not itself change the selected option.                                                                                                            |
| Budget urgency at 30/90 days                                                                               | `governing/budget-stakes.ts:39`                                                                               | PLACEHOLDER consideration strength. Fiscal-year source dates do not establish the behavioral cutoffs.                                                      | Changes budget-stakes importance in member voting. 86,400,000 at line 62 is milliseconds/day, not a behavioral coefficient.                                                                                                                                      |
| Governor's same-party moderate/other-party slight cues; medium confidence                                  | `governing/governor-bill-decision.ts`                                                                         | UNVERIFIED qualitative weights map through the shared numeric scale. Source explicitly awaits governor-sign/veto research.                                 | Can influence sign/veto alongside principles, recorded party votes, relationships, staff and override prospects. No modeled re-election term is inferred. Evaluation uses no random noise.                                                                       |
| Matter deadlines: staff 21, agenda 30, implementation 30, budget 30, bill 10, program 45, clemency 60 days | `governing/state-governing.ts:771–779`                                                                        | PLACEHOLDER office-management windows. In particular bill 10 is not every state's legal veto deadline; clemency comment discloses missing research.        | Determines expiry/delegation timing. Actual legislative-measure executive windows are separate rule-pack inputs.                                                                                                                                                 |
| Staff steadiness at least 2                                                                                | `governing/state-governing.ts:994,1007`                                                                       | UNVERIFIED choice threshold; imported staff-assessment construction needs its owner's ledger.                                                              | Changes delegated implementation/program choices. No empirical steadiness-success scale established.                                                                                                                                                             |
| Staff-candidate birth-year offset 34–61; month 1–12/day 1–28                                               | `governing/state-governing.ts:1084`                                                                           | UNVERIFIED seeded profile, exclusive bounds 62/13/29.                                                                                                      | Writes generated canonical people and affects age/history; not exact actual-age bounds or measured staff demography.                                                                                                                                             |
| Automatic decision max(3, deadline−1) days after opening                                                   | `governing/state-governing.ts:1225`                                                                           | PLACEHOLDER response timing; 1 day before deadline with minimum 3.                                                                                         | Schedules nonplayer office action. Changes whether decisions precede outside events; not an observed response-time distribution.                                                                                                                                 |
| Three chief-of-staff candidates; up to three program options                                               | `governing/state-governing.ts:1276,1290`                                                                      | PLACEHOLDER choice-set caps.                                                                                                                               | Limits hiring and management alternatives. Seeded picks choose identities/options, not researched preferences.                                                                                                                                                   |
| Program review 30 days; chief-of-staff 45–60 hours/week                                                    | `governing/state-governing.ts:1386,1664`                                                                      | UNVERIFIED review cadence and authored work demand.                                                                                                        | Schedules reports and writes work timeDemand consumed by availability/scheduling. No place/office-size anchor verified.                                                                                                                                          |
| Follow-up budget 90 days, legacy non-measure veto 21; implementation fast 60 otherwise 120 days            | `governing/state-governing.ts:1698,1735,1775`                                                                 | PLACEHOLDER management follow-up cadence.                                                                                                                  | Controls when consequences and progress/problem records emerge. Real measure veto/action evidence is a separate route.                                                                                                                                           |
| Entry next day                                                                                             | `governing/state-governing.ts:2013`                                                                           | Scheduling convention, not a strength.                                                                                                                     | Schedules follow-up governing work after entry rather than on the entry date.                                                                                                                                                                                    |
| Implementation careful +3, funded +2, plus staff steadiness; score at least 2 means progress               | `governing/state-governing.ts:2199,2215–2218`                                                                 | UNVERIFIED deterministic outcome scale. Missing office stalls. Removed dice do not make remaining weights researched.                                      | Produces a canonical implementation progress/problem report; can alter recaps/news evidence. No measured success probability.                                                                                                                                    |
| Budget proposal selects priority plus one other, otherwise two others                                      | `governing/state-governing.ts:2433`                                                                           | PLACEHOLDER proposal-size cap and seeded choice.                                                                                                           | Limits program coverage of an appropriation draft; does not establish actual legislative support.                                                                                                                                                                |
| December 1 budget season; February 15/March 15/April 15 bill seasons                                       | `governing/governing-calendar.ts:22–25`                                                                       | PROVISIONAL common calendar explicitly not compiled state law. String numbers are outside AST numeric extraction.                                          | Opens office matters and intake opportunities; import regular-session-year filters do not legalize these universal dates.                                                                                                                                        |
| Odd/even year modulo 2                                                                                     | `governing/session-adjournments.ts:39`                                                                        | MECHANIC selects imported place-specific legal odd/even session limit.                                                                                     | Determines adjournment boundary. Actual values/authority remain in each imported rule pack; no generic year-parity rule substitutes for them.                                                                                                                    |
| House committee 40; Senate committee 22                                                                    | `congress-rule-pack.ts:375,398`                                                                               | Explicit PLACEHOLDER committee sizes even though referral/committee authorities are cited.                                                                 | Defines eligible committee fixture/body counts and vote thresholds; real committee sizes vary. An authority on procedure does not source these sizes.                                                                                                            |
| Senate baseline 100 plus modeled statehood additions                                                       | `congress-rule-pack.ts:393–394`                                                                               | Code marks 100 LEGAL under Article I section 3, deriving two senators per current 50 states; not a permanent constitutional total.                         | Pack baseline and growth limit. Actual seated/chosen/sworn membership and vacancies are separate readers. House size is explicitly unknown in this pack, not an audited legal 435.                                                                               |
| Ordinary cloture 3/5 chosen and sworn                                                                      | `congress-rule-pack.ts:409–410`                                                                               | LEGAL Senate Rule XXII for the modeled ordinary legislative stage; this is 60 only with denominator 100. Exceptions are not all modeled.                   | Gates ordinary Senate bills. Consent passage does not fabricate a cloture vote; draft reconciliation removes this stage only with its unfinished fiscal proof.                                                                                                   |
| President action window 10 in-session days                                                                 | `congress-rule-pack.ts:458`                                                                                   | LEGAL Article I section 7, incompletely applied: source discloses Sundays and pocket veto not modeled.                                                     | Determines executive lapse timing. Existing code must not be described as full constitutional deadline fidelity.                                                                                                                                                 |
| Override 2/3 each house                                                                                    | `congress-rule-pack.ts:470–471`                                                                               | LEGAL Article I section 7, with rule-pack denominator.                                                                                                     | Determines whether a returned federal bill overrides the veto; not a chance of override.                                                                                                                                                                         |
| Exactly one conference forum; ordinal/sequence increments and zero tallies                                 | `legislation.ts:2793`; other appendix locations                                                               | MODEL constraint/MECHANICS, not human calibration.                                                                                                         | Forum validation can refuse an unsupported conference; counting/order preserves canonical evidence. Imported place floor/session/executive values need per-place audit, not a guessed common law.                                                                |
| Neutral midterm loss 3.6 points                                                                            | `national-mood.ts:10`                                                                                         | Historical mean used as model anchor, not a constant observed effect. Main still has the fixed 3.6 rule at the inspected main pin.                         | Shifts President-party two-party share in existing election/turnover callers. The 1136 replacement remains WIP.                                                                                                                                                  |
| Approval baseline 53 percent                                                                               | `national-mood.ts:12`                                                                                         | Unsupported draft baseline. Current packet's equal-tenure mean is about 51.907, not 53; neither is an election-date observation or paired causal estimate. | Centers inferred approval and response. No actual poll producer was established; missing observation does not authorize invented approval.                                                                                                                       |
| Approval .45; growth .6; unemployment .35; inflation .2; economic-to-approval multiplier 2                 | `national-mood.ts:22–26`                                                                                      | UNVERIFIED preserved WIP response weights. No fitted or approved research coefficients.                                                                    | Converts different inputs to predicted midterm shift/inferred approval. Subjective economic sentiment is not interchangeable with macro growth/inflation/unemployment.                                                                                           |
| Response bounds −9,+2.3 points                                                                             | `national-mood.ts:27–28`                                                                                      | OBSERVATION anchors from historical midterms, used as unsupported universal future bounds in draft.                                                        | Saturates response and prevents outcomes outside those extrema; historical extrema alone do not justify that restriction.                                                                                                                                        |
| Logistic sensitivity divisor range/4; economic approval divisor 25                                         | `national-mood.ts:50,106`                                                                                     | UNVERIFIED response shape/scale. Values 4 and 25 are not unit conversions.                                                                                 | Controls how sharply inputs change shift/approval; must remain disclosed even with historical endpoints.                                                                                                                                                         |
| Even non-presidential years, modulo 2/4; absent inputs yield zero change; percentages divide/multiply 100  | `national-mood.ts:59–63,111,129–137`                                                                          | Calendar/model scope and missing-data defaults; 100 is units.                                                                                              | Odd-year state elections get zero national adjustment; missing macro history is not measured neutral conditions. Current branch handles known President party and release history without writing a poll.                                                        |
| All-D/all-R boundary displaced +1/−1; tie rank centered by .5; midpoint /2                                 | `nationwide-world/state-chamber-calibration.ts:46–63`                                                         | UNVERIFIED WIP logit boundary/tie scheme; midpoint is arithmetic. Module absent on inspected main.                                                         | Repositions opening seat leans to rounded partisan targets. Strong displacement and tie treatment affect later elections; sitting composition does not validate them as electoral sensitivity.                                                                   |

## Wider knock-on effects and missing links

Source trace: recorded principles → best proposal/majority backing → filing/sponsor/cosponsors → institution clock → member vote or canonical consent → executive decision → enactment and mapped policy effects. The consent fixture checks request/chair order, Save/Continue replay and the public-information reader's legislative-development reference. A request or passage is an available news source, not evidence that an outlet published a story. Newspaper generation and the nationwide five-year chain remain unobserved.

The strength-3 filing gate, sign-only backing gate, 3/6/9 principle importance, shared importance/confidence multiplication and clock cadence jointly shape output. None supplies an annual enactment target. Question availability, current laws, pending proposals, caucus/chamber membership, session rules and executive behavior also constrain output. Unmapped legal answers may lack a further effect consumer; the coordinator's effect ledger and Team 1 law writers remain necessary connections.

Reconciliation research names 2 U.S.C. sections 632, 641 and 644: the concurrent resolution, its instructions and Byrd tests are distinct evidence. The statutory budget horizon includes the upcoming fiscal year and at least the following four; it is not the clock's unrelated plus-four search loop. This draft has not established recorded adopted resolution identity, committee allocations, full fiscal-window scores or all Byrd grounds. No fabricated budget resolution, parliamentary finding or vote is supplied.

Imported state/legal rule packs, qualification/nomination data, staff assessment, source-opening macro conditions and person life-formation strengths are dependency boundaries. This 18-file slice does not claim their complete inventory. Broader researched nonlaw anchors must span kinds/sizes and preserve seeded world-creation spread; no one-place proxy is approved by this report.

## VITAL STATISTICS

The numeric AST extraction was executed at the named source pin: 451 occurrences, 18 files. The appendix includes every occurrence's value and line; repeated occurrences on the same line are retained in order. Signed unary values are recorded as negative once. Numeric text in date strings and category cardinalities is handled in the table.

Previously executed consent source checks at this unchanged source head: changed test 16/16 passed; strict changed-root TypeScript 4 roots/701 dependency files, zero diagnostics; changed source ESLint, formatting, scoped English, handback report and whitespace passed; exact preceding-head release check passed. The zero-dice command exited 1 with zero new findings and one stale removed entry in Team 4's shared allowlist. It was not a pass. These are source checks, not nationwide runtime acceptance, and were not rerun for this inventory.

Full simulations, five-year postmerge watched results, browser/player acceptance and new independent review: NOT RUN. No production numeric replacement is part of this ledger.

## NEEDS LAMONTAE

CTO requested each team's ledger by 5 a.m. This first core slice is available for the coordinator to compile; imported rule/data and adjacent assignment paths still need bounded follow-up. Team 1 must report its continuous life-strength design before coding weights. CTO decides research and model design; no owner-approved calibration is inferred from this inventory.

## PLACEHOLDERS

Explicit source placeholders and unsupported settings are identified in the table. The preserved draft mood weights and seat calibration are not ready for production. Legal application gaps require actual jurisdiction-specific authority. Observed research numbers are not silently converted into behavior rates.

## Sources and research numbers

- [January 31, 2025 NCSL sitting composition](https://documents.ncsl.org/wwwncsl/About-State-Legislatures/2025-State-and-Legislative-Partisan-Composition.pdf): `data/research/governance-calibration-2024.json` preserves all 50 states and six additional jurisdictions. Vermont House 87 D/56 R/7 other; Senate 16 D/13 R/1 other. The filename does not make it certified 2024 results. Other parties, vacancies and nonpartisan/structural-null entries need preservation. Zero-transcribed blanks are disclosed data interpretation, not missing research replaced by a guess.
- [Gallup historical approval](https://news.gallup.com/poll/116677/presidential-approval-ratings-gallup-historicalstatistics-trends.aspx): `data/research/midterm-calibration.json` has 14 completed presidential-tenure averages, Truman through Biden. Their unweighted row mean is approximately 51.907 percent; tenure duration/poll-count weighting is not established. No paired election-date relationship follows from the mean.
- [Brookings historical congressional elections table](https://www.brookings.edu/wp-content/uploads/2026/04/2-2-Full.pdf): the packet has 19 midterms, 1950–2022, signed President-party share changes with −9/+2.3 endpoints. Excluded uncontested vote entries and one-decimal rounding limit comparison. These are historical observations, not coefficients or future bounds established by research.
- The packet's Census descriptive scope spans states/DC and multiple election years. It supports election-type/date, registration, turnout and size comparisons; it currently produces no game weight. Approval, felt economy, candidates and mobilization require broad evidence and explicit interfaces under CTO's superseding research instruction. No single fitted academic model will be reproduced.
- [Senate Rule XXII](https://www.rules.senate.gov/rules-of-the-senate), [Article I](https://constitution.congress.gov/browse/article-1/) and [2 U.S.C. chapter 17B](https://uscode.house.gov/view.xhtml?path=/prelim@title2/chapter17B&edition=prelim): legal procedure authority, not a source for fictional committee counts, behavioral strength or response timing.

## Complete extracted-location appendix for this slice

Values below include mechanics as well as behavior. A location's semantic classification is in the table or the exclusion rule: empty/count/sequence checks, substring/capture/tuple indices, loop increments, latest-record selection and string padding are mechanics. Sign/zero boundaries, caps, dates, search horizons and qualitative numeric scales with behavioral effects are explicitly identified above. This appendix is a reproducible coverage receipt for these 18 files, not an assertion of coverage of every imported dependency.

### `src/simulation/governing/officeholder-principles.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 45   | `3`, `2`                    |
| 62   | `1`                         |
| 63   | `2`                         |
| 64   | `3`                         |
| 65   | `4`                         |
| 71   | `3`, `6`, `9`               |
| 114  | `0`, `10`                   |
| 175  | `1`                         |
| 204  | `0`                         |
| 212  | `0`                         |
| 219  | `1`, `-1`                   |
| 260  | `0`                         |
| 267  | `0`                         |
| 270  | `0`                         |
| 271  | `0`                         |
| 284  | `0`                         |
| 309  | `0`                         |
| 312  | `0`                         |
| 351  | `0`                         |
| 358  | `1`, `-1`                   |
| 366  | `0`                         |
| 381  | `0`, `0`                    |
| 412  | `1`                         |
| 421  | `0`                         |
| 431  | `1`, `-1`                   |
| 434  | `0`                         |
| 437  | `0`                         |
| 438  | `0`                         |
| 451  | `0`                         |

### `src/simulation/governing/majority-agenda.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 20   | `1`, `1`, `0`, `0`          |
| 23   | `0`, `1`                    |
| 52   | `2`                         |
| 56   | `2`                         |

### `src/simulation/governing/member-agenda.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 77   | `1`                         |
| 80   | `3`                         |
| 117  | `0`                         |
| 178  | `0`                         |
| 326  | `0`                         |
| 384  | `-1`                        |
| 425  | `0`, `4`                    |
| 426  | `5`, `7`                    |
| 427  | `1`, `3`, `1`, `3`, `1`     |
| 428  | `12`, `1`                   |
| 429  | `12`, `1`                   |
| 431  | `2`                         |
| 575  | `0`                         |
| 579  | `0`                         |
| 604  | `0`                         |
| 751  | `1`, `0`, `1`               |
| 752  | `0`, `1`                    |
| 825  | `-1`                        |
| 894  | `0`, `1`                    |

### `src/simulation/governing/congress-lawmaking.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 104  | `1`                         |
| 105  | `3`                         |
| 166  | `0`                         |
| 168  | `0`, `1`                    |
| 243  | `0`                         |
| 356  | `0`                         |
| 368  | `0`, `4`                    |
| 417  | `-1`                        |
| 488  | `0`                         |
| 507  | `1`                         |
| 561  | `0`                         |
| 562  | `0`                         |
| 565  | `1`                         |
| 566  | `1`                         |
| 615  | `0`, `4`                    |
| 616  | `5`, `7`                    |
| 618  | `2`                         |
| 622  | `2`                         |
| 625  | `12`, `1`                   |
| 626  | `12`, `1`, `1`              |
| 628  | `2`                         |
| 687  | `0`                         |
| 699  | `1`                         |
| 714  | `1`                         |

### `src/simulation/governing/congress-chambers.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 129  | `0`, `1`                    |
| 175  | `1`                         |
| 207  | `0`                         |
| 267  | `2`, `4`                    |
| 274  | `1`                         |
| 275  | `1`                         |

### `src/simulation/governing/congress-procedure.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 73   | `0`                         |
| 81   | `0`                         |
| 86   | `0`                         |
| 177  | `0`                         |
| 182  | `1`                         |
| 224  | `1`                         |
| 225  | `0`                         |
| 255  | `0`                         |
| 264  | `0`                         |
| 281  | `0`                         |
| 283  | `0`                         |
| 284  | `0`                         |
| 287  | `0`                         |
| 288  | `0`, `0`                    |
| 381  | `0`                         |
| 383  | `0`                         |
| 391  | `2`                         |
| 461  | `0`                         |
| 462  | `0`                         |

### `src/simulation/governing/legislative-clock.ts`

| Line | Numeric literal occurrences              |
| ---- | ---------------------------------------- |
| 158  | `3`                                      |
| 160  | `7`                                      |
| 258  | `0`, `4`                                 |
| 264  | `1`                                      |
| 340  | `1`                                      |
| 453  | `0`                                      |
| 556  | `0`, `4`, `1`                            |
| 593  | `0`                                      |
| 630  | `1`                                      |
| 636  | `1`                                      |
| 652  | `0`                                      |
| 732  | `0`                                      |
| 765  | `0`, `0`                                 |
| 832  | `0`                                      |
| 1044 | `0`, `4`                                 |
| 1045 | `4`, `1`                                 |
| 1112 | `0`                                      |
| 1234 | `0`                                      |
| 1475 | `0`                                      |
| 1506 | `16`, `60`                               |
| 1507 | `60`                                     |
| 1509 | `30`                                     |
| 1534 | `-1`                                     |
| 1542 | `0`                                      |
| 1561 | `0`                                      |
| 1636 | `0`, `4`                                 |
| 1641 | `0`                                      |
| 1656 | `0`, `4`                                 |
| 1671 | `0`                                      |
| 1683 | `0`                                      |
| 1686 | `34`, `70`                               |
| 1695 | `0`, `4`, `1`, `13`, `2`, `1`, `29`, `2` |
| 1719 | `-1`                                     |
| 1729 | `0`, `1`                                 |
| 1731 | `1`, `1`, `0`, `0`                       |
| 1732 | `0`, `0`                                 |

### `src/simulation/governing/chamber-votes.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 101  | `2`                         |
| 113  | `0`, `1`                    |
| 386  | `0`                         |
| 404  | `0`                         |
| 415  | `0`                         |
| 448  | `0`                         |
| 475  | `0`                         |
| 487  | `0`                         |
| 488  | `0`                         |
| 493  | `0`, `2`                    |
| 527  | `3`                         |
| 594  | `0`                         |
| 638  | `0`, `1`, `2`, `3`          |
| 699  | `0`                         |
| 722  | `1`, `2`, `4`, `6`          |
| 725  | `1`, `2`, `3`               |

### `src/simulation/governing/governor-bill-decision.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 62   | `0`, `0`                    |
| 75   | `0`                         |
| 76   | `0`                         |
| 81   | `1`                         |
| 82   | `1`                         |
| 119  | `1`                         |
| 241  | `0`                         |

### `src/simulation/governing/state-governing.ts`

| Line | Numeric literal occurrences      |
| ---- | -------------------------------- |
| 272  | `1`                              |
| 273  | `0`                              |
| 347  | `0`                              |
| 376  | `1`                              |
| 633  | `0`                              |
| 635  | `1`                              |
| 771  | `21`                             |
| 772  | `30`                             |
| 773  | `30`                             |
| 774  | `30`                             |
| 775  | `10`                             |
| 776  | `45`                             |
| 779  | `60`                             |
| 870  | `0`                              |
| 928  | `0`                              |
| 938  | `0`, `0`                         |
| 994  | `2`                              |
| 1007 | `2`                              |
| 1055 | `2`                              |
| 1066 | `0`, `4`                         |
| 1067 | `0`, `1`                         |
| 1084 | `34`, `62`, `1`, `13`, `1`, `29` |
| 1186 | `-1`                             |
| 1225 | `3`, `1`                         |
| 1276 | `3`                              |
| 1290 | `3`, `0`                         |
| 1291 | `0`, `1`, `0`                    |
| 1347 | `0`                              |
| 1386 | `30`                             |
| 1499 | `1`                              |
| 1664 | `45`, `60`                       |
| 1698 | `90`                             |
| 1735 | `21`                             |
| 1760 | `0`                              |
| 1775 | `60`, `120`                      |
| 1865 | `-1`                             |
| 2013 | `1`                              |
| 2068 | `0`                              |
| 2160 | `0`, `0`                         |
| 2161 | `0`                              |
| 2199 | `0`                              |
| 2215 | `3`, `0`, `2`, `0`               |
| 2218 | `2`                              |
| 2352 | `-1`                             |
| 2367 | `0`, `4`                         |
| 2422 | `0`, `4`                         |
| 2433 | `1`, `2`                         |
| 2464 | `0`                              |
| 2476 | `0`                              |
| 2600 | `0`                              |

### `src/simulation/governing/governing-calendar.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 44   | `0`, `4`                    |
| 47   | `4`, `1`                    |

### `src/simulation/governing/session-adjournments.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 39   | `2`                         |
| 44   | `-1`                        |
| 146  | `1`                         |

### `src/simulation/governing/budget-stakes.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 39   | `30`, `90`                  |
| 58   | `0`, `4`                    |
| 61   | `1`                         |
| 62   | `86_400_000`                |

### `src/simulation/legislation.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 404  | `0`                         |
| 500  | `1`                         |
| 962  | `0`                         |
| 1027 | `0`                         |
| 1028 | `0`                         |
| 1029 | `0`                         |
| 1030 | `0`                         |
| 1031 | `0`                         |
| 1036 | `1`                         |
| 1039 | `1`                         |
| 1042 | `1`                         |
| 1045 | `1`                         |
| 1048 | `1`                         |
| 1124 | `0`                         |
| 1129 | `0`                         |
| 1144 | `0`                         |
| 1293 | `1`                         |
| 1313 | `1`                         |
| 1346 | `1`                         |
| 1373 | `0`                         |
| 1394 | `0`                         |
| 1401 | `0`                         |
| 1422 | `0`                         |
| 1426 | `0`                         |
| 1427 | `1`, `1`, `1`               |
| 1467 | `-1`, `1`                   |
| 1468 | `0`                         |
| 1527 | `0`                         |
| 1606 | `0`                         |
| 1620 | `1`                         |
| 1674 | `0`                         |
| 1690 | `-1`                        |
| 1740 | `1`                         |
| 1747 | `1`                         |
| 1813 | `0`                         |
| 1924 | `0`                         |
| 2013 | `1`                         |
| 2050 | `0`                         |
| 2154 | `0`                         |
| 2164 | `0`                         |
| 2606 | `1`                         |
| 2712 | `1`                         |
| 2793 | `1`                         |
| 2798 | `0`                         |
| 2910 | `0`                         |
| 2971 | `0`                         |
| 2991 | `-1`                        |
| 3060 | `1`                         |
| 3153 | `0`                         |

### `src/simulation/national-mood.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 10   | `3.6`                       |
| 12   | `53`                        |
| 22   | `0.45`                      |
| 23   | `0.6`                       |
| 24   | `0.35`                      |
| 25   | `0.2`                       |
| 26   | `2`                         |
| 27   | `-9`                        |
| 28   | `2.3`                       |
| 45   | `1`                         |
| 50   | `1`, `4`                    |
| 59   | `0`                         |
| 61   | `0`                         |
| 63   | `0`                         |
| 94   | `-1`                        |
| 98   | `100`                       |
| 101  | `100`                       |
| 102  | `1`                         |
| 106  | `25`                        |
| 111  | `100`                       |
| 128  | `0`, `4`                    |
| 129  | `2`, `0`, `4`, `0`, `0`     |
| 131  | `0`                         |
| 136  | `100`                       |
| 137  | `0`                         |

### `src/simulation/nationwide-world/state-chamber-calibration.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 41   | `0`, `0`                    |
| 46   | `0`, `1`                    |
| 47   | `1`                         |
| 49   | `0`                         |
| 50   | `0`, `1`                    |
| 52   | `-1`, `1`                   |
| 53   | `2`                         |
| 54   | `0`                         |
| 63   | `0.5`                       |

### `src/simulation/congress-rule-pack.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 375  | `40`                        |
| 393  | `100`                       |
| 398  | `22`                        |
| 409  | `3`                         |
| 410  | `5`                         |
| 458  | `10`                        |
| 470  | `2`                         |
| 471  | `3`                         |

### `src/simulation/decisions.ts`

| Line | Numeric literal occurrences |
| ---- | --------------------------- |
| 46   | `1`                         |
| 47   | `2`                         |
| 48   | `4`                         |
| 49   | `6`                         |
| 52   | `1`                         |
| 53   | `2`                         |
| 54   | `3`                         |
| 56   | `2`                         |
| 91   | `2`                         |
| 166  | `0`                         |
| 172  | `0`, `0`                    |
| 175  | `0`                         |
| 176  | `1`                         |
| 178  | `0`                         |
| 182  | `0`                         |
| 184  | `1`                         |
| 188  | `-1`, `2`                   |
| 196  | `0`                         |
| 197  | `0`                         |
| 205  | `1`                         |
| 210  | `0`                         |
| 213  | `0`                         |
| 218  | `0`                         |
| 239  | `0`                         |
| 240  | `0`                         |
| 324  | `0`                         |
| 381  | `-8`                        |
| 382  | `0`                         |
| 383  | `0`                         |
| 384  | `8`                         |
| 389  | `0`                         |
| 390  | `0`                         |
| 659  | `1`                         |
| 699  | `0`                         |

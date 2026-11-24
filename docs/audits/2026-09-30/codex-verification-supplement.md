# Solo audit verification supplement

Several systems record success without the action that would make it true. Duties are marked fulfilled from staffing, bail is called paid after an affordability check, and some outlet purchases change ownership without payment. This supplement documents those defects, additional outcome dice, and the shared records that should survive consolidation. It is a working source audit, not a claim that every game path has been checked.

## Audited source and method

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`.
Written after executed `date`: September 30, 2026, 5:43 p.m. Eastern.
Read-only source: `/tmp/audit-main`. No tests or runtime reproduction. Reporting only to Lamontae; no communication with the CTO or other auditors.

## Report ownership and reconciliation

During this audit, `engines.md`, `dice.md` and `STATUS.md` changed independently. Their current text describes a different auditor and CTO communication. Those statements do not describe my actions. I have preserved the files rather than overwrite another writer. New verification findings go here until report ownership is resolved. This does not suspend source inspection. Prior incremental additions in the shared reports remain evidence only at their cited source lines.

### Correct close-choice count

A fresh exact-literal search of production TypeScript/TSX, excluding tests and generated files, returns **38 explicit `randomness: "close-choices"` settings**. `src/simulation/political-belief-formation.ts:161` adds a defaulted setting (`input.randomness ?? "close-choices"`), for **39 configuration sites in this search**, not 40 callers. The current dice table lists those 39 and then adds the evaluator itself as row 40. `src/simulation/decisions.ts:185–188` is the implementation of the random contribution, not another caller. This count does not establish the number of runtime executions, dynamic callers, or every form of randomness.

### Money timing needs a narrower claim

The current status text says mortgages, living costs and office salary settle only on a quiet stretch. Source confirms that `src/simulation/life-opportunities.ts:451–455` calls those settlers together (`settleOfficeSalaries`, `advanceJobMarket`, `settleMortgages`, `settleLivingCosts`). But it is also called by `src/player/HomePurchasePanel.tsx:43`, `src/presentation/ordinary-community.ts:172`, `src/presentation/ordinary-life.ts:231`, and `src/presentation/adult-life.ts:465,511`. The exclusive “only quiet stretch” claim is therefore too broad. The ordinary day-pass path at `src/presentation/ordinary-life.ts:425` explicitly settles job pay and household adult job pay; it does not directly call the three other settlers there. The confirmed defect surface is inconsistent transition composition, not a tested assertion about every UI button.

The shared compensation resolver at `src/simulation/resources.ts:698–726` records gross terms via `recordResourceTransferOutcome`; neither it nor the inspected weekly pay path contains tax withholding. Contrast the separately traced town payroll withholding. Keep the shared transfer writer and unify payroll obligations around it; do not describe every gross wage writer as an independent ledger.

### Clock chain duplication remains confirmed

`src/simulation/world.ts:1425–1461` and `src/simulation/time-work.ts:1994–2030` compose the same government/continuity/reform updates separately. They use different date-crossing inputs and enclosing clock operations. This is duplicated orchestration to consolidate; it does not, by itself, prove that each calendar advance runs all effects twice.

## Remaining coverage

All reports remain working audit material. Numeric and randomness search inventories are candidates, not validated violation totals. Completion requires semantic classification and reconciliation of the independent report changes, not merely counting text matches.

## Additional Financial law-to-record traces

### Tuition freeze: a drawn counterfactual changes the treasury

`src/simulation/public-budgets/tuition-freeze.ts:50–65` calls `drawnLinkSize` with a researched central/range value to decide yearly tuition growth. Lines 105–113 count years only when `law?.origin === "enacted"`; line 137 returns `1 - share * (1 - (1 + growth) ** -frozen)`. `src/simulation/public-budgets/month.ts:330–331` applies the factor to charges and fees. The research describes historical revenue growth; the code turns it into the price path that would otherwise have happened and an aggregate budget effect. This is both a drawn outcome level and an initial-law/new-law path split. July 1 is hardwired at `src/simulation/public-budgets/tuition-freeze.ts:76–77`. A real tuition restriction should constrain each institution's rate decision under the law's effective dates, with revenue following actual rates and enrollments. Keep the source data for calibration and existing treasury records; remove the special factor only after the common writer accounts for those institutions.

### Newly adopted income tax: collections without enacted rates

`src/simulation/public-budgets/income-tax-adoption.ts:10–19` explicitly says a bill does not carry rates and therefore the state's unmaterialized residents pay the average collections of other wage-tax states. Lines 58–62 calculate unweighted state averages; lines 79–84 return `AVERAGE_PER_RESIDENT * (earnings / AVERAGE_EARNINGS) * population * BUDGET_CALIBRATION`. This is sourced historical accounting used as a substitute for a tax mechanism. It can change estimated government revenue without defining the tax schedule that would produce it. The required replacement is an enacted rate/base/exemption schedule applied consistently to represented and aggregate taxpayers, reconciled to actual collections; an average is not permission to invent the law. The code comment separately adds modeled named-person withholding, so investigate population partition before alleging double collection.

### Pension obligations: formula is financial, opening liability is authored

`src/simulation/public-budgets/rules.ts:71–75` fixes `liabilityToSpending: 1.2`, `assumedReturn: 0.07`, and `amortizationYears: 30`, explicitly marked placeholders. `src/simulation/public-budgets/opening.ts:582–587` derives pension liability from general spending and assets from that invented liability times a reported funded ratio. The normal-cost/amortization calculation at lines 597–613 is a shared financial formula; the bedrock failure is its unsupported starting obligation and assumptions. Preserve reported plan data and the common calculation; supply actual earned benefits, plan valuation assumptions and contribution rules instead of declaring that every government's pension debt is 1.2 times annual spending.

### Statehood aid: real legal concept, private interpretation and frozen spending

`src/simulation/public-budgets/statehood-funds.ts:17–28` admits interpreting sufficient estimated revenues as money already held, and freezing the aid loss in fiscal-2024 dollars. Lines 35–43 compute fixed historic spending times match-rate differences. Lines 70–82 restrict the case to one statehood place and certify when `government.balance + government.reserve >= loss * years`. This does read saved books, but cash balance is not the same thing as a forecast of revenues; Medicaid spending never grows in this loss calculation. Treat admission conditions, match rates, forecast horizon and actual eligible spending as legal/program data consumed by common certification and treasury mechanisms. Preserve recorded certification decisions and their dates. Do not claim the real jurisdiction-specific provision itself violates nationwide uniformity; the private engine and unsupported interpretation do.

## Term limits: shared question, separate eligibility calculations

`src/simulation/living-world/local-council-term-limits.ts:28–31` makes every yes ordinance mean two consecutive terms because the ordinance has no count. Its `consecutiveCouncilYears` at lines 67–103 reads organization participation, allows a 31-day break and converts dates with 365.25 days/year. `src/simulation/nationwide-world/state-legislative-term-limits.ts:139–164` instead uses a table of state rules or a most-common eight-year fallback; lines 226–247 separately implement consecutive-service counting with the same 31-day reset. The latter reads work relationships, not the local participation records. Its within-period window uses the proposed term end (lines 277–279); both routes round years before barring service.

These affect actual candidacy: `src/simulation/living-world/local-elections.ts:923` calls the council bar, while `src/simulation/nationwide-world/state-legislature-turnover.ts:302,372` calls the state bar. Keep researched legal differences as data, including partial-term counting and reset intervals. Normalize actual service records, then use one eligibility evaluator for all offices; never infer enacted limits from a popular rule elsewhere. Preserve all old service identities before replacing either private counter.

## Juvenile justice: binary policy answer substitutes for legal jurisdiction

`src/simulation/justice/juvenile-court.ts:25–40` maps yes to adult age 18, no to 17, and no known law to 18: `law?.answer === "no" ? ...17 : ...18`. The comment at lines 18–19 says juvenile court itself is not played and younger offenders are not named by police. This has a real caller at `src/simulation/crime/offenders.ts:161`, `adultCourtAgeAt(...)`. An average rule cannot supply an unknown place's criminal jurisdiction; nor does a single yes/no capture offense-specific transfer, exceptions and timing. Feed actual jurisdiction and transfer rules into one case-routing engine and preserve legitimate declines for unsupported proceedings.

## Health coverage: saved “loss” can be produced by missing income records

The strongest part of this route is that it reads household/work/law records, then writes named-person coverage and a law-effect stamp. It is not merely an effects dashboard. However, `src/simulation/crisis/health-coverage.ts:297–306` represents outside/unknown cases as `covered: false`; lines 336–340 return `outside:income-unrecorded` when a working member's pay is not tracked. `recordHealthCoverage` at lines 490–501 compares that false to prior coverage, and lines 539–560 append a loss record for a previously covered person. `basisFor` at lines 465–466 renders this unhandled reason as “No longer lives in a state that covers them.” Missing pay evidence can therefore become a loss of coverage with an invented residence explanation. This is a source-proven conditional path, not an executed person's case. Preserve prior coverage or an explicit pending determination when necessary evidence is missing; the narrative must report the actual unresolved reason.

Further boundaries: the fifteenth-day pass is chosen to avoid other writers (`src/simulation/crisis/health-coverage.ts:72–80`), not a cited benefit-effective-date rule. The header at lines 18–23 explicitly applies an eligible-population mortality result to each covered person's hazard; this changes the study denominator, even if the cited effect size is accurately transcribed. Lines 25–39 admit missing income categories, exemptions and non-expansion coverage. The replacement should separate legal eligibility, actual enrollment/service access and the person's health mechanism; preserve sourced guidelines and recorded coverage rather than treating all this code as an unused law reader.

## Federal terms and the narrative boundary

- **Historical rate becomes every new bill's rate.** `src/simulation/federal-top-income-tax-law.ts:27` fixes `RAISED_TOP_RATE_BASIS_POINTS = 3960`; lines 73–92 read only an enacted yes/no answer on January 1 and substitute that top rate into the 2026 schedule. The comment at lines 6–12 explains its historical/proposed-law source. That is evidence the rate existed or was proposed, not evidence that every in-game increase enacts it. `src/simulation/statutory-tax.ts:330` consumes the reader, so this reaches actual withholding. Preserve the common bracket calculation and legal source; pass enacted rates, brackets and effective tax periods as law data.
- **Historical fiscal deal becomes every new deal.** `src/simulation/federal-outlay-laws.ts:6–16` uses the 2023 debt-limit deal's estimated cut and a median historical foreign-aid rise. Lines 71–76 return fixed dollars when their yes questions are enacted; lines 91–94 apply the same cut share to every government's federal aid. The header admits the original deal cut discretionary programs whereas the game has one aid line. Replace private yes-to-dollar conversions with appropriations and actual recipient programs. Absence of a measured domestic aid effect is an explicit research gap, not proof that the true effect is exactly zero.
- **The law-effects screen is read-only, but its counterfactual is algebraic.** `src/presentation/law-effects-here.ts:64–73` removes one factor and multiplies all remaining saved factors; lines 134–137 describe the result as what the condition “would” be without the law. It does not run an alternative world with changed jobs, payments, behavior or other feedback. Keep this as a clearly labeled model attribution if retained; it cannot prove an observed named-person causal effect. The violation originates in the outcome producer, not an invented screen-side event.
- **News reads those modeled records.** `src/simulation/press/law-effect-news.ts:647–658` compares `outcomeFactor` and `placeOutcomeAt` before/after the law. Lines 684–701 write an anniversary story comparing those recorded values. This is a real saved story, but not independent validation of the underlying effect calculation. The reader must preserve the distinction between simulated observations, attribution estimates and forecasts; saving a generated number does not make its mechanism sound.
- **Policy realization is a separate path to the causal engine.** `src/simulation/policy-semantics.ts:462–476` selects nonzero computed consequences; lines 514–523 pass `absoluteMetricValue(consequence.estimatedChange)` into `activateEffect`. This is a second caller surface to reconcile when unifying law effects. Its guards against duplicate realization and wrong implementation profiles are useful and should survive. Whether every policy realization is reached by an ordinary law route is not established by this local trace.

## Constitutional review: cases appear from catalog membership

`src/simulation/judiciary/judicial-review.ts:7–31` documents an automatic challenge near a law's effective date, with the state's highest court substituted for the federal district courts where many cited challenges actually began. The nine rows in `data/research/laws/judicial-review-precedents-2026.json:4` select age verification, gas hookups, private-school funding, photo ID, cash bail, concealed carry, right-to-work, rent stabilization and redistricting. This is a verified count of table questions, not nine tested challenges.

**Entry and saved result:** `src/simulation/world.ts:1425` calls `applyJudicialReview`. `src/simulation/judiciary/judicial-review.ts:362–387` scans matching enactments, excludes national laws, and sets `ruledAt` to the day before operation or enactment date, whichever is later. Lines 405–428 run those due rows. `reviewOne` at lines 279–310 obtains seated justices and a simple majority to strike; lines 314–330 write their votes and `outcome:struck`/`outcome:upheld` into history. The path needs no claimant, actual harm, petition, jurisdiction ruling, hearing or service record. This is authored litigation scheduling feeding real law invalidation.

**Decision evidence is also generalized:** lines 161–179 turn every dated precedent row into a high-confidence weighted reason; the reviewed-question type at lines 85–92 carries question/answer/claim/rulings, but no venue or controlling-jurisdiction test. Lines 192–209 add the justice's political principles. `data/research/laws/judicial-review-precedents-2026.json:61–78`, for example, puts Kentucky/South Carolina and Indiana/North Carolina private-school decisions on opposing sides of one question. The code uses the row's importance, not a determination that each holding controls this law in this court. These are source claims in the repository; I have not independently validated those cases.

**Survivor and sequence:** keep judicial seat records, common decision evidence, dated precedent storage and durable ruling IDs. First give a case a recorded claimant, challenged provision, requested remedy, forum and filed date. Apply legal jurisdiction and procedural rules from data. Then let the appropriate court read applicable precedent and actual facts, and have the same legal-status resolver consume the disposition for both initial and newly enacted law. Remove the automatic question-table trigger after this route reproduces existing valid consequences. Do not copy the criminal prosecution timeline wholesale: shared case records can support distinct legal procedures without separate private clocks or invented filings.

## Criminal decisions and civil-case coverage

`src/simulation/justice/prosecution.ts:187–205` reduces referral to `standingFindings >= 2 || deniedIt` and prosecution to `evidence !== "circumstantial" || basisEvents >= 2`. The comments explicitly call these stand-ins for unseated commissioners/prosecutors. Denial is not itself a recorded act of concealment, and two records are not necessarily two independent admissible facts. Keep evidence provenance and require the actual actor's decision against the applicable standard; a citation beside a Boolean heuristic does not establish that heuristic.

`src/simulation/justice/court-decisions.ts:7–12` uses alphabetical option keys so a balanced defendant chooses a plea and a balanced juror acquits. The acquittal default can represent a legal burden if properly implemented; a forced plea is the defendant's substantive choice, not the same legal presumption. Do not accept alphabetical order as a universal records-based replacement for dice.

The judicial gameplay compiler is expressly administrative (`src/simulation/judicial-gameplay-kernels.ts:4–6`) and dispatches common history, evidence, activity, work and relationship writers at lines 614–628. Its bank explicitly marks legal disposition and case-transfer gaps (`src/simulation/judicial-gameplay-kernel-bank.ts:565–566`). Searches for civil-case/plaintiff/tort/injunction paths did not establish a complete ordinary civil litigation engine. That is an **unverified coverage gap**, not a claim that no indirect implementation exists anywhere. Do not count the administrative compiler as an implemented civil court engine or delete it as a duplicate verdict system.

## Effects reaching people: recorded inputs still feed authored responses

### Exposure and reflection

`src/simulation/law-exposure.ts:54–58` refuses exposure without a person and an enacted measure (`Only an enacted law can reach a person`). Lines 75–99 propagate a spouse's exposure, and lines 135–167 schedule NPC reflection after exactly three days. This is a useful durable link between a real consequence and a person, but excludes initial legal provisions from the same attribution identity. The 28-day pay window at lines 42–45 is a marked averaging assumption, not an actual monthly obligation. Preserve source-record IDs and causal attribution when normalizing initial/new laws.

`src/simulation/living-world/official-views.ts:63–90` sets executive visibility 1, legislator visibility .6, three discussion partners, retirement age 65, hearsay weights .5/.25/.125, party anchoring .5 and unknown-pay weight .25. Lines 314–319 multiply these into opinion points. Lines 360–371 return zero for a non-money exposure and otherwise use `Math.min(1, Math.sqrt((amount / pay) * 10))`. Lines 386–395 multiply temperament by 1.5/.75/1.25/.85. These are explicit placeholder weights and a hand-designed response curve. A citation about discussion partners or sympathy does not establish these exact multipliers. Non-money loss of eligibility, permission or rights cannot change an official view through this function. That is a limitation of this route, not proof no other opinion route exists.

Keep the recorded act and person-specific evidence. Replace the numeric shortcut with the person's actual competing commitments, understanding of responsibility and consequences; use measured effects to check the resulting population, not assign everyone's reaction. The saved view itself is not proof the reaction emerged.

### Interest groups and favor voting

`src/simulation/living-world/law-interest-groups.ts:36–43` requires six residents each losing at least .1 month's pay, with resolve thresholds 2 alone or 1 with a tie. Lines 85–91 create an organization, and lines 114–116 gate membership. The comments record prior provisional approval, which does not make the values researched under this audit's rules. Actual organization founding, contact, resources and individual agreement should explain group formation; preserve memberships already recorded.

`src/simulation/patronage/following.ts:18–25` gives favor debt weights .25/.5/1 and caps the support increase at .5. Lines 43–46 put every materialized home-town person in the denominator; this path does not check age/alive/eligibility there. Lines 65–81 extend a debtor's weight to household members, and lines 101–103 return a direct candidate support multiplier. `src/simulation/living-world/local-elections.ts:1081` uses it. This bypasses each household member's own ballot decision and shared voter eligibility; the historical fact that patronage can create loyalty does not justify assigning it to everyone in a household.

### Campaign recognition and midterms

`src/simulation/campaign-recognition.ts:16–34` explicitly labels every magnitude a stand-in. Lines 39–44 assign unknown candidates 50% return, +5 per previous afternoon, +25 per past win up to +50, and no newcomer effect. Lines 84–99 apply caps; `src/simulation/campaigns.ts:1159` consumes the result. This creates the desired snowball by authoring a curve rather than counting recognition and persuasion among contacted people. Preserve actual campaign activities and previous results; build recognition from saved contacts and knowledge.

`src/simulation/national-mood.ts:18–24` hardwires the historical mean midterm penalty at 3.6 points. Lines 37–42 apply it by calendar and the president's party. It is consumed in `src/simulation/election-contests.ts:273,319` and `src/simulation/nationwide-world/state-legislature-turnover.ts:734`. This is deterministic but still a fixed outcome, independent of what the administration did or what voters experienced. Historical mean and spread belong in validation; current satisfaction, turnout and ballot choices must produce the result.

## Generated legal restrictions and institutional calendars

- **Candidacy:** `src/simulation/candidacy.ts:752–767` enforces a generated minimum age and explicitly says its origin is hidden from the player's requirement text. Lines 769–784 fall back to `GAME_ADULT_CANDIDACY_AGE`, which `src/simulation/candidacy-packs.ts:77` sets to **21**. This can deny filing through an invented legal qualification. A stable draw and an auditor-only provenance tag do not establish the law. Unknown legal eligibility needs its actual source or an explicit unresolved gate, not a drawn or blanket age.
- **Local council powers:** `src/simulation/nationwide-world/local-governing-body-rules.ts:29–46` describes drawing seat counts and terms from national municipal shares, forcing the “4 or fewer” band to four and excluding “other” term lengths. Lines 82–91 suppress the large band below 2,500 residents. These are legal/institutional capacities, not ordinary fictional personality variation. Research the charter and terms; preserve the existing government identity and crosswalk rather than replacing the whole town.
- **Filing date:** `src/simulation/nationwide-world/town-election-calendar.ts:23–28` assigns a universal 28-day filing lead, and line 70 uses it to choose the next election. The same file correctly computes November's Tuesday rule from dates at lines 47–54. Keep that calendar utility; replace the invented filing deadline with the jurisdiction's legal deadline.
- **Vacancy appointment:** `src/simulation/nationwide-world/senate-vacancy-law.ts:55–58` fixes ten days when appointment timing is unread. `src/simulation/governing/office-continuity.ts:495–496` uses ten or the smaller known deadline. A legal maximum permits actions before it; it does not explain why a governor always appoints at that fixed interval. Actual vacancy notice, candidate selection and acceptance should produce the appointment date within legal constraints.
- **Legislative sitting dates:** `src/simulation/dc-council-sittings.ts:54–65` and `src/simulation/living-world/local-council-meetings.ts:81–94` each use a separate 14-day sitting profile. `src/simulation/governing/congress-chambers.ts:261–267` assigns Tuesdays and Thursdays for performance reasons. Different real calendars belong in data; private blanket calendars change passage timing and cannot be justified solely by fewer clock stops. Retain the shared due-item scheduler, use actual session/sitting records, and consolidate procedural progression only after preserving each body's legal deadlines and actions.
- **Place aggregation:** `src/simulation/outcome-web/place-outcome-store.ts:243–270` assigns an entire cross-county city to its first/largest county when subtracting overlap; lines 276–279 clamp the remaining county population at zero. The comment marks this placeholder. Use population intersection weights from the actual geography; do not treat the resulting aggregate as proof each named resident was counted under the correct county.

## Civic attendance and employment: deterministic does not mean emergent

`src/simulation/living-world/civic-actions.ts:45–60` chooses participation weights and thresholds so aggregate rates resemble surveys: adult-age .6, town-tenure .4, employment .25, law cost .5, group membership 1, strong view 20/double pull, and action thresholds 14/13. Lines 145–159 compare accumulated quarterly pull with a threshold; lines 208–216 write contact or attendance. The event at lines 257–260 says the resident attended a government meeting, but carries no particular scheduled meeting, attendance act or topic (also admitted in the header at lines 33–35). A fractional participation accumulator is producing an asserted historical event. Use actual invitations, concerns, available time, meeting records and attendance; survey totals should check the result.

Two work paths impose blanket outcomes on named people. `src/simulation/living-world/town-labor-market.ts:262–285` picks a required layoff count for employers without books and removes newest hires first. Lines 288–314 select youngest workers to quit to meet a turnover count; lines 384–411 choose hires by shortest unemployment duration. A study finding population-level age or duration relationships does not make them strict individual rankings or a worker's resignation decision. Retain employer books and employment records, and determine actions from staffing needs, constraints, applicants and individual decisions.

`src/simulation/public-budgets/staffing.ts:292–297` protects the player from budget layoffs by filtering the player's job out and choosing somebody else. Lines 361–378 only enforce a credential if a schooling record exists; no schooling record can pass a credential gate. Lines 383–390 hire by recall date then person ID. These are materially different rules for controlled and unmaterialized people, not merely different presentation. Use one employment/qualification mechanism with player agency represented by choices, not immunity to an employer's budget. Unknown credentials are not a credential.

## Actual payments still become unsupported macro shocks

`src/simulation/macro-economy/sources.ts:227–266` correctly reads completed public transfers rather than treating enactment as payment. Preserve this boundary. But lines 294–299 turn a month's paid/collected cents into `Math.min(1, amount / UNRESEARCHED_FULL_INTENSITY_MONTHLY_MINOR_UNITS)`; `src/simulation/macro-economy/policy.ts:244` sets that universal amount to **$50 million**. City and state layers therefore use the same unexplained saturation amount, and lines 310–318 give it geometric persistence. Actual source money does not justify an invented response magnitude.

Similarly, `src/simulation/macro-economy/sources.ts:326` defines a five-percent loss of town jobs as a full downturn, lines 352–359 cap by that threshold, and lines 360–361 give every failed bank full credit-tightening intensity. Preserve real closures, loans, deposits and job losses. Model resulting spending, vacancies and available credit directly; calibrate aggregate changes without converting every bank failure into an equal-sized shock.

## Duties can be marked fulfilled without evidence of the required action

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. Source trace, not an executed playthrough. Added September 30, 2026, 5:57 p.m. Eastern, after running `date`.

At `src/simulation/enacted-duties.ts:454–463`, a placed organization covered by the duty receives `"complied"` whenever `hasWorkers(next, body.organizationId)` is true. The comment expressly calls this a placeholder. It does not inspect delivery of the required filing, report, service or other action.

The inference becomes a saved fact. Lines 467–472 say the body `"met the duty by"` its deadline; lines 484–491 save a finding with that outcome and `basis: "game-profile"`. This is more consequential than a display estimate: it supplies fabricated compliance to later readers. The future handler calls this settler at line 509 and is registered at line 520. Immediate settlement also calls it at line 351.

**Replacement:** retain the shared deadline and finding writer. A duty must identify the actual action or record that satisfies it. On settlement, query that record, its actor, jurisdiction and completion date. Staffing may establish capacity, never completion. Record unknown when evidence is absent; do not turn absence into either guilt or success. Preserve old findings with their original basis and append corrections rather than rewriting history.

## Paid elapsed time becomes a completed education credential

At `src/simulation/education-study-progression.ts:556–579`, `completeStudyPeriod` checks that enrollment is active, the required period is due and periods remain. Lines 580–633 calculate tuition and record a completed payment. Lines 635–640 then record `"You completed study period"`; lines 642–660 mark enrollment completed and announce the credential at the final period.

The function contains no attendance, learning, assessment or course-requirement check. The actual scheduled handler calls it at line 794; the handler is registered in `src/simulation/life-paths2.ts:1135`. This establishes an automatic production route, not just a developer helper. It does not establish that every education path uses this route.

The default period model also substitutes two periods per year at `education-study-progression.ts:128` and 182 days per period at line 134. The legacy conversion at lines 110–123 preserves duration and total tuition while collapsing sessions into one period; preserving saved financial terms is useful, but it does not establish academic completion.

**Replacement:** keep immutable accepted terms, idempotent due items and real payments. Have the shared education record describe completion requirements and the person's recorded progress. Time and tuition are necessary conditions where applicable; neither is evidence that the person learned or completed the work. This is not a request for a school-administration expansion: a small set of real progress and completion records is enough to avoid inventing a credential.

## Family events use a second decision path made of quarterly rolls

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. Static source evidence; no simulation executed.

`src/simulation/migration/review.ts:212` calls `reviewTownFamilies`. Its producer is separate from the explicit family-plan decision path. The town producer uses these outcome rolls in `src/simulation/living-world/town-families.ts`:

| Location | Decision and short excerpt                                                                                 | Classification                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 583–591  | `rng.fork("break-up").next() < breakUp`, then saves breakup/divorce                                        | Outcome dice                                                     |
| 609–610  | `rng.fork("move-in").next()` against a weighted probability                                                | Outcome dice                                                     |
| 646–647  | `rng.fork("marry").next()` against a weighted probability                                                  | Outcome dice                                                     |
| 754–765  | `chance = (yearly / 4) * (mother.weight / mean) * birthFactor`, then birth roll and `recordFamilyAddition` | Drawn birth outcome                                              |
| 815–829  | Roll whether a person looks, then random index chooses their partner                                       | Outcome and partner dice                                         |
| 335–348  | Seeded 6% same-gender preference, used directly to decide candidate eligibility                            | Generated preference used as behavior; not a harmless identifier |

The probabilities are explicitly labeled game assumptions at lines 95–112. Quarterly breakup chances are 9%, 3.5% and 0.5% for dating, cohabiting and married couples. Moving in is 12%; marriage is 7%. Lines 122–132 add unsupported fertility weights. Lines 140–144 set an eight-year dating gap, 456-day birth spacing and a year of quiet after a relationship ends.

The birth calculation deliberately rescales eligible people toward an age-band population rate at lines 749–754. That makes the national rate an outcome target. It is not a model of those people's intentions and pregnancy records. The player and partner are excluded at lines 696–698; couples involving the player are skipped at line 557. The same situation therefore follows different rules depending on player identity.

The explicit player-facing path is not yet a compliant replacement. `src/simulation/people-family-plan.ts:275–320` calls the shared decision evaluator but permits `randomness: "close-choices"`. Lines 52–61 specify authored 273-day birth and 210-day adoption waits, a two-day answer delay and ages 18–45. The comment explicitly says these are not medical or legal timelines.

**Survivor and migration:** retain shared family, partnership and household record writers. Move both initiators through one records-based proposal/decision/progression mechanism. Keep saved intentions, actual relationships, mutual choices and biological/legal prerequisites. A population birth rate checks aggregate behavior afterward; it must not select who gives birth. Do not merely substitute another arbitrary threshold for a random draw. Where the record cannot settle a decision, leave it pending.

## School dates are rolled separately for each child

At `src/simulation/school-stages.ts:64–71`, the universal school model sets September 1 eligibility, six/nine/thirteen years to stage endings, August 15 plus up to 25 days for starts and May 20 plus up to 27 days for ends. Lines 39–43 openly label this unresearched.

`onCalendar` at lines 120–127 forks the RNG with `personId`, year and suffix, then draws the date. `scheduleSchoolStageEnd` at lines 277–280 uses that date for a real scheduled transition; `schoolGradeOn` at lines 318–327 uses the same person-specific draw for grade. Two children at the same school can consequently receive different calendars because of their IDs. This is a scheduled outcome, not cosmetic variation.

**Replacement:** source institutional calendars and entry-age rules once per applicable school/jurisdiction and effective period. Store individual exceptions only with an actual reason. Preserve old recorded dates while changing future scheduling through an explicit migration.

## Some random calls are identifiers, not game decisions

These should not inflate the outcome-dice count:

- `src/player/PrivateJournalEditor.tsx:71`: `crypto.randomUUID()` identifies a newly added private note; its title and body are initially empty. It decides no world event.
- `src/presentation/browser-world-repository.ts:1787–1800`: `randomSlotNonce()` produces a save identifier, using browser cryptography or a disclosed weaker fallback. The caller is at line 480. Keep identifier uniqueness separate from world outcomes.
- `src/ui/DeveloperViewer.tsx:85–88`: a random suffix selects a new developer simulation seed. Audit what consumes that seed independently; choosing a seed is not itself a result like an election win.
- `src/player/CreatorAppearanceStep.tsx:112–125`: explicit Randomize chooses appearance parts and shade. Classify this as user-requested cosmetic selection, rather than an NPC decision or money outcome.

## Relationship fading has recorded history but unsupported cutoff numbers

`src/simulation/relationship-absence.ts:70–98` explicitly labels its calibration as not research: three usual gaps, a 60-day floor, a 90-day assumed gap for one meeting, four less-current spans, a 365-day dormancy floor, one-third of known history and a threefold kinship multiplier. Lines 119–131 apply those numbers to determine a person's relationship state.

`src/simulation/relationship-standing.ts:414–432` reads current/dormant state while producing the relationship assessment. The effect therefore reaches the relationship consumer. Keep the real contact-history and kinship inputs, and preserve debts and grievances. Replace unsupported universal cutoffs with evidence-backed context and recorded expectations. The source itself acknowledges at `relationship-absence.ts:35–38` that it cannot represent a known reason for absence and treats all gaps as unexplained. Do not infer neglect from a gap whose cause the world has not recorded.

## Bail is described as paid, but its producer does not transfer the money

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. Source trace added after `date` returned September 30, 2026, 6:01 p.m. Eastern. No runtime reproduction.

`src/simulation/justice/prosecution.ts:767–785` calculates bail, then sets `paid = moneyOnHandMinorUnits(world, subjectId) >= due`. It immediately records release and the sentence `"paid ... bail and went home"`. This is an affordability comparison, not a payment. The called `followUp` at lines 330–420 writes an event and law-effect attribution; it neither creates a financial obligation nor records a transfer. A production-source search for the bail helpers and event found no separate payment caller in this route.

`src/simulation/justice/pretrial.ts:95–104` reads a temporarily opened personal-money world but returns only the amount. The caller passes its original world to `followUp`. Even the money initialization used for the comparison is not returned by this helper.

The legal values are also proxies. `pretrial.ts:26–32` identifies median bail by charge and a universal tenth of bail, estimated from Illinois and Florida rules. Lines 40–50 apply those amounts without a venue parameter. A cited historical median is not the bail order for this particular person or the applicable jurisdiction's bond rule.

**Repair sequence:** keep law-in-force lookup and the saved release/hold record. Represent the actual bail order, deposit or bond terms as legal data; call the common Financial obligation/transfer writer; release only on the required completed payment or a valid nonfinancial release order. Link refunds, forfeitures and fees to that obligation. Make narrative read the completed transfer instead of naming an affordability check a payment.

A law-effect stamp is present at `prosecution.ts:397–418`. It correctly attributes the saved event, but attribution cannot prove that the event's asserted payment happened. Audit totals must distinguish stamped events from actual dollars moved.

## Mandatory-minimum laws never supply the sentence length in this route

`src/simulation/justice/court-reasoning.ts:476–490` reads a yes/no law answer and, for any violent offense or person with a prior sentence, returns a mandatory-jail reason. Its comment at lines 466–474 generalizes from four named state laws and explicitly leaves term length at the court's usual value.

`src/simulation/justice/prosecution.ts:211–223` supplies that value: probation is the midpoint of 12–36 months; jail is the rounded midpoint of 3 months and `12 + 3 * max(0, standingFindings - 1)`. These inputs are explicitly unresearched at lines 75–98. Line 725 invokes this formula even after the mandatory-law decision. Consequently a law can be credited with imposing a minimum without its actual minimum ever entering the number of months saved.

The same constants schedule charge decisions after 60 days, resolution after 120 days and dismissal after two hung juries. They are labeled assumptions, not sourced calendars. Lines 107–113 also establish blanket jail consequences for officeholding and campaigning. The consequence is real: line 739 calls `removeFromOffice` when sentenced to jail.

**Replacement:** retain common case, judgment and sentence records. Supply applicable offense definitions, sentencing ranges, minimums, prior-conviction rules, hearing deadlines and office consequences as effective-dated legal data. Decide within those constraints from the actual case and judge records. Do not substitute a different fixed midpoint.

## Missing legal decision-makers are replaced by automatic rulings

At `src/simulation/justice/prosecution.ts:715–736`, if no sentencing judge can hear the case, the code nevertheless selects jail or probation and writes a sentence with `decidedBy: null`. The reason even says no judge could hear it. A shortage of a lawful decision-maker must cause reassignment or a recorded delay, not a court ruling without a judge.

At `src/simulation/justice/clemency.ts:103–108`, an unseated body waits 30 days and half the sentence. `unseatedBodyReading` at lines 607–640 then rejects violent offenses or later referrals and otherwise says yes. At lines 860–869 a missing board size defaults to three, and all nonexecutive members receive the same answer. The result is saved as `"board-vote"` at lines 871–878, despite those members not being seated people. Keep the jurisdiction's consent sequence; replace each fabricated vote with the actual member's decision or an unresolved prerequisite.

## Jury selection randomness is a separate policy conflict, not a harmless ID

`src/simulation/justice/court-reasoning.ts:244–263` cites random jury selection and draws up to twelve people from the eligible pool. This is institutional selection randomness; jurors then reason without decision dice. It is neither an identifier nor a random verdict, but it still conflicts with the owner's literal zero-dice rule. The cited legal claim was not independently researched in this audit. The repair specification must explicitly reconcile legally required selection procedures with that rule rather than quietly exempting the draw.

The implementation also accepts an undersized panel. `src/simulation/justice/prosecution.ts:546–564` blocks only a zero-person panel; one or more selected jurors proceed, and unanimity among them becomes a verdict. Thus a pool of one could produce a verdict in this code. This is a source-derived edge case, not an observed played case. Require the actual panel-size and quorum rules before the verdict calculation; do not treat the materialized population size as permission.

## Exact clock entry path and a safe consolidation boundary

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. This is a source call-path map, not proof that every registered handler fires in every saved world.

`src/simulation/world.ts:1384–1401` exposes `advanceWorld` and validates the requested day count. Its implementation resolves due items at lines 1413–1417, moves the date, then evaluates this nested chain at lines 1425–1461, in inside-to-outside execution order:

1. `applyNationalTermTransitions`
2. `applyStateLegislatureTurnover`
3. `applyCongressTurnover`
4. `applyGovernorTurnover`
5. `applyPresidentialTurnover`
6. `applyConstitutionalReform`
7. `applyArticleV`
8. `applyFederalReform`
9. `applyCongressLawmaking`
10. `applyCrisisOfficeContinuity`
11. `applyEnactedCourtSizes`
12. `applyCrisisRepairFunding`
13. `applySpeechRetelling`
14. `applyJudicialReview`

`src/simulation/time-work.ts:1968–1979` resolves due items for moment advancement. Lines 1987–2029 repeat the same fourteen calls. This is duplicated orchestration. It is not evidence that a single ordinary action executes every function twice.

The due resolver already provides a useful shared nucleus: `src/simulation/future-transitions.ts:543–560` refuses missing handlers, line 636 executes the due handler, lines 648–655 reject identity/date/action-sequence changes, and lines 657–668 preserve existing scheduled records. Preserve these protections.

### Ordinary-life handler route

`src/presentation/ordinary-life.ts:508–514` obtains `createCampaignElectionTransitionRegistry` and combines caller additions. `src/presentation/life-time-handlers.ts:14–20` does the same for activity routes. Despite its campaign name, the registry composes much of ordinary life:

| Responsibility                                       | Actual registration in `src/simulation/campaigns.ts` |
| ---------------------------------------------------- | ---------------------------------------------------- |
| National elections, legislative terms                | 2183–2184                                            |
| Transit payment and taxes                            | 2185–2188                                            |
| Work/study life paths and crisis                     | 2189–2193                                            |
| State government, executives, constitutional routes  | 2197–2204                                            |
| Recall and local elections                           | 2206–2208                                            |
| Council acts, DC sittings, local agenda and meetings | 2213–2220                                            |
| Public programs, enacted duties, office continuity   | 2221–2224                                            |
| Reflection and officials' perceived responsibility   | 2226–2231                                            |
| Local outreach, developments and contradicted claims | 2233–2239                                            |
| Macro economy, loans, party meetings and migration   | 2242–2247                                            |
| Paydays, rents and campaign activity                 | 2249–2253                                            |
| Press, contact, goals, family and life transitions   | 2256–2263                                            |

A registry is composition, not by itself a second election or life engine. Renaming/moving this composition point can clarify ownership without rewriting functioning record writers.

### Removal order for clock duplication

1. Extract the repeated fourteen-call orchestration into one shared function, preserving order and crossed-from date. Both clock adapters call it.
2. Specify dated legal and physical prerequisites for each recurring operation. Keep the shared resolver's existing refusal and history protections.
3. Move one operation at a time from after-advance sweeps to dated shared transitions, preserving stable IDs and replay behavior. Before removing its old call, prove it cannot both miss a crossed date and execute twice.
4. Move prosecution/clemency progression out of the press weekly producer (`src/simulation/press/transitions.ts:62`) into this shared schedule. News must read completed case events afterward.
5. Remove a legacy adapter only after all its callers and saved due keys have a supported route. An unreferenced filename is not sufficient proof, because transition keys are registered data.

### Two further verified consolidation boundaries

**Executive choices:** `src/simulation/governing/congress-lawmaking.ts:542–549` signs whenever any backer belongs to the President's party; lines 568–578 otherwise use party floor votes or default signing. `src/simulation/governing/governor-bill-decision.ts:341–372` uses recorded considerations and `randomness: "none"`. Retain the shared decision evaluation approach, subject to the bedrock audit of its weights. Make executive powers and legal deadlines data; replace the presidential shortcut only after its bill and saved-decision callers use the common contract.

**Government books:** `src/simulation/public-budgets/index.ts:144–160` already sends both state and local governments to `settleGovernmentMonth`, with state aid available to local settlement. Lines 167–171 separately call `settleFederalTreasuryMonth`. This is a concrete federal/common split. Preserve transfer ordering and the distinctions between appropriation, liability, completed payment, cash and debt. Consolidate those accounting operations before removing either settlement adapter. Do not delete business books just because they contain balances: businesses and governments are different account owners within the same financial engine.

## Media ownership has two purchase paths: one pays, one does not

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. Source evidence, no executed purchase.

`src/simulation/press/ownership.ts:606–661` implements an owner buying another outlet. A seller-kind flag supplies availability at lines 621–625; line 630 randomly picks an outlet. Lines 637–648 say the buyer bought it and transfer ownership. The complete function writes no price, obligation or payment.

In contrast, `purchaseOutlet` at lines 773–788 reads and validates purchase terms. Lines 868–895 create a real resource flow from the person to the seller organization and record the completed transfer; lines 897–905 then transfer ownership. These are two implementations of the same purchase operation with different money rules. The automatic route can change ownership without the transaction the personal route requires.

**Survivor:** the terms/financial-transfer/ownership sequence, generalized to a person or organization as buyer. Keep the common ownership record and IDs. Route automatic intentions through that sequence; do not maintain a separate free acquisition producer. Remove `acquireOutlet`'s independent ownership mutation only after all owner practices use the common purchase contract.

## Newsroom layoffs are drawn outcomes that change real employment

The owner-review handler at `src/simulation/press/ownership.ts:344–357` rolls each practice independently. `reduceNewsroomStaff` at lines 503–514 chooses a fixed fraction of jobs; line 527 randomly chooses each worker. Lines 549–556 end those people's actual work relationships. This is economic and personal simulation inside the press subsystem, not merely narration.

`src/simulation/press/ownership-pack-default.ts:17–23` expressly says the review intervals, likelihoods, job-cut shares and prices are invented. Lines 33–36 fix outlet asking prices at $150,000, $4 million or $250 million. Lines 40–53 assign 30% and 10% review probabilities to 34% and 15% job cuts. These numbers require actual operating costs, revenue, staffing commitments and an owner's recorded decision; new research ranges alone would not justify drawing the outcome.

**Boundary:** Financial supplies the owner's accounts and feasible transactions; Social supplies people's decisions and employment consequences; Narrative reports them. A reporter may decide what to cover, but that decision must use the shared records-based decision mechanism, not a newsroom-specific outcome roll.

## A close-choice roll can suppress the story that would explain a law

`src/simulation/press/desk.ts:355–390` evaluates whether a reporter takes a lead with `randomness: "close-choices"`. A result other than `"take"` writes a declined disposition. This can prevent a real event from becoming a story; the existence of a lead does not prove anyone was informed.

The capacity limit is also authored: `src/simulation/press/records.ts:52–55` permits 1, 3 or 8 simultaneous stories by outlet tier. `press/desk.ts:257–285` scales that capacity by staffing and openly identifies proportional scaling as unresearched. Keep actual reporter assignments and time obligations; derive capacity from those records instead of a tier label.

There is a useful downstream connection worth preserving. `press/desk.ts:1240–1259` adds law-news readers, then writes each person's dated event knowledge linked to the publication. This proves a reader-writing route exists after publication. It does not prove universal household coverage, personal attention or belief formation.

## Mortgages bypass the existing loan-servicing rules

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. Static source evidence.

`src/simulation/home-purchase.ts:620–648` has its own monthly mortgage settler and returns immediately for anyone other than the controlled person. It finds the mortgage obligation, computes remaining debt and delegates to `settleMortgageMonth`. Lines 681–713 calculate an affordable installment and record payment through the shared money writer.

The separate `src/simulation/household-loans.ts:426–436` iterates obligations that have loan terms and services each one. Lines 470–493 charge the contracted interest and calculate installment/revolving payments. Lines 516–529 explicitly distinguish unknown money from failure to pay. It also tracks delinquency and collections; the mortgage comment at `home-purchase.ts:616–618` says lender responses are not implemented there.

This is duplicated debt servicing with different semantics, although both use the same underlying obligations and transfer records. The mortgage writer at `home-purchase.ts:570–578` creates principal without shared loan terms. Its comment at lines 70–80 explicitly says interest is not modeled and fixes the down payment at $50,000 and monthly payment at $1,200. A county median supplies the home's opening price; that is an aggregate proxy, not a price derived for this particular property.

**Survivor:** shared loan servicing with effective-dated contract terms, preserving the genuine financial ledger. Give mortgages collateral and lawful foreclosure procedures as data and shared case events. Do not charge old saves retroactive invented interest. Convert each legacy mortgage with its existing principal and explicitly preserved accepted terms, route future servicing once through the common handler, then remove the private mortgage loop. The evidence establishes two servicing paths, not a verified double debit of the same obligation.

## Living costs are a fixed player-only payment rather than actual purchases

`src/simulation/cost-of-living.ts:45–58` declares an unresearched $1,500 monthly amount per adult, including $900 housing. Lines 144–145 limit settlement to the controlled person. Lines 175–178 route the payment to the household and warn that it would need rerouting if household money were tracked, because the intended meaning is consumption rather than savings.

The code does contain protection against one obvious duplicate: `cost-of-living.ts:95–108` locates an existing town lease, allowing the housing component to be removed. Preserve that protection. The remaining problem is the fixed consumption bill and incomplete seller/household accounting, not a source-proven claim that rent is always paid twice.

**Replacement:** actual household obligations and purchases enter the common Financial ledger, with payers, recipients, prices, quantities and periods. The Social engine decides what the household can forgo; a missing payment does not automatically invent a debt. Use research to validate typical budgets rather than debit every played person the same amount.

## Four federal laws substitute historical averages or projections for their terms

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. The citations described below are present in source comments/data; their external studies were not independently checked.

| Law reader                                         | Verified calculation                                                                                               | Why it violates the requested mechanism                                                                                                                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/simulation/federal-farm-subsidy-law.ts:28–53` | Returns `FARM_PAYMENT_CUT_SHARE` for a yes answer; the header at lines 4–14 identifies a historical median 21% cut | The bill's appropriation or payment terms do not supply the cut. Lines 67–70 multiply it by a historical payments/land-value ratio.                                                                              |
| `src/simulation/federal-defense-spending.ts:68–74` | `(1 + DEFENSE_BUILD_UP_YEARLY_RISE) ** years - 1`, capped by the longest historical run                            | The header at lines 5–15 describes 6.9% and five years. Neither a past growth rate nor the longest observed run is this law's appropriation, actual awarded contracts or physical capacity.                      |
| `src/simulation/federal-passenger-rail.ts:60–67`   | Straight-line progress toward `RAIL_PLAN_RISE_PCT` after a fixed first-service lag                                 | Lines 5–18 describe a 62.5% rider projection over fifteen years with a thirty-month lag taken from one service. No constructed route, operating train, seat or passenger choice is required by this calculation. |
| `src/simulation/federal-data-privacy-law.ts:35–46` | `low + (high - low) * ((rng.next() + rng.next()) / 2)` within 0.1%–0.6%                                            | A study range selects the cost outcome. The median fallback without a seed is also a selected level, not measured compliance work.                                                                               |

These are live inputs, not unused documentation: `src/simulation/outcome-web/index.ts:230,239,250` calls the defense, rail and farm readers. `src/simulation/public-budgets/federal-treasury.ts:175` also reads the defense increase. `src/simulation/living-world/town-finances.ts:1008–1016` multiplies the drawn privacy share by business costs and subtracts it from cash-generation net. The latter can affect a real business's financial trajectory despite lacking actual compliance purchases.

All four readers explicitly request `"enacted-only"` and reject a non-enacted origin: farm lines 44–52, defense lines 59–67, rail lines 52–59 and privacy lines 62–69. Baseline laws consequently do not execute these same effect calculations. Separate opening baselines may exist; they are not proof of the required single law path.

**Migration:** represent enacted and opening law terms with the same effective-dated data. Government records authorize farm payments, defense procurement, rail construction/operation and legally required privacy work. Financial records actual commitments and payments. Physical capacity and individual behavior determine downstream land values, output and riders. Historical averages/projections are comparison checks, not substituted statutory amounts or predetermined trajectories. Remove these four private calculators only when their saved consumers read the replacement records.

## A federal cost reader already demonstrates the right evidence chain

`src/simulation/federal-cost-ledger.ts:51–92` accepts positive completed USD transfers only when they belong to the national jurisdiction, a real public-program commitment and its exact posted installment. It traces the appropriation and measure, checks the payer account, and verifies the flow's installment index. Lines 106–131 return the actual transferred amount plus the appropriation, commitment, installment, flow and transfer IDs.

This is useful shared infrastructure to preserve. A count of separate law-related files must not classify this reader as a duplicate treasury or delete it. Its remaining attribution limitation is explicit: lines 93–105 identify a catalog question only when exactly one federal answer is present; a mixed-subject payment remains unassigned. Replace that limitation with explicit program-to-clause attribution rather than charging the same transfer to every question in the bill.

## Civil eviction rulings live inside rent settlement and invent delivered counsel

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. This closes one previously untraced civil-case route; it does not establish complete coverage of every civil case type.

`src/simulation/living-world/town-rent.ts:2019–2045` resolves an open eviction on a later rent day, calls `decideEvictionCase`, writes the ruling and ends tenancy when evicted. This is a private case engine embedded in Financial rent collection. It is distinct from the criminal-case progression and constitutional review already traced.

The outcomes are deterministic but still authored. Lines 325–349 expressly label the thresholds hand-set. Landlords file at two or three months owed; counsel keeps a tenant housed up to four months. A plan spreads debt over six months within half the household's pay. A conciliatory judge gives time up to two months, and a three-month quiet period prevents refiling. `decideEvictionCase` at lines 2205–2248 directly turns those thresholds into settlement or eviction. The measured outcome shares at lines 353–364 are correctly presented as checks rather than rolls, but the decision thresholds have not thereby acquired a legal or empirical basis.

### A right to a lawyer becomes representation without a lawyer record

At lines 2174–2177, an NPC answers if reliability is nonnegative and receives `lawyer = tenantAnswers && law !== null`. The player route at lines 2163–2166 makes a requested lawyer plus a law sufficient. No named lawyer, available legal-aid capacity, appointment, conflict check or completed representation appears in this fact construction.

Lines 2181–2188 stamp this as `"eviction-counsel-representation"`. Lines 2033–2038 then tell the player a lawyer represented the tenant under that law. This conflates legal entitlement with delivered service. It also feeds the automatic favorable settlement at lines 2221–2224. A stamped representation count would therefore overstate what the simulation actually modeled.

### A missing judge does not stop a judicial ruling

`trialJudge` at lines 2101–2114 picks the first seated holder of the state's general trial court or returns null. The facts at lines 2198–2200 turn null into the generic label `"the court"`. The decision code does not block on null: it can still say the court ruled for the landlord at lines 2215–2219 or 2243–2248. No actual judicial assignment or lawful default-order process is demonstrated by that fallback.

**Consolidation:** retain the real rent arrears, lease, tenancy and occupancy writers. Let arrears trigger a legal claim; move filing, service, representation, assignment, hearing, judgment and enforcement through shared Government court records. Court orders then authorize the Financial/housing consequences. Right-to-counsel terms create eligibility and a service obligation; actual staffing, funding and assignment produce representation. Preserve the genuine outcome-check data as validation, not a target. Remove this private ruling function only after the shared court path can settle existing case IDs and preserve pending player responses.

## Scene random wording is separate from the selected consequence

At `src/presentation/contextual-scenes.ts:429–432`, a seeded draw picks a line from a prose bank. Lines 554–558 select the actual answer by the player's intent, while lines 581–597 select its outcome and commit contract independently of the line draw. Lines 637–641 run that answer's explicit consequence. Thus this inspected draw selects wording, not which answer succeeds.

This is not a blanket acceptance of every line bank. Every alternative must still describe the same grounded facts. The route keeps read-time wording selection separate from a commit, and that separation should survive consolidation into Social's voice/Narrative rendering.

`src/presentation/scene-occupancy.ts:14–47` allocates supplied people to nonoverlapping visual anchors and prevents duplicate people/anchors. It is a rendering capacity algorithm, not an engine deciding who exists or attends. The caller's population still needs its own presence proof; visual placement alone is not evidence that a meeting happened. Keep geometric measurements and layout limits out of unsupported economic-outcome counts.

## Labor terms substituted by estimates, and further election dice

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. Added after executed `date`: September 30, 2026, 6:14 p.m. Eastern. Source inspection only.

### Paid-leave legal rates are drawn and used in assessments and claims

`src/simulation/state-paid-leave-law.ts:171–190` constructs missing or newly enacted premium rates with `mean + (draw - 0.5) * deviation`, a seeded draw across other programs. It assigns the common $184,500 wage cap and `sourceUrl: null`. The distinction is disclosed as `ESTIMATED FROM AVERAGE`; disclosure does not make another program's distribution the jurisdiction's legal premium. The live selector at lines 101–114 calls this fallback for a newly adopted program and for unread starting programs. Its own introductory explanation at lines 19–27 names unread Rhode Island and future Virginia rates and excludes employer premiums.

This is not merely a display estimate: `src/simulation/statutory-tax.ts:478–528` calls `paidLeavePremium`, computes `premiumOn`, and produces a liability with `collection: "withheld-from-pay"`. The exact wage-base calculation in `src/simulation/state-paid-leave-law.ts:194–211` is a useful shared mechanism (`BigInt(taxableMinor) * BigInt(premium.employeeRatePerMillion)`). Keep that arithmetic and feed it actual legal terms; remove generation of the terms themselves. This trace establishes the assessment row, not an independently executed paycheck.

The benefit side repeats the substitution. `src/simulation/paid-leave-benefits.ts:97–123` selects a seeded replacement percentage, capped at 100%, when no read rate exists. `src/simulation/living-world/town-pay.ts:1234–1256` uses that rate and actual absence/pay records to create an amount-bearing benefit claim. Preserve the actual lost-days/pay calculation; supply researched jurisdictional tiers, eligibility, waiting periods and enacted terms through the common law data path. A cross-program average can check plausible outcomes, not establish a person's entitlement.

### Teacher floors draw a legal dollar amount and exclude starting laws

`src/simulation/teacher-salary-floor.ts:69–81` calls `drawnLinkSize` using a researched-labeled ratio. The declared range is 0.67–0.95 of the state teacher median (lines 45–59). At lines 125–138, `law.origin !== "enacted"` returns no floor, while the enacted floor becomes `Math.round(stateMedian * teacherFloorRatioAt(...))`. Its consumer is `src/simulation/living-world/town-pay.ts:1000`. This is a specific failure of the one-law rule: the function enforces only laws passed in play and invents their dollar floor from comparative research rather than the bill's amount. It does not prove every opening teacher is paid illegally; the defect is the missing common enforcement path.

The same module labels `SCHOOL_YEAR_STARTS = "07-01"` as `HARDWIRED` at lines 85–90, using five state examples to set one calendar. Replace it with each applicable law's effective-date rule. Preserve existing law lookup and salary settlement records; replace the drawn ratio and enacted-only exclusion after initial and new laws both provide the same typed terms.

### An average fairness-law association becomes every eligible hire's pay cut

`src/simulation/fairness-pay-law.ts:150–177` applies a fixed inverse-1.027 pay adjustment to an uncovered man partnered with a man, bounded by the wage floor. The code comment describes this exact operation, and lines 10–24 attribute the 2.7% average association to Burn's study. Consumers include `src/simulation/job-market.ts:1662`, `src/simulation/living-world/town-pay.ts:735` and `src/simulation/life-paths2.ts:483`. This shared function is preferable to duplicating it, but the behavior still turns an average into an individual outcome without an employer choice, enforcement case or pay-setting mechanism. The study itself was not independently checked in this audit. Keep shared offer/pay records and model the actor's decision and legal constraint; use measured averages as calibration checks, not compulsory discounts for every matching person.

### Recall outcomes and claimed signatures come from dice

`src/simulation/recall.ts:87–95` explicitly calls its profile a placeholder: qualification is 350 per thousand, the removal vote is drawn from 3,000 through 6,499 of 10,000, and the election follows 75 days later. `recallPetitionQualifies` at lines 418–421 and `recallYesShare` at lines 426–428 implement the draws. The first produces a factual claim at lines 513–523 that the petition did not collect enough valid signatures, without counting signatures. The second is used at lines 598–615 to announce what voters chose; lines 621–627 then end the incumbent's actual organization participation when removal wins.

These are random outcomes, not harmless seed/ID generation. The records-based replacement is signature records from eligible residents, validation against the applicable threshold, and ordinary voter decisions/tabulation. Keep petition IDs, due items, public events and office-ending records. Replace the two outcome producers before removing them. The module itself declares missing grounds review and blanket vacancy handling at lines 62–74; those require legal data and the shared court/vacancy paths rather than another recall-specific engine.

### Stable hashes also choose local election law

`src/simulation/municipal-ballot-rules.ts:122–131` chooses a weighted item with `BigInt(stableHash(key)) % BigInt(total)`. That function selects a town's rule from locally selectable options at lines 206–220 and a statewide fallback from other states at lines 225–238. Missing majority thresholds are similarly selected at lines 134–140. The live local election consumer is `src/simulation/living-world/local-elections.ts:1154`. A repeatable hash makes the fiction stable, not lawful: it still decides whether voters use plurality, a runoff or another rule without the town's adoption record.

The header at lines 9–30 honestly marks the evidence as unverified or drawn, and lines 32–39 describe useful common tabulation with ties left unresolved. Preserve that tabulator and the legal-data resolver; replace hash-chosen rules with researched charter/statutory data or a recorded lawful adoption. Do not misclassify this as a harmless ID hash.

### Campaign bills are invented, then paid through the real ledger

`src/simulation/campaign-operating-costs.ts:52–75` declares an unresearched cost table: two to four payment days weekly, a $50 spending threshold, a $15 minimum payment, arbitrary category weights and amounts tied to available cash. `planCampaignOperatingWeek` draws the count and dates at lines 221–230. `chooseCategory` rolls at lines 286–297. The `paymentAmount` function draws a flat price or a percentage of cash at lines 300–320. The payment handler uses those results at lines 418–425, creates a vendor and paid event at lines 426–444, then records a completed resource transfer at lines 455–484.

This is actual money movement driven by fabricated invoices. It is not a third ledger: the shared resource-flow and transfer writers already exist and should survive. The replacement should calculate bills from recorded orders, quantities, contracts, staff hours, travel or fees, with due dates from those obligations. A researched distribution can validate campaign budgets; it cannot create purchases no one made. The player/rival distinction at lines 211–219 also means only the player's committee skips bills when no campaign work was recorded, while rivals act each week; migrate both through the same obligation rules.

## Government follow-ups can manufacture passage and implementation

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. Added after executed `date`: September 30, 2026, 6:16 p.m. Eastern. No runtime reproduction.

### A second budget-passage answer bypasses actual lawmaking

`src/simulation/governing/state-governing.ts:1697–1698` schedules a budget follow-up 90 days after the executive's choice. At lines 2233–2268, `budgetOutcome` announces that a flat budget passed unconditionally when there is no requested change. Otherwise its decisive expression is `skilled || (... majority === publicPartyOf(...))`. It announces passage with extra money or passage cutting the request from those facts. It does not obtain a measure, chamber vote or enacted appropriation in this function. The handler at lines 2308–2344 saves the announcement as a public `GOVERNING_OUTCOME`, including `funded:<subject>` when it claims success.

This is reachable from the seasonal budget matter: lines 2424–2439 open that matter, with some offered program choices themselves randomly selected. By comparison, the separate program branch at lines 1737–1764 requires an actual appropriation, resolves an alternative and calls `commitPublicProgram`; refusal leaves money uncommitted. That actual-record route should survive. The finding is a duplicate passage/result producer, not proof this announcement itself spends treasury cash.

**Safe removal sequence:** make the budget matter submit a request into the existing measure/appropriation route; resolve its follow-up from those saved records; replace consumers of the synthetic `funded:` tag with actual appropriation/commitment/payment IDs; then retire `budgetOutcome`. Keep historical events intact and label old unsupported claims as legacy evidence rather than manufacturing missing votes after the fact.

### Implementation success comes from a hand-set score

`src/simulation/governing/state-governing.ts:1773–1785` schedules a report 60 days after a fast choice or 120 after a careful choice. Lines 2198–2207 treat an earlier `funded:` outcome event as funding evidence. At lines 2211–2229 the code explicitly labels its score `HAND-SET`: careful planning adds three, funding adds two, staff steadiness adds its score; two points declares progress. It then states either “State agencies reported steady early progress” or “delays and a staffing gap,” without reading actual service output or vacancies there.

A careful choice alone exceeds the success threshold while the office remains held. A real staffing gap has not been demonstrated by a low score. This violates bedrock and the Narrative boundary even though an earlier random roll was removed. Keep due reports as reminders, but derive their content from real capacity, work, spending and service records. A lack of those records must not become a fabricated agency report.

### Staff advice and offered priorities still use random choices

At `src/simulation/governing/state-governing.ts:930–942`, an agenda recommendation randomly picks a real option and attributes a reason to the chief of staff: they think it is where the office can show results. The NPC handler adopts the recommended option at lines 2152–2168 and records its decision at lines 2169–2175. Without advice or a staff selection, the fallback is another `SeededRng(...).pick(matter.options)`. Opening priorities are randomly restricted to three program families at lines 1287–1296. These are policy opportunities and decisions, not wording variation.

Use the same recorded constraints, principles, district needs and available lawful choices for all executives and advisers. Preserve the advisory record but derive the reason from the considerations that actually selected it. The principled real-bill branch at lines 2118–2144 already provides a reusable direction; it should not be generalized by retaining the random fallback.

## Further campaign and legislative opening choices

### Fundraising and canvassing draw consequential amounts

`src/simulation/campaign-life-activities.ts:1440–1449` draws a fundraiser amount before checking contribution rules. Lines 1854–1883 create the flow and completed transfer when the planned gift is accepted. Compliance can limit a gift but does not provide the donor's reason or amount. Replace the draw with the donor's available money, commitments, priorities and recorded pledge, retaining the common contribution and resource writers.

At lines 1705–1710, a coin flip selects which recurring volunteer is met after a threshold. That changes the social-contact record, not just an ID. At lines 1812–1828 a separate 60–140% effectiveness draw multiplies minutes, workers and the fixed factor 3/2, then `recordSupportShift` saves campaign support. Replace it with who was actually contacted, what they learned and their subsequent decisions. Hours worked can constrain contact capacity; they should not automatically buy an aggregate support increase.

### The legislative presentation layer chooses the filed subject and office sponsor

`src/presentation/legislation-world.ts:260–266` forces the authored bargaining brief when eligible, otherwise draws a written measure. Lines 371–395 use that content choice and another random member selection as the opening assignment's sponsor. `seatedOfficeMember` at lines 924–943 picks an actual seated member randomly. Their existence does not explain why the staffer's office serves them or why they sponsor this bill.

The comments at lines 245–259 correctly avoid showing dialogue about a different bill, but the solution still binds the world to authored content. Keep the saved assignment and actual seat checks. Open the player's work on a measure the office has genuinely filed or chosen, and render the scene from that measure. Do not claim bill-number generation is equivalent to choosing the bill's policy or sponsor.

### Missing office salaries become seeded legal amounts

`src/simulation/office-pay.ts:119–140` draws a salary between other states' 25th and 75th percentiles and rounds it to $100. `officePayInForce` uses that estimate at lines 244–260 when the applicable table has no figure, before checking enacted changes. `src/simulation/office-salary.ts:66` and `src/simulation/office-salary.ts:205` consume the resolver. This is a legally fixed amount chosen from a distribution; its honest `ESTIMATED FROM AVERAGE` note does not cure that defect. Research the actual salary/per-diem/reimbursement rule and model its terms. Preserve the shared resolver and transfer writer.

The comment at `src/simulation/office-pay.ts:226–235` also records a gap: an enacted pay change with unspecified applicability reaches sitting holders by assumption, despite constitutional term restrictions, and the congressional delay is not modeled there. Move those restrictions into researched jurisdictional law data rather than separate salary engines.

## Legal deductions, fictional donors and generated evidence

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. Added after executed `date`: September 30, 2026, 6:19 p.m. Eastern. Read-only findings; no simulated runs.

### Missing tax rules are replaced with different tax rules

`src/simulation/income-tax-withholding.ts:197–209` replaces an unread standard deduction with `spread.mean + (draw - 0.5) * spread.standardDeviation`. The comment at lines 167–170 explicitly says some of these states use exemptions or credits instead. The substitution therefore changes the legal kind as well as the amount. Lines 138–157 double single brackets and deductions for joint filers and use the single schedule for heads of household, calling these the most common rules while acknowledging they have not been counted state by state. `src/simulation/statutory-tax.ts:450–460` consumes this schedule in the actual wage assessment path. Replace those fallbacks with the jurisdiction's deduction, exemption, credit and filing-status rules as data. Preserve arithmetic over wages and lawful zero-tax results; do not infer a standard deduction from absence of its source field.

### Rival campaign funding does not arise from named donors

`src/simulation/campaign-opponents.ts:321–335` creates a supporters organization with the explicit note “No donor corpus is modeled.” Only the campaign committee receives a starting resource position in the inspected constructor at lines 350–360. `writeFundraising` at lines 749–752 draws $600–$2,500; lines 775–794 state that supporters were asked one at a time and route the amount into `moveMoney`. Lines 692–728 record a completed transfer from the aggregate supporter organization. There are no named contributions in that producer.

The shared writer's balance protection at `src/simulation/resources.ts:571–589` rejects an overdraft only when `sourcePosition` exists. This is a deliberate capacity of the general record writer, not proof every unknown-source transfer is a bug. Combined with this untracked aggregate donor producer, however, the campaign can receive invented contributions without a demonstrated donor balance or decision. Keep the general writer; require this simulation producer to establish actual donors and their permitted gifts before recording completion.

The same module draws advertising spend and effect at lines 818–835. After paying, lines 881–885 apply `Math.floor((spend * swing) / 50_000)` directly to campaign support. Its field-event producer similarly applies the minutes/workers/swing formula at lines 1006–1012. The constants at lines 90–107 label the finance ranges as authored. These share the support and money writers with the player's campaign, but their private purchase/donation/effect rules must be consolidated. Shared storage alone does not make behavior one engine.

### Work consent still has a random fallback

`src/simulation/life-paths2.ts:1390–1412` first respects a refusal goal, rigid existing work and an active livelihood goal. Without those records, it randomly chooses accepted/refused/negotiated. Lines 1413–1422 end the work relationship on refusal; lines 1425–1441 record the answer as the person's choice. Activation at lines 1450–1461 requires that saved acceptance. This is outcome randomness, not optional prose variation. Keep the valid constraints and acceptance record. Use the person's actual priorities, pay needs and available time for unresolved offers, or leave them pending rather than inventing consent.

### Saving invented careers does not turn them into emerged evidence

`src/simulation/governing/staff-evidence.ts:51–105` defines three scripted career histories. `generateStaffCandidateHistory` randomly chooses one at lines 169–172, creates its employer/history at lines 175–239, and is called from `src/simulation/governing/state-governing.ts:1097`. The later `staffAssessment` genuinely reads those saved posts, but its steadiness is the hand-set `1 + floor((publicYears + latest.years) / 6)`, clamped to 1–4, at lines 426–428. At lines 374–381 even a person with no work evidence receives steadiness 2.

That missing-evidence value alone meets the implementation-success threshold in `src/simulation/governing/state-governing.ts:2214–2219`, if the office remains held. A randomly assigned legislative career also drives the budget-success shortcut at lines 2239–2257. This demonstrates why auditing only the final reader misses authored causes upstream. Preserve real work/education history and assess actual capabilities; retire scripted career selection for candidates created during play and remove outcome formulas that treat those labels as completed public work. Opening fictional histories need explicit provenance and constraints, not a claim that they were lived in this simulation.

### A school scene can create the teacher it needs

`src/presentation/formative-context.ts:106–137` first checks the child's enrollment and existing companions. If none exists, it draws a birth date. Lines 177–209 then create a paid teaching job and person through `applyCharacterHistoryPlan`, solely to fill the required role. This is not an unsupported name in a sentence: it creates canonical social/employment facts because presentation needs them. The caller is `src/presentation/formative-play.ts:208`; an availability check at line 554 also calls the generator but discards its returned world. Do not claim the availability check itself persists changes; the design problem is the generation route behind the scene.

Use actual school staffing and enrollment to select participants. If no teacher or peer is available, omit that encounter or advance the relevant hiring/enrollment mechanism. Preserve existing person IDs and history; do not delete those people mid-save. The separate timing draw in `src/presentation/formative-context.ts:517–544` chooses an authored anchor budget and hence days skipped by `src/presentation/formative-play.ts:437–448`. Classify it as random narrative pacing with clock consequences, not random success or an ID. Replace it with an explicit player time choice or the next meaningful saved event.

### Asking for a reporter can create a newsroom and job

`src/player/PressWorkspace.tsx:287` invokes `seekCivicPressContact`. At `src/simulation/press-reach.ts:165–181` it first reuses an existing journalist; otherwise lines 183–214 generate a reporter and possibly a newsroom. Lines 252–274 create paid employment without a hiring decision in this route. Its event honestly labels the assignment authored at lines 236–238. Keep the existing-journalist search and contact action; move any new newsroom/job creation to the actual organization and hiring mechanisms. The reporter's age draw (line 194) is generated identity data, while the larger defect is creating an institution to fulfill a player request without its causes.

## Incident randomness: available machinery versus observed callers

`src/simulation/incidents.ts:150–158` invokes a probability draw only for `occurrenceMode === "probabilistic"`; lines 792–802 compare a seeded integer with the configured exact fraction. This is outcome dice where that mode is used. The synthetic catalog at `src/simulation/incident-catalog.ts:73–129` includes 1/4 hazard, 1/5 slowdown and 1/6 outbreak probabilities. Those are explicitly synthetic definitions, not verified real-world rates.

Do not label every incident caller random. `src/simulation/pressure/ladder.ts:161–163` and lines 189–200 set their definitions to `condition`, with explicit prerequisite records. Their live evaluations at lines 484–525 therefore avoid the probability branch. They still require a separate bedrock review of anger thresholds and the automatic choice of a prominent target (`prominentPeopleIn(...)[0]` at line 517); absence of dice alone does not establish a real actor's decision. Preserve incident/state/event records and actor-initiated paths. Remove probabilistic occurrence from actual game producers after replacement with physical or actor mechanisms, without claiming synthetic fixtures were themselves observed gameplay.

## The deterministic pressure ladder ends in a lethal random outcome

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. Added after executed `date`: September 30, 2026, 6:21 p.m. Eastern.

The distinction above applies to onset of the pressure incidents, not their entire downstream chain. `src/simulation/pressure/ladder.ts:73–85` explicitly labels its thresholds unresearched: anger 0.3, one quarter to lasting unrest, accumulated excess-anger 2 for an attempt, four quarters until a threat expires. At lines 296–313, the strain is the sum of anger above 0.3. Lines 393–410 call `recordViolenceAttempt` once that score crosses the line. This caller supplies a target and earlier events, but no attacker's decision.

`src/simulation/crisis/international.ts:900–907` then calls `roll` to select death, injury or no harm. The probability table at lines 88–89 gives 100,000 millionths to death and 300,000 to injury. The helper at lines 102–105 draws an integer from a seeded RNG. These are a 10% death chance and 30% injury chance under the declared millionth scale, not measured outcomes of a modeled physical encounter.

The consequences are real records: lines 942–956 call `recordPersonDeath`, close health episodes, record office continuity and spread the death; lines 957–965 create serious incapacitation for injury. Thus a pipeline described as having removed draws still reaches lethal dice downstream. Retain the death, health and office-continuity writers. Replace the unsupported anger-to-attempt trigger with a person's recorded decision and opportunity, and replace the outcome draw with an appropriate physical mechanism. Do not create another death engine to solve this.

There is also a false recovery statement: `src/simulation/pressure/ladder.ts:435–444` resolves unrest both when anger is low and when its reading is missing (`!reading`). It writes that public anger fell back and substitutes zero in its context. Missing evidence is not observed calm. A missing reading should leave the condition unresolved or explicitly record lack of information, without fabricating a change.

## Two further randomness classifications

`src/simulation/governing/office-continuity.ts:1562–1575` first tries the shared records-based appointee choice, then randomly picks from its eligible pool if no choice exists. Lines 1584–1614 record that person as the President's vice-presidential nominee. This fallback decides an appointment; preserve the nomination/confirmation route but leave the choice unresolved or use the President's actual records. The pool at lines 1534–1550 excludes the player and sitting governors partly because a governor resignation route is missing, a code limitation that substitutes for legal/person choices.

`src/presentation/session-seed.ts:30–37` uses cryptographic bytes only to create a new session seed; `resolveSessionSeed` preserves an explicit replay seed. Classify this as seed generation, not a random game result by itself. Later consumers that use the seed to invent votes, wages or harm remain violations independently. This source was absent from the earlier narrow random-call candidate list, so that list must not be described as exhaustive.

## Minimum-wage law terms and the split public-cash books

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. Added after executed `date`: September 30, 2026, 6:25 p.m. Eastern. Static source trace; no test suite or game run.

### Three minimum-wage questions use three different substitutions

The federal schedule in `src/simulation/minimum-wage.ts:153–159` interprets yes as a fixed $15 hourly minimum and no as the opening federal minimum. Lines 89–97 explicitly call $15 a placeholder, calibrated to a study rather than a bill. The state path at lines 318–337 first reads an actual typed `labor.minimumWage.hourlyCents` term, which is the behavior to preserve. Its fallback at lines 351–358 adds an average raise instead. The imported data declares a $2 total and $0.90 yearly step; `stateRaiseAfterDays` at lines 221–227 implements that step on 365-day intervals. Those historical median increases do not establish any new bill's terms or calendar.

The city path at lines 423–439 reads an enacted yes/no and sets `baseMinor * (1 + CITY_PREMIUM_RATIO)`. Lines 75–81 identify the calibration sample as 40 California localities. The imported `data/research/labor/local-minimum-wage-premium.json` gives 0.0923 and acknowledges its one-state sample. Thus a city ordinance with no wage amount acquires a 9.23% premium from California. The path excludes initial ordinances and the comment at lines 394–400 says counties are not modeled.

These are three confirmed question paths to unify, not three separate monetary ledgers. Both `src/simulation/job-market.ts:1959` and `src/simulation/living-world/town-pay.ts:912` call the shared minimum resolver, so the allegation that minimum-wage changes reach only town payroll remains incorrect. Preserve that resolver and feed it effective legal amounts, coverage, exclusions and dates at every level. Replace each yes/no substitution only once the initial and enacted rows carry those same terms.

### Public budgets and spendable public cash have separate authorities

`src/simulation/public-budgets/month.ts:701–720` calculates monthly spending from annual appropriations divided by 12, plus read payments and law-cost adjustments, then updates its own `government.balance`. Lines 831–869 save a monthly balance and updated government object. `src/simulation/public-budgets/index.ts:162–175` writes that resulting `publicBudgets` store back to the world. This route does not write corresponding resource transfers for its planned spending.

Actual benefit payments instead use the government's resource position. `src/simulation/paid-leave-benefits.ts:195–206` reads that account's liquid cash and limits the payment to it. The account is opened by `src/simulation/tax-policy.ts:155–180` from `publicCashOpening`, not the budget store's balance. Its producer, `src/simulation/world-setup/conditions.ts:40–53`, assigns a temporary $1 billion federal bank, $100 million per state, and $5 million per admitted local government. These are fixed fictional opening amounts, explicitly described as temporary; no research basis is supplied there.

The two stores are partly connected by `readMonthFlows`, but a one-way payment reader does not make the modeled budget balance the cash available to an actual program. This is the verified duplication to fix. The appropriate survivor is the shared resource account/transfer history for money actually held or moved. Budgets should retain plans, authorizations, commitments and derived summaries; they should not privately create a second spendable balance. Preserve opening balances as disclosed legacy entries during migration, reconcile by government identity, and replace aggregate modeled payments with actual obligations/transactions before retiring the second balance calculation. Never subtract the same payment twice while doing this.

### The bridge drops actual partial payments

`src/simulation/public-budgets/month.ts:179–189` skips every outcome whose status is not `completed`. A real paid-leave claim can move some money and record `partial`: `src/simulation/paid-leave-benefits.ts:203–206` computes the available amount, and lines 232–241 save that transferred amount with partial status. Such money has moved, but the budget reader discards it. The correction should classify by actual nonzero transferred amount with appropriate status handling, not equate completion with all cash movement. This is a source-proven branch mismatch; no saved-world reproduction was run.

### The bridge also forgets pre-existing flows and new local-account identities

At `src/simulation/public-budgets/month.ts:161–174`, the temporary relevant-flow map is built only from flows after `store.cursor.flows`. Lines 179–187 then inspect new outcomes, but require their flow to be in that temporary map. Lines 226–228 advance both cursors. A later month's outcome on a flow created before the prior cursor therefore has no lookup entry and is skipped. This is a static counterexample to incremental completeness; it does not assert how many currently played payments are missed. Retain an indexed map of all relevant flow IDs or resolve each new outcome against the full canonical flow index.

The account map at lines 147–159 recognizes only `publicOrganizationKey(jurisdictionId)` and its law-jurisdiction counterpart. But `src/simulation/public-government-identity.ts:36–41` creates canonical local-government accounts with `public-government:local:<encoded government key>`. Those keys cannot match the reader's jurisdiction-only keys. `src/simulation/tax-policy.ts:103–108` exposes the corresponding local account creator. Audit and migrate every reader through that shared identity function; do not combine a county and city because they share geography.

### The benefit payout itself preserves a useful constraint

`src/simulation/paid-leave-benefits.ts:203–241` caps money moved to what the account holds and records blocked/partial outcomes explicitly. Keep this behavior while replacing the invented legal rate and reconciling the treasury. Fixing a source-data problem must not remove honest insufficient-funds records or convert a partial payment into a completed one.

## Migration and saved place outcomes still create conditions by drawing them

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. Added after executed `date`: September 30, 2026, 6:28 p.m. Eastern.

`src/simulation/migration/review.ts:99–149` explicitly declares unsupported rates: 4% yearly departure, matching 4% arrivals, 50% within-state destinations, newcomer ages 20–65, a threefold job-loss multiplier and a threefold kin pull. Disaster departure chances are 40% for destroyed homes and 5% for damaged homes. At lines 323–328 and 362–367, draws decide whether actual people leave. Lines 712–723 randomly select a destination after weighting it. Lines 387–400 then plan and apply the moves. These are saved residence decisions, not merely an initial population sample.

Arrival generation at lines 740–766 rounds expected arrivals with another roll and creates new people with a drawn origin and age. Lines 411–432 save those people and state that they moved from that origin. That producer does not select an existing person who lived there. This finding does not establish a measured national population error; it establishes the lack of an individual origin/decision path in the inspected producer. Preserve the relocation writer and household constraints. Replace rate-to-person rolls with housing, work, relationships, affordability and recorded decisions; preserve researched migration rates as aggregate checks. Represent any offscreen population explicitly rather than implying an observed named mover's history.

`src/simulation/outcome-web/place-outcomes.ts:64–86` adds random national, local and occasional society-wide drift to outcome levels. At lines 185–208 it changes the prior level with that drift, clamps it to configured bounds, then applies law multipliers. Lines 247–255 save the resulting level; the monthly handler writes those records at lines 327–335. Thus random drift is a persistent source of measured conditions. It is not merely preview noise. The comment at lines 148–152 also says city/county baselines inherit their state's level pending local data.

Keep the saved measurement records and cause references. Replace drift with changes produced by the responsible engines, then aggregate the affected people, assets, transactions or services. A national shock needs an actual shared cause; random correlation does not supply one. Research ranges should validate results, not clamp the possible world to those ranges. This does not mean physical bounds such as a percentage's mathematical domain should be removed.

## Candidate-scan corrections: integer access is not dice

Fifteen rows in the earlier 390-row random-call candidate scan are `resolved.integer(...)` calls across four legislation-family modules. Their implementation at `src/simulation/legislation-drafting.ts:952–959` checks `value.kind === "integer"` and returns `value.value`. It performs no draw. For example, `src/simulation/legislation-administration-families.ts:240` reads the filed `limit-share`, and `src/simulation/legislation-fiscal-families.ts:603` reads the filed `match-share`. Exclude these accessor calls from any confirmed randomness total. The upstream choice of a parameter still needs its own review.

The exact production filename pattern `src/**/legislation-*-families.ts` has eight matches at this commit: administration, fiscal, infrastructure, local-fiscal, program, resilience, service and transit. This is a filename count, not an engine count. `src/simulation/legislation-content-contracts.ts:533` gives each clause a shared renderer contract, and lines 549–558 define the shared parameter accessors. Preserve useful typed definitions and the common compiler while moving authored policy content and selections into the one-law data contract. Do not describe nine separate engines merely from the starting lead's file count.

## Additional dice classification — September 30, 6:33 p.m. Eastern

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. Source inspection only; no simulation or tests executed.

### Committee power is assigned by a shuffle

`src/simulation/governing/committee-assignment.ts:110–116` seeds on the chamber and member count and executes `pool.splice(rng.integer(0, pool.length), 1)`. Lines 37–56 then deal that ordering among committees. The header at lines 5–15 explicitly labels this an authored profile without an acquired roster source. Repeatability does not make this a records-based appointment decision.

The result controls a real legislative question: `src/simulation/governing/legislative-clock.ts:1235–1247` supplies `members: committeeRoster(...)` for a `committee-report` vote. This is a random allocation of governing authority, not a cosmetic ordering or harmless identifier. Keep the shared roster readers and chamber-vote path. Replace the shuffle with recorded appointments under the chamber's rules, using actual appointing decisions; do not substitute another fixed sorting shortcut and call it a decision. This trace establishes the committee-report consumer, not a measured count of bills whose result changes.

### A second intake path chooses a script and then its sponsor

`src/simulation/governing/legislative-clock.ts:1604–1615` gets jurisdiction-specific authored measures and chooses `const blueprint = rng.pick(authored)`. Lines 1642–1647 restrict an appropriation sponsor to the majority caucus but then choose the member randomly. When no seated body exists, lines 1648–1664 manufacture a sponsor person, including an age drawn from 34 through 69. Lines 1666–1686 introduce the measure and schedule its institutional steps. `src/simulation/governing/state-governing.ts:2468` calls this filing path.

Preserve session checks, duplicate-intake protection, measure numbering, appropriation clauses and the shared introduction writer. Replace the authored selection and sponsor manufacture with an actual member's recorded proposal and decision. This is evidence of an additional agenda producer; it is not proof that every listed bill-filing file contains a separate complete legislature engine.

### Party outreach makes both a choice roll and a schedule roll

`src/simulation/living-world/party-chapters.ts:455–507` already supplies useful records: earlier invitations, attendance and organizer temperament. Nevertheless, lines 508–540 evaluate the invitation with `randomness: "close-choices"`. Lines 553–562 draw another 14–29 days after the meeting and save the next outreach schedule.

The constants at lines 71–82 are openly labeled an authored cadence: first contact 3–11 days, a seven-day deferral, a 14-day refusal delay, Tuesday 6:30–8:00 p.m., a 20-minute journey, age 18 and 28-day memory. A fictional chapter can have a recorded meeting schedule. The problem is making these universal unexamined rules and drawing the organizer's next action date. Keep actual attendance and availability constraints; derive outreach from the organizer's commitments and unresolved contact decisions. A tied decision stays undecided rather than receiving a roll.

### Opening population sampling is not an in-play decision, but is not merely an ID

`src/source/adapters/acs-pums-character-history.ts:182–205` performs a weighted donor draw. Lines 292–303 use household survey weights and randomly pick an eligible subject within the chosen household. The adapter explicitly separates survey evidence from fictional names and exact locations at lines 1–7. Its evidence identity includes the corpus hash and constraints at lines 277–289, and it rejects an empty eligible set at lines 272–275.

Classify this as **opening population sampling**, not a random vote, future life event or harmless seed. Under the owner's literal zero-dice rule it still needs a deliberate replacement: deterministic population allocation from the same weighted source and explicit initial-population requirements. Preserve coherent household records and provenance. A source search found the selector declaration but no direct production call to `selectAcsPumsHouseholdDonor(...)`; ordinary-start reachability is therefore unproven here. Do not claim it currently drives all town openings.

### Two harmless identity uses should not inflate violation counts

`src/player/PrivateJournalEditor.tsx:68–77` assigns `id: crypto.randomUUID()` to a new private note. It does not roll whether the note's contents happened. `src/presentation/browser-world-repository.ts:1787–1800` creates a save-slot nonce with browser cryptographic bytes, or `Math.random()` bytes when crypto is absent; line 480 requests that nonce. These are identity uses, not simulated outcomes. Keep them outside the outcome-dice count. Security or collision properties of the fallback are a separate question and were not tested in this audit.

## Decisions still need causes after dice removal — September 30, 6:35 p.m. Eastern

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. Source evidence only.

### Alphabetical ties are not personal decisions

`src/simulation/decisions.ts:192–203` sorts options by score and then `left.option.key.localeCompare(right.option.key)`. Lines 239–240 return `selectedOptionKey: ranked[0]?.option.key ?? null`. Therefore an exact tie among available options still produces a selection with `randomness: "none"`. The tie is resolved by a programmer's option name, not the actor's records. Null means no available option here, not an unresolved equal preference.

Keep the shared consideration, constraint and source-snapshot machinery. Add an explicit undecided result when records do not distinguish alternatives, and migrate callers to respect it before removing the alphabetical tie selection. A blanket switch from close-choice randomness to none would leave this violation intact. No executed count of affected decisions is claimed.

### Party decisions use a private seeded belief path

`src/simulation/living-world/party-evolution.ts:199–211` implements `partyActorStance` by randomly choosing an option and a strength from the person's seeded stream. Lines 545–568 use that stance as every non-player member's vote and tally it. These are political outcomes, not random names or decorative text.

The same private stance has another consequence: lines 729–736 require a defining strength and compare allies' options before assessing a split or founding initiative. The later decision has `randomness: "none"` at line 818, but that does not remove the seeded belief and strength upstream. Preserve recorded party decisions, membership and initiatives. Replace this private stance generator with the canonical person's recorded beliefs and experiences; preserve undecided states. Do not infer that every party split is random solely because these inputs are random.

### Missing Senate becomes a confirmed Chief Justice

`src/simulation/governing/chief-justice-vacancy.ts:225–235` first attempts the appointment-circle choice, then uses `.pick(pool)` if that fails. The legacy branch is explicitly limited: lines 277–286 try `choosePresidentialNominee` and use the legacy nominee only when no choice and no judiciary store exist. This must not be described as every modern Supreme Court nomination using a dice roll.

There is a separate missing-institution defect. `src/simulation/governing/supreme-court-appointments.ts:506–515` returns null when no Senate or no seated Senate members exist. `src/simulation/governing/chief-justice-vacancy.ts:395–409` handles rejection only inside `if (vote)`. Lines 411–438 then write a tenure event even without a vote, with the fallback sentence “The Senate confirmed” at line 436. Lines 441–456 also record an appointment favor and leave prior judicial or congressional seats.

Keep the recorded nomination, real roll-call result, tenure and vacancy writers. Missing Senate authority must leave confirmation unresolved. Migrate the legacy institution state explicitly rather than manufacturing a completed vote. Preserve the historical bytes of existing saves; do not retroactively rewrite recorded appointments during migration.

### Constitutional ratification dates are drawn

`src/simulation/governing/article-v.ts:394–410` schedules each state's amendment action at `1 + ...integer(0, ARTICLE_V_PROFILE.stateActionWindowDays)` days. The window is 730 days at line 115, and the writer explicitly calls this a placeholder spread. It is a random legislative action date, not an ID. Replace it with the state's actual session calendar, agenda and recorded scheduling decision. Keep the common future-due-item writer and amendment identity. A delay distribution may check aggregate plausibility but cannot decide when a particular legislature acts.

## Disaster and presentation boundaries — September 30, 6:37 p.m. Eastern

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`. Static traces, not executed disaster examples.

### Resampled storms and arbitrary footprint selection

`src/simulation/crisis/hazard-producer.ts:260–270` generates an event count with a Poisson draw, including a hard stop at 25 iterations. Lines 321–330 draw that count and select a historical episode. Lines 335–339 derive footprint width from its recorded area count and select `jurisdictionIds.sort().slice(0, width)`. The selected places are therefore the lexicographically first represented jurisdictions, not locations determined by a storm track or the recorded event's geography. Reusing a source episode does not establish that it struck those places in the simulated world.

The sampled events are consumed by `declareHazardEpisode` at lines 461–474. Treat this as an outcome-producing path, not archival display. Preserve source episode metadata, actual jurisdiction records and the disaster record writer. Replace event occurrence and affected places with explicit, evidenced physical forcing and exposure mechanisms; where those do not exist, record the missing mechanism instead of inventing a frequency or track. A declared fictional scenario is a separate, explicit input, not evidence that an emergent storm was simulated.

### Disaster damage, deaths and repair capacity are authored and rolled

`src/simulation/crisis/disaster.ts:63–102` explicitly labels its policy first-playable balancing rather than empirical curves. Its catastrophic profile damages 60% of exposed homes in expectation, destroys 30% of those, injures residents with a 15% base chance, and kills residents of destroyed homes with a 4% chance. Repair effort is fixed at two units for damage and eight for destruction, with weekly capacity two locally or six with federal assistance. The 30-day request window at line 105 cites a legal rule; that citation does not support the neighboring damage or capacity constants.

The draws at lines 251–254 choose actual damage. Lines 417–437 roll death and invoke the canonical death, health closure, office continuity and death-notice writers. Lines 441–450 roll injury and severity. Researching aggregate loss rates would not by itself satisfy the owner's rule: the affected person's outcome still needs exposure and physical mechanisms rather than a draw.

There is also a disconnected representation problem. `hazardExposure` at lines 201–211 collects households and dwellings separately. Lines 392–409 call `homeLevel` once per dwelling and independently once per household with different keys. Both add repair units through lines 361–390. The household damage result is not derived from its occupied dwelling in this path. This permits inconsistent outcomes and duplicated repair representation for a co-located home; an actual conflicting save was not executed. Preserve occupancy links and give the physical dwelling one damage result, then derive residents' exposure and repair obligations from it.

### Wording selection must be separated from event invention

`src/presentation/contextual-scenes.ts:429–432` selects a sentence variant. Lines 529–536 use it for an opening, while lines 583–597 separately set the answer's outcome and commit contract and choose reply wording. At that inspected boundary, the draw selects wording rather than which answer succeeds. Do not count it as a random political outcome without tracing a variant that changes the underlying facts.

`src/presentation/conversation-subjects.ts:851–862` has another variant selector. Its school opening at lines 414–420 asserts a project deadline and unfinished work in both variants; its meeting opening at lines 526–532 asserts a posted public meeting. These fixed assertions require source records regardless of which sentence is selected. This local trace does not establish that those records are checked before either subject becomes reachable. Keep that as an explicit grounding question rather than declaring every sentence bank a fabricated event. Presentation variability, unsupported facts and simulation outcome dice are three different audit categories.

## Follow-through on the school and meeting grounding question — September 30, 6:39 p.m. Eastern

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`.

The meeting-notice question above now has a narrower answer. `src/presentation/ordinary-life.ts:737–748` requires the player's recorded meeting activity to remain scheduled and in the future before returning the neighborhood conversation room. It is incorrect to claim this ordinary route offers the notice conversation without any meeting record. The opening builder `src/simulation/life-opportunities.ts:305–336` does create that notice, and lines 351–366 put a fixed meeting on tomorrow's calendar at 6:30–7:45 p.m. Its source explicitly calls this an authored opening at lines 295–303. The issue is authored setup and attribution. A meeting record does exist. The builder records the player as having seen the agenda at lines 325–330. Line 360 assigns the player responsibility for the tentative public meeting without an organizing decision in that function.

The school topic has a different source path. `src/presentation/player-conversation.ts:118–120` wires the school room to `createSchoolProjectProgress`. Lines 147–152 call that opening with no world argument when history has no conversation progress. `src/presentation/run-b-conversation-progress.ts:289–295` supplies fixed facts: “the part of the project nobody has started” and “the end of next week.” `src/presentation/formative-play.ts:577–587` requires enrollment and another student at the same education organization; it does not require a recorded project or deadline. Thus the inspected production availability path supplies a scripted project from school membership rather than an assigned-work record.

Both room builders also overstate presence. `src/presentation/formative-play.ts:580–585` selects students by active enrollment and shared organization, then lines 594–613 label them `physicallyPresentPersonIds`, participants and hearers. Enrollment does not establish simultaneous presence in a corridor. `src/presentation/ordinary-life.ts:759–780` selects the first non-household person with the same home jurisdiction and places them on the doorstep as physically present. There is no location/attendance check in that selection. Actual use still depends on caller filtering; this source audit does not claim every displayed room always includes absent people.

Preserve the meeting activity gate, history-backed conversation progress and real person identities. Require actual presence records for room participants. Supply school work and deadline facts from recorded assignments, or omit the project subject when no assignment exists. Keep explicitly authored opening scenarios distinguishable from events produced by ordinary simulation.

## Fictional nationwide law profiles and drawn bill terms — September 30, 6:40 p.m. Eastern

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`.

### A state label and coverage row do not establish lawful terms

`src/simulation/world-setup/state-tax-service-profiles.ts:21–27` states that the profile is fictional and selects from 4%, 4.5% and 5%. Lines 72–80 draw that rate per state. Lines 87–105 define a fictional declared-personal-occurrence tax with a 90-day effective delay and 30-day collection lag. Lines 107–137 supply a $1,000,000 appropriation, 365-day availability, one nonoperational generic repair unit, a one-cent monthly operating need and $25 restoration cost. The comment at lines 126–128 explicitly says this is not a named school, measured facility or resident outcome. These are honestly labeled stand-ins, not researched legal or physical mechanisms.

The version-gated world opening saves these profiles through `src/simulation/world-setup/conditions.ts:257–279`. They are not confined to a test file. `src/presentation/tax-work.ts:34–50` accepts the fictional profile when sourced tax power is absent and requires the proposed terms to match it exactly. `src/simulation/tax-policy.ts:226–239` verifies that profile and its digest. Those identity checks are useful, but agreement with a saved fiction is not proof of legal authority.

`src/simulation/governing/program-governing.ts:434–457` recognizes the matching profile when deriving an enacted program. Lines 597–606 copy its generic capacity and costs into the service profile. The coverage function at `src/presentation/funded-service-capability.ts:208–226` independently creates inventory profiles from a fixed seed for its state rows. Therefore a supported state in this inventory must not be reported as a source-backed law or an actual repaired facility.

Preserve jurisdiction identity, saved version/digest checks, tax-base recording, appropriation authority and capacity records. Replace the fictional legal terms with each jurisdiction's actual law data. Replace generic capacity with actual assets, work quantities and costs. Explicitly migrate old fictional profiles without pretending their past terms were researched. Do not remove the common writers merely because their current inputs are stand-ins.

### Automatic bills draw amounts and operating terms

`src/simulation/governing/automatic-legislation.ts:475–486` labels its amounts authored and picks a multiplier from `[0.5, 0.75, 1, 1.5, 2]`. Lines 491–494 clamp that amount to the variant's bounds. Lines 506–522 separately pick a service window and other enumerated parameters, then lines 526–532 pass the chosen values into `compileBillDraft`.

These are actual proposal terms, not a random display order. The proposal can become a law with financial and eligibility consequences. Keep the common draft compiler and parameter validation. Have the sponsor choose terms from recorded goals, actual program quantities, costs and constraints. A researched spending distribution can check those proposals; it cannot choose the sponsor's appropriation by multiplying a default amount with a dice result. Exact numbers of laws generated by this route were not measured.

## Additional election and business settlement boundaries — September 30, 6:42 p.m. Eastern

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`.

### The contest fallback draws votes, but not every contest uses it

`src/simulation/election-contests.ts:169–189` first tries congressional and state-seat calculations, then gives an unmatched unopposed candidate exactly 1,000 votes, then tries the statewide calculation. Only afterward do lines 191–215 draw 1,000–9,999 votes for each candidate and declare the largest tally the winner. Equal draws are broken by candidate ID at lines 204–206. This is a real outcome violation and a fabricated turnout count, but describing all contests as this roll would be false.

`resolveElectionContest` invokes that evaluator when no explicit result is supplied at lines 458–461 and writes `election.contest-resolved` at lines 468–473. Keep contest identity, eligibility, supplied-result validation and saved results. Route every supported office through one actual electorate/counting mechanism. For an unsupported electorate, return an unresolved contest instead of inventing turnout. The inspected code does not establish how many current contests reach the fallback.

### Fixed business receipts become completed payments

`src/simulation/local-economy.ts:406–429` creates an aggregate customer organization whose provenance says individual shoppers are not modeled. Lines 591–605 create a monthly revenue flow from it using `plan.planned.monthlyRevenueMinor`; lines 607–618 create the owner's monthly draw. These are standing money flows, not recorded customer purchases.

Lines 675–705 turn each active flow into `status: "completed"` with the full terms amount. Lines 711–715 require a tracked balance at either endpoint, not both. Lines 773–780 settle revenue first and use the shared transfer writer. The path is called through `refreshLocalEconomy` at lines 817–825, itself used by `src/simulation/life-opportunities.ts:451`.

Important limit: the shared writer at `src/simulation/resources.ts:571–589` rejects an overdraw when a source account exists. Therefore do not claim this code universally bypasses known cash constraints. The verified problems are assumed full payments, revenue without purchases, and an aggregate source whose own balance need not be tracked. When a tracked source is short, this producer supplies no partial/blocked outcome; the writer can throw instead. That failure branch was not executed.

Keep shared flows, transfers and employer/work identities. Generate business receipts from actual demand and sales, and settle wages and draws against the resulting cash and obligations. Add explicit blocked/partial outcomes before retiring the blanket completion producer. Preserve legitimate opening contracts instead of retroactively inventing sales histories.

### Another search false positive

`src/simulation/policy-semantics.ts:949–950` uses `jurisdictionIds.values().next().value` to read the sole member of a set. This is an iterator operation, not randomness. It occurs in the broad random-call candidate inventory and must be excluded from any validated dice count.

## Exact effect-catalog counts and unsupported zero claims — September 30, 6:45 p.m. Eastern

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`.

A fresh JSON read of `data/research/outcome-web/links.json` counts 220 links: 109 labeled researched, 40 about-zero, 38 provisional, 18 contested and 15 to-confirm. Eighty-two have null sizes. These are file contents, not independently verified research classifications and not counts of working mechanisms. No external study was opened in this audit.

The operational distinction matters. `src/simulation/outcome-web/index.ts:540–554` returns `about-zero` first, then identifies person-level shapes, then rejects a null size as `size-not-set`. Lines 694–701 use only links whose status is `built`, with a recorded cause and baseline. Therefore the ordinary place-factor loop does not blindly activate all 82 null-sized links as zero. Person-level shapes have their own route and cannot be classified from this loop alone.

Four source-grounding failures are explicit in the catalog's own text:

- `data/research/outcome-web/links.json:3992–4006` assigns a zero graduation effect to housing vouchers while its anchor says effects were “mostly statistically insignificant.” The companion crime entry at lines 4009–4023 does the same. An imprecise estimate is not proof that every supported context has an exact zero effect.
- `data/research/outcome-web/links.json:4326–4340` says congressional stock trading has zero effect partly because “the game keeps no member holdings to change.” A missing holdings mechanism cannot establish a real-world zero or satisfy the law's implementation requirement.
- `data/research/outcome-web/links.json:4374–4388` sets library-material removal to zero while its anchor says “no study links removals to reading scores.” Absence of an estimate must remain an evidence gap; it is not a measured zero.
- `data/research/outcome-web/links.json:4391–4405` sets the city nondiscrimination poverty effect to zero because the affected group is small. Population share may dilute a measured aggregate effect, but without actual affected households and poverty thresholds it does not prove zero households change status.

Retain the evidence excerpts and uncertainty. Research review must separate measured near-zero estimates, insufficient precision, unmeasured mechanisms, direct accounting identities and indirect consequences. Do not silently replace these zeros with invented nonzero coefficients.

The opposite problem exists for nonzero links. `src/simulation/outcome-web/index.ts:638–674` supplies default spreads of 25% for researched, 50% for provisional/to-confirm and 100% for contested links, then averages two random draws to choose a place's size. These percentages are implementation defaults, not research supplied by each link. Lines 713–717 feed the drawn size into the actual multiplier, and lines 735–753 clamp links and their combined product. Those caps are not automatically physical constraints. Preserve causal attribution and real cause readers, but replace outcome selection with terms and mechanisms; use research ranges to check results rather than draw or bound them by default.

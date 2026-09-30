# Mechanism-based diminishing and negative returns

Design for CTO review; no simulation change authorized or implemented by this document.

## Contract

An enacted law changes a legal term. Existing producers apply that term to actual people, money, organizations and service records. Outcome readers consume the saved result. Research estimates calibrate response strengths and supported turning points; they do not supply a drawn revenue, price, cost or other outcome level. Under CTO1:25, a study range describes the average across places. Place-specific responses arise from recorded conditions and may fall outside that range; do not clamp each place to the research interval.

A benefit can run out of reachable recipients or usable capacity. A separate adverse mechanism can grow at the same time. Their timing, scope and direction must be recorded separately; no universal inverted-U curve or fixed sequence is proposed.

## Existing records and boundaries

| Mechanism | Existing source | Reusable evidence | Missing connection or limit |
| --- | --- | --- | --- |
| Service capacity | `types.ts`: `PublicProgramCapacityRecord`, `PublicProgramCapacityOutturnRecord` | Total and operational units, actual installments, delivered restoration, observed completion when present | Transit contract service hours alone do not establish vehicle availability, demand, reliability or access |
| Fiscal constraint | `public-budgets/store.ts`: `BudgetMonthRow`; resource transfers | Actual spending, cash balance, reserve, debt and payment records | Appropriation is authority, not payment or delivered service; avoid counting both transfer and budget summary as two costs |
| Staff availability | `public-budgets/store.ts`: `StaffingBaseline`; `public-budgets/staffing.ts` | Watched-town funded roles, headcount and real funding | Not statewide police density or a measured productivity curve; national officer denominator still required |
| Trust from conduct | `relationship-standing.ts`: `RelationshipStanding`, `DimensionReading.basis` | Directed person-to-person trust readings with actual interaction IDs | These are qualitative interpersonal readings, not numeric public trust in police. Do not convert bands to an institutional index |
| Housing pressure | `living-world/housing-price-model.ts`: `HousingPriceInputs` | Income, rates, prior price growth and price-to-income gap; model has an explicit mean-reversion term | The source explicitly lacks a measured supply term. A law toggle is not delivered units or occupancy |
| Existing effect shapes | `outcome-web/index.ts`: shape evaluator and `outcomeFactor` | Per-link causes, baseline, lag and provenance | Existing diminishing `scale` and target floor/ceiling are mathematical controls, not evidence of real saturation or reversal |

## Proposed integration boundaries

1. Reuse canonical writers. A capacity-limited service writer records how many units were requested, paid for and actually delivered, referencing the existing capacity and payment records. The outcome reader uses delivered exposure; it must not independently recreate deliveries from the budget.
2. Match jurisdiction, population, unit and date before composing effects. State officer counts cannot come from a watched-town sample. A baseline must use the same scope and denominator as its change.
3. Track beneficial and adverse channels separately. For policing, deployment may affect deterrence while recorded stops or misconduct may affect reporting and cooperation. The latter needs an institutional experience/reporting producer and research; interpersonal trust is not a substitute. No invented offender count or trust level is proposed.
4. Save the cause chain: governing law stamp, actual exposure IDs, capacity/base IDs, applied date, outcome record and relevant person IDs. News and concerns read these saved changes, including an adverse effect, rather than a catalog promise.
5. Prevent double application. A direct paid-leave payment or coverage loss is already a consequence. A summary outcome multiplier must not pay the money again or remove coverage twice.
6. Where a measured turning point is available, retain its units, population and uncertainty. Where a mechanism or research is absent, expose the exact missing connection for review. Do not insert a guessed curve to make every link look complete.

## Link priorities and existing owners

| Link family | Proposed next connection | Owner boundary |
| --- | --- | --- |
| Police to violent/property crime | National state officer counts and population, then actual deployment changes; distinct reporting/cooperation mechanism before negative-return claims | Team 9 research; coordinator link design; production assignment requires CTO review |
| Transit funding to delivered service and ridership | Actual wages/fuel/vehicle costs, available operational units and completed work; demand and crowding need their own recorded bases | Team 6 current transit cost scope; coordinator map connection |
| Minimum wage to pay and employment | Existing actual wage/payment records and employer finances; research at wage-to-median ratios for employment response | Team 3 wages; research Team 9; no new employer rewrite assigned here |
| Education funding/class size | Funded qualified staff plus actual enrollment/class capacity before claims about crowding | Team 5 law scope; exact enrollment/capacity producers still need a bounded trace |
| Housing supply to rent/displacement | Completed usable units and households, construction constraints and affordability; no direct invented supply from a law | Team 4 housing scope; supply elasticity research still needed |
| Coverage rules to people and news | Actual eligibility/coverage changes already stamped; count saved affected people, then saved health consequences when produced | Team 8; do not turn a headline count into an invented health outcome |

## Review and proof requirements

CTO decisions requested: approve these boundaries and the first bounded mechanism to implement. No production code is part of this design. Research-dependent coefficients remain Team 9 work.

Future tests should compare the same seeded world under distinct legal terms; demonstrate actual capacity exhaustion or an independently produced adverse channel; verify no double counting, jurisdiction leakage or fabricated observations; and preserve the same saved causes after Save/Continue. Named-person totals must reconcile with aggregate rows. Those mechanism tests and player proof are NOT RUN for this design.

## Source review

Source pin: `e3182daa79e221604c5a328a1b6b4e055ebf648e`.
Read-only source trace; no runtime or browser tests were run for this design.

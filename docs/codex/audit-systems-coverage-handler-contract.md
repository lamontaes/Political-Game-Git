# Coverage has a saved person writer, but its exports are not registered capabilities

The existing Medicaid path already saves covered or not-covered decisions for real people under starting and enacted laws. Its reusable contract is a legal decision with recorded eligibility facts, not a numeric person count. The shared engine should preserve this decision and writer. Calling the current whole-world coverage pass once per selected person would repeat the scan and does not create a supported single-person adapter.

## Existing decision and writer signatures

Measured source pin: d9e4b8689b24470af29262d5b38affcc9dbb360a. The exported reader at src/simulation/crisis/health-coverage.ts:406 is medicaidCoverageDecision(world: World, personId: EntityId, onDate: IsoDate = world.currentDate): CoverageDecision. CoverageDecision at line 239 includes covered, reasonKey, stateKey, householdSize, monthlyIncomeMinor, monthlyWorkHours and expansion LawInForce. The selector must supply an existing person and actual residence/household/work/enrollment facts; a missing fact cannot be converted to eligibility.

Measured origin reuse: statePrograms at src/simulation/crisis/health-coverage.ts:267 resolves expansion and work-requirement questions through lawInForce at line 279. That canonical reader admits both origins. The private decide function at line 289 uses supported age, income, work and exemption facts. The public decision reader builds a monthly pay map at line 422; calling it independently for every subject repeats that work.

Measured writer at src/simulation/crisis/health-coverage.ts:471 is recordHealthCoverage(world: World, onDate: IsoDate, causeId: EntityId): World. It builds shared pay/law caches and loops world.personOrder at line 487. Its change gate at line 501 skips an unchanged covered state. Never-covered subjects are recorded only for work-requirement losses, at line 505. This export writes a batch, not one caller-supplied person.

Measured saved record: appendCrisisRecord at src/simulation/crisis/records.ts:88 accepts CrisisRecordInput and appends with stable identity and sequence. Duplicate stable keys throw at line 94. HealthCoverageRecord at src/simulation/crisis/types.ts:103 retains personId, program, covered, reason, state, household facts, income, work hours and hazard provenance. Duplicate prevention must occur before invoking this low-level writer; it is not a silent idempotent setter.

## Exact attribution and shared-engine boundary

Measured attribution: src/simulation/crisis/health-coverage.ts:524 identifies work-rule loss or restoration separately from expansion. The stamp at line 529 names the governing law, actual question/state/date, cause ID and prior coverage record. The append at line 539 saves the decision once. Preserve this distinction when two catalog rows feed the same coverage action.

Required admission: the coordinator publishes the exact selector, action, predicate, term and unit resolver names. Existing TypeScript exports are source references, not registered capability IDs. A one-person numeric amount cannot encode covered versus not covered. The admitted adapter needs the existing decision, actual subject/cause/prior IDs and source-bound terms, then the saved coverage writer. Disable or delegate the old path before activating the same migrated consequence. Preserve the current cache/batch boundary or a supported indexed single-person equivalent; add no per-law month/index hook.

Measured term limit: MEDICAID_EXPANSION_RULES at src/simulation/crisis/health-coverage.ts:132 reads the compiled public-program data and mortality link. It is not a generic accessor for amended filed eligibility terms. The boolean law identity alone cannot supply new legal income limits, hours or exemptions. Missing immutable term binding remains an explicit capability gap.

## Named recorded example and proof limits

Measured preserved campaign example: Kai Webster, person_f0acb4eff7818fa0, has a California starting-law Medicaid coverage record within the Sierra Vista, Arizona, world. The record shows covered=true, household size 1 and zero recorded monthly income/work hours on April 15, 2026. The exact crisis record, canonical stamp and cause due-item appear in docs/codex/law-audit/audit-systems-restart-d9e4b868-20260930-1921/partial-06-20260930T194456071807Z.json:67367. This proves saved coverage, not treatment or a new shared-handler pass.

This bounded source check executed zero tests, worlds or production edits. Team8 owns its data and existing domain work; coordinator owns capability admission and shared dispatch. CTO's ordering is pay, then legal-outcome, then coverage. No capability key or operative coefficient is invented here.

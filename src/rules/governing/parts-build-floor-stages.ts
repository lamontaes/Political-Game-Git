// STOPGAP RULES3-GOV-068: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/municipal-government.ts :: buildFloorStages.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1228: readings === null */
export function buildFloorStagesRule1(facts: {
  readonly readings: number | null;
}) {
  return facts.readings! === null;
}

/** Legacy line 1231: index < readings */
export function buildFloorStagesRule2(facts: {
  readonly index: number;
  readonly readings: number;
}) {
  return facts.index < facts.readings;
}

/** Legacy line 1231: index += 1 */
export function buildFloorStagesRule3(facts: { readonly index: number }) {
  return facts.index + 1;
}

/** Legacy line 1236: index === readings - 1 && reading.procedure.amendment !== null           ? knownRule(true, municipalRuleSourceRef(reading, "amendment"))           : unknownRule(               "No instrument read establishes whether this reading takes amendments.",   */
export function buildFloorStagesRule4(facts: {
  readonly index: number;
  readonly readings: number;
  readonly readingProcedureAmendment: string | null;
  readonly knownRuleTrueMunicipalRuleSourceRefReadingAmendment: unknown;
  readonly unknownRuleResult: unknown;
}) {
  return facts.index === facts.readings - 1 &&
    facts.readingProcedureAmendment! !== null
    ? facts.knownRuleTrueMunicipalRuleSourceRefReadingAmendment
    : facts.unknownRuleResult;
}

/** Legacy line 1242: index > 1 && reading.procedure.betweenReadings         ? {             readingIntervalDays: municipalIntervalRule(               reading,               reading.procedure.betweenReadings,               "legislativeProcedure.betweenReadings",           */
export function buildFloorStagesRule5(facts: {
  readonly index: number;
  readonly readingProcedureBetweenReadings: unknown;
  readonly readingIntervalDaysMunicipalIntervalRuleReadingReadingProced: unknown;
  readonly selectedValue: unknown;
}) {
  return facts.index > 1 && facts.readingProcedureBetweenReadings
    ? facts.readingIntervalDaysMunicipalIntervalRuleReadingReadingProced
    : facts.selectedValue;
}

/** Legacy line 1253: everyReadingVoted         ? knownRule(passage, passageSource)         : unknownRule(             "This reading decides nothing; the instrument puts the vote at the final reading.",           ) */
export function buildFloorStagesRule6(facts: {
  readonly everyReadingVoted: boolean;
  readonly knownRulePassagePassageSource: unknown;
  readonly unknownRuleResult: unknown;
}) {
  return facts.everyReadingVoted
    ? facts.knownRulePassagePassageSource
    : facts.unknownRuleResult;
}

/** Legacy line 1263: readings > 1 ? `Reading ${readings} and final passage` : "Adoption" */
export function buildFloorStagesRule7(facts: { readonly readings: number }) {
  return facts.readings > 1
    ? `Reading ${facts.readings} and final passage`
    : "Adoption";
}

/** Legacy line 1265: reading.procedure.amendment === null         ? unknownRule(             "No instrument read establishes whether this body amends at final passage.",           )         : knownRule(true, municipalRuleSourceRef(reading, "amendment")) */
export function buildFloorStagesRule8(facts: {
  readonly readingProcedureAmendment: string | null;
  readonly unknownRuleResult: unknown;
  readonly knownRuleTrueMunicipalRuleSourceRefReadingAmendment: unknown;
}) {
  return facts.readingProcedureAmendment! === null
    ? facts.unknownRuleResult
    : facts.knownRuleTrueMunicipalRuleSourceRefReadingAmendment;
}

/** Legacy line 1270: readings > 1 */
export function buildFloorStagesRule9(facts: { readonly readings: number }) {
  return facts.readings > 1;
}

/** Legacy line 1271: readings > 1 && reading.procedure.betweenReadings       ? {           readingIntervalDays: municipalIntervalRule(             reading,             reading.procedure.betweenReadings,             "legislativeProcedure.betweenReadings",           ),     */
export function buildFloorStagesRule10(facts: {
  readonly readings: number;
  readonly readingProcedureBetweenReadings: unknown;
  readonly readingIntervalDaysMunicipalIntervalRuleReadingReadingProced: unknown;
  readonly selectedValue: unknown;
}) {
  return facts.readings > 1 && facts.readingProcedureBetweenReadings
    ? facts.readingIntervalDaysMunicipalIntervalRuleReadingReadingProced
    : facts.selectedValue;
}

/** Legacy line 1280: reading.procedure.introductionToPassage       ? {           minimumDaysFromIntroduction: municipalIntervalRule(             reading,             reading.procedure.introductionToPassage,             "legislativeProcedure.introductionToPassage",        */
export function buildFloorStagesRule11(facts: {
  readonly readingProcedureIntroductionToPassage: unknown;
  readonly minimumDaysFromIntroductionMunicipalIntervalRuleReadingReadi: unknown;
  readonly selectedValue: unknown;
}) {
  return facts.readingProcedureIntroductionToPassage
    ? facts.minimumDaysFromIntroductionMunicipalIntervalRuleReadingReadi
    : facts.selectedValue;
}

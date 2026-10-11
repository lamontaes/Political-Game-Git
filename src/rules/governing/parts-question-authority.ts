// STOPGAP RULES3-GOV-087: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/question-authority.ts :: questionAuthority.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 261: reach === null || levels.length === 0 */
export function questionAuthorityRule1(facts: {
  readonly reach: unknown;
  readonly levelsLength: number;
}) {
  return facts.reach === null || facts.levelsLength === 0;
}

/** Legacy line 267: reach === null           ? "No level is recorded for this question."           : "This jurisdiction's level of government is not known." */
export function questionAuthorityRule2(facts: { readonly reach: unknown }) {
  return facts.reach === null
    ? "No level is recorded for this question."
    : "This jurisdiction's level of government is not known.";
}

/** Legacy line 274: own.length === 0 */
export function questionAuthorityRule3(facts: { readonly ownLength: number }) {
  return facts.ownLength === 0;
}

/** Legacy line 281: !dial */
export function questionAuthorityRule4(facts: {
  readonly dial: string | null;
}) {
  return !facts.dial!;
}

/** Legacy line 290: verdicts.includes("yes")     ? "yes"     : verdicts.includes("unknown")       ? "unknown"       : "no" */
export function questionAuthorityRule5(facts: {
  readonly verdictsIncludesYes: boolean;
  readonly verdictsIncludesUnknown: boolean;
}) {
  return facts.verdictsIncludesYes
    ? "yes"
    : facts.verdictsIncludesUnknown
      ? "unknown"
      : "no";
}

/** Legacy line 296: gate && may !== "no" && own.every((l) => l === "county" || l === "city")       ? stateGate(world, jurisdictionId, gate, onDate, cutoff)       : null */
export function questionAuthorityRule6(facts: {
  readonly gate: unknown;
  readonly may: string;
  readonly ownEveryLLCountyLCity: boolean;
  readonly stateGateWorldJurisdictionIdGateOnDateCutoff: unknown;
}) {
  return facts.gate && facts.may !== "no" && facts.ownEveryLLCountyLCity
    ? facts.stateGateWorldJurisdictionIdGateOnDateCutoff
    : null;
}

/** Legacy line 296: l === "county" || l === "city" */
export function questionAuthorityRule7(facts: { readonly l: string }) {
  return facts.l === "county" || facts.l === "city";
}

/** Legacy line 307: may === "unknown" &&     own.every(       (level) =>         (level === "county" || level === "city") &&         leftToStateLaw(cells?.[level]),     )       ? homeRuleVerdict(world, jurisdictionId, onDate, cutoff)       : null */
export function questionAuthorityRule8(facts: {
  readonly may: string;
  readonly ownEveryLevelLevelCountyLevelCityLeftToStateLawCellsLevel: boolean;
  readonly homeRuleVerdictWorldJurisdictionIdOnDateCutoff: unknown;
}) {
  return facts.may === "unknown" &&
    facts.ownEveryLevelLevelCountyLevelCityLeftToStateLawCellsLevel
    ? facts.homeRuleVerdictWorldJurisdictionIdOnDateCutoff
    : null;
}

/** Legacy line 310: (level === "county" || level === "city") &&         leftToStateLaw(cells?.[level]) */
export function questionAuthorityRule9(facts: {
  readonly level: string;
  readonly leftToStateLawCellsLevel: boolean;
}) {
  return (
    (facts.level === "county" || facts.level === "city") &&
    facts.leftToStateLawCellsLevel
  );
}

/** Legacy line 327: may === "yes"         ? `The powers catalog grants ${own.join(" and ")} governments the ${dial} dial.`         : may === "unknown"           ? `Whether ${own.join(" and ")} governments hold the ${dial} dial is not settled.`           : `The powers ca */
export function questionAuthorityRule10(facts: {
  readonly may: string;
  readonly ownJoinAnd: string;
  readonly dial: string;
}) {
  return facts.may === "yes"
    ? `The powers catalog grants ${facts.ownJoinAnd} governments the ${facts.dial} dial.`
    : facts.may === "unknown"
      ? `Whether ${facts.ownJoinAnd} governments hold the ${facts.dial} dial is not settled.`
      : `The powers catalog withholds the ${facts.dial} dial from ${facts.ownJoinAnd} governments.`;
}

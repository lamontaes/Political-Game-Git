// STOPGAP RULES3-GOV-055: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/program-governing.ts :: programAlternativesFor.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1415: uncommitted <= 0 */
export function programAlternativesForRule1(facts: {
  readonly uncommitted: number;
}) {
  return facts.uncommitted <= 0;
}

/** Legacy line 1417: Math.floor(uncommitted / 3) */
export function programAlternativesForRule2(facts: {
  readonly uncommitted: number;
}) {
  return Math.floor(facts.uncommitted / 3);
}

/** Legacy line 1418: third > 0 */
export function programAlternativesForRule3(facts: { readonly third: number }) {
  return facts.third > 0;
}

/** Legacy line 1431: capacity.unitsTotal - capacity.unitsOperational */
export function programAlternativesForRule4(facts: {
  readonly capacityUnitsTotal: number;
  readonly capacityUnitsOperational: number;
}) {
  return facts.capacityUnitsTotal - facts.capacityUnitsOperational;
}

/** Legacy line 1432: Math.min(       uncommitted,       idle * capacity.restorationCostPerUnit.minorUnits,     ) */
export function programAlternativesForRule5(facts: {
  readonly uncommitted: number;
  readonly idle: number;
  readonly capacityRestorationCostPerUnitMinorUnits: number;
}) {
  return Math.min(
    facts.uncommitted,
    facts.idle * facts.capacityRestorationCostPerUnitMinorUnits,
  );
}

/** Legacy line 1436: idle > 0 && affordable >= capacity.restorationCostPerUnit.minorUnits */
export function programAlternativesForRule6(facts: {
  readonly idle: number;
  readonly affordable: number;
  readonly capacityRestorationCostPerUnitMinorUnits: number;
}) {
  return (
    facts.idle > 0 &&
    facts.affordable >= facts.capacityRestorationCostPerUnitMinorUnits
  );
}

/** Legacy line 1450: alternatives.length === 0 */
export function programAlternativesForRule7(facts: {
  readonly alternativesLength: number;
}) {
  return facts.alternativesLength === 0;
}

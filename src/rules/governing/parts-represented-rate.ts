// STOPGAP RULES3-GOV-026: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/crisis/hazard-producer.ts :: representedRate.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 247: rate === null */
export function representedRateRule1(facts: { readonly rate: number | null }) {
  return facts.rate! === null;
}

/** Legacy line 249: row.stateUsps === stateUsps && row.family === family */
export function representedRateRule2(facts: {
  readonly rowStateUsps: string;
  readonly stateUsps: string;
  readonly rowFamily: string;
  readonly family: string;
}) {
  return (
    facts.rowStateUsps === facts.stateUsps && facts.rowFamily === facts.family
  );
}

/** Legacy line 252: !footprint || counties === 0 */
export function representedRateRule3(facts: {
  readonly footprint: unknown;
  readonly counties: number;
}) {
  return !facts.footprint || facts.counties === 0;
}

/** Legacy line 253: Math.min(1, footprint.medianCountiesPerEpisode / counties) */
export function representedRateRule4(facts: {
  readonly footprintMedianCountiesPerEpisode: number;
  readonly counties: number;
}) {
  return Math.min(1, facts.footprintMedianCountiesPerEpisode / facts.counties);
}

/** Legacy line 254: rate * share */
export function representedRateRule5(facts: {
  readonly rate: number;
  readonly share: number;
}) {
  return facts.rate * facts.share;
}

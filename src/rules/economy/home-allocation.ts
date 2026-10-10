import { ECONOMY_RULE_PARAMETERS } from "./parameters";

export interface HomeAllocationFacts {
  readonly householdAges: readonly number[];
  readonly working: boolean;
  readonly payMinor: number | null;
  readonly paymentMinor: number | null;
  readonly mayBorrow?: boolean;
  readonly farm?: boolean;
  readonly homePriceFactorByKind: Readonly<Record<string, number>>;
  readonly tenureKinds: {
    readonly rented: string;
    readonly owned: string;
    readonly mortgaged: string;
  };
}

export interface HomeAllocationDecision {
  readonly kind: string;
  readonly tenure: string;
}

/** Select a home kind and tenure from caller-selected household and price facts. */
export function homeForHouseholdFromFacts(
  facts: HomeAllocationFacts,
): HomeAllocationDecision {
  const size = facts.householdAges.length;
  const headAge = Math.max(0, ...facts.householdAges);
  const mayBorrow = facts.mayBorrow ?? true;
  const carries = (kind: string) =>
    mayBorrow &&
    facts.working &&
    facts.paymentMinor !== null &&
    facts.payMinor !== null &&
    facts.payMinor >=
      facts.paymentMinor *
        facts.homePriceFactorByKind[kind]! *
        ECONOMY_RULE_PARAMETERS.homeBuyPaymentCoverageMultiple.value;
  const tenure =
    headAge < ECONOMY_RULE_PARAMETERS.homeOutrightOwnershipAgeYears.value
      ? facts.tenureKinds.mortgaged
      : facts.tenureKinds.owned;

  if (facts.farm && carries("rural-farmhouse")) {
    return { kind: "rural-farmhouse", tenure };
  }
  if (
    size >= ECONOMY_RULE_PARAMETERS.homeHouseholdSizeBands.value.largeMinimum &&
    carries("large-house")
  ) {
    return { kind: "large-house", tenure };
  }
  if (carries("suburban-house")) return { kind: "suburban-house", tenure };
  if (carries("mobile-home")) return { kind: "mobile-home", tenure };
  return {
    kind:
      size <= ECONOMY_RULE_PARAMETERS.homeHouseholdSizeBands.value.smallMaximum
        ? "small-apartment"
        : "rowhouse",
    tenure: facts.tenureKinds.rented,
  };
}

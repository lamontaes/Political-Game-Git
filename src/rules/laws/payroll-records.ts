import type {
  EntityId,
  ResourcePositionOwner,
  ResourceFlow,
  ResourceTransferOutcome,
  World,
} from "../../simulation/types";
export interface PayrollFacts {
  readonly firstVerifiedTaxYear: number;
  readonly territoryKeys: ReadonlySet<string>;
  readonly profiles: ReadonlyMap<
    EntityId,
    { readonly classification: string } | null | undefined
  >;
  readonly flows: World["history"]["resourceFlows"];
  readonly transfers: World["history"]["resourceTransferOutcomes"];
}
// stopgapId: "laws.federal-employment-coverage-gaps"
export function federalCoverageGap(
  facts: PayrollFacts,
  employer: ResourcePositionOwner,
  stateKey: string | null,
  taxYear: number,
): string | null {
  if (taxYear < facts.firstVerifiedTaxYear) return "tax-rules-before-2026";
  if (!stateKey) return "tax-residence-unrecorded";
  if (facts.territoryKeys.has(stateKey))
    return "employment-tax-coverage-exceptions";
  if (employer.kind !== "organization")
    return "employment-tax-coverage-exceptions";
  const classification = facts.profiles.get(
    employer.organizationId,
  )?.classification;
  if (classification === "sector:government")
    return "employment-tax-coverage-exceptions";
  return null;
}

export function wagesPaidEarlierThisYear(
  facts: PayrollFacts,
  flow: ResourceFlow,
  outcome: ResourceTransferOutcome,
  taxYear: number,
): number {
  const year = String(taxYear);
  let total = 0;
  const same = new Set<EntityId>();
  for (const other of facts.flows)
    if (
      other.basisReference.kind === "work" &&
      sameOwner(other.source, flow.source) &&
      sameOwner(other.recipient, flow.recipient)
    )
      same.add(other.id);
  for (const row of facts.transfers.filter((row) =>
    same.has(row.resourceFlowId),
  )) {
    if (row.sequence >= outcome.sequence) continue;
    if (row.occurredAt.slice(0, 4) !== year) continue;
    if (row.transferredAmount.currency !== outcome.transferredAmount.currency)
      continue;
    total += row.transferredAmount.minorUnits;
  }
  return total;
}

function sameOwner(
  a: ResourcePositionOwner,
  b: ResourcePositionOwner,
): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "person") return a.personId === (b as typeof a).personId;
  if (a.kind === "household")
    return a.householdId === (b as typeof a).householdId;
  return a.organizationId === (b as typeof a).organizationId;
}

import type {
  EntityId,
  IsoDate,
  HistoricalCutoff,
  PolicyCatalog,
  PolicyPropositionDefinition,
} from "../../simulation/types";
import type { ConstitutionalMeasureRecord } from "../../simulation/constitutional-types";
import type { PolicyProvisionInForce } from "../../simulation/policy-provisions";
import {
  constitutionalPosition,
  type ConstitutionalPositionFacts,
} from "./constitutional-position";
export interface ConstitutionalPolicyFacts {
  readonly onDate: IsoDate;
  readonly policyCatalog: PolicyCatalog;
  readonly measures: readonly ConstitutionalMeasureRecord[];
  readonly positions: ReadonlyMap<EntityId, ConstitutionalPositionFacts>;
}
export function stateDecidedPropositions(
  facts: ConstitutionalPolicyFacts,
): readonly PolicyPropositionDefinition[] {
  const catalog = facts.policyCatalog;
  return catalog.propositionOrder
    .map((id) => catalog.propositions[id])
    .filter(
      (proposition): proposition is PolicyPropositionDefinition =>
        proposition !== undefined &&
        (catalog.issues[proposition.issueId]?.levels ?? []).includes("state"),
    );
}

export function constitutionalPolicyProvisions(
  facts: ConstitutionalPolicyFacts,
  stateUsps: string,
  onDate: IsoDate = facts.onDate,
  cutoff?: HistoricalCutoff,
): readonly PolicyProvisionInForce[] {
  const latest = new Map<
    EntityId,
    {
      readonly provision: PolicyProvisionInForce;
      readonly sequence: number;
    }
  >();
  for (const measure of facts.measures ?? []) {
    if (
      cutoff &&
      (measure.sequence >= cutoff.historySequenceExclusive ||
        measure.introducedAt > cutoff.asOfDate)
    )
      continue;
    const delta = measure.ruleDelta;
    if (delta.kind !== "policy-provision") continue;
    const key =
      measure.jurisdictionKey === "US"
        ? "US"
        : constitutionalStateUsps(measure.jurisdictionKey);
    if (key !== stateUsps) continue;
    const { operativeAt } = constitutionalPosition(
      facts.positions.get(measure.id)!,
      measure.id,
      onDate,
      cutoff,
    );
    if (!operativeAt || operativeAt > onDate) continue;
    const held = latest.get(delta.propositionId);
    if (
      held &&
      (held.provision.operativeAt > operativeAt ||
        (held.provision.operativeAt === operativeAt &&
          held.sequence > measure.sequence))
    )
      continue;
    latest.set(delta.propositionId, {
      provision: {
        stateUsps,
        propositionId: delta.propositionId,
        stance: delta.stance,
        measureId: measure.id,
        designation: measure.designation,
        operativeAt,
      },
      sequence: measure.sequence,
    });
  }
  return [...latest.values()]
    .sort(
      (a, b) =>
        a.provision.operativeAt.localeCompare(b.provision.operativeAt) ||
        a.sequence - b.sequence,
    )
    .map((entry) => entry.provision);
}
export function constitutionalStateUsps(
  jurisdictionKey: string,
): string | null {
  return /^US-[A-Z]{2}$/.test(jurisdictionKey)
    ? jurisdictionKey.slice(3)
    : null;
}

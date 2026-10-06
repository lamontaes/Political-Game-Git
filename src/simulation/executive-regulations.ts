import type { LawDelegationTerm } from "./law-consequence-types";
import { lawInForce } from "./governing/law-in-force";
import { executiveProfileForOfficeKey } from "./executive-authority-game-profile";
import {
  currentGoverningOfficeByKey,
  openDelegatedRuleDraftMatters,
  type DelegatedRuleDraftMatterInput,
} from "./governing/state-governing";
import type { EntityId, World } from "./types";

export interface DelegatedRegulationCandidate {
  readonly instance: string;
  readonly subjectKey: string;
  readonly title: string;
  readonly sourceEventId: EntityId;
  readonly measureId: EntityId;
  readonly propositionId: EntityId;
  readonly delegation: LawDelegationTerm;
}

/** Find terms delegated by statutes currently in force for this executive. */
export function delegatedRegulationCandidates(
  world: World,
  officeKey: string,
): readonly DelegatedRegulationCandidate[] {
  const office = currentGoverningOfficeByKey(world, officeKey);
  const profile = executiveProfileForOfficeKey(officeKey);
  if (!office || !profile) return [];
  const candidates: DelegatedRegulationCandidate[] = [];
  for (const proposition of Object.values(world.policyCatalog.propositions)) {
    const law = lawInForce(world, office.jurisdictionId, proposition.id);
    if (!law || law.origin !== "enacted") continue;
    const measure = world.history.legislativeMeasures?.find(
      (record) => record.id === law.measureId,
    );
    const enactment = world.history.legislativeEnactments?.find(
      (record) => record.measureId === law.measureId,
    );
    if (
      !measure ||
      (measure.governmentInstrument ?? "statute") !== "statute" ||
      !enactment ||
      !measure.propositionIds?.includes(proposition.id)
    )
      continue;
    for (const [rowIndex, row] of (proposition.consequences ?? []).entries()) {
      for (const [termIndex, delegation] of (row.delegations ?? []).entries()) {
        candidates.push({
          instance: `${measure.id}:${proposition.id}:${rowIndex}:${termIndex}:${delegation.key}`,
          subjectKey: delegation.questionKey,
          title: `${proposition.name}: ${delegation.key}`,
          sourceEventId: enactment.outcomeEventId,
          measureId: measure.id,
          propositionId: proposition.id,
          delegation,
        });
      }
    }
  }
  return candidates;
}

/** Stable, in-range draft choices derived only from the delegating law's range. */
export function boundedRegulationDraftValues(
  delegation: LawDelegationTerm,
): readonly number[] {
  if (
    !delegation.key.trim() ||
    !delegation.questionKey.trim() ||
    !delegation.unit ||
    delegation.sourceIds.length === 0 ||
    (delegation.minimum === null && delegation.maximum === null) ||
    (delegation.minimum !== null && !Number.isFinite(delegation.minimum)) ||
    (delegation.maximum !== null && !Number.isFinite(delegation.maximum)) ||
    (delegation.minimum !== null &&
      delegation.maximum !== null &&
      delegation.minimum > delegation.maximum)
  )
    return [];
  const values =
    delegation.minimum !== null && delegation.maximum !== null
      ? [
          delegation.minimum,
          (delegation.minimum + delegation.maximum) / 2,
          delegation.maximum,
        ]
      : [delegation.minimum ?? delegation.maximum!];
  return [...new Set(values)].filter(
    (value) =>
      (delegation.minimum === null || value >= delegation.minimum) &&
      (delegation.maximum === null || value <= delegation.maximum),
  );
}

/** Open only terms with an in-range draft choice, on Session 23's inbox. */
export function openDelegatedRegulationDrafts(
  world: World,
  officeKey: string,
  agencyHeadFor: (candidate: DelegatedRegulationCandidate) => EntityId | null,
  candidates: readonly DelegatedRegulationCandidate[] = delegatedRegulationCandidates(
    world,
    officeKey,
  ),
): World {
  const drafts: DelegatedRuleDraftMatterInput[] = candidates.flatMap(
    (candidate) => {
      if (boundedRegulationDraftValues(candidate.delegation).length === 0)
        return [];
      const agencyHeadPersonId = agencyHeadFor(candidate);
      return agencyHeadPersonId && world.people[agencyHeadPersonId]
        ? [{ ...candidate, agencyHeadPersonId }]
        : [];
    },
  );
  return openDelegatedRuleDraftMatters(world, officeKey, drafts);
}

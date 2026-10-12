import type {
  EntityId,
  IsoDate,
  PolicyCatalog,
  PrincipleRecord,
} from "../../simulation/types";
export interface PrincipledLeaningFacts {
  readonly onDate: IsoDate;
  readonly policyCatalog: PolicyCatalog;
  readonly principles: readonly PrincipleRecord[];
}
export function principledLeaning(
  facts: PrincipledLeaningFacts,
  personId: EntityId,
  propositionId: EntityId,
): {
  readonly score: number;
  readonly recordIds: readonly EntityId[];
} {
  const proposition = facts.policyCatalog.propositions[propositionId];
  if (!proposition?.principles) return { score: 0, recordIds: [] };
  const latest = new Map<EntityId, PrincipleRecord>();
  for (const record of facts.principles.filter(
    (record) => record.personId === personId,
  )) {
    if (record.formedAt > facts.onDate) continue;
    const prior = latest.get(record.principleId);
    if (!prior || prior.sequence < record.sequence)
      latest.set(record.principleId, record);
  }
  let score = 0;
  const recordIds: EntityId[] = [];
  for (const bearing of proposition.principles) {
    const held = latest.get(bearing.principleId);
    if (!held || held.stance === "conflicted") continue;
    const weight = bearing.weight ?? 1;
    if (weight === 0) continue;
    const agrees =
      (held.stance === "endorses") === (bearing.bearing === "consistent-with");
    score += (agrees ? 1 : -1) * held.strength * 4 * weight;
    recordIds.push(held.id);
  }
  return { score, recordIds };
}

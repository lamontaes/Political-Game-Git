import type {
  EntityId,
  IsoDate,
  PrincipleRecord,
  PolicyPropositionDefinition,
} from "../../simulation/types";
export interface PrincipleAgreementFacts {
  readonly onDate: IsoDate;
  readonly principles: readonly PrincipleRecord[];
  readonly propositionBearings: PolicyPropositionDefinition["principles"];
}
const VOTE_IMPORTANCE = { moderate: 3, strong: 6, decisive: 9 } as const;

export function principleAgreement(
  facts: PrincipleAgreementFacts,
  viewerId: EntityId,
  subjectId: EntityId,
  propositionId?: EntityId,
): {
  readonly score: number;
  readonly importance: "slight" | "moderate" | "strong" | "decisive" | null;
  readonly recordIds: readonly EntityId[];
} {
  const latest = (personId: EntityId) => {
    const map = new Map<EntityId, PrincipleRecord>();
    for (const record of facts.principles.filter(
      (record) => record.personId === personId,
    )) {
      if (record.formedAt > facts.onDate) continue;
      const prior = map.get(record.principleId);
      if (!prior || prior.sequence < record.sequence)
        map.set(record.principleId, record);
    }
    return map;
  };
  const own = latest(viewerId);
  const theirs = latest(subjectId);
  const bearings =
    propositionId === undefined
      ? [...own.keys()].map((principleId) => ({ principleId, weight: 1 }))
      : (facts.propositionBearings ?? []);
  let score = 0;
  const recordIds = new Set<EntityId>();
  for (const bearing of bearings) {
    const mine = own.get(bearing.principleId);
    const other = theirs.get(bearing.principleId);
    const weight = bearing.weight ?? 1;
    if (
      !mine ||
      !other ||
      weight === 0 ||
      mine.stance === "conflicted" ||
      other.stance === "conflicted"
    )
      continue;
    score +=
      (mine.stance === other.stance ? 1 : -1) * mine.strength * weight * 4;
    recordIds.add(mine.id);
  }
  const size = Math.abs(score);
  return {
    score,
    importance:
      size === 0
        ? null
        : size >= VOTE_IMPORTANCE.decisive
          ? "decisive"
          : size >= VOTE_IMPORTANCE.strong
            ? "strong"
            : size >= VOTE_IMPORTANCE.moderate
              ? "moderate"
              : "slight",
    recordIds: [...recordIds],
  };
}

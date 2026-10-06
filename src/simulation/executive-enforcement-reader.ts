import { lawInForce } from "./governing/law-in-force";
import type { EntityId, IsoDate, World } from "./types";

export type EnforcementPriority = "first" | "ordinary" | "lowest";

/** Read only the latest in-force directive for the statute that still governs. */
export function executiveEnforcementPriorityForLaw(
  world: World,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  statuteMeasureId: EntityId,
  onDate: IsoDate = world.currentDate,
): EnforcementPriority | null {
  const currentLaw = lawInForce(world, jurisdictionId, propositionId, onDate);
  if (!currentLaw || currentLaw.measureId !== statuteMeasureId) return null;
  const directives = (world.history.legislativeMeasures ?? [])
    .flatMap((measure) => {
      if (measure.governmentInstrument !== "executive-order") return [];
      const priority = measure.executiveAuthorityChecks?.find(
        (check) =>
          check.clause.kind === "enforcement-priority" &&
          check.clause.propositionId === propositionId &&
          check.clause.statuteMeasureId === statuteMeasureId,
      )?.clause;
      if (!priority || priority.kind !== "enforcement-priority") return [];
      const enactment = (world.history.legislativeEnactments ?? []).find(
        (record) =>
          record.measureId === measure.id &&
          record.outcome === "enacted" &&
          record.resolvedAt <= onDate &&
          (!record.publishedAt || record.publishedAt <= onDate) &&
          (!record.effectiveAt || record.effectiveAt <= onDate) &&
          (!record.expiresAt || record.expiresAt >= onDate),
      );
      return enactment
        ? [{ priority: priority.priority, sequence: enactment.sequence }]
        : [];
    })
    .sort((left, right) => right.sequence - left.sequence);
  return directives[0]?.priority ?? null;
}

import type { EntityId, LegislativeMeasureRecord, World } from "./types";

/** Orders still in force for a new chief executive to review at transition. */
export function inheritedExecutiveOrders(
  world: World,
  jurisdictionId: EntityId,
  incomingHolderId: EntityId,
): readonly LegislativeMeasureRecord[] {
  const measures = world.history.legislativeMeasures ?? [];
  const enactments = world.history.legislativeEnactments ?? [];
  const revoked = new Set(
    measures.flatMap((measure) => {
      const enactment = enactments.find((row) => row.measureId === measure.id);
      if (
        measure.governmentInstrument !== "executive-order" ||
        measure.jurisdictionId !== jurisdictionId ||
        enactment?.outcome !== "enacted" ||
        enactment.effectiveAt === null ||
        enactment.effectiveAt > world.currentDate ||
        (enactment.expiresAt != null && enactment.expiresAt < world.currentDate)
      )
        return [];
      return (measure.executiveAuthorityChecks ?? []).flatMap(({ clause }) =>
        clause.kind === "revoke-executive-order"
          ? [clause.targetMeasureId]
          : [],
      );
    }),
  );
  return measures.filter((measure) => {
    if (
      measure.governmentInstrument !== "executive-order" ||
      measure.jurisdictionId !== jurisdictionId ||
      measure.sponsorPersonId === incomingHolderId ||
      revoked.has(measure.id)
    )
      return false;
    const enactment = enactments.find((row) => row.measureId === measure.id);
    return Boolean(
      enactment?.outcome === "enacted" &&
      enactment.effectiveAt !== null &&
      enactment.effectiveAt <= world.currentDate &&
      (enactment.expiresAt == null || enactment.expiresAt >= world.currentDate),
    );
  });
}

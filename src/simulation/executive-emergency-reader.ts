import { crisisRecords } from "./crisis/records";
import type { EmergencyDeclarationRecord } from "./crisis/types";
import type { EntityId, IsoDate, World } from "./types";

export function activeExecutiveEmergency(
  world: World,
  jurisdictionId: EntityId,
  asOf: IsoDate = world.currentDate,
): EmergencyDeclarationRecord | null {
  const declarations = crisisRecords(world).filter(
    (row): row is EmergencyDeclarationRecord =>
      row.kind === "executive-emergency-declaration" &&
      row.jurisdictionId === jurisdictionId &&
      row.effectiveAt <= asOf,
  );
  const latest = new Map<EntityId, EmergencyDeclarationRecord>();
  for (const row of declarations) {
    const prior = latest.get(row.declarationId);
    if (!prior || row.sequence > prior.sequence)
      latest.set(row.declarationId, row);
  }
  return (
    [...latest.values()]
      .filter(
        (row) =>
          row.operation !== "terminated" &&
          row.activeUntil !== null &&
          row.activeUntil >= asOf,
      )
      .sort((left, right) => right.sequence - left.sequence)[0] ?? null
  );
}

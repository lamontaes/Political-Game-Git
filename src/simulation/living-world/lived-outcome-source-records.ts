import { coverageLossRecordsFor } from "../crisis/health-coverage";
import type { EntityId, IsoDate, World } from "../types";
import { rentRaiseRecordsFor } from "./town-rent";

/** Source-only preparation: no felt size, answering office or opinion. */
export interface LivedOutcomeSourceRecord {
  readonly kind: "coverage-lost" | "rent-raised";
  readonly at: IsoDate;
  readonly sourceRecordId: EntityId;
}

/**
 * Thin adapters over the producer-owned readers. These facts can feed the
 * existing LIVED_OUTCOME_READERS once the missing magnitude and responsibility
 * contracts are admitted. Until then they do not schedule or form views.
 */
export function livedOutcomeSourceRecordsOf(
  world: World,
  personId: EntityId,
  through: IsoDate = world.currentDate,
): readonly LivedOutcomeSourceRecord[] {
  const outcomes: LivedOutcomeSourceRecord[] = [];
  for (const row of coverageLossRecordsFor(world, personId, through))
    outcomes.push({
      kind: "coverage-lost",
      at: row.effectiveAt,
      sourceRecordId: row.id,
    });
  for (const { renewal } of rentRaiseRecordsFor(world, personId, through))
    outcomes.push({
      kind: "rent-raised",
      at: renewal.effectiveAt,
      sourceRecordId: renewal.id,
    });
  return outcomes.sort(
    (a, b) =>
      a.at.localeCompare(b.at) ||
      a.sourceRecordId.localeCompare(b.sourceRecordId),
  );
}

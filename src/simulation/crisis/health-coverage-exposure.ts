import { recordLawExposure } from "../law-exposure";
import type { World } from "../types";
import type { HealthCoverageRecord } from "./types";

/**
 * A change of Medicaid coverage reaches the person (and their partner) as the
 * law that granted or took it. A gain or a loss, with no dollar amount: the
 * record shows enrollment, not what the coverage was worth to them. Only a
 * record stamped with its governing law is exposed, and the stable key keeps a
 * replay from writing it twice.
 */
export function exposeCoverageChanges(
  world: World,
  records: readonly HealthCoverageRecord[],
): World {
  let next = world;
  for (const record of records) {
    const stamp = record.lawEffectStamps?.[0];
    if (!stamp) continue;
    next = recordLawExposure(next, {
      stableKey: `${record.stableKey}:exposure`,
      personId: record.personId,
      measureId: stamp.governingLawKey,
      sectionKey: stamp.questionKey,
      channel: "benefit",
      direction: record.covered ? "gain" : "cost",
      amount: null,
      cadence: null,
      sourceRecordId: record.id,
    });
  }
  return next;
}

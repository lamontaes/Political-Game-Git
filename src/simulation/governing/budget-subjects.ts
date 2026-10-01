import {
  draftLineageComponents,
  draftLineageForMeasure,
} from "../legislation-draft-lineage";
import type {
  EntityId,
  PublicProgramAppropriationRecord,
  World,
} from "../types";
import { PROGRAM_FAMILIES } from "./program-families";

/**
 * Budget subjects come from recorded spending authority, not budget categories.
 * A bundled appropriation's saved edition identifies the component whose
 * clause program-governing adopted; the other parts are not spending lines.
 */
export function recordedBudgetProgramFamilies(
  world: World,
  jurisdictionId: EntityId,
  priority: string | null,
): readonly string[] {
  const knownFamilies = new Set(PROGRAM_FAMILIES.map((row) => row.familyKey));
  const families = new Set<string>();
  const appropriations = (world.history.publicProgramRecords ?? [])
    .filter(
      (record): record is PublicProgramAppropriationRecord =>
        record.kind === "appropriation" &&
        record.jurisdictionId === jurisdictionId &&
        record.recordedAt <= world.currentDate &&
        record.publicGovernmentIdentity?.kind !== "local-government",
    )
    .slice()
    .sort((left, right) => left.sequence - right.sequence);
  for (const appropriation of appropriations) {
    if (!appropriation.sourceMeasureId) continue;
    const measure = world.history.legislativeMeasures?.find(
      (row) => row.id === appropriation.sourceMeasureId,
    );
    if (!measure || measure.jurisdictionId !== jurisdictionId) continue;
    const single = draftLineageForMeasure(world, measure.id);
    const editionBase = `measure-${measure.designation.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
    const matches = single
      ? [single]
      : draftLineageComponents(world, measure.id).filter(
          (lineage) =>
            lineage.componentKey !== undefined &&
            appropriation.stableKey.endsWith(
              `:appropriation:${editionBase}-${lineage.componentKey}`,
            ),
        );
    if (matches.length !== 1) continue;
    const family = matches[0]!.familyKey;
    if (knownFamilies.has(family)) families.add(family);
  }
  const recorded = [...families];
  return priority && families.has(priority)
    ? [priority, ...recorded.filter((family) => family !== priority)]
    : recorded;
}

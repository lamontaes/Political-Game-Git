import { dateAtAge } from "../dates";
import type { Dwelling, IsoDate, World } from "../types";

/** Opening stock predates the law; in-play construction uses its saved date. */
export function rentConstructionCovered(
  world: World,
  dwelling: Dwelling,
  onDate: IsoDate,
  sourcedWindowYears: number | null,
): boolean {
  const openingDate =
    world.history.worldConditions?.find(
      (record) => record.kind === "world-opening",
    )?.effectiveDate ?? world.macroEconomy?.start.effectiveDate;
  const generator =
    dwelling.provenance.kind === "generated"
      ? dwelling.provenance.generatorKey
      : null;
  const openingStock =
    (generator !== null &&
      dwelling.stableKey.startsWith(
        `${generator}:${dwelling.jurisdictionId}:opening:`,
      )) ||
    (openingDate !== undefined &&
      (dwelling.establishedAt < openingDate ||
        (dwelling.establishedAt === openingDate && generator !== null)));
  if (openingStock) return true;
  // No rolling window is admitted for a fixed-cutoff jurisdiction such as D.C.
  return (
    sourcedWindowYears !== null &&
    onDate > dateAtAge(dwelling.establishedAt, sourcedWindowYears)
  );
}

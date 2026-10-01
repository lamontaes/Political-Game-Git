import type { DwellingClassification, IsoDate } from "../types";
import type { SeededRng } from "../rng";
import {
  PLACE_HOUSING_STRUCTURE_BANDS,
  PLACE_HOUSING_STRUCTURE_ROWS,
} from "./place-housing-structure.generated";

type Cells = readonly (number | null)[];
type SourceRow = readonly [string, Cells | null, Cells | null];
let rows: Map<string, SourceRow> | undefined;

export function placeHousingStructureRow(geoid: string): SourceRow | null {
  rows ??= new Map(
    (JSON.parse(PLACE_HOUSING_STRUCTURE_ROWS) as SourceRow[]).map((row) => [
      row[0],
      row,
    ]),
  );
  return rows.get(geoid) ?? null;
}

function chooseBand(
  cells: Cells | null,
  indexes: readonly number[],
  percentile: number,
) {
  if (!cells || indexes.some((index) => cells[2 + index * 2] == null))
    return null;
  const total = indexes.reduce((sum, index) => sum + cells[2 + index * 2]!, 0);
  if (total <= 0) return null;
  let remaining = percentile * total;
  for (const index of indexes) {
    remaining -= cells[2 + index * 2]!;
    if (remaining < 0) return index;
  }
  return null;
}

/** Opening stock estimates, not a construction event or a person's decision.
 * The marginal tables do not imply a joint age-by-structure distribution.
 * Structure selection is conditioned only on the already recorded home class.
 * Unbounded/suppressed categories never become invented exact ages/counts.
 */
export function openingDwellingStructure(
  geoid: string,
  classification: DwellingClassification,
  rng: SeededRng,
  recordedAt: IsoDate,
) {
  // The 2024 survey is not a historical-stock model for earlier game years.
  const row =
    Number(recordedAt.slice(0, 4)) >= 2024
      ? placeHousingStructureRow(geoid)
      : null;
  const yearIndex = chooseBand(
    row?.[1] ?? null,
    PLACE_HOUSING_STRUCTURE_BANDS.B25034.map((_, index) => index),
    rng.fork("built-year-band").next(),
  );
  const yearBand =
    yearIndex == null ? null : PLACE_HOUSING_STRUCTURE_BANDS.B25034[yearIndex]!;
  const builtYear =
    yearBand?.lower != null && yearBand.upper != null
      ? rng
          .fork("built-year-in-band")
          .integer(yearBand.lower, yearBand.upper + 1)
      : null;
  const structureIndexes =
    classification === "residential:apartment"
      ? [2, 3, 4, 5, 6, 7]
      : classification === "residential:rowhouse"
        ? [1]
        : classification === "residential:mobile-home"
          ? [8]
          : [0];
  const unitIndex = chooseBand(
    row?.[2] ?? null,
    structureIndexes,
    rng.fork("structure-band").next(),
  );
  const unitBand =
    unitIndex == null ? null : PLACE_HOUSING_STRUCTURE_BANDS.B25024[unitIndex]!;
  const unitsInBuilding =
    unitBand?.lower != null && unitBand.upper != null
      ? rng.fork("units-in-band").integer(unitBand.lower, unitBand.upper + 1)
      : null;
  return {
    builtYear,
    unitsInBuilding,
    sourceReference: `ACS2024-5year:place:${geoid}:B25034:${yearBand?.variableId ?? "unavailable"}:B25024:${unitBand?.variableId ?? "unavailable"}:estimated-from-place-marginals`,
  };
}

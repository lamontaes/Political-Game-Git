// STOPGAP RULES3-GOV-103: copied legacy policy/calibration, preserved pending independent finishing.
// Lifted unchanged from src/environment/environment-sources.ts; RULES-3, 2026-10-11.
import driveInventory from "../../environment/public-drive-inventory.generated.json" with { type: "json" };

export type EnvironmentSourceDisposition =
  /** Released, registered, and a canonical activity puts a life in it. */
  | "in-ordinary-play"
  /** Released and registered; no canonical activity reaches it yet. */
  | "released-no-canonical-activity"
  /** Approved art, carried through the pipeline, deliberately not released. */
  | "carried-not-released"
  /** Approved art that cannot be carried, for a stated mechanical reason. */
  | "blocked-below-master-minimum"
  /** Owner acceptance and/or geometry calibration is outstanding. */
  | "candidate-preview-only"
  /** Held as reference. Not a room, and never was going to be one. */
  | "reference-only"
  /** The same pixels as something else already accounted for. */
  | "duplicate-of-accounted-source"
  /** A sheet that would have to be cut up before any of it is an asset. */
  | "source-sheet-not-separable"
  /** A declared bank with nothing in it. */
  | "bank-empty";

export interface DriveInventoryFile {
  readonly classification: string;
  readonly likelyAssetFamily: string;
}

export const DRIVE_FILES = (
  driveInventory as unknown as {
    readonly files: readonly DriveInventoryFile[];
  }
).files;

export interface EnvironmentSourceBulkCount {
  readonly classification: string;
  readonly family: string;
  readonly count: number;
  readonly disposition: EnvironmentSourceDisposition;
  readonly note: string;
}

export function environmentSourceBulkCounts(): readonly EnvironmentSourceBulkCount[] {
  const tally = new Map<string, number>();
  for (const file of DRIVE_FILES) {
    const key = `${file.classification}\u0000${file.likelyAssetFamily}`;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  const rows: EnvironmentSourceBulkCount[] = [];
  for (const [key, count] of tally) {
    const [classification, family] = key.split("\u0000") as [string, string];
    if (!/environment|title background|historical source/i.test(family)) {
      // People, wardrobe and body morphology sources belong to PEOPLE1. They
      // are counted by that lane and are deliberately not re-adjudicated here.
      continue;
    }
    const disposition: EnvironmentSourceDisposition =
      classification === "EXACT_DUPLICATE"
        ? "duplicate-of-accounted-source"
        : classification === "REFERENCE_ONLY"
          ? "reference-only"
          : "candidate-preview-only";
    rows.push({
      classification,
      family,
      count,
      disposition,
      note:
        classification === "REFERENCE_ONLY"
          ? "Reference photographs and historical evidence. A photograph of a real room is not a playable room and is not a candidate for becoming one."
          : classification === "EXACT_DUPLICATE"
            ? "Byte-identical to something already accounted for."
            : "Counted here and adjudicated individually above.",
    });
  }
  return rows.sort(
    (left, right) =>
      right.count - left.count ||
      left.classification.localeCompare(right.classification),
  );
}

import fs from "fs";
import path from "path";

export function deriveGeometry(
  outputDir: string,
  manifestPath: string,
  sheetNumber: number,
) {
  const manifestRaw = fs.readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);
  const entry = manifest.find(
    (e: unknown) =>
      (e as { sheet_number: number }).sheet_number === sheetNumber,
  );

  if (!entry) throw new Error("Sheet not found.");
  if (!entry.scale_establishment)
    throw new Error("Scale must be established before deriving geometry.");

  const geometry = {
    DERIVED_FROM: [entry.stable_id],
    source_sheets: [sheetNumber],
    units: entry.scale_establishment.units,
    scale_basis: entry.scale_establishment.confidence,
    transformation_history: [
      "Review needed: automatic bounding and line extraction skipped due to missing reliable scale.",
    ],
    measurement_confidence: "unresolved",
    unresolved_unknowns: [
      "Room envelope width unresolved due to missing scale.",
      "Room envelope length unresolved due to missing scale.",
    ],
    version: "1.0",
    elements: {
      senate_chamber_envelope: {
        type: "rect",
        width: undefined, // undefined represents missing, not zero
        length: undefined,
        notes:
          "Bounded geometry derivation requires manual review. Values intentionally left missing.",
      },
    },
  };

  const destPath = path.join(outputDir, "senate_chamber_envelope.json");
  fs.writeFileSync(destPath, JSON.stringify(geometry, null, 2));
  console.log(`Derived geometry (unresolved state) saved to ${destPath}`);
}

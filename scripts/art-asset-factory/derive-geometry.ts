import fs from "fs";
import path from "path";

export function deriveGeometry(
  outputDir: string,
  manifestPath: string,
  sheetNumber: number,
) {
  const manifestRaw = fs.readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);
  const entry = manifest.find((e: unknown) => e.sheet_number === sheetNumber);

  if (!entry) throw new Error("Sheet not found.");
  if (!entry.scale_establishment)
    throw new Error("Scale must be established before deriving geometry.");

  const geometry = {
    DERIVED_FROM: [entry.stable_id],
    source_sheets: [sheetNumber],
    units: entry.scale_establishment.units,
    scale_basis: entry.scale_establishment.confidence,
    transformation_history: [
      "Manual bounding box extraction based on written dimensions, no automatic line extraction used.",
    ],
    measurement_confidence: "plan-derived",
    unresolved_unknowns: [
      "Internal gallery column exact placement unresolved due to scan legibility.",
    ],
    version: "1.0",
    elements: {
      senate_chamber_envelope: {
        type: "rect",
        width: 900,
        length: 960,
        notes:
          "Bounded subset representing the primary room envelope derived from written dimension evidence.",
      },
    },
  };

  const destPath = path.join(outputDir, "senate_chamber_envelope.json");
  fs.writeFileSync(destPath, JSON.stringify(geometry, null, 2));
  console.log(`Derived geometry saved to ${destPath}`);
}

import fs from "fs";

export function deriveGeometry(
  manifestPath: string,
  sheetNumber: number,
  outputJson: string,
) {
  const manifestRaw = fs.readFileSync(manifestPath, "utf8");
  const manifest: unknown[] = JSON.parse(manifestRaw);
  const entry = manifest.find((e) => e.sheet_number === sheetNumber);
  if (!entry) throw new Error(`Sheet ${sheetNumber} not found.`);

  // Because the drawing lacks clear bounding dimensions and the printed scale
  // is hard to verify automatically, we intentionally leave the dimensions UNRESOLVED.
  // We do not fabricate geometry or emit undefined values that get swallowed by JSON.

  const geometryProof = {
    room: "Senate Chamber",
    geometry_status: "UNRESOLVED",
    width_ft: "UNRESOLVED",
    length_ft: "UNRESOLVED",
    derived_from: [entry.stable_id],
    confidence: "unresolved",
    notes:
      "Geometry is strictly bounded to explicitly avoid fabricating dimensions without a firm printed/written scale and dimensional corroboration.",
    version: "1.0.0",
  };

  fs.writeFileSync(outputJson, JSON.stringify(geometryProof, null, 2));
  console.log(`Derived geometry (unresolved) saved to ${outputJson}`);
}

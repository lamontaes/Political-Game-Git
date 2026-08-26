import fs from "fs";

export function establishScale(
  manifestPath: string,
  sheetNumber: number,
  outputJson: string,
) {
  const manifestRaw = fs.readFileSync(manifestPath, "utf8");
  const manifest: unknown[] = JSON.parse(manifestRaw);
  const entry = manifest.find((e) => e.sheet_number === sheetNumber);
  if (!entry) throw new Error(`Sheet ${sheetNumber} not found.`);

  // Without visual extraction of the printed scale and dual corroboration,
  // we do not fabricate a scale factor for raster pixels.

  const scaleProof = {
    derived_from: [entry.stable_id],
    scale_status: "UNRESOLVED",
    printed_scale: "UNRESOLVED",
    pixels_per_foot: "UNRESOLVED",
    confidence: "unresolved",
    notes:
      "Cannot responsibly establish scale from purely raster pixels without a corroborated printed scale.",
  };

  fs.writeFileSync(outputJson, JSON.stringify(scaleProof, null, 2));
  console.log(`Established scale (unresolved) saved to ${outputJson}`);
}

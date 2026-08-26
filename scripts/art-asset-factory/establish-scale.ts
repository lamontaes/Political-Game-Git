import fs from "fs";

export function establishScale(manifestPath: string, sheetNumber: number) {
  const manifestRaw = fs.readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);
  const entry = manifest.find(
    (e: unknown) =>
      (e as { sheet_number: number }).sheet_number === sheetNumber,
  );
  if (!entry) throw new Error(`Sheet ${sheetNumber} not found.`);

  // Removing previous fabricated precision dimensions.
  // Sheet 13 has a visual scale but without manual resolution it is unresolved for automatic precision.

  entry.scale_establishment = {
    printed_scale_legible: false,
    written_dimension_evidence: [],
    units: "unknown",
    confidence: "unresolved",
    unresolved_ambiguity:
      "Scale could not be reliably extracted from image pixels. Raster pixel lengths alone must not become precise architectural dimensions.",
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Established scale as unresolved for Sheet ${sheetNumber}`);
}

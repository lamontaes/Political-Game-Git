import fs from "fs";
import path from "path";

export function runResidualChecks(
  geometryPath: string,
  manifestPath: string,
  outputDir: string,
) {
  const geomRaw = fs.readFileSync(geometryPath, "utf8");
  const geometry = JSON.parse(geomRaw);

  const manifestRaw = fs.readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);

  // Find the scale establishment for the source
  const sourceSheetStr = geometry.source_sheets[0];
  const entry = manifest.find(
    (e: unknown) =>
      (e as { sheet_number: number }).sheet_number === sourceSheetStr,
  );
  if (!entry) throw new Error("Source sheet not found in manifest");

  const checks = [];

  // Since scale is unresolved, we do not invent fake residuals

  checks.push({
    property: "Senate Chamber Width",
    expected_value: undefined,
    derived_value: geometry.elements.senate_chamber_envelope.width,
    absolute_difference: undefined,
    relative_error: undefined,
    tolerance_threshold: undefined,
    status: "review-needed",
  });

  checks.push({
    property: "Senate Chamber Length",
    expected_value: undefined,
    derived_value: geometry.elements.senate_chamber_envelope.length,
    absolute_difference: undefined,
    relative_error: undefined,
    tolerance_threshold: undefined,
    status: "review-needed",
  });

  const destPath = path.join(outputDir, "residual_checks.json");
  fs.writeFileSync(destPath, JSON.stringify(checks, null, 2));
  console.log(`Residual checks saved to ${destPath}`);
}

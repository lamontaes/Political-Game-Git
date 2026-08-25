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
    (e: unknown) => e.sheet_number === sourceSheetStr,
  );
  if (!entry) throw new Error("Source sheet not found in manifest");

  const checks = [];

  // Check width
  const expectedWidth =
    entry.scale_establishment.written_dimension_evidence.find(
      (ev: unknown) => ev.source_label === "Senate Chamber Width",
    ).parsed_inches;
  const derivedWidth = geometry.elements.senate_chamber_envelope.width;
  const widthDiff = Math.abs(expectedWidth - derivedWidth);
  const widthRel = widthDiff / expectedWidth;
  const widthTolerance = 0.01; // 1% tolerance for manual derivation vs written

  checks.push({
    property: "Senate Chamber Width",
    expected_value: expectedWidth,
    derived_value: derivedWidth,
    absolute_difference: widthDiff,
    relative_error: widthRel,
    tolerance_threshold: widthTolerance,
    status: widthRel <= widthTolerance ? "pass" : "fail",
  });

  // Check length
  const expectedLength =
    entry.scale_establishment.written_dimension_evidence.find(
      (ev: unknown) => ev.source_label === "Senate Chamber Length",
    ).parsed_inches;
  const derivedLength = geometry.elements.senate_chamber_envelope.length;
  const lengthDiff = Math.abs(expectedLength - derivedLength);
  const lengthRel = lengthDiff / expectedLength;
  const lengthTolerance = 0.01;

  checks.push({
    property: "Senate Chamber Length",
    expected_value: expectedLength,
    derived_value: derivedLength,
    absolute_difference: lengthDiff,
    relative_error: lengthRel,
    tolerance_threshold: lengthTolerance,
    status: lengthRel <= lengthTolerance ? "pass" : "fail",
  });

  const destPath = path.join(outputDir, "residual_checks.json");
  fs.writeFileSync(destPath, JSON.stringify(checks, null, 2));
  console.log(`Residual checks saved to ${destPath}`);
}

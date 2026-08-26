import fs from "fs";

export function checkResiduals(
  geometryPath: string,
  scalePath: string,
  outputJson: string,
) {
  const geomRaw = fs.readFileSync(geometryPath, "utf8");
  const scaleRaw = fs.readFileSync(scalePath, "utf8");
  const geom = JSON.parse(geomRaw);
  const scale = JSON.parse(scaleRaw);

  const residuals = {
    derived_from: geom.derived_from || [],
    check_status: "review-needed",
    checks: [] as unknown[],
    notes:
      "Residual checks cannot run because scale and geometry are structurally UNRESOLVED.",
  };

  if (
    geom.geometry_status === "UNRESOLVED" ||
    scale.scale_status === "UNRESOLVED"
  ) {
    residuals.checks.push({
      type: "scale_vs_geometry",
      status: "BLOCKED",
      reason: "Geometry or Scale is explicitly marked UNRESOLVED.",
    });
  }

  fs.writeFileSync(outputJson, JSON.stringify(residuals, null, 2));
  console.log(`Residual checks saved to ${outputJson}`);
}

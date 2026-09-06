/** Strict JSON shape boundary: no silent extra fields, missing keys or metadata bags. */
export function objectShape(
  value: unknown,
  fields: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected reference object");
  const expected = fields.split(" ");
  const actual = Object.keys(value);
  if (
    actual.length !== expected.length ||
    actual.some((k) => !expected.includes(k))
  )
    throw new Error(`Invalid reference fields: expected ${fields}`);
}
function strings(value: unknown): void {
  if (
    !Array.isArray(value) ||
    value.some((x) => typeof x !== "string" || !x.trim())
  )
    throw new Error("Expected nonempty reference strings");
}
function nullableString(value: unknown): void {
  if (value !== null && (typeof value !== "string" || !value.trim()))
    throw new Error("Expected nonempty reference string or null");
}
export function assertCatalogShape(value: unknown): void {
  objectShape(
    value,
    "version coverage sources claims campuses buildings rooms geometry venues eras scenes",
  );
  objectShape(value.coverage, "kind note unencodedResearch");
  strings(value.coverage.unencodedResearch);
  const shapes: Record<string, string> = {
    sources: "id title url sourceDate kind acquisition rights",
    claims:
      "id sourceId locator statement sourceDate confidence verification citedSourceIds conflictingSourceIds discrepancy resolutionNote supersededBy controls renderBlocking",
    campuses: "id name jurisdictionId governmentId claimIds",
    buildings:
      "id name campusId jurisdictionId governmentId address ownerOperator assetFamily baseGeometryFamily uniquenessClass fixedInstitutionalFeatures visualAntiAssumptions referencePack extractedAssetStatus claimIds",
    rooms:
      "id buildingId verifiedName verifiedNumber roomFunctionFamily fixedInstitutionalFeatures visualAntiAssumptions claimIds",
    geometry: "id subjectId dimension value primaryEvidence appliesTo claimIds",
    venues: "id buildingId roomId walkingTransitionGroup claimIds",
    eras: "id venueId effective observedDuring currentEraStatus state availability publicAccessState securityState note claimIds",
    scenes:
      "id venueId jurisdictionId governmentId institutionId branch officeRole sceneType use meetingId effective observedDuring assignment claimIds",
  };
  const nullable = [
    "sourceDate",
    "resolutionNote",
    "supersededBy",
    "campusId",
    "address",
    "ownerOperator",
    "verifiedNumber",
    "roomId",
    "walkingTransitionGroup",
    "meetingId",
  ];
  const arrays = [
    "claimIds",
    "conflictingSourceIds",
    "citedSourceIds",
    "fixedInstitutionalFeatures",
    "visualAntiAssumptions",
  ];
  for (const [group, fields] of Object.entries(shapes)) {
    const records = value[group];
    if (!Array.isArray(records))
      throw new Error(`Expected reference array ${group}`);
    for (const record of records) {
      objectShape(record, fields);
      for (const [key, v] of Object.entries(record)) {
        if (nullable.includes(key)) nullableString(v);
        else if (arrays.includes(key)) strings(v);
        else if (key === "effective" || key === "observedDuring") {
          objectShape(v, "start end");
          nullableString(v.start);
          nullableString(v.end);
        } else if (key === "renderBlocking") {
          if (typeof v !== "boolean")
            throw new Error("Expected renderBlocking boolean");
        } else if (key === "value") {
          if (!v || typeof v !== "object" || !("state" in v))
            throw new Error("Expected geometry value");
          if (v.state === "unknown") objectShape(v, "state reason");
          else {
            objectShape(v, "state magnitude unit confidence");
            const m = (v as Record<string, unknown>).magnitude;
            if (!m || typeof m !== "object" || !("kind" in m))
              throw new Error("Expected geometry magnitude");
            objectShape(m, m.kind === "scalar" ? "kind value" : "kind min max");
          }
        } else if (typeof v !== "string" || !v.trim())
          throw new Error(`Expected reference text ${key}`);
      }
    }
  }
}

import type { FemaDeclarationRecord } from "./types";

/** Read-only administrative context over the accepted corpus. Geographic keys
 * remain provider FIPS; a caller must supply a verified World crosswalk before
 * using a row for a World jurisdiction. No fallback from names or statewide
 * coverage to county/person damage is permitted. */
export function femaResponseContext(
  records: readonly FemaDeclarationRecord[],
  area: { readonly stateFips: string; readonly countyFips: string | null },
  asOf: string,
) {
  if (
    !/^\d{2}$/.test(area.stateFips) ||
    (area.countyFips !== null && !/^\d{3}$/.test(area.countyFips)) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(asOf)
  )
    throw new Error("Exact FIPS and ISO date are required.");
  return records
    .filter(
      (r) =>
        r.fipsStateCode === area.stateFips &&
        r.declarationDate.slice(0, 10) <= asOf &&
        (area.countyFips === null
          ? r.derivedDesignatedAreaType === "statewide"
          : r.derivedDesignatedAreaType === "county-or-parish" &&
            r.fipsCountyCode === area.countyFips),
    )
    .map((r) => ({
      recordId: r.recordId,
      declaration: r.femaDeclarationString,
      declarationDate: r.declarationDate,
      designatedArea: r.designatedArea,
      incidentTypeReportedByAgency: r.incidentType,
      incidentPeriod: {
        beginsAt: r.incidentBeginDate,
        endsAt: r.incidentEndDate,
      },
      programsDeclared: {
        individualHouseholds: r.ihProgramDeclared,
        legacyIndividualAssistance: r.iaProgramDeclared,
        publicAssistance: r.paProgramDeclared,
        hazardMitigation: r.hmProgramDeclared,
      },
      evidence: r.evidence,
      boundary:
        "Administrative source context only. No save-world occurrence, delivery, individual eligibility, personal damage or event frequency is established.",
    }));
}

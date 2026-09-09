/** Publisher-native identity seam for the actual 2025 workbook.
 * PID6 is not the legacy 14-digit GID. County area is not a governing parent;
 * a dormant N row remains in the publisher's inventory. No name matching.
 */
import { readXlsxSheet } from "../../core/archive/xlsx";
import { readZipMember } from "../../core/archive/zip";
import type { ProductionInput } from "../../core/index";
import type { GovernmentUnitsArtifacts } from "./index";
import { GOVERNMENT_UNITS_LISTING_MEMBER } from "./acquisition";

export interface PublishedGeneralPurposeUnit {
  readonly publisherId: string;
  readonly unitName: string;
  readonly unitType: string;
  readonly state: string;
  readonly functionalActive: boolean;
  readonly webAddress: string | null;
  readonly stateFips: string;
  readonly countyAreaFips: string | null;
  readonly placeFips: string | null;
  readonly countyAreaName: string | null;
  readonly evidence: {
    readonly artifactId: string;
    readonly sheet: "General Purpose";
    readonly row: number;
    readonly asOf: "2025-06-30";
  };
}
const HEADER = [
  "CENSUS_ID_PID6",
  "UNIT_NAME",
  "UNIT_TYPE",
  "TITLE",
  "ADDRESS1",
  "ADDRESS2",
  "CITY",
  "STATE",
  "ZIP",
  "ZIP4",
  "WEB_ADDRESS",
  "POLITICAL_CODE_DESCRIPTION",
  "POPULATION",
  "POPULATION_SOURCE_YEAR",
  "FIPS_STATE",
  "FIPS_COUNTY",
  "FIPS_PLACE",
  "COUNTY_AREA_NAME",
  "ACTIVE",
];
export function readPublishedGeneralPurposeUnits(
  input: ProductionInput<GovernmentUnitsArtifacts>,
): readonly PublishedGeneralPurposeUnit[] {
  const artifact = input.artifacts.listing;
  const workbook = readZipMember(
    artifact.bytes,
    GOVERNMENT_UNITS_LISTING_MEMBER,
  );
  const sheet = readXlsxSheet(workbook, "General Purpose");
  if (JSON.stringify(sheet.rows[0]) !== JSON.stringify(HEADER))
    throw new Error("2025 GUS General Purpose header drift.");
  const seen = new Set<string>();
  return sheet.rows
    .slice(1)
    .filter((row) => row.some(Boolean))
    .map((row, index) => {
      const [pid, name, type] = row;
      if (
        !pid ||
        !/^\d{6}$/.test(pid) ||
        seen.has(pid) ||
        !name ||
        !type ||
        !/^[0123] - /.test(type) ||
        !/^[A-Z]{2}$/.test(row[7] ?? "") ||
        !/^[YN]$/.test(row[18] ?? "") ||
        !/^\d{2}$/.test(row[14] ?? "")
      )
        throw new Error(
          `Malformed or duplicate 2025 GUS identity row ${index + 2}.`,
        );
      seen.add(pid);
      const county = row[15] || null,
        place = row[16] || null;
      if (
        (county !== null && !/^\d{3}$/.test(county)) ||
        (place !== null && !/^\d{5}$/.test(place))
      )
        throw new Error(`Malformed 2025 GUS geography row ${index + 2}.`);
      return {
        publisherId: pid,
        unitName: name,
        unitType: type,
        state: row[7]!,
        functionalActive: row[18] === "Y",
        webAddress: row[10] || null,
        stateFips: row[14]!,
        countyAreaFips: county,
        placeFips: place,
        countyAreaName: row[17] || null,
        evidence: {
          artifactId: artifact.artifact.artifactId,
          sheet: "General Purpose",
          row: index + 2,
          asOf: "2025-06-30",
        },
      };
    });
}

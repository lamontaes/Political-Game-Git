import {
  historical,
  unknown,
  readXlsxSheet,
  readZipMember,
} from "../../core/index";
import type { Evidence } from "../../core/index";
import type {
  CpsMetricKey,
  CpsVotingCell,
  CpsVotingRecord,
  CpsVotingTable,
} from "./types";

export const CPS_METRICS: readonly CpsMetricKey[] = [
  "adultPopulation",
  "citizenAdultPopulation",
  "reportedRegistered",
  "registeredTotalPercent",
  "registeredTotalMoe",
  "registeredCitizenPercent",
  "registeredCitizenMoe",
  "reportedVoted",
  "votedTotalPercent",
  "votedTotalMoe",
  "votedCitizenPercent",
  "votedCitizenMoe",
];
const countKeys = new Set<CpsMetricKey>([
  "adultPopulation",
  "citizenAdultPopulation",
  "reportedRegistered",
  "reportedVoted",
]);
const raceGroups = new Set([
  "White alone",
  "White non-Hispanic alone",
  "Black alone",
  "Asian alone",
  "Hispanic (any race)",
  "White alone or in combination",
  "Black alone or in combination",
  "Asian alone or in combination",
]);
const ageGroups = new Set([
  "18 to 24 years",
  "25 to 34 years",
  "35 to 44 years",
  "45 to 64 years",
  "65 years and over",
]);

export function readCpsCell(
  literal: string,
  key: CpsMetricKey,
  evidence: Evidence,
): CpsVotingCell {
  const count = countKeys.has(key);
  const moe = key.endsWith("Moe");
  const numeric = /^\d+(?:\.\d+)?$/.test(literal) ? Number(literal) : null;
  if (
    numeric !== null &&
    (!Number.isFinite(numeric) ||
      (!count && !moe && numeric > 100) ||
      (count && !Number.isInteger(numeric)))
  )
    throw new Error(`Invalid CPS ${key}: ${literal}`);
  return {
    literal,
    value:
      numeric === null
        ? unknown(
            `Publisher cell ${JSON.stringify(literal)} is not an admitted numeric estimate.`,
            [evidence],
          )
        : historical(
            count ? numeric * 1000 : numeric,
            [evidence],
            "2024-11-01",
            "2024-11-30",
            "2025-04-30",
          ),
    unit: count ? "people" : moe ? "percentage-points" : "percent",
    denominator: count
      ? "none"
      : key.includes("Citizen")
        ? "citizen-adults"
        : "total-adults",
    confidenceLevel: moe ? 90 : null,
    publishedResolution: count ? 1000 : 0.1,
    evidence,
  };
}

/** Exact table grammar, including physical row numbering for cell citations. */
export function parseCpsTable(
  bytes: Buffer,
  table: CpsVotingTable,
  artifactId: string,
): readonly CpsVotingRecord[] {
  const sheetName = table === "4a" ? "vote04a_2024" : `vote${table}_2024`;
  const xml = readZipMember(bytes, "xl/worksheets/sheet1.xml").toString("utf8");
  const rowNumbers = [...xml.matchAll(/<row\b[^>]*\br="(\d+)"/g)].map((m) =>
    Number(m[1]),
  );
  if (rowNumbers.some((row, i) => row !== i + 1))
    throw new Error("CPS worksheet has noncontiguous physical row numbers");
  const sheet = readXlsxSheet(bytes, sheetName);
  if (
    sheet.rows.length !== rowNumbers.length ||
    !sheet.rows[1]?.[0]?.startsWith(
      `Table ${table}. Reported Voting and Registration`,
    ) ||
    sheet.rows[2]?.[0] !== "(Numbers in thousands, Population 18 and Over)"
  )
    throw new Error("Unexpected CPS table title, universe or units");
  const offset = table === "4a" ? 1 : 2;
  const expected = [
    "Total registered",
    "Percent registered (Total)",
    "Margin of error (+/-)1",
    "Percent registered (Citizen)",
    "Margin of error (+/-)1",
    "Total voted",
    "Percent voted (Total)",
    "Margin of error (+/-)1",
    "Percent voted (Citizen)",
    "Margin of error (+/-)1",
  ];
  if (
    sheet.rows[3]?.[offset] !== "Total population" ||
    sheet.rows[3]?.[offset + 1] !== "Total citizen population" ||
    expected.some(
      (h, i) =>
        sheet.rows[4]?.[offset + 2 + i]?.replace(/\s+/g, " ").trim() !== h,
    )
  )
    throw new Error("CPS count/rate/denominator headers changed");
  if (
    !sheet.rows.some(
      (r) =>
        r[0] ===
        "1 This figure added to or subtracted from the estimate provides the 90-percent confidence interval.",
    ) ||
    !sheet.rows.some(
      (r) => r[0] === "Estimates may not sum to totals due to rounding.",
    )
  )
    throw new Error("Missing CPS confidence/rounding notes");
  const records: CpsVotingRecord[] = [];
  for (let rowIndex = 5; rowIndex < sheet.rows.length; rowIndex++) {
    const row = sheet.rows[rowIndex]!;
    const geographyName = row[0] ?? "";
    if (!geographyName) break;
    if (!/^[A-Z][A-Z ]+$/.test(geographyName))
      throw new Error(`Unexpected CPS geography ${geographyName}`);
    const group = table === "4a" ? "Total" : row[1]!;
    const dimension =
      group === "Total"
        ? "total"
        : table === "4c" && ageGroups.has(group)
          ? "age"
          : table === "4b" && ["Male", "Female"].includes(group)
            ? "sex"
            : table === "4b" && raceGroups.has(group)
              ? "race-and-hispanic-origin"
              : null;
    if (!dimension) throw new Error(`Unrecognized CPS group ${group}`);
    const metrics = Object.fromEntries(
      CPS_METRICS.map((key, i) => {
        const evidence: Evidence = {
          artifactId,
          locator: {
            kind: "table-cell",
            artifactId,
            table: sheetName,
            lineCode: `${String.fromCharCode(65 + offset + i)}${rowIndex + 1}`,
            period: "2024-11",
          },
        };
        return [key, readCpsCell(row[offset + i] ?? "", key, evidence)];
      }),
    ) as Record<CpsMetricKey, CpsVotingCell>;
    records.push({
      recordId: `cps-2024:${table}:${geographyName}:${group}`,
      table,
      geographyName,
      geographyLevel:
        geographyName === "UNITED STATES" ? "nation" : "state-or-district",
      group,
      dimension,
      period: "2024-11",
      releaseDate: "2025-04-30",
      universe: "civilian-noninstitutionalized-age-18-and-over",
      collection: "self-or-proxy-reported",
      metrics,
    });
  }
  return records;
}

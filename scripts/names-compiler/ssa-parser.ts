/**
 * Social Security Administration (SSA) Baby Names Dataset Parser
 *
 * Ingests authoritative national (1880-2025), state (1910-2025), and territory (1998-2025)
 * popular names research archives with strict geographic and cohort separation.
 */

import { ZipReader } from "./zip-reader";
import { toTitleCase } from "./census-parser";
import type {
  SSAGeographicSeries,
  SSANationalRecord,
  SSAYearlyCounts,
} from "./schemas";

export interface ParsedSSANationalEntry {
  readonly key: string;
  readonly display_name: string;
  readonly record: SSANationalRecord;
}

export function parseSSANational(
  buffer: Buffer,
): Map<string, ParsedSSANationalEntry> {
  const zip = ZipReader.fromBuffer(buffer);
  const files = zip.listFiles().filter((f) => /^yob\d{4}\.txt$/i.test(f));

  if (files.length === 0) {
    throw new Error("No yobYYYY.txt files found in SSA national ZIP archive.");
  }

  // Intermediate accumulator per name
  interface Accumulator {
    displayName: string;
    totalMale: number;
    totalFemale: number;
    firstYear: number;
    lastYear: number;
    peakYear: number;
    peakCount: number;
    yearly: Map<string, { male: number; female: number }>;
  }

  const accumulators = new Map<string, Accumulator>();

  // Sort files chronologically for deterministic processing
  const sortedFiles = [...files].sort((a, b) => {
    const ya = parseInt(a.slice(3, 7), 10);
    const yb = parseInt(b.slice(3, 7), 10);
    return ya - yb;
  });

  for (const filename of sortedFiles) {
    const yearStr = filename.slice(3, 7);
    const year = parseInt(yearStr, 10);
    const text = zip.readText(filename);
    const lines = text.split(/\r?\n/);

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx].trim();
      if (!line) continue;

      const parts = line.split(",");
      if (parts.length < 3) {
        throw new Error(
          `Malformed line in ${filename} at line ${lineIdx + 1}: "${line}".`,
        );
      }

      const rawName = parts[0].trim();
      const sex = parts[1].trim().toUpperCase();
      const count = parseInt(parts[2].trim(), 10);

      if (
        !rawName ||
        (sex !== "M" && sex !== "F") ||
        isNaN(count) ||
        count <= 0
      ) {
        throw new Error(
          `Invalid record in ${filename} at line ${lineIdx + 1}: "${line}".`,
        );
      }

      const key = rawName.toLowerCase();
      let acc = accumulators.get(key);
      if (!acc) {
        acc = {
          displayName: toTitleCase(rawName),
          totalMale: 0,
          totalFemale: 0,
          firstYear: year,
          lastYear: year,
          peakYear: year,
          peakCount: 0,
          yearly: new Map(),
        };
        accumulators.set(key, acc);
      }

      if (year < acc.firstYear) acc.firstYear = year;
      if (year > acc.lastYear) acc.lastYear = year;

      if (sex === "M") {
        acc.totalMale += count;
      } else {
        acc.totalFemale += count;
      }

      const existingYear = acc.yearly.get(yearStr) || { male: 0, female: 0 };
      if (sex === "M") {
        existingYear.male += count;
      } else {
        existingYear.female += count;
      }
      acc.yearly.set(yearStr, existingYear);
    }
  }

  // Finalize records
  const result = new Map<string, ParsedSSANationalEntry>();

  for (const [key, acc] of accumulators) {
    const total = acc.totalMale + acc.totalFemale;
    const maleShare = total > 0 ? acc.totalMale / total : 0;
    const femaleShare = total > 0 ? acc.totalFemale / total : 0;

    // Determine peak year
    let peakYear = acc.firstYear;
    let peakCount = -1;
    const yearlyRecord: Record<string, SSAYearlyCounts> = {};

    // Sort years chronologically
    const sortedYears = Array.from(acc.yearly.keys()).sort(
      (a, b) => parseInt(a, 10) - parseInt(b, 10),
    );

    for (const yr of sortedYears) {
      const counts = acc.yearly.get(yr)!;
      yearlyRecord[yr] = counts;
      const yrTotal = counts.male + counts.female;
      if (yrTotal > peakCount) {
        peakCount = yrTotal;
        peakYear = parseInt(yr, 10);
      }
    }

    const nationalRecord: SSANationalRecord = {
      total_male: acc.totalMale,
      total_female: acc.totalFemale,
      total,
      male_share: maleShare,
      female_share: femaleShare,
      first_year: acc.firstYear,
      last_year: acc.lastYear,
      peak_year: peakYear,
      yearly: yearlyRecord,
    };

    result.set(key, {
      key,
      display_name: acc.displayName,
      record: nationalRecord,
    });
  }

  return result;
}

export function parseSSAGeographicArchive(
  buffer: Buffer,
  archiveType: "state" | "territory",
): Map<string, Record<string, SSAGeographicSeries>> {
  const zip = ZipReader.fromBuffer(buffer);
  const files = zip.listFiles().filter((f) => f.toUpperCase().endsWith(".TXT"));

  if (files.length === 0) {
    throw new Error(`No .TXT files found in SSA ${archiveType} ZIP archive.`);
  }

  // Intermediate map: nameKey -> geoCode -> { totalMale, totalFemale, yearly: Map<year, { male, female }> }
  interface GeoAccumulator {
    totalMale: number;
    totalFemale: number;
    yearly: Map<string, { male: number; female: number }>;
  }

  const nameGeoMap = new Map<string, Map<string, GeoAccumulator>>();

  const sortedFiles = [...files].sort();

  for (const filename of sortedFiles) {
    const text = zip.readText(filename);
    const lines = text.split(/\r?\n/);

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx].trim();
      if (!line) continue;

      const parts = line.split(",");
      if (parts.length < 5) {
        throw new Error(
          `Malformed line in ${filename} at line ${lineIdx + 1}: "${line}".`,
        );
      }

      const geoCode = parts[0].trim().toUpperCase();
      const sex = parts[1].trim().toUpperCase();
      const yearStr = parts[2].trim();
      const rawName = parts[3].trim();
      const count = parseInt(parts[4].trim(), 10);

      if (
        !geoCode ||
        !rawName ||
        (sex !== "M" && sex !== "F") ||
        isNaN(count) ||
        count <= 0 ||
        isNaN(parseInt(yearStr, 10))
      ) {
        throw new Error(
          `Invalid record in ${filename} at line ${lineIdx + 1}: "${line}".`,
        );
      }

      const nameKey = rawName.toLowerCase();
      let geoMap = nameGeoMap.get(nameKey);
      if (!geoMap) {
        geoMap = new Map();
        nameGeoMap.set(nameKey, geoMap);
      }

      let geoAcc = geoMap.get(geoCode);
      if (!geoAcc) {
        geoAcc = {
          totalMale: 0,
          totalFemale: 0,
          yearly: new Map(),
        };
        geoMap.set(geoCode, geoAcc);
      }

      if (sex === "M") {
        geoAcc.totalMale += count;
      } else {
        geoAcc.totalFemale += count;
      }

      const yrCounts = geoAcc.yearly.get(yearStr) || { male: 0, female: 0 };
      if (sex === "M") {
        yrCounts.male += count;
      } else {
        yrCounts.female += count;
      }
      geoAcc.yearly.set(yearStr, yrCounts);
    }
  }

  // Finalize
  const finalized = new Map<string, Record<string, SSAGeographicSeries>>();

  for (const [nameKey, geoMap] of nameGeoMap) {
    const geoRecord: Record<string, SSAGeographicSeries> = {};
    const sortedGeoCodes = Array.from(geoMap.keys()).sort();

    for (const code of sortedGeoCodes) {
      const acc = geoMap.get(code)!;
      const yearlyRecord: Record<string, SSAYearlyCounts> = {};
      const sortedYears = Array.from(acc.yearly.keys()).sort(
        (a, b) => parseInt(a, 10) - parseInt(b, 10),
      );

      for (const yr of sortedYears) {
        yearlyRecord[yr] = acc.yearly.get(yr)!;
      }

      geoRecord[code] = {
        total_male: acc.totalMale,
        total_female: acc.totalFemale,
        total: acc.totalMale + acc.totalFemale,
        yearly: yearlyRecord,
      };
    }

    finalized.set(nameKey, geoRecord);
  }

  return finalized;
}

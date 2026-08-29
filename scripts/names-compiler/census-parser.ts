/**
 * Census 2020 Names Dataset Parser
 *
 * Ingests authoritative 2020 Decennial Census first-name-by-sex and surname-frequency
 * tables with rigorous reconciliation and validation.
 */

import { parseXlsxWorkbook } from "./xlsx-parser";
import type {
  CensusFirstNameRecord,
  CensusSurnameRecord,
  SurnameSourceRecord,
} from "./schemas";

export interface ParsedCensusFirstName {
  readonly key: string;
  readonly display_name: string;
  readonly census: CensusFirstNameRecord;
}

export function toTitleCase(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return "";
  return trimmed
    .split(/[\s-]+/)
    .map((part) => {
      if (part.length === 0) return "";
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

export function parseCensusFirstNames(buffer: Buffer): ParsedCensusFirstName[] {
  const rows = parseXlsxWorkbook(buffer);

  if (rows.length < 3) {
    throw new Error(
      `Census first names workbook contains too few rows (${rows.length}).`,
    );
  }

  const headerIndex = rows.findIndex((r) => r.A?.includes("FIRST NAME"));
  if (headerIndex === -1) {
    throw new Error(
      `Census first names workbook header mismatch: could not find row with "FIRST NAME" in column A.`,
    );
  }

  const results: ParsedCensusFirstName[] = [];
  const seenKeys = new Set<string>();

  // Data rows start immediately after header row and stop before the summary row "ALL OTHER NAMES"
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const rawName = row.A?.trim();

    if (!rawName || rawName === "ALL OTHER NAMES") {
      continue;
    }

    const key = rawName.toLowerCase();
    if (seenKeys.has(key)) {
      throw new Error(
        `Duplicate name "${rawName}" in Census first names at row ${i + 1}.`,
      );
    }
    seenKeys.add(key);

    const rank = parseInt(row.B, 10);
    const totalCount = parseInt(row.C, 10);
    const proportionPer100k = parseFloat(row.D);
    const maleCount = parseInt(row.F, 10);
    const femaleCount = parseInt(row.G, 10);

    if (isNaN(totalCount) || isNaN(maleCount) || isNaN(femaleCount)) {
      throw new Error(
        `Malformed numeric count in Census first names for "${rawName}" at row ${i + 1}.`,
      );
    }

    // Exact count reconciliation invariant: male_count + female_count === total_count
    if (maleCount + femaleCount !== totalCount) {
      throw new Error(
        `Census first name reconciliation failed for "${rawName}": male (${maleCount}) + female (${femaleCount}) != total (${totalCount}).`,
      );
    }

    const maleShare = totalCount > 0 ? maleCount / totalCount : 0;
    const femaleShare = totalCount > 0 ? femaleCount / totalCount : 0;

    results.push({
      key,
      display_name: toTitleCase(rawName),
      census: {
        male_count: maleCount,
        female_count: femaleCount,
        total_count: totalCount,
        male_share: maleShare,
        female_share: femaleShare,
        rank: isNaN(rank) ? undefined : rank,
        proportion_per_100k: isNaN(proportionPer100k)
          ? undefined
          : proportionPer100k,
      },
    });
  }

  return results;
}

export function parseCensusSurnames(buffer: Buffer): SurnameSourceRecord[] {
  const rows = parseXlsxWorkbook(buffer);

  if (rows.length < 3) {
    throw new Error(
      `Census surnames workbook contains too few rows (${rows.length}).`,
    );
  }

  const headerIndex = rows.findIndex((r) => r.A?.includes("LAST NAME"));
  if (headerIndex === -1) {
    throw new Error(
      `Census surnames workbook header mismatch: could not find row with "LAST NAME" in column A.`,
    );
  }

  const results: SurnameSourceRecord[] = [];
  const seenKeys = new Set<string>();

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    const rawName = row.A?.trim();

    if (!rawName || rawName === "ALL OTHER NAMES") {
      continue;
    }

    const key = rawName.toLowerCase();
    if (seenKeys.has(key)) {
      throw new Error(
        `Duplicate surname "${rawName}" in Census surnames at row ${i + 1}.`,
      );
    }
    seenKeys.add(key);

    const rank = parseInt(row.B, 10);
    const totalCount = parseInt(row.C, 10);
    const proportionPer100k = parseFloat(row.D);
    const cumulativeProportion = parseFloat(row.E);

    if (
      isNaN(rank) ||
      isNaN(totalCount) ||
      isNaN(proportionPer100k) ||
      isNaN(cumulativeProportion)
    ) {
      throw new Error(
        `Malformed numeric data in Census surnames for "${rawName}" at row ${i + 1}.`,
      );
    }

    // Descriptive demographic source metadata (passive metadata only; strictly no race inference functions)
    const whiteAlone = parseInt(row.F, 10);
    const blackAlone = parseInt(row.G, 10);
    const aianAlone = parseInt(row.H, 10);
    const apiAlone = parseInt(row.I, 10);
    const twoOrMore = parseInt(row.J, 10);
    const hispanic = parseInt(row.K, 10);

    const demographicMetadata: Record<string, number> = {};
    if (!isNaN(whiteAlone)) demographicMetadata.white_alone_count = whiteAlone;
    if (!isNaN(blackAlone)) demographicMetadata.black_alone_count = blackAlone;
    if (!isNaN(aianAlone)) demographicMetadata.aian_alone_count = aianAlone;
    if (!isNaN(apiAlone)) demographicMetadata.api_alone_count = apiAlone;
    if (!isNaN(twoOrMore))
      demographicMetadata.two_or_more_races_count = twoOrMore;
    if (!isNaN(hispanic)) demographicMetadata.hispanic_origin_count = hispanic;

    const censusRec: CensusSurnameRecord = {
      count: totalCount,
      rank,
      proportion_per_100k: proportionPer100k,
      cumulative_proportion: cumulativeProportion,
      ...(Object.keys(demographicMetadata).length > 0
        ? { demographic_metadata: demographicMetadata }
        : {}),
    };

    results.push({
      key,
      display_name: toTitleCase(rawName),
      census: censusRec,
      provenance: ["census_2020_surnames"],
    });
  }

  return results;
}

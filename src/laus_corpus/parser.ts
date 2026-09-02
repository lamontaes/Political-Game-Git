/**
 * Parser for official BLS LAUS flat file text formats
 */

import type {
  LausArea,
  LausObservation,
  LausSeries,
  ObservationStatus,
  SeasonalAdjustment,
} from "./types";

const PERIOD_NAMES: Record<string, string> = {
  M01: "January",
  M02: "February",
  M03: "March",
  M04: "April",
  M05: "May",
  M06: "June",
  M07: "July",
  M08: "August",
  M09: "September",
  M10: "October",
  M11: "November",
  M12: "December",
  M13: "Annual Average",
};

/**
 * Split TSV line into trimmed fields
 */
function splitLine(line: string): string[] {
  return line.split("\t").map((field) => field.trim());
}

/**
 * Parse la.area_type
 */
export function parseAreaTypeFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  const headerLine = lines[0];
  if (!headerLine || !headerLine.trim()) return result;

  const header = splitLine(headerLine);
  const codeIdx = header.findIndex((h) => h === "area_type_code");
  const textIdx = header.findIndex((h) => h === "areatype_text" || h === "area_type_text");

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;
    const line = rawLine.trim();
    if (!line) continue;
    const fields = splitLine(line);
    const code = fields[codeIdx >= 0 ? codeIdx : 0] || "";
    const text = fields[textIdx >= 0 ? textIdx : 1] || "";
    if (code) {
      result[code] = text;
    }
  }
  return result;
}

/**
 * Parse la.measure
 */
export function parseMeasureFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  const headerLine = lines[0];
  if (!headerLine || !headerLine.trim()) return result;

  const header = splitLine(headerLine);
  const codeIdx = header.findIndex((h) => h === "measure_code");
  const textIdx = header.findIndex((h) => h === "measure_text");

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;
    const line = rawLine.trim();
    if (!line) continue;
    const fields = splitLine(line);
    const code = fields[codeIdx >= 0 ? codeIdx : 0] || "";
    const text = fields[textIdx >= 0 ? textIdx : 1] || "";
    if (code) {
      result[code] = text;
    }
  }
  return result;
}

/**
 * Parse la.footnote
 */
export function parseFootnoteFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);
  const headerLine = lines[0];
  if (!headerLine || !headerLine.trim()) return result;

  const header = splitLine(headerLine);
  const codeIdx = header.findIndex((h) => h === "footnote_code");
  const textIdx = header.findIndex((h) => h === "footnote_text");

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;
    const line = rawLine.trim();
    if (!line) continue;
    const fields = splitLine(line);
    const code = fields[codeIdx >= 0 ? codeIdx : 0] || "";
    const text = fields[textIdx >= 0 ? textIdx : 1] || "";
    if (code) {
      result[code] = text;
    }
  }
  return result;
}

/**
 * Parse la.area
 */
export function parseAreaFile(content: string): LausArea[] {
  const areas: LausArea[] = [];
  const lines = content.split(/\r?\n/);
  const headerLine = lines[0];
  if (!headerLine || !headerLine.trim()) return areas;

  const header = splitLine(headerLine);
  const typeIdx = header.findIndex((h) => h === "area_type_code");
  const codeIdx = header.findIndex((h) => h === "area_code");
  const textIdx = header.findIndex((h) => h === "area_text");
  const levelIdx = header.findIndex((h) => h === "display_level");
  const selIdx = header.findIndex((h) => h === "selectable");
  const sortIdx = header.findIndex((h) => h === "sort_sequence");

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;
    const line = rawLine.trim();
    if (!line) continue;
    const fields = splitLine(line);
    const areaTypeCode = fields[typeIdx >= 0 ? typeIdx : 0] || "";
    const areaCode = fields[codeIdx >= 0 ? codeIdx : 1] || "";
    const areaText = fields[textIdx >= 0 ? textIdx : 2] || "";
    const displayLevel = parseInt(fields[levelIdx >= 0 ? levelIdx : 3] || "0", 10);
    const selectable = (fields[selIdx >= 0 ? selIdx : 4] || "T").toUpperCase() === "T";
    const sortSequence = parseInt(fields[sortIdx >= 0 ? sortIdx : 5] || "0", 10);

    let stateFips: string | null = null;
    let countyFips: string | null = null;

    if (areaCode.startsWith("ST")) {
      stateFips = areaCode.substring(2, 4);
    } else if (areaCode.startsWith("CN")) {
      stateFips = areaCode.substring(2, 4);
      countyFips = areaCode.substring(2, 7);
    }

    if (areaCode) {
      areas.push({
        areaCode,
        areaTypeCode,
        areaText,
        stateFips,
        countyFips,
        displayLevel: isNaN(displayLevel) ? 0 : displayLevel,
        selectable,
        sortSequence: isNaN(sortSequence) ? 0 : sortSequence,
      });
    }
  }

  return areas;
}

/**
 * Parse la.series
 */
export function parseSeriesFile(content: string): LausSeries[] {
  const seriesList: LausSeries[] = [];
  const lines = content.split(/\r?\n/);
  const headerLine = lines[0];
  if (!headerLine || !headerLine.trim()) return seriesList;

  const header = splitLine(headerLine);
  const idIdx = header.findIndex((h) => h === "series_id");
  const typeIdx = header.findIndex((h) => h === "area_type_code");
  const areaIdx = header.findIndex((h) => h === "area_code");
  const measureIdx = header.findIndex((h) => h === "measure_code");
  const seasonalIdx = header.findIndex((h) => h === "seasonal");
  const srdIdx = header.findIndex((h) => h === "srd_code");
  const titleIdx = header.findIndex((h) => h === "series_title");
  const fnIdx = header.findIndex((h) => h === "footnote_codes");
  const beginYrIdx = header.findIndex((h) => h === "begin_year");
  const beginPerIdx = header.findIndex((h) => h === "begin_period");
  const endYrIdx = header.findIndex((h) => h === "end_year");
  const endPerIdx = header.findIndex((h) => h === "end_period");

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;
    const line = rawLine.trim();
    if (!line) continue;
    const fields = splitLine(line);
    const seriesId = fields[idIdx >= 0 ? idIdx : 0] || "";
    if (!seriesId) continue;

    const areaTypeCode = fields[typeIdx >= 0 ? typeIdx : 1] || "";
    const areaCode = fields[areaIdx >= 0 ? areaIdx : 2] || "";
    const measureCode = fields[measureIdx >= 0 ? measureIdx : 3] || "";
    const seasonal = (fields[seasonalIdx >= 0 ? seasonalIdx : 4] || "U").toUpperCase() as SeasonalAdjustment;
    const srdCode = fields[srdIdx >= 0 ? srdIdx : 5] || "";
    const seriesTitle = fields[titleIdx >= 0 ? titleIdx : 6] || "";
    const fnRaw = fields[fnIdx >= 0 ? fnIdx : 7] || "";
    const footnoteCodes = fnRaw ? fnRaw.split(",").map((c) => c.trim()).filter(Boolean) : [];
    const beginYear = parseInt(fields[beginYrIdx >= 0 ? beginYrIdx : 8] || "0", 10);
    const beginPeriod = fields[beginPerIdx >= 0 ? beginPerIdx : 9] || "M01";
    const endYear = parseInt(fields[endYrIdx >= 0 ? endYrIdx : 10] || "0", 10);
    const endPeriod = fields[endPerIdx >= 0 ? endPerIdx : 11] || "M12";

    seriesList.push({
      seriesId,
      areaTypeCode,
      areaCode,
      measureCode,
      seasonal: seasonal === "S" ? "S" : "U",
      srdCode,
      seriesTitle,
      footnoteCodes,
      beginYear: isNaN(beginYear) ? 0 : beginYear,
      beginPeriod,
      endYear: isNaN(endYear) ? 0 : endYear,
      endPeriod,
    });
  }

  return seriesList;
}

/**
 * Parse la.data.*
 */
export function parseDataFile(
  content: string,
  seriesMap?: Map<string, LausSeries>,
  footnotesMap?: Record<string, string>,
): LausObservation[] {
  const observations: LausObservation[] = [];
  const lines = content.split(/\r?\n/);
  const headerLine = lines[0];
  if (!headerLine || !headerLine.trim()) return observations;

  const header = splitLine(headerLine);
  const idIdx = header.findIndex((h) => h === "series_id");
  const yrIdx = header.findIndex((h) => h === "year");
  const perIdx = header.findIndex((h) => h === "period");
  const valIdx = header.findIndex((h) => h === "value");
  const fnIdx = header.findIndex((h) => h === "footnote_codes");

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;
    const line = rawLine.trim();
    if (!line) continue;
    const fields = splitLine(line);
    const seriesId = fields[idIdx >= 0 ? idIdx : 0] || "";
    if (!seriesId) continue;

    const year = parseInt(fields[yrIdx >= 0 ? yrIdx : 1] || "0", 10);
    const period = fields[perIdx >= 0 ? perIdx : 2] || "";
    const rawVal = fields[valIdx >= 0 ? valIdx : 3] || "";
    const fnRaw = fields[fnIdx >= 0 ? fnIdx : 4] || "";

    const footnoteCodes = fnRaw ? fnRaw.split(",").map((c) => c.trim()).filter(Boolean) : [];
    const footnoteTexts = footnotesMap
      ? footnoteCodes.map((code) => footnotesMap[code] || code)
      : [];

    let value: number | null = null;
    let status: ObservationStatus = "FINAL";

    if (!rawVal || rawVal === "-" || rawVal.toUpperCase() === "N" || rawVal.toUpperCase() === "ND") {
      value = null;
      status = footnoteCodes.includes("N") || footnoteCodes.includes("X") ? "SUPPRESSED" : "MISSING";
    } else {
      const parsed = parseFloat(rawVal);
      if (isNaN(parsed)) {
        value = null;
        status = "MISSING";
      } else {
        value = parsed;
        if (footnoteCodes.includes("P")) {
          status = "PRELIMINARY";
        } else if (footnoteCodes.includes("R")) {
          status = "REVISED";
        } else if (footnoteCodes.includes("N") || footnoteCodes.includes("X")) {
          status = "SUPPRESSED";
        } else {
          status = "FINAL";
        }
      }
    }

    const seriesInfo = seriesMap?.get(seriesId);
    let areaCode = "";
    let areaTypeCode = "";
    let measureCode = "";
    let seasonal: SeasonalAdjustment = "U";

    if (seriesInfo) {
      areaCode = seriesInfo.areaCode;
      areaTypeCode = seriesInfo.areaTypeCode;
      measureCode = seriesInfo.measureCode;
      seasonal = seriesInfo.seasonal;
    } else {
      seasonal = seriesId.startsWith("LAS") || seriesId.charAt(3) === "S" ? "S" : "U";
      if (seriesId.length >= 20) {
        areaCode = seriesId.substring(5, 20);
        measureCode = seriesId.substring(18, 20);
      }
    }

    const periodName = PERIOD_NAMES[period] || period;

    observations.push({
      seriesId,
      areaCode,
      areaTypeCode,
      measureCode,
      seasonal,
      year: isNaN(year) ? 0 : year,
      period,
      periodName,
      value,
      status,
      footnoteCodes,
      footnoteTexts,
    });
  }

  return observations;
}

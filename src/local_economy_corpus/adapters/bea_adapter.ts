/**
 * BEA (Bureau of Economic Analysis) Regional Economic Accounts Adapter
 *
 * Normalizes BEA County and State tables (GDP, Personal Income, Employment, Earnings by Industry)
 * into standardized EconomyObservationRecord objects.
 */

import {
  determineGeoLevel,
  getStateAbbrFromFips,
  normalizeFips,
} from "../geography.js";
import { getNaicsTitle, validateNaicsCode } from "../naics.js";
import {
  buildEconomyProvenance,
  buildObservationId,
  classifySuppression,
} from "../provenance.js";
import type {
  EconomyMeasureCategory,
  EconomyObservationRecord,
  SourceVintageMetadata,
  ValueUnit,
} from "../types.js";
import {
  createJobsCountUnit,
  createNominalDollarUnit,
  createRealDollarUnit,
} from "../units.js";
import type {
  AdapterNormalizationOptions,
  EconomySourceAdapter,
} from "./adapter_interface.js";

export const DEFAULT_BEA_VINTAGE: SourceVintageMetadata = {
  vintageId: "bea_regional_2024_release",
  provider: "bea_regional",
  vintageName:
    "BEA Regional Economic Accounts, November 2024 Comprehensive Update",
  releaseDate: "2024-11-14",
  revisionType: "comprehensive_benchmark",
  description:
    "Official BEA regional statistics covering County and State GDP, Personal Income, and Employment.",
};

export interface BeaRawDataRow {
  GeoFips?: string | number;
  GeoFIPS?: string | number;
  GeoName?: string;
  TableName?: string;
  LineCode?: string | number;
  IndustryClassification?: string;
  Description?: string;
  Unit?: string;
  UnitPrice?: string; // "Current Dollars" or "Chained 2017 Dollars"
  Unit_multiplier?: string | number;
  TimePeriod?: string | number;
  DataValue?: string | number | null;
  NoteRef?: string;
  [key: string]: unknown;
}

export class BeaAdapter implements EconomySourceAdapter {
  readonly provider = "bea_regional" as const;

  getDefaultVintage(): SourceVintageMetadata {
    return { ...DEFAULT_BEA_VINTAGE };
  }

  normalizeDataset(
    raw: unknown,
    options?: AdapterNormalizationOptions,
  ): EconomyObservationRecord[] {
    const vintage = {
      ...this.getDefaultVintage(),
      ...(options?.vintageOverride || {}),
    };

    const rows = this.extractRows(raw);
    const observations: EconomyObservationRecord[] = [];

    for (const row of rows) {
      const record = this.normalizeRow(
        row,
        vintage,
        options?.officialSourceUrl,
        options?.retrievalTimestamp,
      );
      if (record) {
        observations.push(record);
      }
    }

    return observations;
  }

  private extractRows(raw: unknown): BeaRawDataRow[] {
    if (Array.isArray(raw)) {
      return raw as BeaRawDataRow[];
    }
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      const beaApi = obj.BEAAPI as { Results?: { Data?: unknown } } | undefined;
      if (Array.isArray(beaApi?.Results?.Data)) {
        return beaApi.Results.Data as BeaRawDataRow[];
      }
      if (Array.isArray(obj.Data)) {
        return obj.Data as BeaRawDataRow[];
      }
      if (Array.isArray(obj.results)) {
        return obj.results as BeaRawDataRow[];
      }
      if (Array.isArray(obj.rows)) {
        return obj.rows as BeaRawDataRow[];
      }
    }
    return [];
  }

  private normalizeRow(
    row: BeaRawDataRow,
    vintage: SourceVintageMetadata,
    officialUrl?: string,
    retrievalTimestamp?: string,
  ): EconomyObservationRecord | null {
    const rawFips = row.GeoFips ?? row.GeoFIPS;
    if (!rawFips) return null;

    const geoFips = normalizeFips(rawFips);
    const geoLevel = determineGeoLevel(geoFips);
    const stateAbbr = getStateAbbrFromFips(geoFips);
    const geoName = (row.GeoName || "").trim();

    const tableName = (row.TableName || "BEA_REGIONAL").trim().toUpperCase();
    const lineCodeStr = String(row.LineCode || "1").trim();
    const description = (row.Description || "").trim();
    const timePeriodStr = String(row.TimePeriod || "").trim();

    if (!timePeriodStr) return null;

    const {
      frequency,
      year,
      quarter,
      periodLabel,
      periodStartDate,
      periodEndDate,
    } = this.parseTimePeriod(timePeriodStr);

    const category = this.determineCategory(
      tableName,
      lineCodeStr,
      description,
    );
    const unit = this.determineUnit(row, tableName, lineCodeStr, description);
    const { naicsCode, naicsTitle } = this.determineNaics(row, description);

    const suppression = classifySuppression(row.DataValue);

    const measureCode = `${tableName}-${lineCodeStr}`;
    const measureName = description || `BEA ${tableName} Line ${lineCodeStr}`;

    const observationId = buildObservationId({
      geoFips,
      provider: this.provider,
      measureCode,
      naicsCode,
      ownershipCode: null,
      periodLabel,
      vintageId: vintage.vintageId,
    });

    const provenance = buildEconomyProvenance({
      provider: this.provider,
      providerSeriesId: `${tableName}_${geoFips}_${lineCodeStr}`,
      vintageId: vintage.vintageId,
      tableOrDataset: tableName,
      lineCodeOrField: lineCodeStr,
      officialSourceUrl:
        officialUrl || "https://www.bea.gov/data/economic-accounts/regional",
      retrievalTimestamp,
      rawPayload: row,
    });

    return {
      observationId,
      geoFips,
      geoName,
      geoLevel,
      stateAbbr,
      category,
      measureCode,
      measureName,
      naicsCode,
      naicsTitle,
      ownershipCode: null,
      ownershipTitle: null,
      frequency,
      year,
      quarter,
      month: null, // BEA regional does not publish monthly county data
      periodLabel,
      periodStartDate,
      periodEndDate,
      unit,
      value: suppression.numericValue,
      rawValue: row.DataValue ?? null,
      isSuppressed: suppression.isSuppressed,
      suppressionStatus: suppression.status,
      suppressionCode: suppression.code,
      provenance,
    };
  }

  private parseTimePeriod(timePeriod: string): {
    frequency: "annual" | "quarterly";
    year: number;
    quarter: number | null;
    periodLabel: string;
    periodStartDate: string;
    periodEndDate: string;
  } {
    const qMatch = timePeriod.match(/^([1-2][0-9]{3})Q([1-4])$/i);
    if (qMatch && qMatch[1] && qMatch[2]) {
      const year = parseInt(qMatch[1], 10);
      const quarter = parseInt(qMatch[2], 10);
      const startMonth = String((quarter - 1) * 3 + 1).padStart(2, "0");
      const endMonth = String(quarter * 3).padStart(2, "0");
      const endDay = quarter === 1 || quarter === 4 ? "31" : "30";

      return {
        frequency: "quarterly",
        year,
        quarter,
        periodLabel: `${year}Q${quarter}`,
        periodStartDate: `${year}-${startMonth}-01`,
        periodEndDate: `${year}-${endMonth}-${endDay}`,
      };
    }

    const yearNum = parseInt(timePeriod, 10);
    const validYear = !isNaN(yearNum) ? yearNum : 2020;

    return {
      frequency: "annual",
      year: validYear,
      quarter: null,
      periodLabel: String(validYear),
      periodStartDate: `${validYear}-01-01`,
      periodEndDate: `${validYear}-12-31`,
    };
  }

  private determineCategory(
    tableName: string,
    lineCode: string,
    description: string,
  ): EconomyMeasureCategory {
    const descLower = description.toLowerCase();

    if (tableName.includes("GDP")) {
      return "gdp";
    }

    if (
      tableName.includes("EMP") ||
      descLower.includes("employment") ||
      descLower.includes("jobs")
    ) {
      return "employment";
    }

    if (
      tableName.includes("INC5N") ||
      descLower.includes("earnings by place of work")
    ) {
      return "earnings";
    }

    if (
      descLower.includes("transfer receipts") ||
      descLower.includes("transfer payments")
    ) {
      return "transfer_receipts";
    }

    if (
      descLower.includes("proprietors' income") ||
      descLower.includes("proprietors income")
    ) {
      return "proprietors_income";
    }

    if (descLower.includes("per capita personal income")) {
      return "per_capita_income";
    }

    if (descLower.includes("population")) {
      return "population";
    }

    if (
      tableName.includes("INC1") ||
      tableName.includes("INC4") ||
      descLower.includes("personal income")
    ) {
      return "personal_income";
    }

    return "earnings";
  }

  private determineUnit(
    row: BeaRawDataRow,
    tableName: string,
    lineCode: string,
    description: string,
  ): ValueUnit {
    const rawUnit = (row.Unit || "").toLowerCase();
    const unitPrice = (row.UnitPrice || "").toLowerCase();
    const descLower = description.toLowerCase();

    // Check if Real Chained Dollars
    const isReal =
      unitPrice.includes("chained") ||
      rawUnit.includes("chained") ||
      descLower.includes("real gdp") ||
      tableName === "CAGDP9" ||
      tableName === "SAGDP9";

    const refYear = 2017; // Standard BEA reference year for chained dollars

    if (isReal) {
      const multiplier = rawUnit.includes("million") ? 1000000 : 1000;
      return createRealDollarUnit(refYear, multiplier);
    }

    if (
      rawUnit.includes("thousands of dollars") ||
      rawUnit.includes("thousand dollars")
    ) {
      return createNominalDollarUnit(1000, "Thousands of dollars");
    }

    if (
      rawUnit.includes("millions of dollars") ||
      rawUnit.includes("million dollars")
    ) {
      return createNominalDollarUnit(1000000, "Millions of dollars");
    }

    if (rawUnit.includes("dollars") || descLower.includes("per capita")) {
      return createNominalDollarUnit(1, "Dollars");
    }

    if (
      rawUnit.includes("number of jobs") ||
      descLower.includes("jobs") ||
      descLower.includes("employment")
    ) {
      return createJobsCountUnit();
    }

    if (rawUnit.includes("persons") || descLower.includes("population")) {
      return { kind: "count", scaleMultiplier: 1, displayUnit: "Persons" };
    }

    // Default based on category
    if (tableName.includes("GDP") || tableName.includes("INC")) {
      return createNominalDollarUnit(1000, "Thousands of dollars");
    }

    return createJobsCountUnit();
  }

  private determineNaics(
    row: BeaRawDataRow,
    description: string,
  ): { naicsCode: string | null; naicsTitle: string | null } {
    if (row.IndustryClassification) {
      const code = String(row.IndustryClassification).trim();
      const val = validateNaicsCode(code);
      if (val.valid) {
        return { naicsCode: code, naicsTitle: getNaicsTitle(code) };
      }
    }

    const descLower = description.toLowerCase();

    // Match common BEA line descriptions
    if (descLower.includes("goods-producing"))
      return { naicsCode: "101", naicsTitle: "Goods-producing" };
    if (descLower.includes("service-providing"))
      return { naicsCode: "102", naicsTitle: "Service-providing" };
    if (descLower.includes("forestry, fishing"))
      return {
        naicsCode: "11",
        naicsTitle: "Agriculture, Forestry, Fishing and Hunting",
      };
    if (descLower.includes("mining"))
      return {
        naicsCode: "21",
        naicsTitle: "Mining, Quarrying, and Oil and Gas Extraction",
      };
    if (descLower.includes("utilities"))
      return { naicsCode: "22", naicsTitle: "Utilities" };
    if (descLower.includes("construction"))
      return { naicsCode: "23", naicsTitle: "Construction" };
    if (descLower.includes("manufacturing"))
      return { naicsCode: "31-33", naicsTitle: "Manufacturing" };
    if (descLower.includes("wholesale trade"))
      return { naicsCode: "42", naicsTitle: "Wholesale Trade" };
    if (descLower.includes("retail trade"))
      return { naicsCode: "44-45", naicsTitle: "Retail Trade" };
    if (descLower.includes("transportation and warehousing"))
      return {
        naicsCode: "48-49",
        naicsTitle: "Transportation and Warehousing",
      };
    if (descLower.includes("information"))
      return { naicsCode: "51", naicsTitle: "Information" };
    if (descLower.includes("finance and insurance"))
      return { naicsCode: "52", naicsTitle: "Finance and Insurance" };
    if (descLower.includes("real estate"))
      return {
        naicsCode: "53",
        naicsTitle: "Real Estate and Rental and Leasing",
      };
    if (descLower.includes("professional, scientific"))
      return {
        naicsCode: "54",
        naicsTitle: "Professional, Scientific, and Technical Services",
      };
    if (descLower.includes("management of companies"))
      return {
        naicsCode: "55",
        naicsTitle: "Management of Companies and Enterprises",
      };
    if (descLower.includes("administrative and waste"))
      return {
        naicsCode: "56",
        naicsTitle: "Administrative and Support and Waste Management",
      };
    if (descLower.includes("educational services"))
      return { naicsCode: "61", naicsTitle: "Educational Services" };
    if (descLower.includes("health care"))
      return {
        naicsCode: "62",
        naicsTitle: "Health Care and Social Assistance",
      };
    if (descLower.includes("arts, entertainment"))
      return {
        naicsCode: "71",
        naicsTitle: "Arts, Entertainment, and Recreation",
      };
    if (descLower.includes("accommodation and food"))
      return { naicsCode: "72", naicsTitle: "Accommodation and Food Services" };
    if (descLower.includes("other services"))
      return {
        naicsCode: "81",
        naicsTitle: "Other Services (except Public Administration)",
      };
    if (descLower.includes("government"))
      return { naicsCode: "92", naicsTitle: "Public Administration" };

    return { naicsCode: null, naicsTitle: null };
  }
}

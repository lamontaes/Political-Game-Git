/**
 * BLS (Bureau of Labor Statistics) QCEW Adapter
 *
 * Normalizes Quarterly Census of Employment and Wages datasets
 * (establishments, employment, total wages, average weekly pay)
 * into standardized EconomyObservationRecord objects.
 *
 * Strict invariants:
 * - Surviving confidentiality/suppression codes ("N", "C", "(D)").
 * - No synthetic monthly values created from annual totals.
 * - Explicit nominal dollar units.
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
  FrequencyType,
  GeographicLevel,
  QcewOwnershipCode,
  QcewOwnershipTitle,
  SourceVintageMetadata,
  ValueUnit,
} from "../types.js";
import {
  createEstablishmentsCountUnit,
  createJobsCountUnit,
  createNominalDollarUnit,
} from "../units.js";
import type {
  AdapterNormalizationOptions,
  EconomySourceAdapter,
} from "./adapter_interface.js";

export const DEFAULT_QCEW_VINTAGE: SourceVintageMetadata = {
  vintageId: "bls_qcew_2024_annual",
  provider: "bls_qcew",
  vintageName:
    "BLS Quarterly Census of Employment and Wages, 2024 Final Annual Release",
  releaseDate: "2024-09-04",
  revisionType: "final_annual",
  description:
    "Official BLS QCEW employment, establishment, and wage statistics by industry and ownership.",
};

const OWNERSHIP_TITLES: Record<QcewOwnershipCode, QcewOwnershipTitle> = {
  "0": "Total Covered",
  "1": "Federal Government",
  "2": "State Government",
  "3": "Local Government",
  "5": "Private",
};

export interface QcewRawDataRow {
  area_fips?: string | number;
  own_code?: string | number;
  industry_code?: string | number;
  agglvl_code?: string | number;
  size_code?: string | number;
  year?: string | number;
  qtr?: string | number;
  disclosure_code?: string | null;
  annual_avg_estabs?: string | number | null;
  qtrly_estabs?: string | number | null;
  annual_avg_emplvl?: string | number | null;
  month1_emplvl?: string | number | null;
  month2_emplvl?: string | number | null;
  month3_emplvl?: string | number | null;
  total_annual_wages?: string | number | null;
  total_qtrly_wages?: string | number | null;
  annual_avg_wkly_wage?: string | number | null;
  avg_wkly_wage?: string | number | null;
  avg_annual_pay?: string | number | null;
  area_title?: string;
  [key: string]: unknown;
}

export class QcewAdapter implements EconomySourceAdapter {
  readonly provider = "bls_qcew" as const;

  getDefaultVintage(): SourceVintageMetadata {
    return { ...DEFAULT_QCEW_VINTAGE };
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
      const records = this.normalizeRow(
        row,
        vintage,
        options?.officialSourceUrl,
        options?.retrievalTimestamp,
      );
      observations.push(...records);
    }

    return observations;
  }

  private extractRows(raw: unknown): QcewRawDataRow[] {
    if (Array.isArray(raw)) {
      return raw as QcewRawDataRow[];
    }
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.data)) {
        return obj.data as QcewRawDataRow[];
      }
      if (Array.isArray(obj.rows)) {
        return obj.rows as QcewRawDataRow[];
      }
      if (Array.isArray(obj.results)) {
        return obj.results as QcewRawDataRow[];
      }
    }
    return [];
  }

  private normalizeRow(
    row: QcewRawDataRow,
    vintage: SourceVintageMetadata,
    officialUrl?: string,
    retrievalTimestamp?: string,
  ): EconomyObservationRecord[] {
    const rawFips = row.area_fips;
    if (!rawFips) return [];

    const geoFips = normalizeFips(rawFips);
    const geoLevel = determineGeoLevel(geoFips);
    const stateAbbr = getStateAbbrFromFips(geoFips);
    const geoName = (row.area_title || "").trim();

    const ownCode = String(row.own_code ?? "0").trim() as QcewOwnershipCode;
    const ownTitle = OWNERSHIP_TITLES[ownCode] || "Total Covered";

    const rawIndustry = String(row.industry_code ?? "10").trim();
    const naicsValidation = validateNaicsCode(rawIndustry);
    const naicsCode = naicsValidation.valid ? rawIndustry : "10";
    const naicsTitle = getNaicsTitle(naicsCode);

    const yearNum = parseInt(String(row.year ?? "2022"), 10);
    const year = !isNaN(yearNum) ? yearNum : 2022;
    const qtrStr = String(row.qtr ?? "0").trim();
    const isAnnual = qtrStr === "0" || qtrStr === "A" || qtrStr === "";

    const isSuppressedRow =
      row.disclosure_code === "N" ||
      row.disclosure_code === "C" ||
      row.disclosure_code === "D";

    const records: EconomyObservationRecord[] = [];

    if (isAnnual) {
      // Annual Average Records
      const periodLabel = String(year);
      const periodStartDate = `${year}-01-01`;
      const periodEndDate = `${year}-12-31`;

      // 1. Establishments
      if (row.annual_avg_estabs !== undefined) {
        records.push(
          this.createRecord({
            geoFips,
            geoName,
            geoLevel,
            stateAbbr,
            category: "establishments",
            measureCode: "QCEW-ANNUAL-AVG-ESTABS",
            measureName: "Annual Average Establishment Count",
            naicsCode,
            naicsTitle,
            ownershipCode: ownCode,
            ownershipTitle: ownTitle,
            frequency: "annual",
            year,
            quarter: null,
            month: null,
            periodLabel,
            periodStartDate,
            periodEndDate,
            unit: createEstablishmentsCountUnit(),
            rawVal: row.annual_avg_estabs,
            rowSuppression: isSuppressedRow ? "N" : null,
            vintage,
            officialUrl,
            retrievalTimestamp,
            rawPayload: row,
          }),
        );
      }

      // 2. Annual Average Employment
      if (row.annual_avg_emplvl !== undefined) {
        records.push(
          this.createRecord({
            geoFips,
            geoName,
            geoLevel,
            stateAbbr,
            category: "employment",
            measureCode: "QCEW-ANNUAL-AVG-EMPLVL",
            measureName: "Annual Average Employment Level",
            naicsCode,
            naicsTitle,
            ownershipCode: ownCode,
            ownershipTitle: ownTitle,
            frequency: "annual",
            year,
            quarter: null,
            month: null,
            periodLabel,
            periodStartDate,
            periodEndDate,
            unit: createJobsCountUnit(),
            rawVal: row.annual_avg_emplvl,
            rowSuppression: isSuppressedRow ? "N" : null,
            vintage,
            officialUrl,
            retrievalTimestamp,
            rawPayload: row,
          }),
        );
      }

      // 3. Total Annual Wages (in exact dollars)
      if (row.total_annual_wages !== undefined) {
        records.push(
          this.createRecord({
            geoFips,
            geoName,
            geoLevel,
            stateAbbr,
            category: "wages",
            measureCode: "QCEW-TOTAL-ANNUAL-WAGES",
            measureName: "Total Annual Wages",
            naicsCode,
            naicsTitle,
            ownershipCode: ownCode,
            ownershipTitle: ownTitle,
            frequency: "annual",
            year,
            quarter: null,
            month: null,
            periodLabel,
            periodStartDate,
            periodEndDate,
            unit: createNominalDollarUnit(1, "Dollars"),
            rawVal: row.total_annual_wages,
            rowSuppression: isSuppressedRow ? "N" : null,
            vintage,
            officialUrl,
            retrievalTimestamp,
            rawPayload: row,
          }),
        );
      }

      // 4. Annual Average Weekly Wage (in exact dollars)
      if (
        row.annual_avg_wkly_wage !== undefined ||
        row.avg_wkly_wage !== undefined
      ) {
        const val = row.annual_avg_wkly_wage ?? row.avg_wkly_wage;
        records.push(
          this.createRecord({
            geoFips,
            geoName,
            geoLevel,
            stateAbbr,
            category: "average_wage",
            measureCode: "QCEW-ANNUAL-AVG-WKLY-WAGE",
            measureName: "Annual Average Weekly Wage",
            naicsCode,
            naicsTitle,
            ownershipCode: ownCode,
            ownershipTitle: ownTitle,
            frequency: "annual",
            year,
            quarter: null,
            month: null,
            periodLabel,
            periodStartDate,
            periodEndDate,
            unit: createNominalDollarUnit(1, "Dollars"),
            rawVal: val,
            rowSuppression: isSuppressedRow ? "N" : null,
            vintage,
            officialUrl,
            retrievalTimestamp,
            rawPayload: row,
          }),
        );
      }

      // 5. Average Annual Pay (in exact dollars)
      if (row.avg_annual_pay !== undefined) {
        records.push(
          this.createRecord({
            geoFips,
            geoName,
            geoLevel,
            stateAbbr,
            category: "average_wage",
            measureCode: "QCEW-AVG-ANNUAL-PAY",
            measureName: "Average Annual Pay",
            naicsCode,
            naicsTitle,
            ownershipCode: ownCode,
            ownershipTitle: ownTitle,
            frequency: "annual",
            year,
            quarter: null,
            month: null,
            periodLabel,
            periodStartDate,
            periodEndDate,
            unit: createNominalDollarUnit(1, "Dollars"),
            rawVal: row.avg_annual_pay,
            rowSuppression: isSuppressedRow ? "N" : null,
            vintage,
            officialUrl,
            retrievalTimestamp,
            rawPayload: row,
          }),
        );
      }
    } else {
      // Quarterly Records
      const qNum = parseInt(qtrStr, 10);
      const validQtr = !isNaN(qNum) ? qNum : 1;
      const periodLabel = `${year}Q${validQtr}`;
      const startMonth = (validQtr - 1) * 3 + 1;
      const endMonth = validQtr * 3;
      const startMonthStr = String(startMonth).padStart(2, "0");
      const endMonthStr = String(endMonth).padStart(2, "0");
      const endDay = validQtr === 1 || validQtr === 4 ? "31" : "30";

      const periodStartDate = `${year}-${startMonthStr}-01`;
      const periodEndDate = `${year}-${endMonthStr}-${endDay}`;

      // Quarterly Establishments
      if (row.qtrly_estabs !== undefined) {
        records.push(
          this.createRecord({
            geoFips,
            geoName,
            geoLevel,
            stateAbbr,
            category: "establishments",
            measureCode: "QCEW-QTRLY-ESTABS",
            measureName: "Quarterly Establishment Count",
            naicsCode,
            naicsTitle,
            ownershipCode: ownCode,
            ownershipTitle: ownTitle,
            frequency: "quarterly",
            year,
            quarter: validQtr,
            month: null,
            periodLabel,
            periodStartDate,
            periodEndDate,
            unit: createEstablishmentsCountUnit(),
            rawVal: row.qtrly_estabs,
            rowSuppression: isSuppressedRow ? "N" : null,
            vintage,
            officialUrl,
            retrievalTimestamp,
            rawPayload: row,
          }),
        );
      }

      // Total Quarterly Wages
      if (row.total_qtrly_wages !== undefined) {
        records.push(
          this.createRecord({
            geoFips,
            geoName,
            geoLevel,
            stateAbbr,
            category: "wages",
            measureCode: "QCEW-TOTAL-QTRLY-WAGES",
            measureName: "Total Quarterly Wages",
            naicsCode,
            naicsTitle,
            ownershipCode: ownCode,
            ownershipTitle: ownTitle,
            frequency: "quarterly",
            year,
            quarter: validQtr,
            month: null,
            periodLabel,
            periodStartDate,
            periodEndDate,
            unit: createNominalDollarUnit(1, "Dollars"),
            rawVal: row.total_qtrly_wages,
            rowSuppression: isSuppressedRow ? "N" : null,
            vintage,
            officialUrl,
            retrievalTimestamp,
            rawPayload: row,
          }),
        );
      }

      // Quarterly Average Weekly Wage
      if (row.avg_wkly_wage !== undefined) {
        records.push(
          this.createRecord({
            geoFips,
            geoName,
            geoLevel,
            stateAbbr,
            category: "average_wage",
            measureCode: "QCEW-AVG-WKLY-WAGE",
            measureName: "Quarterly Average Weekly Wage",
            naicsCode,
            naicsTitle,
            ownershipCode: ownCode,
            ownershipTitle: ownTitle,
            frequency: "quarterly",
            year,
            quarter: validQtr,
            month: null,
            periodLabel,
            periodStartDate,
            periodEndDate,
            unit: createNominalDollarUnit(1, "Dollars"),
            rawVal: row.avg_wkly_wage,
            rowSuppression: isSuppressedRow ? "N" : null,
            vintage,
            officialUrl,
            retrievalTimestamp,
            rawPayload: row,
          }),
        );
      }

      // Genuine monthly observations if reported
      const months = [
        { num: startMonth, val: row.month1_emplvl, code: "M1" },
        { num: startMonth + 1, val: row.month2_emplvl, code: "M2" },
        { num: startMonth + 2, val: row.month3_emplvl, code: "M3" },
      ];

      for (const m of months) {
        if (m.val !== undefined && m.val !== null) {
          const mStr = String(m.num).padStart(2, "0");
          const mLabel = `${year}M${mStr}`;
          const lastDay = [1, 3, 5, 7, 8, 10, 12].includes(m.num)
            ? "31"
            : m.num === 2
              ? year % 4 === 0
                ? "29"
                : "28"
              : "30";

          records.push(
            this.createRecord({
              geoFips,
              geoName,
              geoLevel,
              stateAbbr,
              category: "employment",
              measureCode: `QCEW-MONTHLY-EMPLVL`,
              measureName: "Monthly Employment Level",
              naicsCode,
              naicsTitle,
              ownershipCode: ownCode,
              ownershipTitle: ownTitle,
              frequency: "monthly",
              year,
              quarter: validQtr,
              month: m.num,
              periodLabel: mLabel,
              periodStartDate: `${year}-${mStr}-01`,
              periodEndDate: `${year}-${mStr}-${lastDay}`,
              unit: createJobsCountUnit(),
              rawVal: m.val,
              rowSuppression: isSuppressedRow ? "N" : null,
              vintage,
              officialUrl,
              retrievalTimestamp,
              rawPayload: row,
            }),
          );
        }
      }
    }

    return records;
  }

  private createRecord(params: {
    geoFips: string;
    geoName: string;
    geoLevel: GeographicLevel;
    stateAbbr: string;
    category: EconomyMeasureCategory;
    measureCode: string;
    measureName: string;
    naicsCode: string;
    naicsTitle: string;
    ownershipCode: QcewOwnershipCode;
    ownershipTitle: QcewOwnershipTitle;
    frequency: FrequencyType;
    year: number;
    quarter: number | null;
    month: number | null;
    periodLabel: string;
    periodStartDate: string;
    periodEndDate: string;
    unit: ValueUnit;
    rawVal: unknown;
    rowSuppression: string | null;
    vintage: SourceVintageMetadata;
    officialUrl?: string;
    retrievalTimestamp?: string;
    rawPayload: unknown;
  }): EconomyObservationRecord {
    const rawCode =
      params.rowSuppression ||
      (params.rawVal === "N" || params.rawVal === "C"
        ? String(params.rawVal)
        : null);
    const suppression = rawCode
      ? {
          isSuppressed: true,
          status: "suppressed_confidential" as const,
          code: rawCode,
          numericValue: null,
        }
      : classifySuppression(params.rawVal);

    const observationId = buildObservationId({
      geoFips: params.geoFips,
      provider: this.provider,
      measureCode: params.measureCode,
      naicsCode: params.naicsCode,
      ownershipCode: params.ownershipCode,
      periodLabel: params.periodLabel,
      vintageId: params.vintage.vintageId,
    });

    const provenance = buildEconomyProvenance({
      provider: this.provider,
      providerSeriesId: `QCEW_${params.geoFips}_${params.naicsCode}_OWN${params.ownershipCode}_${params.measureCode}`,
      vintageId: params.vintage.vintageId,
      tableOrDataset: "QCEW",
      lineCodeOrField: params.measureCode,
      officialSourceUrl: params.officialUrl || "https://www.bls.gov/cew/",
      retrievalTimestamp: params.retrievalTimestamp,
      rawPayload: params.rawPayload,
    });

    const rawValue =
      typeof params.rawVal === "string" || typeof params.rawVal === "number"
        ? params.rawVal
        : null;

    return {
      observationId,
      geoFips: params.geoFips,
      geoName: params.geoName,
      geoLevel: params.geoLevel,
      stateAbbr: params.stateAbbr,
      category: params.category,
      measureCode: params.measureCode,
      measureName: params.measureName,
      naicsCode: params.naicsCode,
      naicsTitle: params.naicsTitle,
      ownershipCode: params.ownershipCode,
      ownershipTitle: params.ownershipTitle,
      frequency: params.frequency,
      year: params.year,
      quarter: params.quarter,
      month: params.month,
      periodLabel: params.periodLabel,
      periodStartDate: params.periodStartDate,
      periodEndDate: params.periodEndDate,
      unit: params.unit,
      value: suppression.numericValue,
      rawValue,
      isSuppressed: suppression.isSuppressed,
      suppressionStatus: suppression.status,
      suppressionCode: suppression.code,
      provenance,
    };
  }
}

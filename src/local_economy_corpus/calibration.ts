/**
 * Local Economy Calibration & Analytical Query Engine
 *
 * Provides pure query utilities over normalized observation records:
 * - Location Quotients (industry concentration vs state/nation)
 * - Economic dependency profiles (goods vs services, transfer receipts dependence, proprietor share)
 * - Wage level comparisons
 * - Cyclical growth & recession indicators
 *
 * Invariant: Does not implement causal simulation; computes inspectable metrics from source records.
 */

import { assertUnitCompatibility } from "./units.js";
import type {
  EconomicStructureProfile,
  EconomyObservationRecord,
  LocationQuotientResult,
  NormalizedEconomyCorpusPackage,
} from "./types.js";

export class EconomyCorpusQueryEngine {
  private readonly observations: EconomyObservationRecord[];

  constructor(
    corpusOrObservations:
      NormalizedEconomyCorpusPackage | EconomyObservationRecord[],
  ) {
    if (Array.isArray(corpusOrObservations)) {
      this.observations = corpusOrObservations;
    } else {
      this.observations = corpusOrObservations.observations;
    }
  }

  public findObservation(params: {
    geoFips: string;
    category?: string;
    measureCode?: string;
    naicsCode?: string | null;
    ownershipCode?: string | null;
    year: number;
    quarter?: number | null;
    frequency?: string;
    vintageId?: string;
  }): EconomyObservationRecord | undefined {
    return this.observations.find((obs) => {
      if (obs.geoFips !== params.geoFips) return false;
      if (obs.year !== params.year) return false;
      if (params.category && obs.category !== params.category) return false;
      if (params.measureCode && obs.measureCode !== params.measureCode)
        return false;
      if (params.naicsCode !== undefined && obs.naicsCode !== params.naicsCode)
        return false;
      if (
        params.ownershipCode !== undefined &&
        obs.ownershipCode !== params.ownershipCode
      )
        return false;
      if (params.quarter !== undefined && obs.quarter !== params.quarter)
        return false;
      if (params.frequency && obs.frequency !== params.frequency) return false;
      if (params.vintageId && obs.provenance.vintageId !== params.vintageId)
        return false;
      return true;
    });
  }

  public filterObservations(
    predicate: (obs: EconomyObservationRecord) => boolean,
  ): EconomyObservationRecord[] {
    return this.observations.filter(predicate);
  }

  /**
   * Calculates Location Quotient (LQ) for an industry in a local area relative to a benchmark (state or US).
   * Formula: LQ = (local_industry_emp / local_total_emp) / (bench_industry_emp / bench_total_emp)
   */
  public calculateLocationQuotient(params: {
    geoFips: string;
    benchmarkFips: string;
    naicsCode: string;
    year: number;
    ownershipCode?: string | null;
    vintageId?: string;
  }): LocationQuotientResult {
    // Determine target ownership code: if not specified, find available ownership for local industry
    let ownCode = params.ownershipCode;
    if (ownCode === undefined) {
      const candidatePrivate = this.findObservation({
        geoFips: params.geoFips,
        category: "employment",
        naicsCode: params.naicsCode,
        ownershipCode: "5",
        year: params.year,
        frequency: "annual",
        vintageId: params.vintageId,
      });
      ownCode = candidatePrivate ? "5" : "0";
    }

    // 1. Find local industry employment
    const localIndObs = this.findObservation({
      geoFips: params.geoFips,
      category: "employment",
      naicsCode: params.naicsCode,
      ownershipCode: ownCode,
      year: params.year,
      frequency: "annual",
      vintageId: params.vintageId,
    });

    // 2. Find local total employment (NAICS 10)
    const localTotObs = this.findObservation({
      geoFips: params.geoFips,
      category: "employment",
      naicsCode: "10",
      ownershipCode: ownCode,
      year: params.year,
      frequency: "annual",
      vintageId: params.vintageId,
    });

    // 3. Find benchmark industry employment
    const benchIndObs = this.findObservation({
      geoFips: params.benchmarkFips,
      category: "employment",
      naicsCode: params.naicsCode,
      ownershipCode: ownCode,
      year: params.year,
      frequency: "annual",
      vintageId: params.vintageId,
    });

    // 4. Find benchmark total employment (NAICS 10)
    const benchTotObs = this.findObservation({
      geoFips: params.benchmarkFips,
      category: "employment",
      naicsCode: "10",
      ownershipCode: ownCode,
      year: params.year,
      frequency: "annual",
      vintageId: params.vintageId,
    });

    const localName =
      localTotObs?.geoName || localIndObs?.geoName || params.geoFips;
    const benchName =
      benchTotObs?.geoName || benchIndObs?.geoName || params.benchmarkFips;
    const naicsTitle =
      localIndObs?.naicsTitle ||
      benchIndObs?.naicsTitle ||
      `NAICS ${params.naicsCode}`;

    // Check if missing
    if (!localIndObs || !localTotObs || !benchIndObs || !benchTotObs) {
      return {
        geoFips: params.geoFips,
        geoName: localName,
        benchmarkFips: params.benchmarkFips,
        benchmarkName: benchName,
        naicsCode: params.naicsCode,
        naicsTitle,
        year: params.year,
        localEmployment: localIndObs?.value ?? null,
        localTotalEmployment: localTotObs?.value ?? null,
        benchmarkEmployment: benchIndObs?.value ?? null,
        benchmarkTotalEmployment: benchTotObs?.value ?? null,
        locationQuotient: null,
        isSuppressed: false,
        status: "unavailable",
      };
    }

    // Check suppression
    if (
      localIndObs.isSuppressed ||
      localTotObs.isSuppressed ||
      benchIndObs.isSuppressed ||
      benchTotObs.isSuppressed ||
      localIndObs.value === null ||
      localTotObs.value === null ||
      benchIndObs.value === null ||
      benchTotObs.value === null
    ) {
      return {
        geoFips: params.geoFips,
        geoName: localName,
        benchmarkFips: params.benchmarkFips,
        benchmarkName: benchName,
        naicsCode: params.naicsCode,
        naicsTitle,
        year: params.year,
        localEmployment: localIndObs.value,
        localTotalEmployment: localTotObs.value,
        benchmarkEmployment: benchIndObs.value,
        benchmarkTotalEmployment: benchTotObs.value,
        locationQuotient: null,
        isSuppressed: true,
        status: "suppressed",
      };
    }

    const localInd = localIndObs.value;
    const localTot = localTotObs.value;
    const benchInd = benchIndObs.value;
    const benchTot = benchTotObs.value;

    if (localTot <= 0 || benchTot <= 0 || benchInd <= 0) {
      return {
        geoFips: params.geoFips,
        geoName: localName,
        benchmarkFips: params.benchmarkFips,
        benchmarkName: benchName,
        naicsCode: params.naicsCode,
        naicsTitle,
        year: params.year,
        localEmployment: localInd,
        localTotalEmployment: localTot,
        benchmarkEmployment: benchInd,
        benchmarkTotalEmployment: benchTot,
        locationQuotient: null,
        isSuppressed: false,
        status: "zero_denominator",
      };
    }

    const localShare = localInd / localTot;
    const benchShare = benchInd / benchTot;
    const lq = localShare / benchShare;

    return {
      geoFips: params.geoFips,
      geoName: localName,
      benchmarkFips: params.benchmarkFips,
      benchmarkName: benchName,
      naicsCode: params.naicsCode,
      naicsTitle,
      year: params.year,
      localEmployment: localInd,
      localTotalEmployment: localTot,
      benchmarkEmployment: benchInd,
      benchmarkTotalEmployment: benchTot,
      locationQuotient: Math.round(lq * 1000) / 1000,
      isSuppressed: false,
      status: "valid",
    };
  }

  /**
   * Builds an economic structure summary profile for a county or state in a specific year.
   */
  public buildEconomicStructureProfile(params: {
    geoFips: string;
    year: number;
    vintageId?: string;
  }): EconomicStructureProfile {
    const geoFips = params.geoFips;
    const year = params.year;

    // Nominal GDP (CAGDP1 line 3)
    const nomGdpObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.category === "gdp" &&
        o.unit.kind === "currency" &&
        o.unit.priceBasis === "nominal",
    );

    // Real GDP (CAGDP9 line 1)
    const realGdpObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.category === "gdp" &&
        o.unit.kind === "currency" &&
        o.unit.priceBasis === "real",
    );

    // Personal Income (CAINC1 line 10)
    const piObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.category === "personal_income" &&
        o.measureCode.includes("10"),
    );

    // Per Capita Income (CAINC1 line 30)
    const pciObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.category === "per_capita_income",
    );

    // Population (CAINC1 line 20)
    const popObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips && o.year === year && o.category === "population",
    );

    // Total Employment (CAEMP25 line 10)
    const totEmpObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.category === "employment" &&
        (o.measureCode === "CAEMP25-10" ||
          (o.provenance.tableOrDataset.includes("EMP") &&
            o.measureCode.includes("10"))),
    );

    // Wage & Salary Jobs (CAEMP25 line 20)
    const wageJobsObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.category === "employment" &&
        o.measureCode.includes("20") &&
        o.provenance.tableOrDataset.includes("EMP"),
    );

    // Proprietors Jobs (CAEMP25 line 40)
    const propJobsObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.category === "employment" &&
        o.measureCode.includes("40") &&
        o.provenance.tableOrDataset.includes("EMP"),
    );

    // Transfer receipts (CAINC4 line 30)
    const transferObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.category === "transfer_receipts",
    );

    // Net earnings (CAINC4 line 20)
    const earningsObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.category === "earnings" &&
        o.measureCode.includes("20"),
    );

    // Dividends, interest, rent (CAINC4 line 40)
    const divRentObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.category === "personal_income" &&
        o.measureCode.includes("40"),
    );

    // QCEW Goods (NAICS 101) & Services (NAICS 102)
    const goodsEmpObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.category === "employment" &&
        o.naicsCode === "101" &&
        o.frequency === "annual",
    );

    const servEmpObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.category === "employment" &&
        o.naicsCode === "102" &&
        o.frequency === "annual",
    );

    // QCEW Private (own 5) vs Gov (own 1, 2, 3)
    const privEmpObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.category === "employment" &&
        o.naicsCode === "10" &&
        o.ownershipCode === "5" &&
        o.frequency === "annual",
    );

    const totCoveredEmpObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.category === "employment" &&
        o.naicsCode === "10" &&
        o.ownershipCode === "0" &&
        o.frequency === "annual",
    );

    // Average pay & wage
    const avgPayObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.measureCode === "QCEW-AVG-ANNUAL-PAY" &&
        o.ownershipCode === "0",
    );

    const avgPayPrivObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.measureCode === "QCEW-AVG-ANNUAL-PAY" &&
        o.ownershipCode === "5",
    );

    const avgWkWageObs = this.observations.find(
      (o) =>
        o.geoFips === geoFips &&
        o.year === year &&
        o.measureCode.includes("WKLY-WAGE") &&
        o.ownershipCode === "0" &&
        o.frequency === "annual",
    );

    const geoName =
      nomGdpObs?.geoName ||
      piObs?.geoName ||
      totCoveredEmpObs?.geoName ||
      geoFips;

    const vintageId =
      nomGdpObs?.provenance.vintageId ||
      piObs?.provenance.vintageId ||
      totCoveredEmpObs?.provenance.vintageId ||
      "unknown";

    // Compute shares
    let proprietorShareOfJobs: number | undefined;
    if (
      propJobsObs?.value !== undefined &&
      propJobsObs.value !== null &&
      totEmpObs?.value !== undefined &&
      totEmpObs.value !== null &&
      totEmpObs.value > 0
    ) {
      proprietorShareOfJobs =
        Math.round((propJobsObs.value / totEmpObs.value) * 10000) / 10000;
    }

    let transferShareOfPersonalIncome: number | undefined;
    if (
      transferObs?.value !== undefined &&
      transferObs.value !== null &&
      piObs?.value !== undefined &&
      piObs.value !== null &&
      piObs.value > 0
    ) {
      transferShareOfPersonalIncome =
        Math.round((transferObs.value / piObs.value) * 10000) / 10000;
    }

    let goodsProducingShare: number | undefined;
    let serviceProvidingShare: number | undefined;
    if (
      goodsEmpObs?.value !== undefined &&
      goodsEmpObs.value !== null &&
      servEmpObs?.value !== undefined &&
      servEmpObs.value !== null
    ) {
      const sum = goodsEmpObs.value + servEmpObs.value;
      if (sum > 0) {
        goodsProducingShare =
          Math.round((goodsEmpObs.value / sum) * 10000) / 10000;
        serviceProvidingShare =
          Math.round((servEmpObs.value / sum) * 10000) / 10000;
      }
    }

    let governmentEmployment: number | undefined;
    let governmentShareOfEmployment: number | undefined;
    if (
      totCoveredEmpObs?.value !== undefined &&
      totCoveredEmpObs.value !== null &&
      privEmpObs?.value !== undefined &&
      privEmpObs.value !== null
    ) {
      governmentEmployment = totCoveredEmpObs.value - privEmpObs.value;
      if (totCoveredEmpObs.value > 0 && governmentEmployment >= 0) {
        governmentShareOfEmployment =
          Math.round((governmentEmployment / totCoveredEmpObs.value) * 10000) /
          10000;
      }
    }

    return {
      geoFips,
      geoName,
      year,
      vintageId,
      totalGdpNominalUsd: nomGdpObs?.value ?? undefined,
      totalGdpRealUsd: realGdpObs?.value ?? undefined,
      totalPersonalIncomeNominalUsd: piObs?.value ?? undefined,
      perCapitaPersonalIncomeUsd: pciObs?.value ?? undefined,
      population: popObs?.value ?? undefined,
      totalEmploymentJobs: totEmpObs?.value ?? undefined,
      wageAndSalaryJobs: wageJobsObs?.value ?? undefined,
      proprietorsJobs: propJobsObs?.value ?? undefined,
      proprietorShareOfJobs,
      netEarningsNominalUsd: earningsObs?.value ?? undefined,
      transferReceiptsNominalUsd: transferObs?.value ?? undefined,
      transferShareOfPersonalIncome,
      dividendsInterestRentNominalUsd: divRentObs?.value ?? undefined,
      goodsProducingEmployment: goodsEmpObs?.value ?? undefined,
      serviceProvidingEmployment: servEmpObs?.value ?? undefined,
      goodsProducingShare,
      serviceProvidingShare,
      privateEmployment: privEmpObs?.value ?? undefined,
      governmentEmployment,
      governmentShareOfEmployment,
      averageAnnualPayTotalCoveredUsd: avgPayObs?.value ?? undefined,
      averageAnnualPayPrivateUsd: avgPayPrivObs?.value ?? undefined,
      averageWeeklyWageTotalCoveredUsd: avgWkWageObs?.value ?? undefined,
    };
  }

  /**
   * Calculates Year-over-Year growth rates for Real GDP, strictly enforcing price basis compatibility.
   */
  public calculateRealGdpGrowth(params: {
    geoFips: string;
    startYear: number;
    endYear: number;
  }): {
    growthRate: number;
    startValue: number;
    endValue: number;
    unit: string;
  } | null {
    const obsStart = this.observations.find(
      (o) =>
        o.geoFips === params.geoFips &&
        o.year === params.startYear &&
        o.category === "gdp" &&
        o.unit.kind === "currency" &&
        o.unit.priceBasis === "real",
    );

    const obsEnd = this.observations.find(
      (o) =>
        o.geoFips === params.geoFips &&
        o.year === params.endYear &&
        o.category === "gdp" &&
        o.unit.kind === "currency" &&
        o.unit.priceBasis === "real",
    );

    if (
      !obsStart ||
      !obsEnd ||
      obsStart.value === null ||
      obsEnd.value === null
    ) {
      return null;
    }

    // Strict compatibility check
    assertUnitCompatibility(obsStart.unit, obsEnd.unit);

    if (obsStart.value === 0) return null;

    const growth = (obsEnd.value - obsStart.value) / obsStart.value;
    return {
      growthRate: Math.round(growth * 10000) / 10000,
      startValue: obsStart.value,
      endValue: obsEnd.value,
      unit: obsStart.unit.displayUnit,
    };
  }
}

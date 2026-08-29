/**
 * Local Economy & Labor-Market Source Corpus Compiler
 *
 * Ingests, normalizes, indexes, and compiles deterministic, checksummed packages
 * containing BEA Regional Accounts and BLS QCEW datasets.
 */

import crypto from "node:crypto";
import { BeaAdapter } from "./adapters/bea_adapter.js";
import { QcewAdapter } from "./adapters/qcew_adapter.js";
import { COMPILER_VERSION } from "./provenance.js";
import type {
  AdapterNormalizationOptions,
  EconomySourceAdapter,
} from "./adapters/adapter_interface.js";
import type {
  EconomyObservationRecord,
  EconomyProvider,
  EconomySeriesSummary,
  LocalEconomyJurisdictionSummary,
  LocalEconomyManifest,
  NormalizedEconomyCorpusPackage,
  SourceVintageMetadata,
} from "./types.js";

export interface IngestionEntry {
  provider: EconomyProvider;
  raw: unknown;
  options?: AdapterNormalizationOptions;
}

export class LocalEconomyCorpusCompiler {
  private readonly adapters: Map<EconomyProvider, EconomySourceAdapter> =
    new Map();
  private readonly observationsMap: Map<string, EconomyObservationRecord> =
    new Map();
  private readonly vintagesMap: Map<string, SourceVintageMetadata> = new Map();

  constructor() {
    this.registerAdapter(new BeaAdapter());
    this.registerAdapter(new QcewAdapter());
  }

  public registerAdapter(adapter: EconomySourceAdapter): void {
    this.adapters.set(adapter.provider, adapter);
    const defVintage = adapter.getDefaultVintage();
    if (defVintage) {
      this.vintagesMap.set(defVintage.vintageId, defVintage);
    }
  }

  public registerVintage(vintage: SourceVintageMetadata): void {
    this.vintagesMap.set(vintage.vintageId, vintage);
  }

  public ingest(entry: IngestionEntry): number {
    const adapter = this.adapters.get(entry.provider);
    if (!adapter) {
      throw new Error(`No adapter registered for provider: ${entry.provider}`);
    }

    const records = adapter.normalizeDataset(entry.raw, entry.options);
    let count = 0;

    for (const record of records) {
      this.observationsMap.set(record.observationId, record);
      if (entry.options?.vintageOverride) {
        this.registerVintage({
          ...adapter.getDefaultVintage(),
          ...entry.options.vintageOverride,
        });
      }
      count++;
    }

    return count;
  }

  public compile(timestampOverride?: string): NormalizedEconomyCorpusPackage {
    const compiledAt = timestampOverride || new Date().toISOString();

    // 1. Sort observations deterministically
    const observations = Array.from(this.observationsMap.values()).sort(
      (a, b) => {
        if (a.geoFips !== b.geoFips) return a.geoFips.localeCompare(b.geoFips);
        if (a.measureCode !== b.measureCode)
          return a.measureCode.localeCompare(b.measureCode);
        const naicsA = a.naicsCode || "";
        const naicsB = b.naicsCode || "";
        if (naicsA !== naicsB) return naicsA.localeCompare(naicsB);
        const ownA = a.ownershipCode || "";
        const ownB = b.ownershipCode || "";
        if (ownA !== ownB) return ownA.localeCompare(ownB);
        if (a.year !== b.year) return a.year - b.year;
        if (a.periodLabel !== b.periodLabel)
          return a.periodLabel.localeCompare(b.periodLabel);
        return a.provenance.vintageId.localeCompare(b.provenance.vintageId);
      },
    );

    // 2. Aggregate Series Summaries
    const seriesMap = new Map<string, EconomySeriesSummary>();
    for (const obs of observations) {
      const ownPart = obs.ownershipCode || "0";
      const naicsPart = obs.naicsCode || "all";
      const seriesKey = `${obs.geoFips}_${obs.measureCode}_${naicsPart}_own${ownPart}_${obs.frequency}`;

      let series = seriesMap.get(seriesKey);
      if (!series) {
        series = {
          seriesKey,
          geoFips: obs.geoFips,
          geoName: obs.geoName,
          geoLevel: obs.geoLevel,
          category: obs.category,
          measureCode: obs.measureCode,
          measureName: obs.measureName,
          naicsCode: obs.naicsCode,
          frequency: obs.frequency,
          unit: obs.unit,
          firstYear: obs.year,
          lastYear: obs.year,
          observationCount: 0,
          suppressedCount: 0,
          vintages: [],
        };
        seriesMap.set(seriesKey, series);
      }

      series.observationCount++;
      if (obs.isSuppressed) {
        series.suppressedCount++;
      }
      if (obs.year < series.firstYear) series.firstYear = obs.year;
      if (obs.year > series.lastYear) series.lastYear = obs.year;
      if (!series.vintages.includes(obs.provenance.vintageId)) {
        series.vintages.push(obs.provenance.vintageId);
      }
    }

    const series = Array.from(seriesMap.values()).sort((a, b) =>
      a.seriesKey.localeCompare(b.seriesKey),
    );

    // 3. Aggregate Jurisdiction Summaries
    const jurisdictionsMap = new Map<string, LocalEconomyJurisdictionSummary>();
    for (const obs of observations) {
      let jur = jurisdictionsMap.get(obs.geoFips);
      if (!jur) {
        jur = {
          geoFips: obs.geoFips,
          geoName: obs.geoName,
          geoLevel: obs.geoLevel,
          stateAbbr: obs.stateAbbr,
          hasBeaRegional: false,
          hasQcew: false,
          coveredYears: [],
          totalObservations: 0,
          categoriesPresent: [],
          naicsSectorsPresent: [],
        };
        jurisdictionsMap.set(obs.geoFips, jur);
      }

      jur.totalObservations++;
      if (obs.provenance.provider === "bea_regional") jur.hasBeaRegional = true;
      if (obs.provenance.provider === "bls_qcew") jur.hasQcew = true;

      if (!jur.coveredYears.includes(obs.year)) {
        jur.coveredYears.push(obs.year);
      }
      if (!jur.categoriesPresent.includes(obs.category)) {
        jur.categoriesPresent.push(obs.category);
      }
      if (obs.naicsCode && !jur.naicsSectorsPresent.includes(obs.naicsCode)) {
        jur.naicsSectorsPresent.push(obs.naicsCode);
      }
    }

    for (const jur of jurisdictionsMap.values()) {
      jur.coveredYears.sort((a, b) => a - b);
      jur.categoriesPresent.sort();
      jur.naicsSectorsPresent.sort();
    }

    const sortedJurisdictions: Record<string, LocalEconomyJurisdictionSummary> =
      {};
    const sortedFipsKeys = Array.from(jurisdictionsMap.keys()).sort();
    for (const k of sortedFipsKeys) {
      sortedJurisdictions[k] = jurisdictionsMap.get(k)!;
    }

    // 4. Vintages
    const vintages = Array.from(this.vintagesMap.values()).sort((a, b) =>
      a.vintageId.localeCompare(b.vintageId),
    );

    // 5. Build Manifest
    const manifestWithoutHash = {
      manifestVersion: "1.0.0",
      generatedAt: compiledAt,
      compilerVersion: COMPILER_VERSION,
      totalJurisdictions: sortedFipsKeys.length,
      totalObservations: observations.length,
      totalSeries: series.length,
      vintages,
      jurisdictions: sortedJurisdictions,
      providers: {
        bea: {
          name: "Bureau of Economic Analysis (BEA) Regional Economic Accounts",
          documentationUrl:
            "https://www.bea.gov/data/economic-accounts/regional",
          apiBaseUrl: "https://apps.bea.gov/api/data",
        },
        bls_qcew: {
          name: "Bureau of Labor Statistics (BLS) Quarterly Census of Employment and Wages",
          documentationUrl: "https://www.bls.gov/cew/",
          apiBaseUrl: "https://data.bls.gov/cew/data/api",
        },
      },
    };

    const manifestSha = crypto
      .createHash("sha256")
      .update(JSON.stringify(manifestWithoutHash))
      .digest("hex");

    const manifest: LocalEconomyManifest = {
      ...manifestWithoutHash,
      sha256: manifestSha,
    };

    // 6. Compute Record Counts
    let suppressedObservations = 0;
    let realDollarObservations = 0;
    let nominalDollarObservations = 0;

    for (const obs of observations) {
      if (obs.isSuppressed) suppressedObservations++;
      if (obs.unit.kind === "currency") {
        if (obs.unit.priceBasis === "real") realDollarObservations++;
        if (obs.unit.priceBasis === "nominal") nominalDollarObservations++;
      }
    }

    const recordCounts = {
      totalObservations: observations.length,
      totalSeries: series.length,
      totalJurisdictions: sortedFipsKeys.length,
      totalVintages: vintages.length,
      suppressedObservations,
      realDollarObservations,
      nominalDollarObservations,
    };

    const corpusPayload = {
      manifest,
      vintages,
      observations,
      series,
      buildMetadata: {
        compiledAt,
        compilerVersion: COMPILER_VERSION,
        recordCounts,
        checksum: "",
      },
    };

    const checksum = crypto
      .createHash("sha256")
      .update(JSON.stringify({ manifest, observations, series }))
      .digest("hex");

    corpusPayload.buildMetadata.checksum = checksum;

    return corpusPayload;
  }
}

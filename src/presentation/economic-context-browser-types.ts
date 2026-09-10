export type BrowserReleaseStatus = "FINAL" | "PRELIMINARY" | "REVISED";
export type BrowserBeaGeographyLevel =
  "nation" | "state" | "county" | "msa" | "region-or-aggregate";
export type BrowserBeaValuationKind =
  "currency-amount" | "currency-per-person" | "headcount" | "index";

export interface BrowserEvidence {
  readonly artifactId: string;
  readonly providerNativeId?: string;
  readonly locator: { readonly artifactId: string };
}

export interface BrowserNormalizedCorpus {
  readonly corpusId: string;
  readonly compiler: { readonly name: string; readonly version: string };
  readonly parser: { readonly name: string; readonly version: string };
  readonly inputs: readonly {
    readonly artifactId: string;
    readonly sha256: string;
  }[];
  readonly asOf: string;
  readonly recordCount: number;
  readonly canonicalSha256: string;
  readonly inputClass: "production" | "fixture";
  readonly coverage: {
    readonly isCompleteUniverse: boolean;
    readonly universeDescription: string;
    readonly boundedSampleReason: string | null;
  };
}

export interface BrowserArtifactLock {
  readonly domain: string;
  readonly artifacts: readonly {
    readonly artifactId: string;
    readonly provider: string;
    readonly retrieval: {
      readonly url: string;
      readonly method: string;
      readonly retrievedAt: string;
      readonly httpStatus: number;
      readonly responseBytes: number;
    };
    readonly bytes: { readonly length: number; readonly sha256: string };
    readonly mediaType: string;
    readonly publisher: {
      readonly statedVintage: string | null;
      readonly releaseDate: string | null;
      readonly schemaVersion: string | null;
      readonly documentationUrl: string | null;
    };
    readonly storage: "committed" | "cached-not-committed" | "derived-qa-slice";
    readonly localPath: string | null;
    readonly derivation?: {
      readonly parentArtifactId: string;
      readonly parentSha256: string;
      readonly selectionPredicate: string;
    };
  }[];
}

export type BrowserEconomicProduct = "bea" | "laus" | "hud";

export type BrowserEconomicValue =
  | {
      readonly state: "KNOWN";
      readonly value: number;
      readonly release: BrowserReleaseStatus;
      readonly asOf: string;
    }
  | {
      readonly state: "UNKNOWN";
      readonly reason: string;
    };

export interface BrowserBeaRecord {
  readonly recordId: string;
  readonly tableName: string;
  readonly lineCode: string;
  readonly lineDescription: string;
  readonly rowDescription: string;
  readonly geoFips: string;
  readonly geoName: string;
  readonly geographyLevel: BrowserBeaGeographyLevel;
  readonly beaRegion: string | null;
  readonly unit: string;
  readonly valuationKind: BrowserBeaValuationKind;
  readonly year: string;
  readonly value: BrowserEconomicValue;
  readonly evidence: BrowserEvidence;
}

export interface BrowserLausRecord {
  readonly recordId: string;
  readonly seriesId: string;
  readonly seriesTitle: string;
  readonly area: {
    readonly areaCode: string;
    readonly areaText: string;
    readonly areaTypeCode: string;
    readonly areaTypeText: string;
  };
  readonly measure: { readonly code: string; readonly text: string };
  readonly seasonalAdjustmentCode: string;
  readonly year: string;
  readonly period: string;
  readonly isAnnualAverage: boolean;
  readonly footnoteCodes: readonly string[];
  readonly footnoteTexts: readonly string[];
  readonly value: BrowserEconomicValue;
  readonly evidence: BrowserEvidence;
}

export interface BrowserHudRecord {
  readonly recordKind: "fair-market-rent" | "income-limit";
  readonly recordId: string;
  readonly product: "fair-market-rent" | "income-limit";
  readonly productVintage: string;
  readonly area: {
    readonly hudFipsCode: string;
    readonly hudAreaCode: string;
    readonly hudAreaName: string;
    readonly stateUsps: string;
    readonly stateFips: string;
    readonly countyName: string;
    readonly countyTownName: string | null;
    readonly metropolitanIndicator: string;
  };
  readonly evidence: BrowserEvidence;
  readonly publishedPopulation?: number | null;
  readonly rentByBedrooms?: Readonly<
    Record<"0" | "1" | "2" | "3" | "4", number>
  >;
  readonly areaMedianFamilyIncome?: number;
  readonly veryLowIncomeLimitByFamilySize?: Readonly<Record<string, number>>;
  readonly extremelyLowIncomeLimitByFamilySize?: Readonly<
    Record<string, number>
  >;
  readonly lowIncomeLimitByFamilySize?: Readonly<Record<string, number>>;
}

export interface BrowserEconomicShard<T> {
  readonly schemaVersion: "1";
  readonly product: BrowserEconomicProduct;
  readonly shardKey: string;
  readonly records: readonly T[];
}

export interface BrowserEconomicManifest {
  readonly schemaVersion: "1";
  readonly corpora: {
    readonly bea: BrowserNormalizedCorpus;
    readonly laus: BrowserNormalizedCorpus;
    readonly hud: BrowserNormalizedCorpus;
  };
  readonly locks: {
    readonly bea: BrowserArtifactLock;
    readonly laus: BrowserArtifactLock;
    readonly hud: BrowserArtifactLock;
  };
  readonly indexes: {
    readonly bea: Readonly<Record<string, string>>;
    readonly laus: Readonly<Record<string, string>>;
    readonly hud: Readonly<Record<string, string>>;
  };
  readonly coverage: {
    readonly bea: {
      readonly recordCount: number;
      readonly geographyCount: number;
      readonly periods: readonly string[];
    };
    readonly laus: {
      readonly recordCount: number;
      readonly geographyCount: number;
      readonly firstCommittedYear: number;
      readonly unavailableEarlierRangeReason: string;
      readonly pinnedAbsentParentSha256: string;
    };
    readonly hud: {
      readonly recordCount: number;
      readonly geographyCount: number;
      readonly productVintages: readonly string[];
    };
  };
}

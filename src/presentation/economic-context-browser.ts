import type {
  BrowserArtifactLock,
  BrowserBeaGeographyLevel,
  BrowserBeaRecord,
  BrowserEconomicManifest,
  BrowserEconomicShard,
  BrowserHudRecord,
  BrowserLausRecord,
} from "./economic-context-browser-types";

export interface BrowserEconomicGeographyBinding {
  readonly bindingKey: string;
  readonly placeKey: string;
  readonly placeLabel: string;
  readonly beaAreas: readonly {
    readonly geographyLevel: BrowserBeaGeographyLevel;
    readonly geoFips: string;
    readonly relationship:
      "same-jurisdiction" | "containing-state" | "containing-metro";
  }[];
  readonly lausAreaCodes: readonly {
    readonly areaCode: string;
    readonly relationship:
      "same-jurisdiction" | "containing-state" | "containing-metro";
  }[];
  readonly hudFipsCodes: readonly {
    readonly hudFipsCode: string;
    readonly relationship: "same-jurisdiction" | "containing-hud-area";
  }[];
}

export type BrowserEconomicObservationValue =
  | { readonly state: "known"; readonly value: number }
  | { readonly state: "missing"; readonly reason: string };

export interface BrowserEconomicObservation {
  readonly observationKey: string;
  readonly recordClass: "historical-observation";
  readonly sourceProduct:
    "bea-regional" | "bls-laus" | "hud-fair-market-rent" | "hud-income-limit";
  readonly sourceSeriesKey: string;
  readonly label: string;
  readonly geography: {
    readonly providerCode: string;
    readonly providerName: string;
    readonly level: string;
    readonly relationship: string;
  };
  readonly referencePeriod: string;
  readonly unit: string;
  readonly value: BrowserEconomicObservationValue;
  readonly vintage: {
    readonly observationAsOf: string;
    readonly productVintage: string | null;
    readonly releaseStatus: string | null;
    readonly publisherReleaseDate: string | null;
    readonly sourceRetrievedAt: string;
    readonly knownAvailableOn: string;
    readonly knownAvailableOnBasis:
      "publisher-release-date" | "retrieval-date-fallback";
    readonly validityPeriod: null;
    readonly validityBasis: "not-established-by-locked-product";
    readonly adjustment: string;
  };
  readonly source: {
    readonly artifactId: string;
    readonly providerNativeId: string | null;
    readonly provider: string;
    readonly artifactSha256: string;
    readonly retrievalUrl: string;
    readonly documentationUrl: string | null;
  };
  readonly interpretationBoundary:
    | "observation-not-forecast"
    | "area-rate-not-person-probability"
    | "benchmark-not-transaction"
    | "threshold-not-household-determination";
}

export interface BrowserEconomicContextResult {
  readonly bindingKey: string;
  readonly placeKey: string;
  readonly placeLabel: string;
  readonly simulationDate: string;
  readonly referenceKind: "dated-real-world-context";
  readonly observations: readonly BrowserEconomicObservation[];
  readonly withheldFutureObservationCount: number;
  readonly availability: readonly {
    readonly product: "bea-regional" | "bls-laus" | "hud-housing";
    readonly status: "available" | "unavailable";
    readonly observationCount: number;
    readonly reason: string | null;
  }[];
  readonly coverage: BrowserEconomicManifest["coverage"];
  readonly boundaries: readonly string[];
}

export interface EconomicContextBrowserProvider {
  query(
    binding: BrowserEconomicGeographyBinding,
    simulationDate: string,
  ): Promise<BrowserEconomicContextResult>;
}

type FetchJson = (url: string) => Promise<unknown>;

const BOUNDARIES = [
  "Historical observations are not simulated history, drafts, forecasts, or outturn.",
  "A source reference period is not a source release date or validity period.",
  "An area unemployment rate is not a person's probability of unemployment.",
  "A Fair Market Rent is a benchmark, not a lease or transaction.",
  "Changing a slider cannot create an economic or GDP effect.",
] as const;

export function createEconomicContextBrowserProvider(options?: {
  readonly baseUrl?: string;
  readonly fetchJson?: FetchJson;
}): EconomicContextBrowserProvider {
  const baseUrl = (options?.baseUrl ?? "/data/economic-context/v1").replace(
    /\/$/,
    "",
  );
  const fetchJson = options?.fetchJson ?? defaultFetchJson;
  let manifestPromise: Promise<BrowserEconomicManifest> | null = null;
  const shardPromises = new Map<string, Promise<unknown>>();

  const loadManifest = () => {
    manifestPromise ??= fetchJson(`${baseUrl}/manifest.json`).then(
      assertManifest,
    );
    return manifestPromise;
  };
  const loadShard = <T>(path: string): Promise<BrowserEconomicShard<T>> => {
    let pending = shardPromises.get(path);
    if (!pending) {
      pending = fetchJson(`${baseUrl}/${path}`);
      shardPromises.set(path, pending);
    }
    return pending.then((value) => assertShard<T>(value, path));
  };

  return {
    async query(binding, simulationDate) {
      requireBinding(binding);
      requireIsoDate(simulationDate);
      const manifest = structuredClone(await loadManifest());
      const [beaRows, lausRows, hudRows] = await Promise.all([
        loadRows<BrowserBeaRecord>(
          binding.beaAreas.map(
            (area) =>
              manifest.indexes.bea[`${area.geographyLevel}:${area.geoFips}`],
          ),
          loadShard,
        ),
        loadRows<BrowserLausRecord>(
          binding.lausAreaCodes.map(
            (area) => manifest.indexes.laus[area.areaCode],
          ),
          loadShard,
        ),
        loadRows<BrowserHudRecord>(
          binding.hudFipsCodes.map(
            (area) => manifest.indexes.hud[area.hudFipsCode],
          ),
          loadShard,
        ),
      ]);
      const all = [
        ...projectBea(beaRows, manifest.locks.bea, binding),
        ...projectLaus(lausRows, manifest.locks.laus, binding),
        ...projectHud(
          hudRows,
          manifest.locks.hud,
          manifest.corpora.hud.asOf,
          binding,
        ),
      ].sort(compareObservation);
      const observations = all.filter(
        (item) => item.vintage.knownAvailableOn <= simulationDate,
      );
      return {
        bindingKey: binding.bindingKey,
        placeKey: binding.placeKey,
        placeLabel: binding.placeLabel,
        simulationDate,
        referenceKind: "dated-real-world-context",
        observations: structuredClone(observations),
        withheldFutureObservationCount: all.length - observations.length,
        availability: availability(binding, all, observations),
        coverage: structuredClone(manifest.coverage),
        boundaries: [...BOUNDARIES],
      };
    },
  };
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error(`Economic context request failed (${response.status}).`);
  }
  return response.json() as Promise<unknown>;
}

async function loadRows<T>(
  paths: readonly (string | undefined)[],
  load: (path: string) => Promise<BrowserEconomicShard<T>>,
): Promise<readonly T[]> {
  const unique = [...new Set(paths.filter((path): path is string => !!path))];
  const shards = await Promise.all(unique.map(load));
  return shards.flatMap((item) => item.records);
}

function projectBea(
  rows: readonly BrowserBeaRecord[],
  lock: BrowserArtifactLock,
  binding: BrowserEconomicGeographyBinding,
): readonly BrowserEconomicObservation[] {
  const matches = new Map(
    binding.beaAreas.map((area) => [
      `${area.geographyLevel}:${area.geoFips}`,
      area.relationship,
    ]),
  );
  return rows.flatMap((row) => {
    const relationship = matches.get(`${row.geographyLevel}:${row.geoFips}`);
    if (!relationship) return [];
    return [
      makeObservation(
        {
          observationKey: `bea:${row.recordId}`,
          sourceProduct: "bea-regional",
          sourceSeriesKey: `bea.${row.tableName.toLowerCase()}.${row.lineCode}`,
          label: row.lineDescription,
          geography: {
            providerCode: row.geoFips,
            providerName: row.geoName,
            level: row.geographyLevel,
            relationship,
          },
          referencePeriod: row.year,
          unit: row.unit,
          value: displayValue(row.value),
          observationAsOf:
            row.value.state === "KNOWN" ? row.value.asOf : `${row.year}-12-31`,
          productVintage: row.year,
          releaseStatus: row.value.state === "KNOWN" ? row.value.release : null,
          adjustment:
            "Published annual estimate; nominal unless the line definition states otherwise.",
          evidence: row.evidence,
          interpretationBoundary: "observation-not-forecast",
        },
        lock,
      ),
    ];
  });
}

function projectLaus(
  rows: readonly BrowserLausRecord[],
  lock: BrowserArtifactLock,
  binding: BrowserEconomicGeographyBinding,
): readonly BrowserEconomicObservation[] {
  const matches = new Map(
    binding.lausAreaCodes.map((area) => [area.areaCode, area.relationship]),
  );
  return rows.flatMap((row) => {
    const relationship = matches.get(row.area.areaCode);
    if (!relationship) return [];
    const rate = ["03", "07", "08"].includes(row.measure.code);
    return [
      makeObservation(
        {
          observationKey: `laus:${row.recordId}`,
          sourceProduct: "bls-laus",
          sourceSeriesKey: `bls.laus.${row.seriesId.toLowerCase()}`,
          label: row.measure.text,
          geography: {
            providerCode: row.area.areaCode,
            providerName: row.area.areaText,
            level: row.area.areaTypeText,
            relationship,
          },
          referencePeriod: `${row.year}-${row.period}`,
          unit: rate ? "Percent" : "Number of persons",
          value: displayValue(row.value),
          observationAsOf:
            row.value.state === "KNOWN"
              ? row.value.asOf
              : periodEnd(row.year, row.period),
          productVintage: null,
          releaseStatus: row.value.state === "KNOWN" ? row.value.release : null,
          adjustment:
            row.seasonalAdjustmentCode === "S"
              ? "Seasonally adjusted"
              : "Not seasonally adjusted",
          evidence: row.evidence,
          interpretationBoundary: rate
            ? "area-rate-not-person-probability"
            : "observation-not-forecast",
        },
        lock,
      ),
    ];
  });
}

function projectHud(
  rows: readonly BrowserHudRecord[],
  lock: BrowserArtifactLock,
  corpusAsOf: string,
  binding: BrowserEconomicGeographyBinding,
): readonly BrowserEconomicObservation[] {
  const matches = new Map(
    binding.hudFipsCodes.map((area) => [area.hudFipsCode, area.relationship]),
  );
  const output: BrowserEconomicObservation[] = [];
  for (const row of rows) {
    const relationship = matches.get(row.area.hudFipsCode);
    if (!relationship) continue;
    const geography = {
      providerCode: row.area.hudFipsCode,
      providerName: row.area.hudAreaName,
      level:
        row.area.metropolitanIndicator === "1"
          ? "HUD metropolitan area"
          : "HUD nonmetropolitan area",
      relationship,
    };
    if (row.recordKind === "fair-market-rent") {
      if (!row.rentByBedrooms) {
        throw new Error(`HUD FMR row lacks rent values: ${row.recordId}`);
      }
      for (const [bedrooms, value] of Object.entries(row.rentByBedrooms)) {
        output.push(
          makeObservation(
            {
              observationKey: `hud:${row.recordId}:${bedrooms}-bedroom`,
              sourceProduct: "hud-fair-market-rent",
              sourceSeriesKey: `hud.fmr.${bedrooms}-bedroom`,
              label:
                bedrooms === "0"
                  ? "Efficiency Fair Market Rent"
                  : `${bedrooms}-bedroom Fair Market Rent`,
              geography,
              referencePeriod: row.productVintage,
              unit: "USD per month",
              value: { state: "known", value },
              observationAsOf: corpusAsOf,
              productVintage: row.productVintage,
              releaseStatus: null,
              adjustment:
                "Published product benchmark; no transformation applied.",
              evidence: row.evidence,
              interpretationBoundary: "benchmark-not-transaction",
            },
            lock,
          ),
        );
      }
      continue;
    }
    for (const [key, label, value] of incomeThresholds(row)) {
      output.push(
        makeObservation(
          {
            observationKey: `hud:${row.recordId}:${key}`,
            sourceProduct: "hud-income-limit",
            sourceSeriesKey: `hud.income-limit.${key}`,
            label,
            geography,
            referencePeriod: row.productVintage,
            unit: "USD per year",
            value: { state: "known", value },
            observationAsOf: corpusAsOf,
            productVintage: row.productVintage,
            releaseStatus: null,
            adjustment:
              "Published product benchmark; no transformation applied.",
            evidence: row.evidence,
            interpretationBoundary: "threshold-not-household-determination",
          },
          lock,
        ),
      );
    }
  }
  return output;
}

function incomeThresholds(
  row: BrowserHudRecord,
): Array<[string, string, number]> {
  if (row.areaMedianFamilyIncome === undefined) {
    throw new Error(`HUD income-limit row lacks AMFI: ${row.recordId}`);
  }
  return [
    [
      "area-median-family-income",
      "Area median family income",
      row.areaMedianFamilyIncome,
    ],
    ...thresholdRows("very-low", row.veryLowIncomeLimitByFamilySize),
    ...thresholdRows("extremely-low", row.extremelyLowIncomeLimitByFamilySize),
    ...thresholdRows("low", row.lowIncomeLimitByFamilySize),
  ];
}

function thresholdRows(
  prefix: string,
  values: Readonly<Record<string, number>> | undefined,
): Array<[string, string, number]> {
  if (!values) return [];
  return Object.entries(values).map(([size, value]) => [
    `${prefix}:${size}`,
    `${prefix.replaceAll("-", " ")} income limit, family size ${size}`,
    value,
  ]);
}

interface ObservationParts {
  readonly observationKey: string;
  readonly sourceProduct: BrowserEconomicObservation["sourceProduct"];
  readonly sourceSeriesKey: string;
  readonly label: string;
  readonly geography: BrowserEconomicObservation["geography"];
  readonly referencePeriod: string;
  readonly unit: string;
  readonly value: BrowserEconomicObservationValue;
  readonly observationAsOf: string;
  readonly productVintage: string | null;
  readonly releaseStatus: string | null;
  readonly adjustment: string;
  readonly evidence: {
    readonly artifactId: string;
    readonly providerNativeId?: string;
  };
  readonly interpretationBoundary: BrowserEconomicObservation["interpretationBoundary"];
}

function makeObservation(
  parts: ObservationParts,
  lock: BrowserArtifactLock,
): BrowserEconomicObservation {
  const artifact = artifactFor(lock, parts.evidence.artifactId);
  const publisherReleaseDate = artifact.publisher.releaseDate;
  return {
    observationKey: parts.observationKey,
    recordClass: "historical-observation",
    sourceProduct: parts.sourceProduct,
    sourceSeriesKey: parts.sourceSeriesKey,
    label: parts.label,
    geography: { ...parts.geography },
    referencePeriod: parts.referencePeriod,
    unit: parts.unit,
    value: { ...parts.value },
    vintage: {
      observationAsOf: parts.observationAsOf,
      productVintage: parts.productVintage,
      releaseStatus: parts.releaseStatus,
      publisherReleaseDate,
      sourceRetrievedAt: artifact.retrieval.retrievedAt,
      knownAvailableOn:
        publisherReleaseDate ?? artifact.retrieval.retrievedAt.slice(0, 10),
      knownAvailableOnBasis: publisherReleaseDate
        ? "publisher-release-date"
        : "retrieval-date-fallback",
      validityPeriod: null,
      validityBasis: "not-established-by-locked-product",
      adjustment: parts.adjustment,
    },
    source: {
      artifactId: artifact.artifactId,
      providerNativeId: parts.evidence.providerNativeId ?? null,
      provider: artifact.provider,
      artifactSha256: artifact.bytes.sha256,
      retrievalUrl: artifact.retrieval.url,
      documentationUrl: artifact.publisher.documentationUrl,
    },
    interpretationBoundary: parts.interpretationBoundary,
  };
}

function availability(
  binding: BrowserEconomicGeographyBinding,
  all: readonly BrowserEconomicObservation[],
  visible: readonly BrowserEconomicObservation[],
): BrowserEconomicContextResult["availability"] {
  const definitions = [
    {
      product: "bea-regional" as const,
      bound: binding.beaAreas.length > 0,
      matches: (item: BrowserEconomicObservation) =>
        item.sourceProduct === "bea-regional",
    },
    {
      product: "bls-laus" as const,
      bound: binding.lausAreaCodes.length > 0,
      matches: (item: BrowserEconomicObservation) =>
        item.sourceProduct === "bls-laus",
    },
    {
      product: "hud-housing" as const,
      bound: binding.hudFipsCodes.length > 0,
      matches: (item: BrowserEconomicObservation) =>
        item.sourceProduct.startsWith("hud-"),
    },
  ];
  return definitions.map((definition) => {
    const allCount = all.filter(definition.matches).length;
    const count = visible.filter(definition.matches).length;
    return {
      product: definition.product,
      status: count > 0 ? ("available" as const) : ("unavailable" as const),
      observationCount: count,
      reason:
        count > 0
          ? null
          : !definition.bound
            ? "No exact provider geography was bound; names were not used as a fallback."
            : allCount > 0
              ? "The locked observations are not established as available by this simulation date."
              : "The declared corpus has no record for the exact provider geography.",
    };
  });
}

function displayValue(
  value: BrowserBeaRecord["value"] | BrowserLausRecord["value"],
): BrowserEconomicObservationValue {
  return value.state === "KNOWN"
    ? { state: "known", value: value.value }
    : { state: "missing", reason: value.reason };
}

function artifactFor(lock: BrowserArtifactLock, artifactId: string) {
  const artifact = lock.artifacts.find(
    (candidate) => candidate.artifactId === artifactId,
  );
  if (!artifact) {
    throw new Error(
      `Economic context artifact ${artifactId} is absent from ${lock.domain}.`,
    );
  }
  return artifact;
}

function periodEnd(year: string, period: string): string {
  if (period === "M13") return `${year}-12-31`;
  const month = Number(period.slice(1));
  const day = new Date(Date.UTC(Number(year), month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function compareObservation(
  left: BrowserEconomicObservation,
  right: BrowserEconomicObservation,
): number {
  return (
    left.sourceProduct.localeCompare(right.sourceProduct) ||
    left.geography.providerCode.localeCompare(right.geography.providerCode) ||
    left.sourceSeriesKey.localeCompare(right.sourceSeriesKey) ||
    left.referencePeriod.localeCompare(right.referencePeriod) ||
    left.observationKey.localeCompare(right.observationKey)
  );
}

function requireBinding(binding: BrowserEconomicGeographyBinding): void {
  if (!binding.bindingKey.trim() || !binding.placeKey.trim()) {
    throw new Error("Economic context requires stable binding and place keys.");
  }
  if (
    binding.beaAreas.some((area) => !/^\d{5}$/.test(area.geoFips)) ||
    binding.lausAreaCodes.some(
      (area) => !/^[A-Z0-9]{15}$/.test(area.areaCode),
    ) ||
    binding.hudFipsCodes.some((area) => !/^\d{10}$/.test(area.hudFipsCode))
  ) {
    throw new Error("Economic context received a malformed provider key.");
  }
}

function requireIsoDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new Error(
      `Economic context requires an ISO simulation date: ${value}`,
    );
  }
}

function assertManifest(value: unknown): BrowserEconomicManifest {
  if (
    !value ||
    typeof value !== "object" ||
    (value as { schemaVersion?: unknown }).schemaVersion !== "1"
  ) {
    throw new Error("Economic context manifest is malformed.");
  }
  return value as BrowserEconomicManifest;
}

function assertShard<T>(value: unknown, path: string): BrowserEconomicShard<T> {
  if (
    !value ||
    typeof value !== "object" ||
    (value as { schemaVersion?: unknown }).schemaVersion !== "1" ||
    !Array.isArray((value as { records?: unknown }).records)
  ) {
    throw new Error(`Economic context shard is malformed: ${path}`);
  }
  return value as BrowserEconomicShard<T>;
}

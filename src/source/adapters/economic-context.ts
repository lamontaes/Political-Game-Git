/**
 * One-way BEA / LAUS / HUD read-model bridge.
 *
 * The adapter accepts only provider-native geography identifiers. Display
 * names are deliberately absent from the binding keys, so similarly named
 * counties, cities, and metropolitan areas cannot be joined by accident.
 * Reading projects observations and optional World-observation inputs; it
 * never writes the World, publishes news, forecasts, or creates a personal
 * resource, employment, rent, or housing record.
 */

import type {
  CompiledCorpus,
  Evidence,
  ReleaseStatus,
  Sourced,
} from "../core/index";
import type {
  BeaGeographyLevel,
  BeaObservationRecord,
} from "../domains/bea-regional/index";
import type { LausObservationRecord } from "../domains/bls-laus/index";
import type { HudRecord } from "../domains/hud-housing/index";
import {
  createExactQuantity,
  makeIsoDate,
  money,
  worldMetricDefinitionByStableKey,
} from "../../simulation/index";
import type {
  EntityId,
  MetricReferencePeriod,
  RecordWorldMetricObservationInput,
  World,
  WorldMetricValue,
} from "../../simulation/index";

export type EconomicSourceProduct =
  "bea-regional" | "bls-laus" | "hud-fair-market-rent" | "hud-income-limit";

export interface EconomicContextCorpora {
  readonly bea: CompiledCorpus<BeaObservationRecord>;
  readonly laus: CompiledCorpus<LausObservationRecord>;
  readonly hud: CompiledCorpus<HudRecord>;
}

export interface EconomicContextGeographyBinding {
  readonly bindingKey: string;
  readonly jurisdictionId: EntityId;
  readonly placeKey: string;
  readonly placeLabel: string;
  readonly beaAreas: readonly {
    readonly geographyLevel: BeaGeographyLevel;
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

export interface EconomicObservationGeography {
  readonly providerCode: string;
  readonly providerName: string;
  readonly level: string;
  readonly relationship: string;
}

export interface EconomicObservationVintage {
  readonly corpusAsOf: string;
  readonly observationAsOf: string;
  readonly productVintage: string | null;
  readonly release: ReleaseStatus | null;
  readonly adjustment: string;
  readonly revision: string;
}

export interface EconomicContextObservation {
  readonly observationKey: string;
  readonly kind: "bea" | "laus" | "hud-fair-market-rent" | "hud-income-limit";
  readonly sourceProduct: EconomicSourceProduct;
  readonly sourceSeriesKey: string;
  readonly label: string;
  readonly geography: EconomicObservationGeography;
  readonly period: string;
  readonly unit: string;
  readonly value: EconomicObservedValue;
  readonly vintage: EconomicObservationVintage;
  readonly evidence: Evidence;
  readonly detailKey: string;
  readonly interpretationBoundary:
    | "observation-not-forecast"
    | "area-rate-not-person-probability"
    | "benchmark-not-transaction"
    | "threshold-not-household-determination";
}

export type EconomicObservedValue =
  | Sourced<number>
  | {
      readonly state: "KNOWN";
      readonly value: number;
      readonly evidence: readonly Evidence[];
      readonly release: null;
      readonly asOf: string;
    };

export interface EconomicContextAvailability {
  readonly product: EconomicSourceProduct;
  readonly status: "available" | "unavailable";
  readonly observationCount: number;
  readonly reason: string | null;
}

export interface EconomicHistoricalComparison {
  readonly sourceSeriesKey: string;
  readonly geography: EconomicObservationGeography;
  readonly unit: string;
  readonly earlierObservationKey: string;
  readonly laterObservationKey: string;
  readonly earlierPeriod: string;
  readonly laterPeriod: string;
  readonly earlierValue: number;
  readonly laterValue: number;
  readonly absoluteChange: number;
  readonly comparisonKind: "same-period-prior-year" | "available-window";
  readonly interpretationBoundary: "historical-comparison-not-forecast";
}

export interface EconomicAnalystInput {
  readonly observationKey: string;
  readonly suggestedMetricStableKey: string;
  readonly worldScopeJurisdictionId: EntityId | null;
  readonly sourceGeography: EconomicObservationGeography;
  readonly referencePeriod: MetricReferencePeriod;
  readonly value: WorldMetricValue;
  readonly sourceSeriesKey: string;
  readonly sourceLabel: string;
  readonly sourceReference: {
    readonly title: string;
    readonly locator: string;
  };
  readonly methodologyKey: string;
  readonly sourceReleaseDate: string | null;
  readonly worldObservationReadiness:
    "missing-release-date" | "source-geography-has-no-canonical-world-scope";
  readonly vintageKey: string;
  readonly interpretationBoundary: "dated-reference-not-baseline-or-effect";
}

export interface EconomicPublicationCandidate {
  readonly candidateKey: string;
  readonly observationKey: string;
  readonly status: "not-published";
  readonly sourceReleaseDate: string | null;
  readonly sourceLabel: string;
  readonly interpretationBoundary: "explicit-publication-required";
}

export type EconomicWorldObservationProjection =
  | {
      readonly status: "available";
      readonly input: RecordWorldMetricObservationInput;
    }
  | {
      readonly status: "unavailable";
      readonly reason: string;
    };

export interface EconomicContextReadModel {
  readonly bindingKey: string;
  readonly jurisdictionId: EntityId;
  readonly placeKey: string;
  readonly placeLabel: string;
  readonly referenceKind: "dated-real-world-context";
  readonly corpora: readonly {
    readonly product: "bea-regional" | "bls-laus" | "hud-housing";
    readonly asOf: string;
    readonly canonicalSha256: string;
    readonly compiler: string;
  }[];
  readonly availability: readonly EconomicContextAvailability[];
  readonly observations: readonly EconomicContextObservation[];
  readonly comparisons: readonly EconomicHistoricalComparison[];
  readonly analystInputs: readonly EconomicAnalystInput[];
  readonly publicationCandidates: readonly EconomicPublicationCandidate[];
  readonly boundaries: readonly string[];
}

const BOUNDARIES = [
  "These are dated real-world observations, not the simulated economy after a save diverges.",
  "An observation is not a forecast or evidence of a policy effect.",
  "An area unemployment rate is not a person's probability of losing a job.",
  "A Fair Market Rent is a benchmark, not a rent offer or signed lease.",
  "An annual income observation is not cash in a person's resource position.",
  "A read does not publish a fictional news item.",
] as const;

export function buildEconomicContextReadModel(
  corpora: EconomicContextCorpora,
  binding: EconomicContextGeographyBinding,
): EconomicContextReadModel {
  validateBinding(binding);

  const bea = projectBea(corpora.bea, binding);
  const laus = projectLaus(corpora.laus, binding);
  const hud = projectHud(corpora.hud, binding);
  const observations = [...bea, ...laus, ...hud].sort(compareObservations);
  const latestKeys = latestObservationKeys(observations);

  return {
    bindingKey: binding.bindingKey,
    jurisdictionId: binding.jurisdictionId,
    placeKey: binding.placeKey,
    placeLabel: binding.placeLabel,
    referenceKind: "dated-real-world-context",
    corpora: [
      corpusIdentity("bea-regional", corpora.bea),
      corpusIdentity("bls-laus", corpora.laus),
      corpusIdentity("hud-housing", corpora.hud),
    ],
    availability: availabilityFor(binding, bea, laus, hud),
    observations,
    comparisons: historicalComparisons(observations),
    analystInputs: observations.flatMap((observation) =>
      toAnalystInput(binding.jurisdictionId, observation),
    ),
    publicationCandidates: observations
      .filter((observation) => latestKeys.has(observation.observationKey))
      .map((observation) => ({
        candidateKey: `economic-context:${binding.bindingKey}:${observation.observationKey}`,
        observationKey: observation.observationKey,
        status: "not-published" as const,
        sourceReleaseDate: null,
        sourceLabel: observation.sourceProduct,
        interpretationBoundary: "explicit-publication-required" as const,
      })),
    boundaries: [...BOUNDARIES],
  };
}

/**
 * Turn one already-projected compatible statistic into the existing World
 * observation writer's input. The caller still chooses whether and when to
 * record it; this helper performs no write and cannot create canonical truth.
 */
export function worldObservationInputFromEconomicContext(
  world: World,
  input: EconomicAnalystInput,
  stableKey: string,
  recordedAt: string,
): EconomicWorldObservationProjection {
  if (input.worldScopeJurisdictionId === null) {
    return {
      status: "unavailable",
      reason: `The ${input.sourceGeography.relationship} source geography has no canonical World jurisdiction scope.`,
    };
  }
  if (input.sourceReleaseDate === null) {
    return {
      status: "unavailable",
      reason:
        "The locked source product does not establish a release date; observation as-of was not substituted.",
    };
  }
  if (!world.jurisdictions[input.worldScopeJurisdictionId]) {
    throw new Error(
      `Economic context references a jurisdiction absent from the World: ${input.worldScopeJurisdictionId}`,
    );
  }
  const metric = worldMetricDefinitionByStableKey(
    world,
    input.suggestedMetricStableKey,
  );
  return {
    status: "available",
    input: {
      stableKey,
      metricId: metric.id,
      scope: {
        jurisdictionId: input.worldScopeJurisdictionId,
        segmentKey: null,
      },
      referencePeriod: clonePeriod(input.referencePeriod),
      value: cloneWorldMetricValue(input.value),
      sourceSeriesKey: input.sourceSeriesKey,
      sourceLabel: input.sourceLabel,
      sourceReference: { ...input.sourceReference },
      methodologyKey: input.methodologyKey,
      releaseDate: makeIsoDate(input.sourceReleaseDate),
      recordedAt: makeIsoDate(recordedAt),
      vintageKey: input.vintageKey,
      uncertainty: { kind: "none" },
      supersedesObservationId: null,
      underlyingStateId: null,
    },
  };
}

function validateBinding(binding: EconomicContextGeographyBinding): void {
  if (
    !binding.bindingKey.trim() ||
    !binding.placeKey.trim() ||
    !binding.placeLabel.trim()
  ) {
    throw new Error(
      "Economic geography binding requires stable keys and a label.",
    );
  }
  const exactKeys = [
    ...binding.beaAreas.map(
      (area) => `bea:${area.geographyLevel}:${area.geoFips}`,
    ),
    ...binding.lausAreaCodes.map((area) => `laus:${area.areaCode}`),
    ...binding.hudFipsCodes.map((area) => `hud:${area.hudFipsCode}`),
  ];
  if (new Set(exactKeys).size !== exactKeys.length) {
    throw new Error(
      "Economic geography binding contains a duplicate provider key.",
    );
  }
  if (
    binding.beaAreas.some((area) => !/^\d{5}$/.test(area.geoFips)) ||
    binding.lausAreaCodes.some(
      (area) => !/^[A-Z0-9]{15}$/.test(area.areaCode),
    ) ||
    binding.hudFipsCodes.some((area) => !/^\d{10}$/.test(area.hudFipsCode))
  ) {
    throw new Error(
      "Economic geography binding contains a malformed provider key.",
    );
  }
}

function projectBea(
  corpus: CompiledCorpus<BeaObservationRecord>,
  binding: EconomicContextGeographyBinding,
): readonly EconomicContextObservation[] {
  const matches = new Map(
    binding.beaAreas.map((area) => [
      `${area.geographyLevel}:${area.geoFips}`,
      area.relationship,
    ]),
  );
  return corpus.records.flatMap<EconomicContextObservation>((record) => {
    const relationship = matches.get(
      `${record.geographyLevel}:${record.geoFips}`,
    );
    if (!relationship) return [];
    return [
      {
        observationKey: `bea:${record.recordId}`,
        kind: "bea" as const,
        sourceProduct: "bea-regional" as const,
        sourceSeriesKey: `bea.${record.tableName.toLowerCase()}.${record.lineCode}`,
        label: record.lineDescription,
        geography: {
          providerCode: record.geoFips,
          providerName: record.geoName,
          level: record.geographyLevel,
          relationship,
        },
        period: record.year,
        unit: record.unit,
        value: cloneSourced(record.value),
        vintage: {
          corpusAsOf: corpus.corpus.asOf,
          observationAsOf: observationAsOf(
            record.value,
            `${record.year}-12-31`,
          ),
          productVintage: record.year,
          release: releaseOf(record.value),
          adjustment:
            "Published annual estimate; nominal unless the line definition states otherwise.",
          revision: releaseOf(record.value) ?? "unavailable value state",
        },
        evidence: cloneEvidence(record.evidence),
        detailKey: `${record.tableName}:${record.lineCode}`,
        interpretationBoundary: "observation-not-forecast" as const,
      },
    ];
  });
}

function projectLaus(
  corpus: CompiledCorpus<LausObservationRecord>,
  binding: EconomicContextGeographyBinding,
): readonly EconomicContextObservation[] {
  const matches = new Map(
    binding.lausAreaCodes.map((area) => [area.areaCode, area.relationship]),
  );
  return corpus.records.flatMap((record) => {
    const relationship = matches.get(record.area.areaCode);
    if (!relationship) return [];
    const rate = ["03", "07", "08"].includes(record.measure.code);
    return [
      {
        observationKey: `laus:${record.recordId}`,
        kind: "laus" as const,
        sourceProduct: "bls-laus" as const,
        sourceSeriesKey: `bls.laus.${record.seriesId.toLowerCase()}`,
        label: record.measure.text,
        geography: {
          providerCode: record.area.areaCode,
          providerName: record.area.areaText,
          level: record.area.areaTypeText,
          relationship,
        },
        period: `${record.year}-${record.period}`,
        unit: rate ? "Percent" : "Number of persons",
        value: cloneSourced(record.value),
        vintage: {
          corpusAsOf: corpus.corpus.asOf,
          observationAsOf: observationAsOf(
            record.value,
            periodEnd(record.year, record.period),
          ),
          productVintage: null,
          release: releaseOf(record.value),
          adjustment:
            record.seasonalAdjustmentCode === "S"
              ? "Seasonally adjusted"
              : "Not seasonally adjusted",
          revision: releaseOf(record.value) ?? record.footnoteTexts.join(" "),
        },
        evidence: cloneEvidence(record.evidence),
        detailKey: `${record.seriesId}:${record.measure.code}`,
        interpretationBoundary: rate
          ? ("area-rate-not-person-probability" as const)
          : ("observation-not-forecast" as const),
      },
    ];
  });
}

function projectHud(
  corpus: CompiledCorpus<HudRecord>,
  binding: EconomicContextGeographyBinding,
): readonly EconomicContextObservation[] {
  const matches = new Map(
    binding.hudFipsCodes.map((area) => [area.hudFipsCode, area.relationship]),
  );
  const observations: EconomicContextObservation[] = [];
  for (const record of corpus.records) {
    const relationship = matches.get(record.area.hudFipsCode);
    if (!relationship) continue;
    const geography = {
      providerCode: record.area.hudFipsCode,
      providerName: record.area.hudAreaName,
      level:
        record.area.metropolitanIndicator === "1"
          ? "HUD metropolitan area"
          : "HUD nonmetropolitan area",
      relationship,
    };
    if (record.recordKind === "fair-market-rent") {
      for (const [bedrooms, value] of Object.entries(record.rentByBedrooms)) {
        observations.push({
          observationKey: `hud:${record.recordId}:${bedrooms}-bedroom`,
          kind: "hud-fair-market-rent",
          sourceProduct: "hud-fair-market-rent",
          sourceSeriesKey: `hud.fmr.${bedrooms}-bedroom`,
          label:
            bedrooms === "0"
              ? "Efficiency Fair Market Rent"
              : `${bedrooms}-bedroom Fair Market Rent`,
          geography,
          period: record.productVintage,
          unit: "USD per month",
          value: knownFromHud(value, record.evidence, corpus.corpus.asOf),
          vintage: hudVintage(corpus, record.productVintage),
          evidence: cloneEvidence(record.evidence),
          detailKey: `${record.recordKind}:${bedrooms}`,
          interpretationBoundary: "benchmark-not-transaction",
        });
      }
      continue;
    }
    const thresholdRows: Array<[string, string, number]> = [
      [
        "area-median-family-income",
        "Area median family income",
        record.areaMedianFamilyIncome,
      ],
    ];
    for (const [familySize, value] of Object.entries(
      record.veryLowIncomeLimitByFamilySize,
    )) {
      thresholdRows.push([
        `very-low:${familySize}`,
        `Very-low-income limit, family size ${familySize}`,
        value,
      ]);
    }
    for (const [familySize, value] of Object.entries(
      record.extremelyLowIncomeLimitByFamilySize,
    )) {
      thresholdRows.push([
        `extremely-low:${familySize}`,
        `Extremely-low-income limit, family size ${familySize}`,
        value,
      ]);
    }
    for (const [familySize, value] of Object.entries(
      record.lowIncomeLimitByFamilySize,
    )) {
      thresholdRows.push([
        `low:${familySize}`,
        `Low-income limit, family size ${familySize}`,
        value,
      ]);
    }
    for (const [key, label, value] of thresholdRows) {
      observations.push({
        observationKey: `hud:${record.recordId}:${key}`,
        kind: "hud-income-limit",
        sourceProduct: "hud-income-limit",
        sourceSeriesKey: `hud.income-limit.${key}`,
        label,
        geography,
        period: record.productVintage,
        unit: "USD per year",
        value: knownFromHud(value, record.evidence, corpus.corpus.asOf),
        vintage: hudVintage(corpus, record.productVintage),
        evidence: cloneEvidence(record.evidence),
        detailKey: `${record.recordKind}:${key}`,
        interpretationBoundary: "threshold-not-household-determination",
      });
    }
  }
  return observations;
}

function toAnalystInput(
  jurisdictionId: EntityId,
  observation: EconomicContextObservation,
): readonly EconomicAnalystInput[] {
  if (observation.value.state !== "KNOWN") return [];
  const value = observation.value.value;
  let suggestedMetricStableKey: string | null = null;
  let metricValue: WorldMetricValue | null = null;
  let referencePeriod: MetricReferencePeriod | null = null;

  if (observation.kind === "bea" && observation.detailKey === "CAINC1:1") {
    const minorUnits = value * 100_000;
    if (!Number.isSafeInteger(minorUnits)) return [];
    suggestedMetricStableKey = "income.aggregate-personal";
    metricValue = { kind: "money", money: money(minorUnits, "USD") };
    referencePeriod = annualPeriod(observation.period);
  } else if (
    observation.kind === "bea" &&
    observation.detailKey === "CAINC1:2"
  ) {
    if (!Number.isSafeInteger(value)) return [];
    suggestedMetricStableKey = "population.resident-count";
    metricValue = {
      kind: "quantity",
      quantity: createExactQuantity(value, 1, "count:people"),
    };
    referencePeriod = {
      kind: "point",
      at: makeIsoDate(`${observation.period}-12-31`),
    };
  } else if (
    observation.kind === "bea" &&
    (observation.detailKey === "SARPP:1" || observation.detailKey === "MARPP:1")
  ) {
    const exact = decimalFraction(value);
    suggestedMetricStableKey = "prices.cost-level";
    metricValue = {
      kind: "quantity",
      quantity: createExactQuantity(
        exact.numerator,
        exact.denominator,
        "index:cost-level",
      ),
    };
    referencePeriod = {
      kind: "point",
      at: makeIsoDate(`${observation.period}-12-31`),
    };
  } else if (observation.kind === "laus") {
    const measure = observation.detailKey.split(":").at(-1);
    const mapping: Readonly<Record<string, string>> = {
      "03": "labor.unemployment-rate",
      "05": "labor.employed-count",
      "06": "labor.force-count",
    };
    suggestedMetricStableKey = measure ? (mapping[measure] ?? null) : null;
    if (!suggestedMetricStableKey) return [];
    if (measure === "03") {
      const exact = decimalFraction(value);
      metricValue = {
        kind: "quantity",
        quantity: createExactQuantity(
          exact.numerator,
          exact.denominator * 100,
          "rate:share",
        ),
      };
    } else {
      if (!Number.isSafeInteger(value)) return [];
      metricValue = {
        kind: "quantity",
        quantity: createExactQuantity(value, 1, "count:people"),
      };
    }
    referencePeriod = {
      kind: "point",
      at: makeIsoDate(observation.vintage.observationAsOf),
    };
  }

  if (!suggestedMetricStableKey || !metricValue || !referencePeriod) return [];
  return [
    {
      observationKey: observation.observationKey,
      suggestedMetricStableKey,
      worldScopeJurisdictionId:
        observation.geography.relationship === "same-jurisdiction"
          ? jurisdictionId
          : null,
      sourceGeography: { ...observation.geography },
      referencePeriod,
      value: metricValue,
      sourceSeriesKey: observation.sourceSeriesKey,
      sourceLabel: sourceLabel(observation.sourceProduct),
      sourceReference: {
        title: `${sourceLabel(observation.sourceProduct)} ${observation.label}`,
        locator: observation.observationKey,
      },
      methodologyKey: methodologyKey(observation),
      sourceReleaseDate: null,
      worldObservationReadiness:
        observation.geography.relationship === "same-jurisdiction"
          ? "missing-release-date"
          : "source-geography-has-no-canonical-world-scope",
      vintageKey: `${observation.sourceProduct}:${observation.vintage.productVintage ?? observation.vintage.corpusAsOf}:${observation.vintage.release ?? "unavailable"}`,
      interpretationBoundary: "dated-reference-not-baseline-or-effect",
    },
  ];
}

function availabilityFor(
  binding: EconomicContextGeographyBinding,
  bea: readonly EconomicContextObservation[],
  laus: readonly EconomicContextObservation[],
  hud: readonly EconomicContextObservation[],
): readonly EconomicContextAvailability[] {
  const fmr = hud.filter((item) => item.kind === "hud-fair-market-rent");
  const limits = hud.filter((item) => item.kind === "hud-income-limit");
  return [
    availability("bea-regional", bea.length, binding.beaAreas.length),
    availability("bls-laus", laus.length, binding.lausAreaCodes.length),
    availability(
      "hud-fair-market-rent",
      fmr.length,
      binding.hudFipsCodes.length,
    ),
    availability(
      "hud-income-limit",
      limits.length,
      binding.hudFipsCodes.length,
    ),
  ];
}

function availability(
  product: EconomicSourceProduct,
  observationCount: number,
  boundCodeCount: number,
): EconomicContextAvailability {
  return observationCount > 0
    ? { product, status: "available", observationCount, reason: null }
    : {
        product,
        status: "unavailable",
        observationCount: 0,
        reason:
          boundCodeCount === 0
            ? "No exact provider geography was bound for this product. Names were not used as a fallback."
            : "The locked product contains no record for the exact bound provider geography.",
      };
}

function historicalComparisons(
  observations: readonly EconomicContextObservation[],
): readonly EconomicHistoricalComparison[] {
  const groups = new Map<string, EconomicContextObservation[]>();
  for (const observation of observations) {
    if (observation.value.state !== "KNOWN") continue;
    const key = seriesIdentity(observation);
    const group = groups.get(key) ?? [];
    group.push(observation);
    groups.set(key, group);
  }
  const result: EconomicHistoricalComparison[] = [];
  for (const group of groups.values()) {
    group.sort(compareObservations);
    const later = group.at(-1);
    if (!later || group.length < 2 || later.value.state !== "KNOWN") continue;
    const priorYear = samePeriodPriorYear(group, later);
    const earlier = priorYear ?? group[0];
    if (!earlier || earlier.value.state !== "KNOWN" || earlier === later)
      continue;
    result.push({
      sourceSeriesKey: later.sourceSeriesKey,
      geography: { ...later.geography },
      unit: later.unit,
      earlierObservationKey: earlier.observationKey,
      laterObservationKey: later.observationKey,
      earlierPeriod: earlier.period,
      laterPeriod: later.period,
      earlierValue: earlier.value.value,
      laterValue: later.value.value,
      absoluteChange: later.value.value - earlier.value.value,
      comparisonKind: priorYear ? "same-period-prior-year" : "available-window",
      interpretationBoundary: "historical-comparison-not-forecast",
    });
  }
  return result.sort((left, right) =>
    `${left.sourceSeriesKey}:${left.geography.providerCode}`.localeCompare(
      `${right.sourceSeriesKey}:${right.geography.providerCode}`,
    ),
  );
}

function samePeriodPriorYear(
  group: readonly EconomicContextObservation[],
  later: EconomicContextObservation,
): EconomicContextObservation | null {
  const match = /^(\d{4})-(M\d{2}|M13)$/.exec(later.period);
  if (!match) return null;
  const target = `${Number(match[1]) - 1}-${match[2]}`;
  return group.find((item) => item.period === target) ?? null;
}

function latestObservationKeys(
  observations: readonly EconomicContextObservation[],
): ReadonlySet<string> {
  const latest = new Map<string, EconomicContextObservation>();
  for (const observation of observations) {
    const key = seriesIdentity(observation);
    const previous = latest.get(key);
    if (!previous || compareObservations(previous, observation) < 0) {
      latest.set(key, observation);
    }
  }
  return new Set(
    [...latest.values()].map((observation) => observation.observationKey),
  );
}

function seriesIdentity(observation: EconomicContextObservation): string {
  return `${observation.sourceSeriesKey}:${observation.geography.providerCode}:${observation.unit}`;
}

function compareObservations(
  left: EconomicContextObservation,
  right: EconomicContextObservation,
): number {
  return (
    left.sourceProduct.localeCompare(right.sourceProduct) ||
    left.geography.providerCode.localeCompare(right.geography.providerCode) ||
    left.sourceSeriesKey.localeCompare(right.sourceSeriesKey) ||
    left.period.localeCompare(right.period) ||
    left.observationKey.localeCompare(right.observationKey)
  );
}

function corpusIdentity(
  product: "bea-regional" | "bls-laus" | "hud-housing",
  corpus: CompiledCorpus<unknown>,
) {
  return {
    product,
    asOf: corpus.corpus.asOf,
    canonicalSha256: corpus.corpus.canonicalSha256,
    compiler: `${corpus.corpus.compiler.name}@${corpus.corpus.compiler.version}`,
  } as const;
}

function knownFromHud(
  value: number,
  evidence: Evidence,
  asOf: string,
): EconomicObservedValue {
  return {
    state: "KNOWN",
    value,
    evidence: [cloneEvidence(evidence)],
    release: null,
    asOf,
  };
}

function hudVintage(
  corpus: CompiledCorpus<HudRecord>,
  productVintage: string,
): EconomicObservationVintage {
  return {
    corpusAsOf: corpus.corpus.asOf,
    observationAsOf: corpus.corpus.asOf,
    productVintage,
    release: null,
    adjustment: "Published product benchmark; no transformation applied.",
    revision: "Release status not encoded in the locked product",
  };
}

function annualPeriod(year: string): MetricReferencePeriod {
  return {
    kind: "interval",
    startsAt: makeIsoDate(`${year}-01-01`),
    endsAt: makeIsoDate(`${year}-12-31`),
  };
}

function periodEnd(year: string, period: string): string {
  if (period === "M13") return `${year}-12-31`;
  const month = Number(period.slice(1));
  const day = new Date(Date.UTC(Number(year), month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function decimalFraction(value: number): {
  numerator: number;
  denominator: number;
} {
  const text = String(value);
  const places = text.includes(".") ? text.length - text.indexOf(".") - 1 : 0;
  const denominator = 10 ** places;
  const numerator = Math.round(value * denominator);
  return { numerator, denominator };
}

function observationAsOf(value: Sourced<number>, fallback: string): string {
  return value.state === "KNOWN" ? value.asOf : fallback;
}

function releaseOf(value: Sourced<number>): ReleaseStatus | null {
  return value.state === "KNOWN" ? value.release : null;
}

function sourceLabel(product: EconomicSourceProduct): string {
  if (product === "bea-regional")
    return "U.S. Bureau of Economic Analysis, Regional Economic Accounts";
  if (product === "bls-laus")
    return "U.S. Bureau of Labor Statistics, Local Area Unemployment Statistics";
  return "U.S. Department of Housing and Urban Development";
}

function methodologyKey(observation: EconomicContextObservation): string {
  if (observation.kind === "bea")
    return `method.bea.${observation.detailKey.toLowerCase().replace(":", ".")}`;
  if (observation.kind === "laus") return "method.bls-laus.area-estimate";
  return `method.hud.${observation.kind}`;
}

function cloneEvidence(evidence: Evidence): Evidence {
  return {
    ...evidence,
    locator: { ...evidence.locator },
  };
}

function cloneSourced<T>(value: Sourced<T>): Sourced<T> {
  return structuredClone(value);
}

function clonePeriod(period: MetricReferencePeriod): MetricReferencePeriod {
  return period.kind === "point" ? { ...period } : { ...period };
}

function cloneWorldMetricValue(value: WorldMetricValue): WorldMetricValue {
  return value.kind === "money"
    ? { kind: "money", money: { ...value.money } }
    : { kind: "quantity", quantity: { ...value.quantity } };
}

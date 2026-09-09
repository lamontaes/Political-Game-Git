import type {
  BrowserEconomicContextResult,
  BrowserEconomicObservation,
} from "./economic-context-browser";

export type EconomicGraphRecordClass =
  | "historical-observation"
  | "simulated-history"
  | "draft"
  | "forecast"
  | "outturn";

export interface EconomicGraphPoint {
  readonly pointKey: string;
  readonly period: string;
  readonly value: number | null;
  readonly missingReason: string | null;
  readonly recordClass: EconomicGraphRecordClass;
}

export interface EconomicGraphSeries {
  readonly seriesKey: string;
  readonly label: string;
  readonly recordClass: EconomicGraphRecordClass;
  readonly points: readonly EconomicGraphPoint[];
}

export interface EconomicGraphModel {
  readonly graphKey: string;
  readonly title: string;
  readonly description: string;
  readonly kind: "line" | "comparison-bars";
  readonly unit: string;
  readonly geography: {
    readonly providerCode: string;
    readonly providerName: string;
    readonly level: string;
  } | null;
  readonly referenceLabel: string;
  readonly series: readonly EconomicGraphSeries[];
  readonly boundaries: readonly string[];
}

export interface EconomicGraphCollection {
  readonly graphs: readonly EconomicGraphModel[];
  readonly unavailable: readonly {
    readonly graphKind: "gdp" | "budget-history" | "fiscal-estimate";
    readonly reason: string;
  }[];
}

const SERIES = {
  perCapitaIncome: "bea.cainc1.3",
  metroPriceParity: "bea.marpp.1",
  twoBedroomFmr: "hud.fmr.2-bedroom",
} as const;

export function economicObservationGraphs(
  context: BrowserEconomicContextResult,
): EconomicGraphCollection {
  const graphs: EconomicGraphModel[] = [];
  addObservationGraph(
    graphs,
    context,
    "per-capita-income",
    "Per-capita personal income",
    "Published annual area observations. These values are not personal cash.",
    (item) =>
      item.sourceSeriesKey === SERIES.perCapitaIncome &&
      item.geography.relationship === "same-jurisdiction",
  );
  addObservationGraph(
    graphs,
    context,
    "unemployment-rate",
    "Unemployment rate",
    "Published area estimates. The rate is not a person's job-loss probability.",
    (item) =>
      item.sourceProduct === "bls-laus" && item.sourceSeriesKey.endsWith("003"),
  );
  addObservationGraph(
    graphs,
    context,
    "metro-price-parity",
    "Regional price parity",
    "Published index observations; the national price level equals 100.",
    (item) => item.sourceSeriesKey === SERIES.metroPriceParity,
  );
  addObservationGraph(
    graphs,
    context,
    "two-bedroom-fmr",
    "Two-bedroom Fair Market Rent",
    "A published housing benchmark, not a rent offer or signed lease.",
    (item) => item.sourceSeriesKey === SERIES.twoBedroomFmr,
  );

  return {
    graphs,
    unavailable: [
      {
        graphKind: "gdp",
        reason:
          "The locked BEA tables are CAINC1, SARPP, and MARPP; none is a GDP series.",
      },
      {
        graphKind: "budget-history",
        reason:
          "No typed budget-history or outturn records were supplied to this economic context query.",
      },
      {
        graphKind: "fiscal-estimate",
        reason:
          "No proposal estimate was supplied; changing a UI value cannot create a forecast.",
      },
    ],
  };
}

function addObservationGraph(
  output: EconomicGraphModel[],
  context: BrowserEconomicContextResult,
  graphKey: string,
  title: string,
  description: string,
  predicate: (observation: BrowserEconomicObservation) => boolean,
): void {
  const observations = context.observations.filter(predicate);
  const first = observations[0];
  if (!first) return;
  const groups = new Map<string, BrowserEconomicObservation[]>();
  for (const item of observations) {
    const key = `${item.sourceSeriesKey}:${item.geography.providerCode}`;
    const rows = groups.get(key) ?? [];
    rows.push(item);
    groups.set(key, rows);
  }
  const units = new Set(observations.map((item) => item.unit));
  if (units.size !== 1) {
    throw new Error(`${title} cannot mix units: ${[...units].join(", ")}`);
  }
  output.push({
    graphKey,
    title,
    description,
    kind: "line",
    unit: first.unit,
    geography: {
      providerCode: first.geography.providerCode,
      providerName: first.geography.providerName,
      level: first.geography.level,
    },
    referenceLabel: `Available to the simulation on ${first.vintage.knownAvailableOn}`,
    series: [...groups.entries()].map(([seriesKey, rows]) => ({
      seriesKey,
      label: rows[0]!.label,
      recordClass: "historical-observation",
      points: rows
        .sort((left, right) =>
          left.referencePeriod.localeCompare(right.referencePeriod),
        )
        .map((item) => ({
          pointKey: item.observationKey,
          period: item.referencePeriod,
          value: item.value.state === "known" ? item.value.value : null,
          missingReason:
            item.value.state === "missing" ? item.value.reason : null,
          recordClass: "historical-observation",
        })),
    })),
    boundaries: [
      "Historical observation",
      "Missing observations remain gaps; no interpolation is performed.",
      "This graph does not project a future value or policy effect.",
    ],
  });
}

export interface FiscalGraphRecord {
  readonly recordKey: string;
  readonly seriesKey: string;
  readonly seriesLabel: string;
  readonly period: string;
  readonly value: number | null;
  readonly missingReason: string | null;
  readonly unit: string;
  readonly geographyKey: string;
  readonly geographyLabel: string;
  readonly recordClass: Exclude<
    EconomicGraphRecordClass,
    "historical-observation"
  >;
}

export function fiscalRecordGraph(
  graphKey: string,
  title: string,
  records: readonly FiscalGraphRecord[],
): EconomicGraphModel | null {
  if (records.length === 0) return null;
  const units = new Set(records.map((record) => record.unit));
  const geographies = new Set(records.map((record) => record.geographyKey));
  if (units.size !== 1 || geographies.size !== 1) {
    throw new Error(
      "A fiscal graph requires one exact unit and geography; incompatible records were not coerced.",
    );
  }
  const grouped = new Map<string, FiscalGraphRecord[]>();
  for (const record of records) {
    const groupedKey = `${record.seriesKey}:${record.recordClass}`;
    const rows = grouped.get(groupedKey) ?? [];
    rows.push(record);
    grouped.set(groupedKey, rows);
  }
  return {
    graphKey,
    title,
    description:
      "Supplied fiscal records retain their own lifecycle class; no observation is promoted to a forecast or outturn.",
    kind: "line",
    unit: records[0]!.unit,
    geography: {
      providerCode: records[0]!.geographyKey,
      providerName: records[0]!.geographyLabel,
      level: "supplied fiscal scope",
    },
    referenceLabel: "Periods supplied by the owning fiscal system",
    series: [...grouped.values()].map((rows) => ({
      seriesKey: `${rows[0]!.seriesKey}:${rows[0]!.recordClass}`,
      label: rows[0]!.seriesLabel,
      recordClass: rows[0]!.recordClass,
      points: rows
        .sort((left, right) => left.period.localeCompare(right.period))
        .map((record) => ({
          pointKey: record.recordKey,
          period: record.period,
          value: record.value,
          missingReason: record.missingReason,
          recordClass: record.recordClass,
        })),
    })),
    boundaries: [
      "Drafts, forecasts, simulated history, and outturn remain distinct.",
      "Missing values remain gaps.",
      "No GDP response or policy elasticity is inferred.",
    ],
  };
}

export interface LegislativeEstimateGraphInput {
  readonly estimateId: string;
  readonly measureId: string;
  readonly provisionIds: readonly string[];
  readonly addedOutlaysMinorUnits: number;
  readonly currency: "USD";
  readonly qualification: string;
  readonly referencePeriod: {
    readonly kind: "interval";
    readonly startsAt: string;
    readonly endsAt: string;
  };
}

export function legislativeEstimateComparisonGraph(
  estimate: LegislativeEstimateGraphInput,
): EconomicGraphModel {
  if (!Number.isSafeInteger(estimate.addedOutlaysMinorUnits)) {
    throw new Error(
      "Legislative estimate outlays must be integer USD minor units.",
    );
  }
  const period = `${estimate.referencePeriod.startsAt}–${estimate.referencePeriod.endsAt}`;
  return {
    graphKey: `legislative-estimate:${estimate.estimateId}`,
    title: "Proposal incremental outlay estimate",
    description: estimate.qualification,
    kind: "comparison-bars",
    unit: "USD minor units",
    geography: null,
    referenceLabel: period,
    series: [
      {
        seriesKey: `${estimate.estimateId}:baseline`,
        label: "Baseline incremental outlay",
        recordClass: "forecast",
        points: [
          {
            pointKey: `${estimate.estimateId}:baseline:${period}`,
            period,
            value: 0,
            missingReason: null,
            recordClass: "forecast",
          },
        ],
      },
      {
        seriesKey: `${estimate.estimateId}:proposal`,
        label: "Proposal incremental outlay",
        recordClass: "forecast",
        points: [
          {
            pointKey: `${estimate.estimateId}:proposal:${period}`,
            period,
            value: estimate.addedOutlaysMinorUnits,
            missingReason: null,
            recordClass: "forecast",
          },
        ],
      },
    ],
    boundaries: [
      "Conditional forecast under the estimate's stated assumptions.",
      "Zero is the proposal-specific incremental baseline, not a zero budget.",
      "This is not an appropriation, enactment, observed budget, or outturn.",
      "No GDP effect is represented.",
    ],
  };
}

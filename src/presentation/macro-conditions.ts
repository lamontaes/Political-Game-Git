import type { EconomicGraphModel } from "./economic-graphs";
import { proseMonthYear } from "./prose-dates";
import {
  projectModeledAccountHistory,
  type ModeledAccountEntry,
} from "./modeled-account-history";
import {
  macroConditionsAt,
  macroHistoryStart,
  macroMonthHistory,
  macroReleasesAt,
  macroScopeForJurisdiction,
  monthEnd,
  monthKeyOf,
  quarterKeyOf,
  type MacroReleaseIndicator,
} from "../simulation/macro-economy";
import type { EntityId, IsoDate, World } from "../simulation/types";

/**
 * Politics → Budget & economy: this World's own economic conditions.
 *
 * Every card, graph and accessible table row below is a view of ONE series
 * object, so they cannot disagree. All values were recorded by the canonical
 * monthly step; nothing is computed forward, interpolated or back-filled
 * here, and a missing value is a labeled gap rather than a zero.
 */

export type MacroValueClass =
  | "simulated-publication"
  | "modeled-condition"
  | "modeled-initial-condition"
  | "modeled-account-record";

export interface MacroSeriesPoint {
  readonly period: string;
  readonly periodEnd: IsoDate;
  readonly value: number | null;
  readonly missingReason: string | null;
  readonly sourceKey: string | null;
}

export interface MacroSeries {
  readonly key: string;
  readonly title: string;
  readonly unit: string;
  readonly geographyLabel: string;
  readonly cadence: "monthly" | "quarterly";
  readonly valueClass: MacroValueClass;
  readonly note: string;
  readonly points: readonly MacroSeriesPoint[];
}

export interface MacroCard {
  readonly seriesKey: string;
  readonly title: string;
  readonly value: number | null;
  readonly unit: string;
  readonly period: string | null;
  readonly geographyLabel: string;
  readonly valueClass: MacroValueClass;
  readonly note: string;
}

export interface MacroConditionsReadModel {
  readonly status: "recorded" | "no-history";
  readonly asOf: IsoDate;
  readonly startingConditions: {
    readonly effectiveDate: IsoDate;
    readonly inflation12mPct: number;
    readonly unemploymentPct: number;
    readonly housingClassification: string | null;
    readonly valueClass: "modeled-initial-condition";
  } | null;
  readonly series: readonly MacroSeries[];
  readonly cards: readonly MacroCard[];
  readonly graphs: readonly EconomicGraphModel[];
  readonly localNote: string | null;
}

const NATIONAL = "United States (national model)";

export function macroPeriodLabel(period: string): string {
  if (period.includes("-Q")) return `Q${period.slice(6)} ${period.slice(0, 4)}`;
  return proseMonthYear(`${period}-01`);
}

function recordedMonthKeys(world: World): readonly string[] {
  return macroMonthHistory(world, "national", world.currentDate).map((month) =>
    monthKeyOf(month.periodStart),
  );
}

function releaseSeries(
  world: World,
  indicator: MacroReleaseIndicator,
  title: string,
  unit: string,
  gapReason: string,
): MacroSeries {
  const releases = macroReleasesAt(world, world.currentDate, indicator).filter(
    (release) => release.scope === "national",
  );
  const byPeriod = new Map(
    releases.map((release) => [
      indicator === "real-output-growth-annualized-quarterly"
        ? quarterKeyOf(monthKeyOf(release.referencePeriodStart))
        : monthKeyOf(release.referencePeriodStart),
      release,
    ]),
  );
  const months = recordedMonthKeys(world);
  const quarterly = indicator === "real-output-growth-annualized-quarterly";
  const periods = quarterly
    ? [...new Set(months.map(quarterKeyOf))].filter((quarter) =>
        months.includes(
          `${quarter.slice(0, 4)}-${String(Number(quarter.slice(6)) * 3).padStart(2, "0")}`,
        ),
      )
    : months;
  return {
    key: `macro.${indicator}`,
    title,
    unit,
    geographyLabel: NATIONAL,
    cadence: quarterly ? "quarterly" : "monthly",
    valueClass: "simulated-publication",
    note: "Figures published in this world, not real government data.",
    points: periods.map((period) => {
      const release = byPeriod.get(period);
      return {
        period,
        periodEnd: release
          ? release.referencePeriodEnd
          : monthEnd(
              quarterly
                ? `${period.slice(0, 4)}-${String(Number(period.slice(6)) * 3).padStart(2, "0")}`
                : period,
            ),
        value: release?.value ?? null,
        missingReason: release ? null : gapReason,
        sourceKey: release?.key ?? null,
      };
    }),
  };
}

function housingSeries(world: World): MacroSeries {
  return {
    key: "macro.housing-supply-demand-ratio",
    title: "Housing availability",
    unit: "supply ÷ demand ratio (1.00 = balanced)",
    geographyLabel: NATIONAL,
    cadence: "monthly",
    valueClass: "modeled-condition",
    note: "A modeled ratio, not a count of homes; it moves only with recorded housing events.",
    points: macroMonthHistory(world, "national", world.currentDate).map(
      (month) => ({
        period: monthKeyOf(month.periodStart),
        periodEnd: month.periodEnd,
        value: month.housing?.supplyDemandRatio ?? null,
        missingReason: month.housing ? null : "No housing condition recorded.",
        sourceKey: month.key,
      }),
    ),
  };
}

function monthlyAccountTotals(
  entries: readonly ModeledAccountEntry[],
): Map<string, { receipts: number; outlays: number }> {
  const totals = new Map<string, { receipts: number; outlays: number }>();
  for (const entry of entries) {
    const key = monthKeyOf(entry.occurredAt);
    const row = totals.get(key) ?? { receipts: 0, outlays: 0 };
    if (entry.direction === "in") row.receipts += entry.transferred.minorUnits;
    else row.outlays += entry.transferred.minorUnits;
    totals.set(key, row);
  }
  return totals;
}

function budgetSeries(
  world: World,
  jurisdictionId: EntityId,
): readonly MacroSeries[] {
  const account = projectModeledAccountHistory(world, jurisdictionId);
  if (account.status !== "recorded") return [];
  const totals = monthlyAccountTotals(account.entries);
  const opened = monthKeyOf(account.openedAt);
  const months = recordedMonthKeys(world).filter((key) => key >= opened);
  const geographyLabel = account.jurisdictionLabel;
  const build = (
    key: string,
    title: string,
    pick: (row: { receipts: number; outlays: number }) => number,
  ): MacroSeries => ({
    key: `budget.${key}`,
    title,
    unit: "US dollars per month",
    geographyLabel,
    cadence: "monthly",
    valueClass: "modeled-account-record",
    note: "Money actually moved through this government's modeled receipts account; not its full treasury.",
    points: months.map((month) => {
      const row = totals.get(month) ?? { receipts: 0, outlays: 0 };
      return {
        period: month,
        periodEnd: monthEnd(month),
        value: pick(row) / 100,
        missingReason: null,
        sourceKey: account.accountOrganizationId,
      };
    }),
  });
  return [
    build("receipts", "Budget receipts", (row) => row.receipts),
    build("outlays", "Budget outlays", (row) => row.outlays),
    build("balance", "Budget balance", (row) => row.receipts - row.outlays),
  ];
}

function cardOf(series: MacroSeries): MacroCard {
  const latest = [...series.points].reverse().find((p) => p.value !== null);
  return {
    seriesKey: series.key,
    title: series.title,
    value: latest?.value ?? null,
    unit: series.unit,
    period: latest ? macroPeriodLabel(latest.period) : null,
    geographyLabel: series.geographyLabel,
    valueClass: series.valueClass,
    note: latest
      ? series.note
      : (series.points.at(-1)?.missingReason ?? "Nothing recorded yet."),
  };
}

function graphOf(series: MacroSeries): EconomicGraphModel {
  return {
    graphKey: series.key,
    title: series.title,
    description: series.note,
    kind: "line",
    unit: series.unit,
    geography: {
      providerCode: series.geographyLabel,
      providerName: series.geographyLabel,
      level: series.geographyLabel === NATIONAL ? "national" : "jurisdiction",
    },
    referenceLabel:
      series.cadence === "quarterly" ? "Calendar quarters" : "Calendar months",
    series: [
      {
        seriesKey: series.key,
        label: series.title,
        recordClass: "simulated-history",
        points: series.points.map((point) => ({
          pointKey: `${series.key}:${point.period}`,
          period: macroPeriodLabel(point.period),
          value: point.value,
          missingReason: point.missingReason,
          releaseStatus: null,
          recordClass: "simulated-history",
        })),
      },
    ],
    boundaries: [
      "Gaps are shown as gaps, never zeros.",
      "No forecast is drawn; every point was recorded when its period closed.",
    ],
  };
}

export function projectMacroConditions(
  world: World,
  jurisdictionId: EntityId,
): MacroConditionsReadModel {
  const start = macroHistoryStart(world);
  if (!start) {
    return {
      status: "no-history",
      asOf: world.currentDate,
      startingConditions: null,
      series: budgetSeries(world, jurisdictionId),
      cards: [],
      graphs: [],
      localNote: null,
    };
  }
  const series = [
    releaseSeries(
      world,
      "real-output-growth-annualized-quarterly",
      "Real output growth",
      "% annualized, quarterly",
      "Needs two full recorded quarters to compare.",
    ),
    releaseSeries(
      world,
      "unemployment-rate",
      "Unemployment",
      "% of labor force",
      "Not released for this month.",
    ),
    releaseSeries(
      world,
      "consumer-price-inflation-12m",
      "Consumer price inflation",
      "% over 12 months",
      "Needs twelve recorded months to compare.",
    ),
    housingSeries(world),
    ...budgetSeries(world, jurisdictionId),
  ];
  const local = macroConditionsAt(
    world,
    macroScopeForJurisdiction(jurisdictionId),
    world.currentDate,
  );
  const firstMonth = macroMonthHistory(world, "national", world.currentDate)[0];
  return {
    status: "recorded",
    asOf: world.currentDate,
    startingConditions: {
      effectiveDate: start.effectiveDate,
      inflation12mPct: start.initial.inflation12mPct,
      unemploymentPct: start.initial.unemploymentPct,
      housingClassification: firstMonth?.housing?.classification ?? null,
      valueClass: "modeled-initial-condition",
    },
    series,
    cards: series.map(cardOf),
    graphs: series.map(graphOf),
    localNote: local
      ? `This place's own conditions differ from the national figures after local events; local unemployment was ${local.unemploymentPct.toFixed(1)}% in ${macroPeriodLabel(monthKeyOf(local.periodStart))}.`
      : null,
  };
}

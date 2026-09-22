import {
  macroConditionsAt,
  macroMonthHistory,
  macroScopeForJurisdiction,
} from "../simulation/macro-economy";
import type {
  MacroMonthRecord,
  MacroScopeKey,
} from "../simulation/macro-economy";
import type { IsoDate, World } from "../simulation";
import type { BrowserEconomicContextResult } from "./economic-context-browser";

/**
 * A town's rent, income and unemployment after the last real edition.
 *
 * The real figures stop at the last edition the game ships, so without this a
 * life in 2031 reads the FY2025 rent and the 2024 county income. The world has
 * its own monthly economy (`world.macroEconomy`: growth, unemployment and a
 * price level, different in every game), so each figure is carried forward
 * from the month its edition reached the world by what that economy did since:
 *
 * - rent moves with the price level;
 * - income per person moves with the price level and real output;
 * - the unemployment rate moves by the change in the modeled rate.
 *
 * BLANKET RULE, pending research question
 * `local-economic-figures-after-the-last-real-edition`. It applies the same
 * way in every town because the model has no local price level of its own yet
 * (see `localMonth` in macro-economy/producer.ts). What these are is the
 * world's own conditions, never an agency release, and the screen says so.
 */
export const LOCAL_FIGURES_CARRIED_FORWARD_RULE =
  "blanket-until-researched" as const;

export interface CarriedLocalFigure {
  readonly key: "rent" | "income" | "unemployment";
  readonly label: string;
  readonly geographyLabel: string;
  readonly unit: "USD per month" | "USD per year" | "percent";
  /** The last real figure and the period it describes. */
  readonly realValue: number;
  readonly realPeriod: string;
  /** Where the world's own economy has taken it by now. */
  readonly carriedValue: number;
  readonly rule: typeof LOCAL_FIGURES_CARRIED_FORWARD_RULE;
}

const SERIES = [
  {
    key: "rent",
    seriesKey: "hud.fmr.2-bedroom",
    label: "Two-bedroom rent",
    unit: "USD per month",
  },
  {
    key: "income",
    seriesKey: "bea.cainc1.3",
    label: "Income per person",
    unit: "USD per year",
    level: "county",
  },
  {
    key: "unemployment",
    seriesKey: "bls.laus.lasst",
    suffix: "03",
    label: "Unemployment rate",
    unit: "percent",
  },
] as const;

type Observation = BrowserEconomicContextResult["observations"][number];

function latestFor(
  observations: readonly Observation[],
  spec: (typeof SERIES)[number],
): Observation | null {
  const matching = observations.filter(
    (item) =>
      item.value.state === "known" &&
      ("suffix" in spec
        ? item.sourceSeriesKey.startsWith(spec.seriesKey) &&
          item.sourceSeriesKey.endsWith(spec.suffix)
        : item.sourceSeriesKey === spec.seriesKey) &&
      (!("level" in spec) || item.geography.level === spec.level),
  );
  return (
    matching.sort((a, b) =>
      b.referencePeriod.localeCompare(a.referencePeriod),
    )[0] ?? null
  );
}

/**
 * The model's month at a date: the town's own layer where it has one by then,
 * otherwise the national month.
 *
 * A town's layer only begins once something local happens to it, and it
 * continues from the national month it began at, so a figure that reached the
 * world before the layer existed is based on the national month and carried
 * by the town's layer from there. Basing it on the layer's first month instead
 * would quietly move the base forward the day a local shock arrived, and the
 * carried rent would fall while prices rose.
 */
function monthAt(
  world: World,
  local: MacroScopeKey,
  date: string,
): MacroMonthRecord | null {
  return (
    macroConditionsAt(world, local, date as IsoDate) ??
    macroConditionsAt(world, "national", date as IsoDate)
  );
}

/** The month a figure first reached this world, or the world's first month. */
function baseMonth(
  world: World,
  local: MacroScopeKey,
  availableOn: string,
): MacroMonthRecord | null {
  return (
    monthAt(world, local, availableOn) ??
    macroMonthHistory(world, "national", world.currentDate)[0] ??
    null
  );
}

/**
 * The carried-forward figures for a town, or an empty list until the world's
 * economy has moved at least one month past each figure's edition.
 */
export function carriedLocalFigures(
  world: World,
  jurisdictionId: string,
  context: BrowserEconomicContextResult,
): readonly CarriedLocalFigure[] {
  const local = macroScopeForJurisdiction(jurisdictionId);
  const now = monthAt(world, local, world.currentDate);
  if (!now) return [];
  const figures: CarriedLocalFigure[] = [];
  for (const spec of SERIES) {
    const observation = latestFor(context.observations, spec);
    if (!observation || observation.value.state !== "known") continue;
    const base = baseMonth(world, local, observation.vintage.knownAvailableOn);
    if (!base || base.periodStart === now.periodStart) continue;
    const real = observation.value.value;
    const prices = now.priceIndex / base.priceIndex;
    const output = now.realOutputIndex / base.realOutputIndex;
    const carried =
      spec.key === "rent"
        ? Math.round(real * prices)
        : spec.key === "income"
          ? Math.round(real * prices * output)
          : Math.max(
              0,
              Math.round(
                (real + now.unemploymentPct - base.unemploymentPct) * 10,
              ) / 10,
            );
    figures.push({
      key: spec.key,
      label: spec.label,
      geographyLabel: observation.geography.providerName,
      unit: spec.unit,
      realValue: real,
      realPeriod: observation.referencePeriod,
      carriedValue: carried,
      rule: LOCAL_FIGURES_CARRIED_FORWARD_RULE,
    });
  }
  return figures;
}

function format(value: number, unit: CarriedLocalFigure["unit"]): string {
  if (unit === "percent") return `${value.toFixed(1)}%`;
  const dollars = value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return unit === "USD per month" ? `${dollars} a month` : `${dollars} a year`;
}

/** One line per figure, saying which number is real and which is the world's. */
export function carriedLocalFigureLine(figure: CarriedLocalFigure): string {
  return `${figure.label}, ${figure.geographyLabel}: ${format(
    figure.carriedValue,
    figure.unit,
  )} now in this world, from ${format(figure.realValue, figure.unit)} in the last published figure (${figure.realPeriod}).`;
}

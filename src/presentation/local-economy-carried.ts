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

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * A reference period as a player reads it: "July 2026", "2025". The providers'
 * codes ("2026-M07", "FY2025", "2024-Q3") are bookkeeping, not player text.
 */
export function periodInWords(period: string): string {
  const month = /^(\d{4})-M(\d{2})$/.exec(period);
  if (month) {
    const name = MONTHS[Number(month[2]) - 1];
    if (name) return `${name} ${month[1]}`;
  }
  const quarter = /^(\d{4})-Q([1-4])$/.exec(period);
  if (quarter) {
    const first = MONTHS[(Number(quarter[2]) - 1) * 3]!;
    const last = MONTHS[(Number(quarter[2]) - 1) * 3 + 2]!;
    return `${first} to ${last} ${quarter[1]}`;
  }
  const year = /(\d{4})/.exec(period);
  return year ? year[1]! : period;
}

/**
 * A place name without the provider's footnote mark ("AK*"). In BEA's
 * regional tables the asterisk points to CAINC1__Footnotes.html, whose notes
 * record past county and census-area boundary changes; none describes the
 * recent figure a player is shown, so the mark is dropped, not explained.
 */
export function placeInWords(name: string): string {
  return name.replace(/\*+$/u, "").trim();
}

/**
 * One line per figure: where the world is now and where it started. The
 * player's line names no publication or agency, only the time the starting
 * figure describes.
 */
export function carriedLocalFigureLine(figure: CarriedLocalFigure): string {
  const direction =
    figure.carriedValue > figure.realValue
      ? "up from"
      : figure.carriedValue < figure.realValue
        ? "down from"
        : "the same as";
  return `${figure.label}, ${placeInWords(figure.geographyLabel)}: ${format(
    figure.carriedValue,
    figure.unit,
  )}, ${direction} ${format(figure.realValue, figure.unit)} in ${periodInWords(figure.realPeriod)}.`;
}

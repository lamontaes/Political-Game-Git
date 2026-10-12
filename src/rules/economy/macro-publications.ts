/** Full retained monthly/inflation/quarterly release math, source selection and English formatting. Returns draft DTOs for common publication transport. */
import type { IsoDate } from "../../simulation/types";
import type {
  MacroEconomyStore,
  MacroMonthRecord,
  MacroReleaseIndicator,
  MacroReleaseRecord,
} from "../../simulation/macro-economy/types";
import { roundMacro } from "./macro-kernel";
import {
  annualizedQuarterlyGrowthPct,
  twelveMonthChangePct,
} from "./macro-index-rules";
import { monthKeyOf, previousMonthKey } from "./macro-calendar";
// STOPGAP: economy.macro-release-native-frontier
export function quarterKeyOf(monthKey: string): string {
  const quarter = Math.floor((Number(monthKey.slice(5, 7)) - 1) / 3) + 1;
  return `${monthKey.slice(0, 4)}-Q${quarter}`;
}

export function quarterMonthKeys(quarterKey: string): readonly string[] {
  const quarter = Number(quarterKey.slice(6));
  const first = (quarter - 1) * 3 + 1;
  return [first, first + 1, first + 2].map(
    (month) => `${quarterKey.slice(0, 4)}-${String(month).padStart(2, "0")}`,
  );
}

export function previousQuarterKey(quarterKey: string): string {
  const year = Number(quarterKey.slice(0, 4));
  const quarter = Number(quarterKey.slice(6));
  return quarter === 1
    ? `${String(year - 1).padStart(4, "0")}-Q4`
    : `${quarterKey.slice(0, 4)}-Q${quarter - 1}`;
}
const MONTH_NAMES = [
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
function monthLabel(monthKey: string): string {
  return `${MONTH_NAMES[Number(monthKey.slice(5, 7)) - 1]} ${monthKey.slice(0, 4)}`;
}
function formatPct(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)} percent`;
}
interface ReleaseDraft {
  readonly indicator: MacroReleaseIndicator;
  readonly periodKey: string;
  readonly referencePeriodStart: IsoDate;
  readonly referencePeriodEnd: IsoDate;
  readonly value: number;
  readonly unit: MacroReleaseRecord["unit"];
  readonly sourceMonthKeys: readonly string[];
  readonly summary: string;
}
export function releaseDrafts(
  store: MacroEconomyStore,
  monthKey: string,
): readonly ReleaseDraft[] {
  const national = new Map(
    store.months
      .filter((record) => record.scope === "national")
      .map((record) => [monthKeyOf(record.periodStart), record]),
  );
  const current = national.get(monthKey)!;
  const drafts: ReleaseDraft[] = [
    {
      indicator: "unemployment-rate",
      periodKey: monthKey,
      referencePeriodStart: current.periodStart,
      referencePeriodEnd: current.periodEnd,
      value: roundMacro(current.unemploymentPct),
      unit: "percent-of-labor-force",
      sourceMonthKeys: [current.key],
      summary: `The national unemployment rate for ${monthLabel(monthKey)} was reported at ${formatPct(current.unemploymentPct)}.`,
    },
  ];
  const yearAgo = national.get(previousMonthKey(monthKey, 12));
  if (yearAgo) {
    const value = twelveMonthChangePct(current.priceIndex, yearAgo.priceIndex);
    drafts.push({
      indicator: "consumer-price-inflation-12m",
      periodKey: monthKey,
      referencePeriodStart: current.periodStart,
      referencePeriodEnd: current.periodEnd,
      value,
      unit: "percent-12-month",
      sourceMonthKeys: [yearAgo.key, current.key],
      summary: `Consumer prices in ${monthLabel(monthKey)} were reported ${formatPct(Math.abs(value))} ${value < 0 ? "lower" : "higher"} than a year earlier.`,
    });
  }
  const quarter = quarterKeyOf(monthKey);
  const quarterMonths = quarterMonthKeys(quarter);
  if (quarterMonths[2] === monthKey) {
    const now = quarterMonths.map((key) => national.get(key));
    const before = quarterMonthKeys(previousQuarterKey(quarter)).map((key) =>
      national.get(key),
    );
    if (now.every(Boolean) && before.every(Boolean)) {
      const mean = (records: readonly (MacroMonthRecord | undefined)[]) =>
        records.reduce((sum, record) => sum + record!.realOutputIndex, 0) /
        records.length;
      const value = annualizedQuarterlyGrowthPct(mean(now), mean(before));
      drafts.push({
        indicator: "real-output-growth-annualized-quarterly",
        periodKey: quarter,
        referencePeriodStart: now[0]!.periodStart,
        referencePeriodEnd: now[2]!.periodEnd,
        value,
        unit: "percent-annualized",
        sourceMonthKeys: [...before, ...now].map((record) => record!.key),
        summary: `The national economy's real output was reported ${value < 0 ? "shrinking" : "growing"} at an annual rate of ${formatPct(Math.abs(value))} in the ${["first", "second", "third", "fourth"][Number(quarter.slice(6)) - 1]} quarter of ${quarter.slice(0, 4)}.`,
      });
    }
  }
  return drafts;
}

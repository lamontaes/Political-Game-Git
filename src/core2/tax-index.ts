/**
 * How far the law's indexed tax amounts have moved since their dollar year
 * (pool item money-tax-brackets-and-benefits-not-indexed-to-prices). A law
 * row that says it is indexed (`terms.indexed`, written from
 * data/research/money/tax-indexing-2026.json) has its brackets, standard
 * deduction or wage base raised once a year, each January, by the rise in
 * prices or in average pay since January of its dollar year, as the statutes
 * do (26 U.S.C. 1(f), 42 U.S.C. 430). Read from the economy's own months
 * (the macro module's `months` table), so the town and the country tier move
 * by the same index. Only forward: in or before the dollar year the amounts
 * stand as written.
 */
import type { CoreAPI, CoreState } from "./types";

/** What an indexed amount moves with. */
export type TaxIndexBy = "prices" | "wages";

/** The factor an amount written in `dollarYear` is raised by this year. */
export type TaxIndex = (by: TaxIndexBy, dollarYear: number) => number;

interface MonthRow {
  readonly priceIndex?: number;
  readonly hourlyEarnings?: number;
}

/** The economy's index reader for the law in force today, or none where the world keeps no economy. */
export function taxIndexOf(
  api: CoreAPI,
  date: string = api.state.date,
): TaxIndex | undefined {
  if (!(api.state as CoreState).modules.has("macro")) return undefined;
  const months = api.moduleState("macro").table("months");
  const year = Number(date.slice(0, 4));
  return (by, dollarYear) => {
    if (!(year > dollarYear)) return 1;
    // stopgapId: SG-WORLD-tax-index-january
    const at = (y: number) =>
      months.get(`macro-month:${y}-01`) as unknown as MonthRow | undefined;
    const field = by === "prices" ? "priceIndex" : "hourlyEarnings";
    const now = at(year)?.[field];
    const then = at(dollarYear)?.[field];
    return now && then && now > 0 && then > 0 ? now / then : 1;
  };
}

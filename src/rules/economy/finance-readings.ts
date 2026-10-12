/** Retained national trailing-three-month finance reader and saved taxable-sales price chaining. */
import { MACRO_CREDIT_POLICY } from "./macro-credit";
import { MACRO_ERA_POLICY } from "./macro-policy";
import type { EntityId, IsoDate, World } from "../../simulation/types";
export interface FinanceReadingFacts {
  readonly onDate: IsoDate;
  readonly macroEconomy:
    Pick<NonNullable<World["macroEconomy"]>, "months"> | undefined;
  readonly townFinances:
    | Pick<
        NonNullable<World["townFinances"]>,
        "taxableSales" | "basePriceIndex"
      >
    | undefined;
}
interface Economy {
  readonly growthGapPct: number;
  readonly trendPct: number;
  readonly inflationPct: number;
  readonly chargeOffPct: number;
  readonly debtRatePct: number;
  readonly lendingGrowthPct: number;
  readonly tightness: number;
  readonly priceIndex: number;
  readonly nationalUnemploymentPct: number | null;
}
export function economyOf(facts: FinanceReadingFacts): Economy | null {
  const months = facts.macroEconomy?.months ?? [];
  const national = months
    .filter(
      (month) => month.scope === "national" && month.recordedAt <= facts.onDate,
    )
    .slice(-3);
  if (national.length === 0) return null;
  const mean = (values: readonly number[]) =>
    values.reduce((sum, value) => sum + value, 0) / values.length;
  const growth = mean(national.map((m) => m.growthPct));
  const inflation = mean(national.map((m) => m.inflationPct));
  const credit = national.map((m) => m.credit).filter((c) => c !== undefined);
  const start = MACRO_CREDIT_POLICY.start;
  const trend =
    national.at(-1)!.drivers?.trendPct ?? MACRO_ERA_POLICY.start.trendGrowthPct;
  return {
    growthGapPct: growth - trend,
    trendPct: trend,
    inflationPct: inflation,
    chargeOffPct: credit.length
      ? mean(credit.map((c) => c.chargeOffPct))
      : start.chargeOffPct,
    debtRatePct: credit.length
      ? mean(credit.map((c) => c.debtRatePct))
      : mean(
          national.map(
            (m) => (m.policyRate.lowerPct + m.policyRate.upperPct) / 2,
          ),
        ) + start.spreadPp,
    lendingGrowthPct: credit.length
      ? mean(credit.map((c) => c.lendingGrowthPct))
      : growth + inflation,
    tightness: mean(national.map((m) => m.creditTightness)),
    nationalUnemploymentPct: national.at(-1)!.unemploymentPct,
    priceIndex: national.at(-1)!.priceIndex,
  };
}
export function townTaxableSales(
  facts: FinanceReadingFacts,
  town: EntityId,
): number | null {
  const store = facts.townFinances;
  const economy = economyOf(facts);
  const index = store?.taxableSales?.[town];
  if (!store || !economy || index === undefined) return null;
  return (
    index * (economy.priceIndex / (store.basePriceIndex ?? economy.priceIndex))
  );
}

/**
 * A town's home-price level, month by month, from the economy the world has
 * recorded. No draws: each month's change is Build 15's measured price model
 * (`housing-price-model.ts`) applied to the macro months of the town's scope.
 *
 * Inputs, read from the record:
 *   income growth: the month's real growth plus inflation, both continuous
 *     annual rates, averaged over the last twelve recorded months. The game
 *     keeps no wage index yet, so the value of output stands in for income.
 *   rate change: the policy-rate midpoint against twelve months earlier,
 *     passed unscaled. STAND-IN: policy rate for the 30-year mortgage rate
 *     (not measured as a pass-through); the macro months carry no mortgage
 *     rate. No central bank is modeled yet, so the range never moves and this
 *     is zero.
 *   price-to-income gap: the log of home prices over output value, against the
 *     same ratio at the world's first month, as of the month before.
 *   the town's own events: none are wired yet, so zero.
 *
 * HARDWIRED at the start: before the world's first month, home prices are
 * taken to have grown with income and to sit at their usual ratio to it.
 */

import type { EntityId, IsoDate, World } from "../types";
import {
  macroMonthHistory,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import type { MacroMonthRecord } from "../macro-economy/types";
import { priceGrowthMonthly } from "./housing-price-model";

const WINDOW = 12;

interface Level {
  readonly recordedAt: IsoDate;
  readonly level: number;
}

const cache = new WeakMap<readonly unknown[], Map<string, readonly Level[]>>();

function incomeRate(month: MacroMonthRecord): number {
  return (month.growthPct + month.inflationPct) / 100;
}

function rateMidpoint(month: MacroMonthRecord): number {
  return (month.policyRate.lowerPct + month.policyRate.upperPct) / 2;
}

/** The home-price level after each recorded month, the first month at 1. */
export function homePriceLevels(
  months: readonly MacroMonthRecord[],
): readonly Level[] {
  if (months.length === 0) return [];
  const first = months[0]!;
  // Before the first month: prices grew with income, so each earlier month
  // carries a twelfth of the first month's income rate.
  const changes: number[] = Array.from(
    { length: WINDOW },
    () => incomeRate(first) / WINDOW,
  );
  const incomes: number[] = Array.from({ length: WINDOW }, () =>
    incomeRate(first),
  );
  const logIncome = (month: MacroMonthRecord) =>
    Math.log(month.realOutputIndex * month.priceIndex);
  const startGap = -logIncome(first);
  let logPrice = 0;
  let gap = logPrice - logIncome(first) - startGap;
  const levels: Level[] = [{ recordedAt: first.recordedAt, level: 1 }];
  for (let index = 1; index < months.length; index += 1) {
    const month = months[index]!;
    incomes.push(incomeRate(month));
    const yearAgo = months[Math.max(0, index - WINDOW)]!;
    const change = priceGrowthMonthly({
      lastGrowth: changes.slice(-WINDOW).reduce((sum, row) => sum + row, 0),
      incomeGrowth:
        incomes.slice(-WINDOW).reduce((sum, row) => sum + row, 0) / WINDOW,
      rateChangePp: rateMidpoint(month) - rateMidpoint(yearAgo),
      priceToIncomeGapLog: gap,
      housingLawEffect: 0,
    });
    changes.push(change);
    logPrice += change;
    gap = logPrice - logIncome(month) - startGap;
    levels.push({ recordedAt: month.recordedAt, level: Math.exp(logPrice) });
  }
  return levels;
}

/**
 * The town's home-price level on `date` against the world's first recorded
 * month: its own scope's months when the world keeps them, else the nation's.
 */
export function homePriceLevel(
  world: World,
  town: EntityId,
  date: IsoDate,
): number {
  const all = world.macroEconomy?.months ?? [];
  let byScope = cache.get(all);
  if (!byScope) {
    byScope = new Map();
    cache.set(all, byScope);
  }
  const local = macroScopeForJurisdiction(town);
  const scope = all.some((month) => month.scope === local) ? local : "national";
  let levels = byScope.get(scope);
  if (!levels) {
    levels = homePriceLevels(
      macroMonthHistory(world, scope, "9999-12-31" as IsoDate),
    );
    byScope.set(scope, levels);
  }
  let found = 1;
  for (const row of levels) {
    if (row.recordedAt > date) break;
    found = row.level;
  }
  return found;
}

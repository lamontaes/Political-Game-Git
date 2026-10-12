/** Full retained supply-law selection and native monthly housing-price/cache math over raw law/month records. */
import { addDays } from "../../simulation/dates";
import {
  lawInForce,
  lawInForceAtStart,
  type LawFacts,
} from "../laws/dated-law";
import { macroMonthHistory } from "./macro-readings";
import { priceGrowthMonthly } from "./housing-price-model";
import type { EntityId, IsoDate } from "../../simulation/types";
import type {
  MacroMonthRecord,
  MacroScopeKey,
} from "../../simulation/macro-economy/types";
export interface HousingPriceFacts {
  readonly months: readonly MacroMonthRecord[];
  readonly laws: LawFacts;
}
const macroScopeForJurisdiction = (id: string): MacroScopeKey =>
  `jurisdiction:${id}`;
const WINDOW = 12;
export const HOUSING_SUPPLY_LAWS = [
  "us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones",
  "us-policy-positions:housing-land-use.by-right-permitting",
  "us-policy-positions:housing-land-use.preempt-local-housing-limits",
] as const;
export const HOUSING_SUPPLY_LAW_EFFECT = {
  fiveYearLogChange: -0.12,
  monthlyLogChange: -0.00146,
  actsAfterDays: 365,
} as const;
const supplyLawIdsByCatalog = new WeakMap<object, readonly EntityId[]>();
function supplyLawIds(facts: HousingPriceFacts): readonly EntityId[] {
  const propositions = facts.laws.policyCatalog?.propositions;
  if (!propositions) return [];
  let ids = supplyLawIdsByCatalog.get(propositions);
  if (!ids) {
    const wanted = new Set<string>(HOUSING_SUPPLY_LAWS);
    ids = Object.values(propositions)
      .filter((row) => wanted.has(row.stableKey))
      .map((row) => row.id);
    supplyLawIdsByCatalog.set(propositions, ids);
  }
  return ids;
}
// stopgapId: "economy.housing-supply-law-response"
export function housingLawEffect(
  facts: HousingPriceFacts,
  town: EntityId,
  date: IsoDate,
): number {
  const acting = addDays(date, -HOUSING_SUPPLY_LAW_EFFECT.actsAfterDays);
  let change = 0;
  for (const question of supplyLawIds(facts)) {
    const law = lawInForce(facts.laws, town, question, date);
    if (law?.origin !== "enacted" || law.operativeAt > acting) continue;
    const before =
      lawInForceAtStart(facts.laws, town, question, date) === "yes" ? 1 : 0;
    change += (law.answer === "yes" ? 1 : 0) - before;
  }
  if (change === 0) return 0;
  return Math.sign(change) * HOUSING_SUPPLY_LAW_EFFECT.monthlyLogChange;
}
interface Level {
  readonly recordedAt: IsoDate;
  readonly level: number;
}
const cache = new WeakMap<
  readonly unknown[],
  Map<
    string,
    {
      readonly count: number;
      readonly laws: number;
      readonly levels: readonly Level[];
    }
  >
>();
function incomeRate(month: MacroMonthRecord): number {
  return (month.growthPct + month.inflationPct) / 100;
}
// stopgapId: "economy.home-price-mortgage-rate-proxy"
function rateMidpoint(month: MacroMonthRecord): number {
  return (month.policyRate.lowerPct + month.policyRate.upperPct) / 2;
}
// stopgapId: "economy.housing-price-cache-frontier"
// stopgapId: "economy.home-price-opening-level"
export function homePriceLevels(
  months: readonly MacroMonthRecord[],
  townEffect: (month: MacroMonthRecord) => number = () => 0,
): readonly Level[] {
  if (months.length === 0) return [];
  const first = months[0]!;
  const changes: number[] = Array.from(
    { length: WINDOW },
    () => incomeRate(first) / WINDOW,
  );
  const incomes: number[] = Array.from({ length: WINDOW }, () =>
    incomeRate(first),
  );
  let logIncome = 0;
  let logPrice = 0;
  let gap = 0;
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
      housingLawEffect: townEffect(month),
    });
    changes.push(change);
    logPrice += change;
    logIncome += incomeRate(month) / WINDOW;
    gap = logPrice - logIncome;
    levels.push({ recordedAt: month.recordedAt, level: Math.exp(logPrice) });
  }
  return levels;
}
export function homePriceLevel(
  facts: HousingPriceFacts,
  town: EntityId,
  date: IsoDate,
): number {
  const all = facts.months ?? [];
  let byScope = cache.get(all);
  if (!byScope) {
    byScope = new Map();
    cache.set(all, byScope);
  }
  const local = macroScopeForJurisdiction(town);
  let entry = byScope.get(local);
  const laws = facts.laws.enactments?.length ?? 0;
  if (!entry || entry.count !== all.length || entry.laws !== laws) {
    const end = "9999-12-31" as IsoDate;
    const own = macroMonthHistory(
      { months: facts.months, releases: [] },
      local,
      end,
    );
    const firstOwn = own[0]?.recordedAt;
    const national = macroMonthHistory(
      { months: facts.months, releases: [] },
      "national",
      end,
    ).filter((month) => firstOwn === undefined || month.recordedAt < firstOwn);
    entry = {
      count: all.length,
      laws,
      levels: homePriceLevels([...national, ...own], (month) =>
        housingLawEffect(facts, town, month.recordedAt),
      ),
    };
    byScope.set(local, entry);
  }
  let found = 1;
  for (const row of entry.levels) {
    if (row.recordedAt > date) break;
    found = row.level;
  }
  return found;
}

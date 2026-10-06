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
 *   the town's own events: a law enacted in play that lets more homes be
 *     built (`HOUSING_SUPPLY_LAWS`), once it has been in force a year
 *     (`HOUSING_SUPPLY_LAW_EFFECT`). Nothing else is wired yet.
 *
 * HARDWIRED at the start: before the world's first month, home prices are
 * taken to have grown with income and to sit at their usual ratio to it.
 */

import type { EntityId, IsoDate, World } from "../types";
import { OUTCOME_LINKS } from "../outcome-web";
import type { PlaceOutcomeRecord } from "../outcome-web/place-outcome-store";
import {
  lawEffectStamp,
  type LawEffectStampedRecord,
} from "../law-effect-stamp";
import { addDays } from "../dates";
import { lawInForce, lawInForceAtStart } from "../governing/law-in-force";
import {
  macroMonthHistory,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import type { MacroMonthRecord } from "../macro-economy/types";
import { priceGrowthMonthly } from "./housing-price-model";

const WINDOW = 12;

/**
 * The laws that let more homes be built. Each is a policy question a state or
 * a town answers; the law the place began with is already in its prices, so
 * only a change from it in play moves them.
 */
export const HOUSING_SUPPLY_LAWS = [
  "us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones",
  "us-policy-positions:housing-land-use.by-right-permitting",
  "us-policy-positions:housing-land-use.preempt-local-housing-limits",
] as const;

/**
 * What a law letting more homes be built does to a town's home prices, once
 * it has been in force long enough for homes to go up. The laws act as one
 * package: a second such law adds nothing measured.
 *
 * Measured, and HARDWIRED as the middle of what was found:
 *   Minneapolis, which allowed three homes on every residential lot among
 *   other reforms: from 2017 to 2022 its housing stock grew 12% and rents 1%,
 *   while in the rest of Minnesota the stock grew 4% and rents 14% (Pew
 *   Charitable Trusts, January 4, 2024). About 12 log points over five years.
 *   Auckland's 2016 upzoning: three-bedroom rents 26% to 33% lower after six
 *   years than in comparable cities (Greenaway-McGrevy, Economic Inquiry,
 *   2025). Not a U.S. place, so a check, not the size.
 *   California's SB 9 (2021): 53 homes approved in its first year across 13
 *   cities (Terner Center, 2022), about zero.
 *   Sao Paulo's 2014 upzoning: home prices 0.5% lower in the long run
 *   (Anagol, Ferreira and Rexer, NBER w29440, 2021; Research 1's table of
 *   September 29, 2026, marks it provisional, not U.S.). The low end.
 * `monthlyLogChange` is the push each month that, through the price model's
 * momentum and its pull back toward income, leaves prices the measured 12 log
 * points lower after five years (worked out on steady growth; the test checks
 * it). The recorded game delay is 365 days before the supply effect begins.
 */
export const HOUSING_SUPPLY_LAW_EFFECT = {
  fiveYearLogChange: -0.12,
  monthlyLogChange: -0.00146,
  actsAfterDays: 365,
} as const;

// Resolve after module initialization: rent/home readers and the outcome engine
// import each other. Reuse this immutable link index after its first actual call.
let supplyLinksByKey: Map<string, (typeof OUTCOME_LINKS)[number]> | undefined;
function supplyLinks() {
  return (supplyLinksByKey ??= new Map(
    OUTCOME_LINKS.filter(
      (link) => link.to === "housing.new-large-buildings",
    ).map((link) => [link.key, link]),
  ));
}

const supplyLawIdsByCatalog = new WeakMap<object, readonly EntityId[]>();

/** The catalog ids of `HOUSING_SUPPLY_LAWS`, read once per catalog. */
function supplyLawIds(world: World): readonly EntityId[] {
  const propositions = world.policyCatalog?.propositions;
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

/**
 * The town's own events that move its home prices in the month recorded on
 * `date`, as a monthly log change: a supply law enacted in play, a year after
 * it took effect. Repealing one the town began with moves prices the other
 * way.
 */
export function housingLawEffect(
  world: World,
  town: EntityId,
  date: IsoDate,
): number {
  const acting = addDays(date, -HOUSING_SUPPLY_LAW_EFFECT.actsAfterDays);
  let change = 0;
  for (const question of supplyLawIds(world)) {
    const law = lawInForce(world, town, question, date);
    if (law?.origin !== "enacted" || law.operativeAt > acting) continue;
    const before =
      lawInForceAtStart(world, town, question, date) === "yes" ? 1 : 0;
    change += (law.answer === "yes" ? 1 : 0) - before;
  }
  if (change === 0) return 0;
  return Math.sign(change) * HOUSING_SUPPLY_LAW_EFFECT.monthlyLogChange;
}

interface Level {
  readonly recordedAt: IsoDate;
  readonly level: number;
}

/**
 * Keyed by the months array; an entry holds while the number of months and of
 * enacted laws is unchanged, so a month or a law added later counts.
 */
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

function rateMidpoint(month: MacroMonthRecord): number {
  return (month.policyRate.lowerPct + month.policyRate.upperPct) / 2;
}

/** The home-price level after each recorded month, the first month at 1. */
export function homePriceLevels(
  months: readonly MacroMonthRecord[],
  townEffect: (month: MacroMonthRecord) => number = () => 0,
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
  // Income is carried as the sum of each month's rate, not read from the
  // index, so a switch from the nation's months to the town's own does not
  // jump when the two indexes start from different bases.
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

/**
 * The town's home-price level on `date` against the world's first recorded
 * month. The nation's months run until the town's own scope begins keeping
 * months, and the town's own months from then on.
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
  let entry = byScope.get(local);
  const laws = world.history.legislativeEnactments?.length ?? 0;
  if (!entry || entry.count !== all.length || entry.laws !== laws) {
    const end = "9999-12-31" as IsoDate;
    const own = macroMonthHistory(world, local, end);
    const firstOwn = own[0]?.recordedAt;
    const national = macroMonthHistory(world, "national", end).filter(
      (month) => firstOwn === undefined || month.recordedAt < firstOwn,
    );
    entry = {
      count: all.length,
      laws,
      levels: homePriceLevels([...national, ...own], (month) =>
        housingLawEffect(world, town, month.recordedAt),
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

/**
 * Attribute an actually changed saved permit-unit record to its operative
 * housing law. A price cache or an unchanged modeled level is not a saved
 * consequence. This records provenance; it does not apply another multiplier.
 */
export function withHousingSupplyLawStamps(
  world: World,
  record: PlaceOutcomeRecord & LawEffectStampedRecord,
): PlaceOutcomeRecord & LawEffectStampedRecord {
  if (record.measure !== "housing.new-large-buildings") return record;
  const structural = record.structural ?? record.base;
  if (record.value === Math.round(structural * 100) / 100) return record;
  if (
    record.places &&
    record.places.reduce((sum, place) => sum + place.weight, 0) >= 1
  )
    return record;
  const stamps = [...(record.lawEffectStamps ?? [])];
  const wanted = new Set<string>(HOUSING_SUPPLY_LAWS);
  for (const cause of record.causes) {
    if (cause.factor === 1) continue;
    const link = supplyLinks().get(cause.key);
    if (!link || link.to !== record.measure || !link.from.startsWith("law:"))
      continue;
    const questionKey = link.from.slice("law:".length);
    if (!wanted.has(questionKey)) continue;
    const propositionId = supplyLawIds(world).find(
      (id) => world.policyCatalog.propositions[id]?.stableKey === questionKey,
    );
    if (!propositionId) continue;
    const law = lawInForce(
      world,
      record.jurisdictionId,
      propositionId,
      record.month,
    );
    if (law?.origin !== "enacted") continue;
    const stamp = lawEffectStamp(law, {
      effectKind: "housing-permit-units",
      questionKey,
      jurisdictionId: record.jurisdictionId,
      appliedAt: record.month,
      sourceRecordIds: [law.measureId],
    });
    if (
      !stamp ||
      stamps.some(
        (saved) =>
          saved.governingLawKey === stamp.governingLawKey &&
          saved.effectKind === stamp.effectKind &&
          saved.appliedAt === stamp.appliedAt,
      )
    )
      continue;
    stamps.push(stamp);
  }
  return stamps.length === (record.lawEffectStamps?.length ?? 0)
    ? record
    : { ...record, lawEffectStamps: stamps };
}

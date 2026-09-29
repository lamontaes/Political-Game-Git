import { addDays, makeIsoDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import type { EntityId, IsoDate, World } from "../types";
import {
  BUDGET_LAW_KEYS,
  type BudgetLawName,
  type BudgetLawReading,
} from "./store";

/** The fiscal year a date falls in, for a year that starts on `startMonthDay`. */
export function fiscalYearContaining(
  date: IsoDate,
  startMonthDay: string,
): { fiscalYear: number; startsOn: IsoDate; endsOn: IsoDate } {
  const year = Number(date.slice(0, 4));
  const thisYear = makeIsoDate(`${year}-${startMonthDay}`);
  const startYear = date < thisYear ? year - 1 : year;
  const startsOn = makeIsoDate(`${startYear}-${startMonthDay}`);
  const endsOn = addDays(makeIsoDate(`${startYear + 1}-${startMonthDay}`), -1);
  return { fiscalYear: Number(endsOn.slice(0, 4)), startsOn, endsOn };
}

export function firstOfMonth(date: IsoDate): IsoDate {
  return makeIsoDate(`${date.slice(0, 7)}-01`);
}

export function firstOfNextMonth(date: IsoDate): IsoDate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return makeIsoDate(
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
}

export function firstOfPreviousMonth(date: IsoDate): IsoDate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return makeIsoDate(
    month === 1
      ? `${year - 1}-12-01`
      : `${year}-${String(month - 1).padStart(2, "0")}-01`,
  );
}

const propositionIds = new WeakMap<object, ReadonlyMap<string, EntityId>>();

/** A policy question's id in this world's catalog, by its qualified key. */
export function propositionIdFor(
  world: World,
  questionKey: string,
): EntityId | null {
  const catalog = world.policyCatalog?.propositions;
  if (!catalog) return null;
  let index = propositionIds.get(catalog);
  if (!index) {
    index = new Map(
      Object.values(catalog).map((row) => [row.stableKey, row.id]),
    );
    propositionIds.set(catalog, index);
  }
  return index.get(questionKey) ?? null;
}

/** What the law in force says on one budget question, in one place. */
export function budgetLawReading(
  world: World,
  jurisdictionId: EntityId,
  name: BudgetLawName,
  onDate: IsoDate,
): BudgetLawReading {
  const propositionId = propositionIdFor(world, BUDGET_LAW_KEYS[name]);
  const law = propositionId
    ? lawInForce(world, jurisdictionId, propositionId, onDate)
    : null;
  if (!law || (law.answer !== "yes" && law.answer !== "no"))
    return { answer: "unknown", measureId: null, level: null };
  return { answer: law.answer, measureId: law.measureId, level: law.level };
}

export function budgetLawReadings(
  world: World,
  jurisdictionId: EntityId,
  onDate: IsoDate,
): Readonly<Record<BudgetLawName, BudgetLawReading>> {
  return {
    balanced: budgetLawReading(world, jurisdictionId, "balanced", onDate),
    reserve: budgetLawReading(world, jurisdictionId, "reserve", onDate),
    pensions: budgetLawReading(world, jurisdictionId, "pensions", onDate),
  };
}

/**
 * Nominal output (real output times prices) recorded for the state as of a
 * date, the nation's where the state has none, or null before any month is
 * recorded.
 */
export function nominalEconomyIndex(
  world: World,
  stateJurisdictionId: EntityId,
  asOf: IsoDate,
): number | null {
  const record =
    macroConditionsAt(
      world,
      macroScopeForJurisdiction(stateJurisdictionId),
      asOf,
    ) ?? macroConditionsAt(world, "national", asOf);
  return record ? record.realOutputIndex * record.priceIndex : null;
}

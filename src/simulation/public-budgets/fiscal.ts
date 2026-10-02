import { evaluateLawAmount } from "../law-consequence-amount";
import { readFinalEnactedLawTerm } from "../governing/final-law-term-query";
import { BUDGET_OBLIGATION_AMOUNT, BUDGET_ALLOCATION_TERM_KEYS } from "./rules";
import { addDays, makeIsoDate } from "../dates";
import { STATUTE_EFFECTIVE_DEFAULT_DAYS } from "../enacted-rule-changes";
import {
  type LawInForce,
  lawInForce,
  lawInForceAtStart,
} from "../governing/law-in-force";
import finances from "../../../data/research/money/state-local-finances-2022.json" with { type: "json" };
import type { SPENDING_QUESTION_EFFECTS } from "./rules";
import { mayAnswerQuestion } from "../governing/question-authority";
import { measurePropositionAnswer } from "../issue-record";
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

/** The existing spending row's annual change per resident, relative to opening law. */
export function lawSpendingPerResident(
  world: World,
  jurisdictionId: EntityId,
  effect: (typeof SPENDING_QUESTION_EFFECTS)[number],
  date: IsoDate,
): number | null {
  const propositionId = propositionIdFor(world, effect.questionKey);
  if (!propositionId) return null;
  const now = lawInForce(world, jurisdictionId, propositionId, date)?.answer;
  const began = lawInForceAtStart(world, jurisdictionId, propositionId, date);
  return began === "no" && now === "yes"
    ? effect.toYes
    : began === "yes" && now === "no"
      ? effect.toNo
      : null;
}

/** Census state-and-local spending per resident; unread places use the national figure. */
export function spendingPerResident(
  placeKey: string,
  category: string,
): number {
  const places = finances.places as unknown as Readonly<
    Record<
      string,
      {
        readonly stateAndLocalPerResident?: Readonly<Record<string, number>>;
      }
    >
  >;
  const value =
    places[placeKey]?.stateAndLocalPerResident?.[category] ??
    places.US?.stateAndLocalPerResident?.[category];
  if (value === undefined)
    throw new Error(`No spending baseline for ${category}.`);
  return value;
}

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

/**
 * What the law says on one budget question for one government's own budget.
 *
 * A budget law binds the government that enacted it: the state's law governs
 * the state's books, a city's ordinance the city's. So a state reads the law
 * in force at its level (`law-in-force.ts`, starting law included), and a
 * county or city reads only its own enacted ordinances, the latest in force
 * governing. A state's requirement on its localities' budgets is not modeled
 * here yet.
 */
export function budgetLawReading(
  world: World,
  jurisdictionId: EntityId,
  name: BudgetLawName,
  onDate: IsoDate,
  ownOrdinancesOnly: boolean,
): BudgetLawReading {
  const propositionId = propositionIdFor(world, BUDGET_LAW_KEYS[name]);
  if (!propositionId) return UNKNOWN_LAW;
  if (ownOrdinancesOnly) {
    const own = ownOrdinance(
      world,
      jurisdictionId,
      propositionId,
      onDate,
      name,
    );
    return own.answer === "unknown" && name === "balanced"
      ? LOCAL_BALANCED_ESTIMATE
      : own;
  }
  const law = lawInForce(world, jurisdictionId, propositionId, onDate);
  if (!law || (law.answer !== "yes" && law.answer !== "no")) return UNKNOWN_LAW;
  return selectedBudgetLawReading(world, law, name, onDate);
}

function selectedBudgetLawReading(
  world: World,
  law: LawInForce,
  name: BudgetLawName,
  onDate: IsoDate,
): BudgetLawReading {
  const termKey = BUDGET_ALLOCATION_TERM_KEYS[name];
  const contribution =
    termKey && law.answer === "yes"
      ? readFinalEnactedLawTerm(world, law, {
          questionKey: BUDGET_LAW_KEYS[name],
          termKey,
          unit: "ratio",
          onDate,
        })
      : null;
  return {
    answer: law.answer,
    measureId: law.measureId,
    level: law.level,
    ...(contribution && contribution.value >= 0
      ? { requiredContributionShare: contribution.value }
      : {}),
  };
}

/**
 * A county's or city's balanced-budget rule where no ordinance of its own
 * answers. The rule comes from state law on local governments, which is not
 * read place by place yet, so the most common real rule stands in for every
 * county and city alike: it must pass a balanced budget.
 */
export const LOCAL_BALANCED_ESTIMATE: BudgetLawReading = {
  answer: "yes",
  measureId: null,
  level: null,
  estimated:
    'ESTIMATED FROM AVERAGE: "Most state and local governments are subject to a requirement to pass a balanced budget" (Government Finance Officers Association, Achieving a Structurally Balanced Budget); each state\'s rule for its local governments is not read yet.',
};

const UNKNOWN_LAW: BudgetLawReading = {
  answer: "unknown",
  measureId: null,
  level: null,
};

function ownOrdinance(
  world: World,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  onDate: IsoDate,
  name: BudgetLawName,
): BudgetLawReading {
  let best: {
    answer: "yes" | "no";
    measureId: EntityId;
    operativeAt: IsoDate;
    sequence: number;
  } | null = null;
  for (const enactment of world.history.legislativeEnactments ?? []) {
    if (enactment.outcome !== "enacted") continue;
    const measure = world.history.legislativeMeasures?.find(
      (entry) => entry.id === enactment.measureId,
    );
    if (!measure || measure.jurisdictionId !== jurisdictionId) continue;
    const answer = measurePropositionAnswer(measure, propositionId);
    if (answer !== "yes" && answer !== "no") continue;
    if (!mayAnswerQuestion(world, jurisdictionId, propositionId)) continue;
    const operativeAt =
      enactment.effectiveAt ??
      addDays(enactment.resolvedAt, STATUTE_EFFECTIVE_DEFAULT_DAYS);
    if (operativeAt > onDate) continue;
    if (
      !best ||
      operativeAt > best.operativeAt ||
      (operativeAt === best.operativeAt && enactment.sequence > best.sequence)
    )
      best = {
        answer,
        measureId: measure.id,
        operativeAt,
        sequence: enactment.sequence,
      };
  }
  return best
    ? selectedBudgetLawReading(
        world,
        {
          answer: best.answer,
          measureId: best.measureId,
          level: "local-ordinance",
          origin: "enacted",
          operativeAt: best.operativeAt,
          operativeBasis: "enacted-date",
        },
        name,
        onDate,
      )
    : UNKNOWN_LAW;
}

export function budgetLawReadings(
  world: World,
  jurisdictionId: EntityId,
  onDate: IsoDate,
  ownOrdinancesOnly: boolean,
): Readonly<Record<BudgetLawName, BudgetLawReading>> {
  return {
    balanced: budgetLawReading(
      world,
      jurisdictionId,
      "balanced",
      onDate,
      ownOrdinancesOnly,
    ),
    reserve: budgetLawReading(
      world,
      jurisdictionId,
      "reserve",
      onDate,
      ownOrdinancesOnly,
    ),
    pensions: budgetLawReading(
      world,
      jurisdictionId,
      "pensions",
      onDate,
      ownOrdinancesOnly,
    ),
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

/** One evaluated allocation for opening and adoption; this does not pay cash. */
export function budgetObligationPayment(
  required: number,
  paidShare: number,
  law: BudgetLawReading,
): number {
  const requiredShare =
    law.answer === "yes" ? (law.requiredContributionShare ?? 1) : 0;
  return Math.round(
    evaluateLawAmount(BUDGET_OBLIGATION_AMOUNT, {
      record: {
        obligation: { value: required, unit: "dollars/year" },
        "paid-share": { value: paidShare, unit: "ratio" },
      },
      term: { "required-share": { value: requiredShare, unit: "ratio" } },
      capacity: {},
      exposure: {},
    }).value,
  );
}

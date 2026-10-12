import type { PropositionAnswer } from "../../simulation/issue-record";
/** Retained budget-calendar, own-law precedence, obligation allocation and recorded nominal-output arithmetic. */
import { addDays, makeIsoDate } from "../../simulation/dates";
import { lawInForce, type LawInForce, type LawFacts } from "../laws/dated-law";
import { evaluateLawAmount } from "../laws/law-amount";
import { legalTermReceiptKey } from "../laws/minimum-authority";
import { macroConditionsAt } from "./macro-readings";
import {
  BUDGET_LAW_KEYS,
  BUDGET_ALLOCATION_TERM_KEYS,
  BUDGET_OBLIGATION_AMOUNT,
  STATUTE_EFFECTIVE_DEFAULT_DAYS,
} from "./budget-policy";
import type {
  EntityId,
  IsoDate,
  LegislativeMeasureRecord,
} from "../../simulation/types";
import type {
  BudgetLawName,
  BudgetLawReading,
} from "../../simulation/public-budgets/store";
import type {
  MacroMonthRecord,
  MacroScopeKey,
} from "../../simulation/macro-economy/types";
import type { readFinalEnactedLawTerm as nativeTerm } from "../../simulation/governing/final-law-term-query";
export interface BudgetFiscalFacts {
  readonly laws: LawFacts;
  readonly months: readonly MacroMonthRecord[];
  readonly finalTerms: ReadonlyMap<string, ReturnType<typeof nativeTerm>>;
  readonly ownAuthority: ReadonlyMap<string, boolean>;
}
export function budgetAuthorityReceiptKey(id: EntityId, question: EntityId) {
  return JSON.stringify([id, question]);
}
function ownAuthority(
  facts: BudgetFiscalFacts,
  id: EntityId,
  question: EntityId,
) {
  const key = budgetAuthorityReceiptKey(id, question);
  if (!facts.ownAuthority.has(key))
    throw Error("Missing own-budget authority receipt: " + key);
  return facts.ownAuthority.get(key)!;
}
function readFinalEnactedLawTerm(
  facts: BudgetFiscalFacts,
  law: LawInForce,
  query: Parameters<typeof nativeTerm>[2],
) {
  const key = legalTermReceiptKey(law, query);
  if (!facts.finalTerms.has(key))
    throw Error("Missing budget final-term receipt: " + key);
  return facts.finalTerms.get(key) ?? null;
}
const macroScopeForJurisdiction = (id: string): MacroScopeKey =>
  `jurisdiction:${id}`;
export function measurePropositionAnswer(
  measure: LegislativeMeasureRecord,
  propositionId: EntityId,
): PropositionAnswer | null {
  if (!(measure.propositionIds ?? []).includes(propositionId)) return null;
  return (
    (measure.propositionAnswers ?? []).find(
      (row) => row.propositionId === propositionId,
    )?.answer ?? null
  );
}
export function fiscalYearContaining(
  date: IsoDate,
  startMonthDay: string,
): {
  fiscalYear: number;
  startsOn: IsoDate;
  endsOn: IsoDate;
} {
  const year = Number(date.slice(0, 4));
  const thisYear = makeIsoDate(`${year}-${startMonthDay}`);
  const startYear = date < thisYear ? year - 1 : year;
  const startsOn = makeIsoDate(`${startYear}-${startMonthDay}`);
  const endsOn = addDays(makeIsoDate(`${startYear + 1}-${startMonthDay}`), -1);
  return { fiscalYear: Number(endsOn.slice(0, 4)), startsOn, endsOn };
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
export function propositionIdFor(
  facts: BudgetFiscalFacts,
  questionKey: string,
): EntityId | null {
  const catalog = facts.laws.policyCatalog?.propositions;
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
export function budgetLawReading(
  facts: BudgetFiscalFacts,
  jurisdictionId: EntityId,
  name: BudgetLawName,
  onDate: IsoDate,
  ownOrdinancesOnly: boolean,
): BudgetLawReading {
  const propositionId = propositionIdFor(facts, BUDGET_LAW_KEYS[name]);
  if (!propositionId) return UNKNOWN_LAW;
  if (ownOrdinancesOnly) {
    const own = ownOrdinance(
      facts,
      jurisdictionId,
      propositionId,
      onDate,
      name,
    );
    return own.answer === "unknown" && name === "balanced"
      ? LOCAL_BALANCED_ESTIMATE
      : own;
  }
  const law = lawInForce(facts.laws, jurisdictionId, propositionId, onDate);
  if (!law || (law.answer !== "yes" && law.answer !== "no")) return UNKNOWN_LAW;
  return selectedBudgetLawReading(facts, law, name, onDate);
}
function selectedBudgetLawReading(
  facts: BudgetFiscalFacts,
  law: LawInForce,
  name: BudgetLawName,
  onDate: IsoDate,
): BudgetLawReading {
  const termKey = BUDGET_ALLOCATION_TERM_KEYS[name];
  const contribution =
    termKey && law.answer === "yes"
      ? readFinalEnactedLawTerm(facts, law, {
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
// stopgapId: "economy.budget-local-balanced-fallback"
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
// stopgapId: "economy.budget-own-authority-date"
function ownOrdinance(
  facts: BudgetFiscalFacts,
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
  for (const enactment of facts.laws.enactments ?? []) {
    if (enactment.outcome !== "enacted") continue;
    const measure = facts.laws.measures?.find(
      (entry) => entry.id === enactment.measureId,
    );
    if (!measure || measure.jurisdictionId !== jurisdictionId) continue;
    const answer = measurePropositionAnswer(measure, propositionId);
    if (answer !== "yes" && answer !== "no") continue;
    if (!ownAuthority(facts, jurisdictionId, propositionId)) continue;
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
        facts,
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
  facts: BudgetFiscalFacts,
  jurisdictionId: EntityId,
  onDate: IsoDate,
  ownOrdinancesOnly: boolean,
): Readonly<Record<BudgetLawName, BudgetLawReading>> {
  return {
    balanced: budgetLawReading(
      facts,
      jurisdictionId,
      "balanced",
      onDate,
      ownOrdinancesOnly,
    ),
    reserve: budgetLawReading(
      facts,
      jurisdictionId,
      "reserve",
      onDate,
      ownOrdinancesOnly,
    ),
    pensions: budgetLawReading(
      facts,
      jurisdictionId,
      "pensions",
      onDate,
      ownOrdinancesOnly,
    ),
  };
}
export function nominalEconomyIndex(
  facts: Pick<BudgetFiscalFacts, "months">,
  stateJurisdictionId: EntityId,
  asOf: IsoDate,
): number | null {
  const record =
    macroConditionsAt(
      { months: facts.months, releases: [] },
      macroScopeForJurisdiction(stateJurisdictionId),
      asOf,
    ) ??
    macroConditionsAt({ months: facts.months, releases: [] }, "national", asOf);
  return record ? record.realOutputIndex * record.priceIndex : null;
}
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

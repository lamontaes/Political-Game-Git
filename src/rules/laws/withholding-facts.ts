/** KEEP closure from income-tax-withholding.ts. Immutable sourced facts and upstream life-query outputs. */
import type {
  EntityId,
  IsoDate,
  Person,
  ResourceTransferOutcome,
} from "../../simulation/types";
import type {
  IncomeTaxSchedule,
  FilingStatus,
} from "../../simulation/income-tax-withholding";
import { daysBetween } from "../offices/calendar";
import {
  reciprocalRankedReferences,
  weightedReferenceMean,
} from "./income-tax-estimation";
import { stateIncomeTaxScheduleFromSingleFact as stateScheduleForFilingStatus } from "./state-income-tax-schedule";
export interface ScheduleFacts {
  readonly places: Readonly<Record<string, StatePlace>>;
  readonly householdIncomes: Readonly<Record<string, number>>;
  readonly regions: ReadonlyMap<string, string>;
  readonly sourceUrl: string;
  readonly deductionCache?: Map<string, StateDeductionEstimate>;
}
function regionOf(facts: ScheduleFacts, usps: string) {
  return facts.regions.get(usps);
}
export interface FilingFacts {
  readonly onDate: IsoDate;
  readonly people: Readonly<Record<string, Person>>;
  readonly partnerships: ReadonlyMap<
    EntityId,
    readonly { readonly kind: string }[]
  >;
  readonly memberships: ReadonlyMap<
    EntityId,
    readonly { readonly membership: { readonly householdId: EntityId } }[]
  >;
  readonly children: ReadonlyMap<EntityId, readonly EntityId[]>;
}
interface StatePlace {
  readonly wageIncomeTax: string;
  readonly brackets: readonly {
    readonly ratePercent: number;
    readonly overSingle: number;
  }[];
  readonly standardDeductionSingle: number | null;
  readonly standardDeductionNote?: string;
}

export interface StateDeductionReference {
  readonly stateKey: string;
  readonly deductionDollars: number;
  readonly sameTaxStructure: boolean;
  readonly sameRegion: boolean;
  readonly incomeDistanceDollars: number;
  readonly rank: number;
  readonly weight: number;
}

export interface StateDeductionEstimate {
  readonly mean: number;
  readonly references: readonly StateDeductionReference[];
}

function householdIncomeDollars(
  facts: ScheduleFacts,
  stateKey: string,
): number {
  const income = facts.householdIncomes[stateKey];
  if (income === undefined)
    throw new Error(`No sourced household income for ${stateKey}.`);
  return income;
}

export function stateDeductionEstimate(
  facts: ScheduleFacts,
  stateKey: string,
): StateDeductionEstimate {
  const cached = facts.deductionCache?.get(stateKey);
  if (cached) return cached;
  const target = facts.places[stateKey];
  if (!target || !["flat", "graduated"].includes(target.wageIncomeTax))
    throw new Error(`No state wage-tax structure for ${stateKey}.`);
  const targetIncome = householdIncomeDollars(facts, stateKey);
  const targetRegion = regionOf(facts, stateKey.slice(3));
  const compareCloseness = (
    a: Omit<StateDeductionReference, "rank" | "weight">,
    b: Omit<StateDeductionReference, "rank" | "weight">,
  ): number =>
    Number(b.sameTaxStructure) - Number(a.sameTaxStructure) ||
    Number(b.sameRegion) - Number(a.sameRegion) ||
    a.incomeDistanceDollars - b.incomeDistanceDollars;
  const candidates = Object.entries(facts.places).flatMap(([key, place]) =>
    place.standardDeductionSingle !== null &&
    ["flat", "graduated"].includes(place.wageIncomeTax)
      ? [
          {
            stateKey: key,
            deductionDollars: place.standardDeductionSingle,
            sameTaxStructure: place.wageIncomeTax === target.wageIncomeTax,
            sameRegion: regionOf(facts, key.slice(3)) === targetRegion,
            incomeDistanceDollars: Math.abs(
              householdIncomeDollars(facts, key) - targetIncome,
            ),
          },
        ]
      : [],
  );
  if (candidates.length === 0)
    throw new Error("No read state deductions for the similar-state estimate.");
  const references = reciprocalRankedReferences(
    candidates,
    compareCloseness,
    (row) => row.stateKey,
  );
  const estimate = {
    mean: weightedReferenceMean(references, (ref) => ref.deductionDollars),
    references,
  };
  facts.deductionCache?.set(stateKey, estimate);
  return estimate;
}

export const STATE_FILING_STATUS_NOTE: Readonly<Record<FilingStatus, string>> =
  {
    single: "",
    "married-filing-jointly":
      "A joint return doubles the single brackets and deduction, the most common state rule (not yet counted state by state).",
    "head-of-household":
      "A head of household files on the single schedule, the most common state rule (not yet counted state by state).",
  };

export function stateIncomeTaxSchedule(
  facts: ScheduleFacts,
  stateKey: string,
  status: FilingStatus,
  worldSeed: string,
):
  | {
      readonly kind: "schedule";
      readonly schedule: IncomeTaxSchedule;
      readonly estimatedFromAverage?: string;
    }
  | {
      readonly kind: "none";
    }
  | {
      readonly kind: "unknown";
      readonly researchQuestionId: string;
    } {
  void worldSeed;
  const place = facts.places[stateKey];
  if (!place)
    return {
      kind: "unknown",
      researchQuestionId: "state-wage-income-tax-withholding",
    };
  if (place.wageIncomeTax === "none") return { kind: "none" };
  const notes: string[] = [];
  let deductionDollars = place.standardDeductionSingle;
  if (deductionDollars === null) {
    const estimate = stateDeductionEstimate(facts, stateKey);
    deductionDollars = Math.round(estimate.mean);
    notes.push(
      `ESTIMATED FROM AVERAGE: the state's personal exemptions or credits are not read, so its single filer takes a standard deduction of $${deductionDollars.toLocaleString("en-US")}, ` +
        `from a weighted average of the ${estimate.references.length} read deductions, ranked by matching tax structure, then Census region, then nearest median household income, rounded to whole dollars. ` +
        "Weights are reciprocal ranks (equal closeness gets equal weight), an authored estimation rule. " +
        "Sources: Tax Foundation, State Individual Income Tax Rates and Brackets, 2026; U.S. Census Bureau, CPS ASEC Table H-8, 2023 median household income in current dollars.",
    );
  }
  if (status !== "single")
    notes.push(
      `${notes.length === 0 ? "ESTIMATED FROM AVERAGE: the state's own brackets and deduction (Tax Foundation 2026). " : ""}${STATE_FILING_STATUS_NOTE[status]}`,
    );
  const single: IncomeTaxSchedule = {
    standardDeductionMinor: deductionDollars * 100,
    brackets: place.brackets.map((bracket) => ({
      overMinor: bracket.overSingle * 100,
      rateBasisPoints: Math.round(bracket.ratePercent * 100),
    })),
    sourceUrl: facts.sourceUrl,
  };
  return {
    kind: "schedule",
    schedule: stateScheduleForFilingStatus(single, status),
    ...(notes.length ? { estimatedFromAverage: notes.join(" ") } : {}),
  };
}

// stopgapId: "laws.filing-status-family-default"
export function filingStatusAt(
  facts: FilingFacts,
  personId: EntityId,
): FilingStatus {
  if (
    (facts.partnerships.get(personId) ?? []).some(
      (partnership) => partnership.kind === "legal:marriage",
    )
  )
    return "married-filing-jointly";
  const households = new Set(
    (facts.memberships.get(personId) ?? []).map(
      (active) => active.membership.householdId,
    ),
  );
  const livesWithOwnChild = (facts.children.get(personId) ?? []).some(
    (childId) => {
      const child = facts.people[childId];
      if (!child) return false;
      if (daysBetween(child.birthDate, facts.onDate) >= 19 * 365.25)
        return false;
      return (facts.memberships.get(childId) ?? []).some((active) =>
        households.has(active.membership.householdId),
      );
    },
  );
  return livesWithOwnChild ? "head-of-household" : "single";
}

// stopgapId: "laws.pay-period-inference"
export function payPeriodsPerYear(
  outcome: Pick<ResourceTransferOutcome, "periodStartsAt" | "periodEndsAt">,
): number {
  const days = daysBetween(outcome.periodStartsAt, outcome.periodEndsAt) + 1;
  if (days <= 1) return 260;
  if (days === 7) return 52;
  if (days === 14) return 26;
  if (days >= 15 && days <= 16) return 24;
  if (days >= 28 && days <= 31) return 12;
  return Math.max(1, Math.round(365 / days));
}

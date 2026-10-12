import type { EntityId, IsoDate } from "../../simulation/types";
import type { TermLimitRule } from "../../simulation/enacted-rule-changes";
import type { FederalReformCause } from "../../simulation/living-world/federal-reform";
import { makeIsoDate as validateDate } from "../elections/calendar";
import {
  presidentialTermsCounted,
  presidentialTermBar,
  type PresidentialTermFacts,
} from "../elections/presidential-terms";
function makeIsoDate(raw: string): IsoDate {
  return validateDate(raw) as IsoDate;
}
export interface PresidentReformFacts extends PresidentialTermFacts {
  readonly onDate: IsoDate;
  readonly presidentPersonId: EntityId | null;
  readonly playerPersonId: EntityId | null;
  readonly playerBodyKey: string | null;
  readonly limit: {
    readonly limit: TermLimitRule | null;
    readonly countsFrom: IsoDate | null;
  };
}
export const FEDERAL_REFORM_PROFILE = {
  id: "ocd-federal-reform-placeholder/v1",
  reviewMonthDay: "03-01",
  longTenureTerms: 3,
  restoredLimit: 2,
  highestExtendedLimit: 4,
  stateActionDays: [30, 900],
  ratificationYears: 7,
} as const;

export function yearsLater(date: IsoDate, years: number): IsoDate {
  const year = Number(date.slice(0, 4)) + years;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const monthDay = date.slice(5) === "02-29" && !leap ? "02-28" : date.slice(5);
  return makeIsoDate(`${year}-${monthDay}`);
}

export function nextTermStart(facts: PresidentReformFacts): IsoDate {
  const year = Number(facts.onDate.slice(0, 4));
  const inauguration = Math.ceil(year / 4) * 4 + 1;
  return makeIsoDate(`${inauguration}-01-20`);
}

export function federalReformCause(
  facts: PresidentReformFacts,
): FederalReformCause | null {
  const president = facts.presidentPersonId ?? null;
  if (!president) return null;
  if (facts.playerPersonId === president) return null;
  if (facts.playerPersonId !== null && facts.playerBodyKey !== null)
    return null;
  nextTermStart(facts); // Retain native date validation even though this result is not consumed.
  const { limit, countsFrom } = facts.limit;
  const cap = limit?.maxLifetimeTerms ?? null;
  const served = presidentialTermsCounted(facts, president, countsFrom);
  const profile = FEDERAL_REFORM_PROFILE;
  if (served >= profile.longTenureTerms && (cap === null || cap > served))
    return {
      direction: "restore",
      holderPersonId: president,
      value: {
        maxConsecutiveTerms: null,
        maxLifetimeTerms: profile.restoredLimit,
        lookbackYears: null,
      },
      reason: `the sitting President has served ${served} terms`,
    };
  if (
    cap !== null &&
    presidentialTermBar(facts, president, limit, countsFrom) !== null &&
    cap < profile.highestExtendedLimit
  )
    return {
      direction: "extend",
      holderPersonId: president,
      value: {
        maxConsecutiveTerms: null,
        maxLifetimeTerms: cap + 1,
        lookbackYears: null,
      },
      reason: "the sitting President is barred from another term",
    };
  return null;
}

// stopgapId: "SG-P14-legislatures-federal-reform-profile"

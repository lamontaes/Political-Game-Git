import bases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import budgets from "../../../data/research/money/government-budgets-2026.json" with { type: "json" };
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "../life-places";
import type { DecisionConsideration, EntityId, IsoDate, World } from "../types";

/**
 * THE STAKES OF A BUDGET (Build 25, CTO ruling of September 29, 9:45 a.m.:
 * "a budget can't pass"). An appropriation answers no policy question, so a
 * member with no view of its programs had no reason to vote at all, and the
 * budget died. Every member has one: without a budget in force when the
 * fiscal year begins, the government has no authority to spend, and its
 * offices close. How near that day is, from the government's own fiscal
 * year (NASBO for the states and territories, public-budget-bases.json; the
 * federal year from government-budgets-2026.json), sets how much it weighs.
 */

const STATE_FISCAL_YEAR = Object.fromEntries(
  Object.entries(
    bases.places as Readonly<
      Record<string, { readonly fiscalYearStart?: string | null }>
    >,
  ).flatMap(([key, row]) =>
    row.fiscalYearStart ? [[key, row.fiscalYearStart]] : [],
  ),
) as Readonly<Record<string, string>>;

const FEDERAL_FISCAL_YEAR = budgets.national.federal.fiscalYearStartsOn;

/**
 * GAME ASSUMPTION (Build 25), hand-set until the research on how the
 * deadline weighs on a legislator's budget vote is read: within a month of
 * the new fiscal year the stakes are strong, within a quarter moderate, and
 * otherwise slight. A slight reason still outweighs having none.
 */
const DEADLINE_DAYS = { strong: 30, moderate: 90 } as const;

/** Month and day ("07-01") a government's fiscal year begins on, or null. */
export function fiscalYearStartFor(
  world: Pick<World, "jurisdictions">,
  jurisdictionId: EntityId,
): string | null {
  if (jurisdictionId === NATIONAL_ELECTION_JURISDICTION.id)
    return FEDERAL_FISCAL_YEAR;
  const jurisdiction = world.jurisdictions[jurisdictionId];
  const stateKey =
    (jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null) ??
    lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey ??
    null;
  return stateKey ? (STATE_FISCAL_YEAR[stateKey] ?? null) : null;
}

/** Days from `today` to the next start of a fiscal year on `monthDay`. */
export function daysToFiscalYear(today: IsoDate, monthDay: string): number {
  const year = Number(today.slice(0, 4));
  const at = (y: number) => Date.parse(`${y}-${monthDay}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  const next = at(year) > now ? at(year) : at(year + 1);
  return Math.round((next - now) / 86_400_000);
}

/**
 * The reason every member has to pass a budget: the government's offices
 * close without one. Null where the government's fiscal year is not known.
 */
export function budgetDeadlineConsideration(
  world: World,
  jurisdictionId: EntityId,
): DecisionConsideration | null {
  const start = fiscalYearStartFor(world, jurisdictionId);
  if (!start) return null;
  const days = daysToFiscalYear(world.currentDate, start);
  return {
    stableKey: "member:budget-deadline",
    optionKey: "vote-yea",
    sourceType: "context:budget-deadline",
    direction: "supports",
    importance:
      days <= DEADLINE_DAYS.strong
        ? "strong"
        : days <= DEADLINE_DAYS.moderate
          ? "moderate"
          : "slight",
    confidence: "high",
    explanation: `Without a budget in force when the fiscal year begins in ${days} days, the government's offices close.`,
    sourceRefs: [],
  };
}

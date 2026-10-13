/**
 * Government measures for the outcome web (OPUS-WEB asked for 48; these are
 * the ones GOV's engines record today). Each reads the records as they stand
 * on the date asked, for the town; null where the town has no such record
 * yet. Units are given per measure; the web scales them to its links.
 *
 * - `labor.minimum-wage-change-pct`: the governing minimum wage's change over
 *   the past year (or since the opening), in percent.
 * - `labor.minimum-wage-gap-to-15`: dollars an hour short of $15 (0 at or above).
 * - `election.incumbent-vote`: the incumbent's share of the vote in the town's
 *   latest contested race an incumbent stood in (0 to 1).
 * - `election.incumbent-reelection`: the share of incumbents who stood in the
 *   past year and won (0 to 1).
 * - `voting.local-turnout`: turnout among the town's eligible residents in its
 *   latest decided local race (0 to 1).
 * - `budget.parks-added-pct`: the city's parks line above its Census base this
 *   fiscal year, in percent.
 */
import type { CoreAPI, CoreState } from "./types";
import { lawInForce } from "./modules/laws";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  type ContestRow,
} from "./modules/elections";
import { VOTING_MODULE_ID, resultOf, type ResultRow } from "./modules/voting";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import {
  BUDGETS_MODULE_ID,
  budgetPriorities,
  budgetsOf,
  governments,
  proposedBudget,
} from "./modules/budgets";

export const GOV_MEASURES = [
  "labor.minimum-wage-change-pct",
  "labor.minimum-wage-gap-to-15",
  "election.incumbent-vote",
  "election.incumbent-reelection",
  "voting.local-turnout",
  "budget.parks-added-pct",
] as const;

const daysBefore = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) - days * 86_400_000)
    .toISOString()
    .slice(0, 10);

/** The town's decided races with their results and incumbents, latest first. */
function decided(api: CoreAPI): {
  contest: ContestRow;
  result: ResultRow;
  incumbentId: string | null;
}[] {
  if (
    !api.state.modules.has(ELECTIONS_MODULE_ID) ||
    !api.state.modules.has(VOTING_MODULE_ID)
  )
    return [];
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  return (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((c) => c.electionDate <= api.state.date)
    .map((contest) => {
      const result = resultOf(api, contest.id);
      const term = contest.incumbentTermId
        ? (terms.get(contest.incumbentTermId) as unknown as TermRow | undefined)
        : undefined;
      const incumbentId = term
        ? (term.personId ?? `official:${term.id}`)
        : null;
      return { contest, result: result!, incumbentId };
    })
    .filter((r) => r.result)
    .sort(
      (a, b) =>
        b.contest.electionDate.localeCompare(a.contest.electionDate) ||
        a.contest.id.localeCompare(b.contest.id),
    );
}

export function govMeasure(api: CoreAPI, measure: string): number | null {
  const date = api.state.date;
  switch (measure) {
    case "labor.minimum-wage-change-pct": {
      const now = lawInForce(api, "minimum-wage", date).value;
      // A year back, or the opening (the world holds no law before it).
      const yearAgo = daysBefore(date, 365);
      const opened = (api.state as CoreState).startedAt;
      const before = lawInForce(
        api,
        "minimum-wage",
        yearAgo < opened ? opened : yearAgo,
      ).value;
      return now && before ? ((now - before) / before) * 100 : null;
    }
    case "labor.minimum-wage-gap-to-15": {
      const now = lawInForce(api, "minimum-wage", date).value;
      return now === null ? null : Math.max(0, 15 - now / 100);
    }
    case "election.incumbent-vote": {
      // The latest contested race an incumbent stood in.
      const race = decided(api).find(
        (r) =>
          r.incumbentId &&
          ballot(api, r.contest.id).length > 1 &&
          ballot(api, r.contest.id).some((f) => f.personId === r.incumbentId),
      );
      if (!race) return null;
      const total = Object.values(race.result.totals).reduce(
        (a, b) => a + b,
        0,
      );
      return total > 0
        ? (race.result.totals[race.incumbentId!] ?? 0) / total
        : null;
    }
    case "election.incumbent-reelection": {
      const since = daysBefore(date, 365);
      const stood = decided(api).filter(
        (r) =>
          r.contest.electionDate >= since &&
          r.incumbentId &&
          ballot(api, r.contest.id).some((f) => f.personId === r.incumbentId),
      );
      return stood.length
        ? stood.filter((r) => r.result.winnerId === r.incumbentId).length /
            stood.length
        : null;
    }
    case "voting.local-turnout": {
      const race = decided(api).find(
        (r) =>
          r.contest.family === "municipalOffice" ||
          r.contest.family === "countyOffice",
      );
      if (!race) return null;
      const eligible = race.result.namedEligible + race.result.countedEligible;
      return eligible > 0
        ? (race.result.namedTurnout + race.result.countedTurnout) / eligible
        : null;
    }
    case "budget.parks-added-pct": {
      if (!api.state.modules.has(BUDGETS_MODULE_ID)) return null;
      const city = governments(api).find((g) => g.level === "city");
      if (!city) return null;
      const budget = budgetsOf(api, city.id)
        .filter((b) => b.startsOn <= date)
        .at(-1);
      if (!budget) return null;
      // The Census base: the proposed line without the executive's priority.
      const base =
        (proposedBudget(api, city, budget.fiscalYear, "base").spendingMinor
          .parks ?? 0) - (budgetPriorities(api, city.id)?.changes.parks ?? 0);
      const now = budget.spendingMinor.parks ?? 0;
      return base ? ((now - base) / base) * 100 : null;
    }
    default:
      return null;
  }
}

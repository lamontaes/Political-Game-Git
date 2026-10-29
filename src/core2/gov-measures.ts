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
 * - `budget.parks-added-pct`: the town's parks spending above its Census base
 *   this fiscal year, in percent: each government's parks line weighted by the
 *   town's share of its residents.
 * - `budget.highways-added-pct`: the same for highways, which the state and
 *   county carry.
 * - `labor.minimum-wage`: the governing minimum wage, dollars an hour.
 * - `labor.minimum-wage-to-median`: that wage over the median hourly pay of
 *   the town's current jobs (0 to about 1).
 * - `voting.youth-turnout`: the share of the town's named 18- to 24-year-old
 *   eligible voters who voted in its latest decided race (0 to 1).
 * - `voting.party-share`: the Democratic share of the two-party vote in the
 *   latest decided partisan race covering the town (0 to 1).
 */
import { GOV_MEASURES } from "./gov-measure-keys";
import type { CoreAPI, CoreState } from "./types";
import { LAWS_MODULE_ID, lawChain, lawInForce } from "./modules/laws";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  isLocalFamily,
  type ContestRow,
} from "./modules/elections";
import { VOTING_MODULE_ID, resultOf, type ResultRow } from "./modules/voting";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import {
  BUDGETS_MODULE_ID,
  baseBudget,
  budgetsOf,
  governments,
  townShareOf,
} from "./modules/budgets";
import { townShare } from "./law-reach/group-b-money";
import { parameter } from "./parameters";

export { GOV_MEASURES };

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

/** The engines a measure reads; the measure is null where one is not installed. */
function enginesFor(measure: string): readonly string[] {
  if (measure.startsWith("labor.")) return [LAWS_MODULE_ID];
  if (measure.startsWith("budget.")) return [BUDGETS_MODULE_ID];
  return [ELECTIONS_MODULE_ID, VOTING_MODULE_ID, OFFICES_MODULE_ID];
}

/** The governments nearest the town first: the budget a line's record stands on. */
const NEAREST = ["city", "township", "county", "state", "federal"];

/**
 * A budget line's spending for the town above its Census base this fiscal
 * year, in percent: each government's line against its base, weighted by the
 * town's share of the government's residents (a state's roads and a city's
 * parks alike), so a law at any level that raises the line moves it.
 */
function townLineAddedPct(api: CoreAPI, line: string): number | null {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return null;
  let base = 0;
  let now = 0;
  for (const gov of governments(api)) {
    const budget = budgetsOf(api, gov.id)
      .filter((b) => b.startsOn <= api.state.date)
      .at(-1);
    const share = townShareOf(api, gov);
    if (!budget || !share) continue;
    base +=
      share *
      (baseBudget(api, gov, budget.fiscalYear).spendingMinor[line] ?? 0);
    now += share * (budget.spendingMinor[line] ?? 0);
  }
  return base ? ((now - base) / base) * 100 : null;
}

/** The budget row of the government nearest the town that carries the line. */
function townLineRecord(api: CoreAPI, line: string): string | null {
  const nearest = [...governments(api)].sort(
    (a, b) => NEAREST.indexOf(a.level) - NEAREST.indexOf(b.level),
  );
  for (const gov of nearest) {
    const budget = budgetsOf(api, gov.id)
      .filter((b) => b.startsOn <= api.state.date)
      .at(-1);
    if (budget && (budget.spendingMinor[line] ?? 0) > 0) return budget.id;
  }
  return null;
}

export function govMeasure(api: CoreAPI, measure: string): number | null {
  if (!enginesFor(measure).every((id) => api.state.modules.has(id)))
    return null;
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
      const race = decided(api).find((r) => isLocalFamily(r.contest.family));
      if (!race) return null;
      const eligible = race.result.namedEligible + race.result.countedEligible;
      return eligible > 0
        ? (race.result.namedTurnout + race.result.countedTurnout) / eligible
        : null;
    }
    case "budget.parks-added-pct":
      return townLineAddedPct(api, "parks");
    case "budget.highways-added-pct":
      return townLineAddedPct(api, "highways");
    case "labor.minimum-wage": {
      const now = lawInForce(api, "minimum-wage", date).value;
      return now === null ? null : now / 100;
    }
    case "labor.minimum-wage-to-median": {
      const now = lawInForce(api, "minimum-wage", date).value;
      const town = lawChain(api).townPlaceId;
      const pay = [...api.state.jobs.values()]
        .filter(
          (j) =>
            j.endsAt === undefined &&
            (j.hourlyMinor ?? 0) > 0 &&
            api.state.organizations.get(j.organizationId)?.placeId === town,
        )
        .map((j) => j.hourlyMinor!)
        .sort((a, b) => a - b);
      if (now === null || !pay.length) return null;
      return now / pay[Math.floor(pay.length / 2)]!;
    }
    case "voting.youth-turnout": {
      const race = decided(api)[0];
      if (!race) return null;
      const youth = (
        api
          .moduleState(VOTING_MODULE_ID)
          .table("ballots")
          .rows() as unknown as {
          contestId: string;
          voterId: string;
          voted: boolean;
        }[]
      ).filter((b) => {
        if (b.contestId !== race.contest.id) return false;
        const p = api.state.people.get(b.voterId);
        if (!p) return false;
        const age =
          Number(race.contest.electionDate.slice(0, 4)) -
          Number(p.birthDate.slice(0, 4));
        return age >= parameter("votingAge") && age <= 24;
      });
      return youth.length
        ? youth.filter((b) => b.voted).length / youth.length
        : null;
    }
    case "voting.party-share": {
      for (const race of decided(api)) {
        let dem = 0;
        let rep = 0;
        for (const f of ballot(api, race.contest.id)) {
          const votes = race.result.totals[f.personId] ?? 0;
          if (f.party === "Democratic") dem += votes;
          if (f.party === "Republican") rep += votes;
        }
        if (dem > 0 && rep > 0) return dem / (dem + rep);
      }
      return null;
    }
    default:
      return null;
  }
}

/**
 * The record a government measure's value stands on: the governing minimum
 * wage row for the labor measures, the budget of the government nearest the town that carries a parks or
 * highways line, and null for measures read from results (their races carry their own ids).
 */
export function govMeasureRecord(api: CoreAPI, measure: string): string | null {
  if (!enginesFor(measure).every((id) => api.state.modules.has(id)))
    return null;
  if (measure.startsWith("labor."))
    return (
      lawInForce(api, "minimum-wage", api.state.date).governing?.id ?? null
    );
  if (
    measure === "budget.parks-added-pct" ||
    measure === "budget.highways-added-pct"
  )
    return townLineRecord(
      api,
      measure === "budget.parks-added-pct" ? "parks" : "highways",
    );
  return null;
}

/**
 * A budget line above its Census base, for the town: the town's share of the
 * line across the governments that carry it, in force today, against the same
 * share of its base, in percent. Every bill and act that changed the line
 * counts, in this year and the years after (a passed bill's change carries).
 * Null where no government carries the line. The record is the budget of the
 * government whose line moved most.
 */
export function budgetLineAddedPct(
  api: CoreAPI,
  line: string,
): { value: number; recordId: string | null } | null {
  if (!api.state.modules.has(BUDGETS_MODULE_ID)) return null;
  const date = api.state.date;
  let base = 0;
  let now = 0;
  let recordId: string | null = null;
  let moved = 0;
  for (const gov of governments(api)) {
    const budget = [...budgetsOf(api, gov.id)]
      .filter((b) => b.startsOn <= date)
      .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
      .at(-1);
    const share = budget ? townShare(api, gov) : 0;
    if (!budget || !share) continue;
    const was =
      baseBudget(api, gov, budget.fiscalYear).spendingMinor[line] ?? 0;
    const is = budget.spendingMinor[line] ?? 0;
    base += was * share;
    now += is * share;
    if (Math.abs(is - was) * share > moved) {
      moved = Math.abs(is - was) * share;
      recordId = budget.id;
    }
  }
  return base > 0 ? { value: ((now - base) / base) * 100, recordId } : null;
}

/**
 * The SNAP one-person maximum allotment in force, against the one in force at
 * the opening, in percent. Null where the law engine has no amount.
 */
export function snapMaximumChangePct(
  api: CoreAPI,
): { value: number; recordId: string | null } | null {
  if (!api.state.modules.has(LAWS_MODULE_ID)) return null;
  const now = lawInForce(api, "snap-maximum", api.state.date);
  const opening = lawInForce(
    api,
    "snap-maximum",
    (api.state as CoreState).startedAt,
  );
  return now.value && opening.value
    ? {
        value: ((now.value - opening.value) / opening.value) * 100,
        recordId: now.governing?.id ?? null,
      }
    : null;
}

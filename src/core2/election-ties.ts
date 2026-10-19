/**
 * An exact tie, settled the way the state's law says
 * (`data/research/elections/tie-rules-2026.json`), by the kind of race:
 *
 * - a lot, where the law says lot (a recorded draw: its citation, the tied
 *   candidates, each name's slip and the result);
 * - a second election between the tied candidates;
 * - the legislature in joint session (statewide offices) or the local
 *   governing body, each member voting for their own reasons: their views
 *   against each tied candidate's platform, their party's side against the
 *   candidate's, and how they stand with each candidate, never party alone.
 *
 * Race size counts where the law has it (a state that reruns a large race
 * and draws a lot for a small one). Owner ruling (Oct 14, 2026): ties follow
 * the law of the state, a recorded lot where the law says lot.
 */
import ties from "../../data/research/elections/tie-rules-2026.json" with { type: "json" };
import { stableHash } from "./kernel/ids";
import { campaignParameter, type Stance } from "./campaign-views";
import { agreementWith } from "./modules/views";
import { partySide } from "./appointments";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  type ContestRow,
  type FilingRow,
} from "./modules/elections";
import { CAMPAIGNS_MODULE_ID, parsePlatform } from "./modules/campaigns";
import { OFFICES_MODULE_ID, type TermRow } from "./modules/offices";
import { voterLean } from "./modules/voting";
import { holderOf, officialLean, officialOf } from "./modules/officials";
import type { ModuleRow } from "./module-data";
import type { OfficeInput } from "./offices-local";
import type { CoreAPI } from "./types";

interface TieRule {
  readonly method: string;
  readonly detail?: string;
  readonly citation?: string;
  readonly estimate?: boolean;
  readonly smallRace?: {
    readonly method: string;
    /** The statute's own line: a race with this many votes cast or fewer takes the small-race method. */
    readonly atOrBelowVotes: number;
  };
}

const rules = (
  ties as unknown as { states: Record<string, Record<string, TieRule>> }
).states;

/** The kept record of a tie: how the law settled it and who decided. */
export interface TieRow {
  readonly id: string;
  readonly contestId: string;
  readonly date: string;
  readonly tied: readonly string[];
  readonly method: string;
  readonly citation: string;
  readonly estimate: boolean;
  /** The winner, or null where a second election decides. */
  readonly winnerId: string | null;
  /** For a lot: each tied candidate's slip; the lowest is drawn. */
  readonly slips?: Readonly<Record<string, string>>;
  /** For a deciding body: the candidate each member backed. */
  readonly votes?: Readonly<Record<string, string>>;
}

/** The field of the tie rules a contest's family is read under. */
export function ruleField(contest: ContestRow): string {
  if (contest.family === "statewideExecutive") return "statewideExecutiveTie";
  if (contest.family === "stateLegislative") return "legislativeTie";
  if (contest.family === "countyOffice" || contest.family === "municipalOffice")
    return "localTie";
  return "generalElectionTie";
}

function stateOf(api: CoreAPI): string {
  return (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("town")
      .get("town") as unknown as { stateKey: string }
  ).stateKey;
}

function keep(api: CoreAPI, row: TieRow): void {
  api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("ties")
    .put(row as unknown as ModuleRow);
}

/**
 * Settle a tie. Returns the winner, or null when a second election will
 * decide (`secondElection` opens it). `raceVotes`, the race's total votes,
 * lets a state's small-race rule apply.
 */
export function breakElectionTie(
  api: CoreAPI,
  contest: ContestRow,
  tied: readonly string[],
  secondElection: (
    api: CoreAPI,
    contest: ContestRow,
    tied: readonly string[],
  ) => void,
  raceVotes?: number,
): string | null {
  const sorted = [...tied].sort();
  const rule = rules[stateOf(api)]?.[ruleField(contest)];
  let method = rule?.method ?? "new-election";
  if (rule?.smallRace && raceVotes !== undefined) {
    // The statute's own line, read from the state's row (data).
    if (raceVotes <= rule.smallRace.atOrBelowVotes)
      method = rule.smallRace.method;
  }
  const base = {
    id: `tie:${contest.id}`,
    contestId: contest.id,
    date: api.state.date,
    tied: sorted,
    method,
    citation: rule?.citation ?? "no tie rule read for this place",
    estimate: rule?.estimate ?? true,
  };
  if (method === "lot") {
    const slips = Object.fromEntries(
      sorted.map((id) => [
        id,
        stableHash(`lot:${contest.id}:${sorted.join(",")}:${id}`),
      ]),
    );
    // The lowest slip is drawn: a lot is a lawful draw, not a roll.
    const winnerId = [...sorted].sort(
      (a, b) => slips[a]!.localeCompare(slips[b]!) || a.localeCompare(b),
    )[0]!;
    keep(api, { ...base, winnerId, slips });
    return winnerId;
  }
  if (method === "legislature-decides" || method === "board-decides") {
    const votes = bodyVotes(api, contest, sorted, method);
    const counts = new Map<string, number>();
    for (const choice of Object.values(votes))
      counts.set(choice, (counts.get(choice) ?? 0) + 1);
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const winnerId =
      ranked.length && (ranked.length === 1 || ranked[0]![1] > ranked[1]![1])
        ? ranked[0]![0]
        : null;
    keep(api, { ...base, winnerId, votes });
    if (winnerId === null) secondElection(api, contest, sorted);
    return winnerId;
  }
  keep(api, { ...base, winnerId: null });
  secondElection(api, contest, sorted);
  return null;
}

/** The members of the body that decides: the legislature in joint session, or the local governing body. */
function bodyMembers(
  api: CoreAPI,
  contest: ContestRow,
  method: string,
): readonly TermRow[] {
  const offices = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .rows() as unknown as OfficeInput[];
  const own = offices.find((o) => o.id === contest.officeId);
  const bodies =
    method === "legislature-decides"
      ? offices.filter(
          (o) =>
            o.kind.startsWith("legislature-") &&
            o.jurisdiction === own?.jurisdiction,
        )
      : offices
          .filter(
            (o) =>
              o.jurisdiction === own?.jurisdiction &&
              o.elected &&
              o.seats > 1 &&
              !o.kind.startsWith("legislature-"),
          )
          .sort((a, b) => a.id.localeCompare(b.id))
          .slice(0, 1);
  return bodies.flatMap((body) =>
    (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("seats")
        .query("byOffice", [body.id]) as unknown as { id: string }[]
    ).flatMap(
      (seat) =>
        api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[],
    ),
  );
}

/** How a member stands with a candidate they know, -1 to 1. */
function relationshipOf(
  api: CoreAPI,
  memberId: string,
  candidateId: string,
): number {
  const member = api.state.people.get(memberId);
  if (!member?.knownIds.has(candidateId)) return 0;
  let level = 0;
  for (const id of api.state.relationshipsByPerson.get(memberId) ?? []) {
    const row = api.state.relationships.get(id);
    if (row && (row.otherId === candidateId || row.actorId === candidateId))
      level = Math.max(-1, Math.min(1, row.level));
  }
  return level;
}

/**
 * Each member of the deciding body backs the tied candidate they favor, for
 * their own reasons: their views against the candidate's platform, their
 * side against the candidate's party, and their standing with the candidate.
 * A member with no pull either way abstains.
 */
function bodyVotes(
  api: CoreAPI,
  contest: ContestRow,
  tied: readonly string[],
  method: string,
): Record<string, string> {
  const filings = ballot(api, contest.id).filter((f) =>
    tied.includes(f.personId),
  );
  const platformOf = (filing: FilingRow) => {
    const campaign = api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("campaigns")
      .get(filing.id) as unknown as { platform: readonly Stance[] } | undefined;
    return campaign ? campaign.platform : parsePlatform(filing.platform);
  };
  const votes: Record<string, string> = {};
  for (const seated of bodyMembers(api, contest, method)) {
    // A member the world has not seated as a person yet becomes one the
    // moment they decide, with their own views.
    const term = holderOf(api, seated);
    const person = term.personId ? api.state.people.get(term.personId) : null;
    // A member with no record at all has no views to vote from: they abstain.
    if (!person) continue;
    const official = officialOf(api, person.id);
    const lean = official ? officialLean(official) : voterLean(api, person);
    let best: { id: string; score: number } | null = null;
    let level = true;
    for (const filing of filings) {
      const score =
        agreementWith(api, person.id, lean, platformOf(filing)) +
        lean * partySide(filing.party ?? null) +
        campaignParameter("ballotRelationshipWeight") *
          relationshipOf(api, person.id, filing.personId);
      if (!best || score > best.score) {
        level = true;
        best = { id: filing.personId, score };
      } else if (score === best.score) level = false;
    }
    if (best && level) votes[term.id] = best.id;
  }
  return votes;
}

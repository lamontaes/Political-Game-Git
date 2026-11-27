/**
 * The rest of the electorate's sample, the kept count, recounts, the returns and taking office.
 *
 * Split out of voting.ts by scripts/elections/split-module.ts (structure only);
 * voting.ts re-exports every export of this file by name.
 */
import { bookkeeping } from "../bookkeeping";
import { addDays, makeIsoDate } from "../kernel/dates";
import {
  countMargin,
  insideRecountMargin,
  recountRuleFor,
} from "../recount-rules";
import { isExplicitlyControlledPersonV1 } from "../player-control-state-v1";
import {
  countedResidents,
  type PlaceResult,
  type RacePlace,
  type SampleVoter,
} from "../electorate";
import { VOTING_MODULE_ID } from "../voting-module-id";
import { barredFromVoting } from "../laws-in-force";
import { readinessOf } from "../turnout";
import { leanedByKinds } from "../trait-decisions";
import type { CoreAPI, CoreState } from "../types";
import type { ModuleRow } from "../module-data";
import { personLean } from "../campaign-views";
import { basePlaces } from "../race-places";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  type ContestRow,
  type FilingRow,
} from "./elections";
import { townLean } from "./campaigns";
import { OFFICES_MODULE_ID, seatWinner, type TermRow } from "./offices";
import type { OfficeInput } from "./offices";
import { termEndAfter } from "../elections-calendar";
import {
  candidateInputs,
  candidateReasons,
  electorateChange,
  raceConditions,
  type CandidateReasons,
} from "../electorate-inputs";
import { candidateFacts, incumbentLeanOf } from "./voting-appeal";
import {
  ageOn,
  drawOfficialIdentity,
  electionsParameter,
  openNextCycle,
  partySide,
  table,
  town,
} from "./voting-base";
import type { ResultRow } from "./voting-base";
import {
  countedScale,
  countedVoters,
  cycleTurnout,
  electionCycle,
} from "./voting-count";
import { wardsOf } from "./voting-polling-day";
import { contestRightShare } from "./voting-primary";
import { countedHabit, turnoutReasons } from "./voting-turnout";

/**
 * The town's eligible voters past its named and counted adults: its
 * population at the adult and citizen shares its counted residents and
 * named people show. None where the counted residents are the whole town.
 */
function restOfTown(
  api: CoreAPI,
  known: { readonly named: number; readonly counted: number },
): number {
  const population = Number(api.state.placeMetadata.referencePopulation);
  if (!Number.isFinite(population) || population <= 0) return 0;
  const { townPlaceId } = town(api);
  const adultAge = api.parameter("votingAge");
  const date = api.state.date;
  let people = 0,
    adults = 0;
  for (const p of api.state.people.values())
    if (p.alive && p.placeId === townPlaceId) {
      people += 1;
      if (ageOn(p, date) >= adultAge) adults += 1;
    }
  for (const v of countedResidents(api.state as CoreState))
    if (v.placeId === townPlaceId) {
      people += v.weight;
      if (ageOn(v, date) >= adultAge) adults += v.weight;
    }
  if (!people || population <= people) return 0;
  const eligible =
    (population - people) * (adults / people) * countedScale(api);
  void known;
  return Math.round(eligible);
}

/** The families whose races weigh each candidate's public standing. */
const STANDING_FAMILIES = new Set([
  "statewideExecutive",
  "usHouse",
  "stateLegislative",
]);

/**
 * The rest of a race's electorate, place by place: the town's own named and
 * counted voters set apart from the place they live in (from every place in
 * proportion where none is recorded), and the rest of the town where its
 * population runs past them. Each place feels the town's jobs and crime
 * where the town lies in it.
 */
export function racePlaces(
  api: CoreAPI,
  contest: ContestRow,
  filings: readonly FilingRow[],
  known: { readonly named: number; readonly counted: number },
): readonly RacePlace[] {
  if (!filings.length) return [];
  const { stateKey, townPlaceId } = town(api);
  const usps = stateKey.slice(3);
  const change = electorateChange(api);
  // The 2024 vote the places are sized from already reflects the opening's
  // barred share and election laws.
  const scale = (1 - change.barred) / Math.max(1e-9, 1 - change.openingBarred);
  const { places, home } = basePlaces(api, contest);
  // A ward holds an equal share of the town's other people.
  const rest = Math.round(
    restOfTown(api, known) / Math.max(1, wardsOf(api, contest)),
  );
  if (!places.length)
    return rest > 0
      ? [
          {
            id: `town:${townPlaceId}:rest`,
            name: "the rest of the town",
            eligible: rest,
            rightShare: (1 + townLean(api)) / 2,
            votes2024: 0,
            source: `The town's population (${String(api.state.placeMetadata.referencePopulation)}) past its named and counted residents, at their adult and citizen shares`,
            inTown: true,
            local: true,
          },
        ]
      : [];
  const own = known.named + known.counted;
  const total = places.reduce((n, p) => n + p.eligible, 0);
  const spread = home || !total ? 1 : Math.max(0, 1 - own / total);
  void usps;
  return places.map((p) => ({
    ...p,
    eligible:
      p.id === home
        ? Math.max(0, p.eligible - own)
        : Math.round(p.eligible * spread),
    local: p.id === home,
    scale,
  }));
}

const reasonsByDay = new WeakMap<
  object,
  Map<string, readonly CandidateReasons[] | null>
>();

/**
 * Each candidate's public standing in a partisan state or federal race (the
 * presidency too): incumbency, experience, the campaign's books,
 * the officeholder's record, the economy and the midterm penalty, as every
 * voter in the race sees them. Null for a local or nonpartisan race.
 */
export function publicReasons(
  api: CoreAPI,
  contest: ContestRow,
  filings: readonly FilingRow[],
): readonly CandidateReasons[] | null {
  const president = contest.officeId === "office:US:president";
  if (!president && !STANDING_FAMILIES.has(contest.family)) return null;
  if (!filings.some((f) => partySide(f.party ?? null) !== 0)) return null;
  const byKey = reasonsByDay.get(api.state) ?? new Map();
  reasonsByDay.set(api.state, byKey);
  const key = `${api.state.date}|${contest.id}|${filings.map((f) => f.id).join(",")}`;
  if (byKey.has(key)) return byKey.get(key)!;
  const { places } = basePlaces(api, contest);
  const votes = places.reduce((s, p) => s + p.votes2024, 0);
  const right = contestRightShare(api, contest);
  const seat = contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  const conditions = raceConditions(api, {
    federal: contest.level === "federal",
    family: president ? "president" : contest.family,
    cycle: electionCycle(contest.electionDate),
    raceVotes: votes * cycleTurnout(contest.electionDate).share,
    townPlaceId: town(api).townPlaceId,
    electionDate: contest.electionDate,
  });
  const reasons = filings.map((f) =>
    candidateReasons(
      candidateInputs(api, {
        id: f.personId,
        party: f.party ?? null,
        filingId: f.id,
        // The holder standing again.
        incumbent: candidateFacts(api, f, contest).isIncumbent,
        seatParty: seat?.party ?? null,
        raceLean: 2 * right - 1,
      }),
      conditions,
    ),
  );
  byKey.set(key, reasons);
  return reasons;
}

const samples = new WeakMap<object, Map<string, readonly SampleVoter[]>>();

/**
 * The town's counted adults as the places counted coarsely see them (its
 * named adults where it has no counted residents): each one's rank in the
 * town's lean order, readiness to vote apart from the race (duty and
 * engagement less the cost of voting that day, with what the election adds
 * to it), and the incumbent side of their traits.
 */
export function electorateSample(
  api: CoreAPI,
  date: string,
  extraCost: number,
): readonly SampleVoter[] {
  const byKey = samples.get(api.state) ?? new Map();
  samples.set(api.state, byKey);
  const key = `${api.state.date}|${date}|${extraCost}`;
  const hit = byKey.get(key);
  if (hit) return hit;
  const { townPlaceId } = town(api);
  const adultAge = api.parameter("votingAge");
  const today = api.state.date;
  const counted = countedVoters(api).filter(
    (v) => v.placeId === townPlaceId && ageOn(v, today) >= adultAge,
  );
  const voters: {
    id: string;
    traits: Readonly<Record<string, number>>;
    birthDate: string;
    weeklyMinutes?: number;
    weight?: number;
  }[] = counted.length
    ? counted
    : [...api.state.people.values()].filter(
        (p) =>
          p.alive &&
          p.placeId === townPlaceId &&
          ageOn(p, today) >= adultAge &&
          !barredFromVoting(api, p.id),
      );
  const lean0 = townLean(api);
  const rows = voters
    .map((voter) => {
      const t = turnoutReasons(api, voter, voter.weeklyMinutes, extraCost);
      return {
        id: voter.id,
        lean: personLean(api.state.people, voter, lean0),
        // No campaign reaches a place counted from afar, and no one there
        // has a record in play.
        readiness: readinessOf({
          duty: t.duty,
          reach: 0,
          habit: countedHabit(api, voter, date),
          cost: t.cost,
        }),
        incumbentLean: incumbentLeanOf(api, voter),
      };
    })
    .sort((a, b) => b.lean - a.lean || a.id.localeCompare(b.id));
  // A record's place in the lean order is by the real voters it stands for.
  const weightOf = new Map(voters.map((v) => [v.id, v.weight ?? 1]));
  const all = rows.reduce((n, r) => n + weightOf.get(r.id)!, 0);
  let before = 0;
  const sample = rows.map((row) => {
    const weight = weightOf.get(row.id)!;
    const rank = (before + weight / 2) / all;
    before += weight;
    return {
      id: row.id,
      rank,
      readiness: row.readiness,
      incumbentLean: row.incumbentLean,
      weight,
    };
  });
  byKey.clear();
  byKey.set(key, sample);
  return sample;
}

/** A count's candidates by votes, most first (ties by id). */
export function rankTotals(
  totals: Readonly<Record<string, number>>,
): [string, number][] {
  return Object.entries(totals).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}

/** Two or more candidates share first place on some votes. */
export const tiedFirst = (ranked: readonly (readonly [string, number])[]) =>
  ranked.length > 1 && ranked[0]![1] > 0 && ranked[0]![1] === ranked[1]![1];

/** The votes one part of a race's electorate cast. */
interface CountPart {
  readonly votes: Readonly<Record<string, number>>;
  readonly turnout: number;
  readonly eligible: number;
}

/**
 * The one count writer (engine map E1): every race at every level, a town's
 * contest, a state or federal seat the town doesn't vote in and each state's
 * electors, keeps its result, its places and the night's returns here. The
 * totals are the named voters' ballots, the counted residents' and the
 * places counted coarsely; the race's law decides who wins on them.
 */
export function keepCount(
  api: CoreAPI,
  input: {
    /** The race: a contest's id, or the id of a race the town doesn't vote in. */
    readonly id: string;
    readonly date: string;
    /** Every candidate on the ballot, in its order. */
    readonly candidates: readonly string[];
    readonly named?: CountPart & {
      readonly exitPoll: Readonly<Record<string, number>>;
    };
    readonly counted?: CountPart;
    readonly wider: {
      readonly votes: Readonly<Record<string, number>>;
      readonly cast: number;
      readonly places: readonly PlaceResult[];
    } | null;
    readonly reasons: readonly CandidateReasons[] | null;
    /** The winner on the totals, by the race's law; null for none. */
    readonly decide: (
      ranked: readonly [string, number][],
      electorate: number,
    ) => string | null;
    /** Who takes the seat for a winning ballot line. */
    readonly winnerOf: (candidateId: string) => string;
    readonly takesOffice: string;
    /** The state whose recount rule the race follows. */
    readonly stateKey: string;
    /** The office, as the race's records name it. */
    readonly office: string;
    /** False for a count that follows another's (a ticket office's): that race's recount is its own. */
    readonly recount?: boolean;
  },
): ResultRow {
  const named = input.named ?? {
    votes: {},
    turnout: 0,
    eligible: 0,
    exitPoll: {},
  };
  const counted = input.counted ?? { votes: {}, turnout: 0, eligible: 0 };
  const { wider } = input;
  if (wider) recordPlaces(api, input.id, wider.places);
  const placeVotes = Object.fromEntries(
    Object.entries(wider?.votes ?? {}).map(([id, n]) => [id, Math.round(n)]),
  );
  const electorate = named.turnout + counted.turnout + (wider?.cast ?? 0);
  const totals = countTotals(
    input.candidates,
    named.votes,
    counted.votes,
    placeVotes,
  );
  const winnerCandidateId = input.decide(rankTotals(totals), electorate);
  const winnerId = winnerCandidateId ? input.winnerOf(winnerCandidateId) : null;
  const result: ResultRow = {
    id: `result:${input.id}`,
    contestId: input.id,
    date: input.date,
    namedVotes: named.votes,
    countedVotes: counted.votes,
    countedTurnout: counted.turnout,
    countedEligible: counted.eligible,
    placeVotes,
    totals,
    namedTurnout: named.turnout,
    namedEligible: named.eligible,
    electorate,
    winnerId,
    winnerCandidateId,
    takesOffice: winnerId ? input.takesOffice : null,
    exitPoll: named.exitPoll,
    ...(input.reasons ? { electorateReasons: input.reasons } : {}),
    ...(wider ? { placesCast: wider.cast } : {}),
  };
  table(api, "results").put(result as unknown as ModuleRow);
  if (!bookkeeping()) dropOlderTownReturns(api, input.id, input.date);
  const recount =
    input.recount === false
      ? null
      : openRecount(api, result, input.stateKey, input.office);
  if (!recount) return result;
  // A recount holds the result until it ends: the winner is seated no
  // earlier than the day it is certified.
  const held: ResultRow = {
    ...result,
    recountId: recount.id,
    ...(result.takesOffice && recount.ends > result.takesOffice
      ? { takesOffice: recount.ends }
      : {}),
  };
  table(api, "results").put(held as unknown as ModuleRow);
  return held;
}

/** A count's totals: each candidate's named, counted and coarsely counted votes. */
function countTotals(
  candidates: readonly string[],
  named: Readonly<Record<string, number>>,
  counted: Readonly<Record<string, number>>,
  places: Readonly<Record<string, number>>,
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const id of candidates)
    totals[id] = (named[id] ?? 0) + (counted[id] ?? 0) + (places[id] ?? 0);
  return totals;
}

/** A close count's recount, opened by the place's own rule. */
export interface RecountRow {
  readonly id: string;
  readonly resultId: string;
  readonly contestId: string;
  readonly office: string;
  readonly stateKey: string;
  /** The count's day. */
  readonly date: string;
  /** Automatic by the margin, or asked for by the candidate behind. */
  readonly kind: "automatic" | "requested";
  /** Offered: the player may ask on election night; open until it ends; confirmed once certified; declined. */
  readonly status: "offered" | "open" | "confirmed" | "declined";
  readonly leaderId: string;
  readonly trailingId: string;
  readonly margin: number;
  /** The votes the place's rule measures the margin against. */
  readonly base: number;
  /** The day the recount opened, and the day it ends and the result is certified. */
  readonly opened: string;
  readonly ends: string;
  readonly days: number;
  readonly rule: string;
  /** The candidate who asked, and their reasons. */
  readonly requestedBy?: string;
  readonly reasons?: Readonly<Record<string, number>>;
  readonly certifiedOn?: string;
  readonly sourceIds: readonly string[];
}

/** A race's recount, if its count opened one. */
export function recountOf(api: CoreAPI, raceId: string): RecountRow | null {
  return (
    (table(api, "recounts").get(`recount:${raceId}`) as unknown as
      RecountRow | undefined) ?? null
  );
}

/** The trait act kinds of asking for a recount, and of conceding the count. */
const ASK_KINDS = ["confront", "distrust", "take-risk"] as const;
const CONCEDE_KINDS = ["concede", "cooperate", "trust"] as const;

/**
 * A count's margin against the place's recount rule (owner, Nov 10, 2026:
 * "Recount by own states rules"): inside the automatic margin a recount
 * opens by itself; inside the margin a candidate may ask in, the candidate
 * behind decides from their own traits and how close it was, and the player
 * is offered the choice on election night. No roll.
 */
function openRecount(
  api: CoreAPI,
  result: ResultRow,
  stateKey: string,
  office: string,
): RecountRow | null {
  if (!result.winnerCandidateId) return null;
  const rule = recountRuleFor(stateKey);
  if (!rule) return null;
  // The state's statewide rule is read for every race in it.
  // stopgapId: SG-GOV-recount-one-rule-per-place
  api.stopgap("SG-GOV-recount-one-rule-per-place");
  const margin = countMargin(rankTotals(result.totals), rule);
  if (!margin || margin.leaderId !== result.winnerCandidateId) return null;
  const automatic = insideRecountMargin(rule.automatic, margin);
  if (!automatic && !insideRecountMargin(rule.request, margin)) return null;
  const date = api.state.date;
  const row: RecountRow = {
    id: `recount:${result.contestId}`,
    resultId: result.id,
    contestId: result.contestId,
    office,
    stateKey,
    date,
    kind: automatic ? "automatic" : "requested",
    status: "open",
    leaderId: margin.leaderId,
    trailingId: margin.trailingId,
    margin: margin.margin,
    base: margin.base,
    opened: date,
    ends: addDays(makeIsoDate(date), rule.days),
    days: rule.days,
    rule: `${rule.name}'s recount rule (${rule.tag}: ${rule.source})`,
    sourceIds: [result.id],
  };
  if (automatic) return startRecount(api, row);
  // Only a person can ask: a party's line in a race the town does not vote in
  // has no one to decide.
  const behind = api.state.people.get(margin.trailingId);
  if (!behind?.alive) return null;
  if (isExplicitlyControlledPersonV1(api.state, behind.id)) {
    const offered: RecountRow = { ...row, status: "offered" };
    table(api, "recounts").put(offered as unknown as ModuleRow);
    return offered;
  }
  // The closer the count, the stronger the case for asking: at the closeness
  // scale it is even, and the candidate's temperament decides.
  const closeness =
    electionsParameter("recountAskWeight") *
    (1 -
      margin.margin / margin.base / electionsParameter("recountAskCloseShare"));
  if (
    !leanedByKinds(
      api.state,
      behind,
      "voting.ask-recount",
      ASK_KINDS,
      CONCEDE_KINDS,
      closeness,
    )
  )
    return null;
  return startRecount(api, {
    ...row,
    requestedBy: behind.id,
    reasons: { closeness },
  });
}

/**
 * Where a recount is news: the town's own race in the town, a race in the
 * town's state it does not vote in at the state, another state's at the
 * nation (the press reads the level from the place).
 */
function recountPlace(api: CoreAPI, row: RecountRow): string {
  const here = town(api);
  if (api.moduleState(ELECTIONS_MODULE_ID).table("contests").get(row.contestId))
    return here.townPlaceId;
  return row.stateKey === here.stateKey
    ? `state:${row.stateKey.slice(row.stateKey.lastIndexOf("-") + 1)}`
    : `national:${row.stateKey}`;
}

/** A recount opens: on the record for the paper, and on the calendar for the day it ends. */
function startRecount(api: CoreAPI, row: RecountRow): RecountRow {
  table(api, "recounts").put(row as unknown as ModuleRow);
  api.moduleCalendar(VOTING_MODULE_ID).schedule({
    key: `recount-ends:${row.contestId}:${row.opened}`,
    date: row.ends,
    kind: "recount-ends",
    source: { tag: "SOURCED", citation: row.rule, asOf: api.state.date },
    sourceRecordIds: [row.id],
  });
  api.emit({
    id: `recount-opened:${row.contestId}`,
    date: api.state.date,
    kind: "recount-opened",
    personIds: [row.leaderId, row.trailingId].filter((id) =>
      api.state.people.has(id),
    ),
    placeId: recountPlace(api, row),
    source: { tag: "SOURCED", citation: row.rule, asOf: api.state.date },
    publicRecord: true,
    news: true,
    facts: {
      contestId: row.contestId,
      office: row.office,
      recountId: row.id,
      recount: row.kind,
      leaderId: row.leaderId,
      trailingId: row.trailingId,
      margin: String(row.margin),
      ends: row.ends,
      ...(row.requestedBy ? { requestedBy: row.requestedBy } : {}),
    },
  });
  return row;
}

/**
 * The player's answer on election night: not conceding a count inside the
 * margin the place lets a candidate ask in is the ask (the concession call's
 * reply, which the press puts on the record); conceding declines it.
 */
export function answerRecountOffer(
  api: CoreAPI,
  event: Readonly<{ facts?: Readonly<Record<string, unknown>> }>,
): void {
  const facts = event.facts ?? {};
  const row = recountOf(api, String(facts.contestId ?? ""));
  if (row?.status !== "offered" || facts.loserId !== row.trailingId) return;
  if (facts.conceded !== "no") {
    table(api, "recounts").put({
      ...row,
      status: "declined",
    } as unknown as ModuleRow);
    return;
  }
  const opened = api.state.date;
  const ends = addDays(makeIsoDate(opened), row.days);
  startRecount(api, {
    ...row,
    status: "open",
    opened,
    ends,
    requestedBy: row.trailingId,
    sourceIds: [...row.sourceIds, String(facts.replyId ?? "")],
  });
  const result = table(api, "results").get(row.resultId) as unknown as
    ResultRow | undefined;
  if (result?.takesOffice && ends > result.takesOffice)
    table(api, "results").put({
      ...result,
      takesOffice: ends,
    } as unknown as ModuleRow);
}

/**
 * A recount ends: the same count runs again on the result's own parts and
 * the result is certified that day, citing the recount.
 */
export function endRecount(api: CoreAPI, recountId: string): void {
  const row = table(api, "recounts").get(recountId) as unknown as
    RecountRow | undefined;
  const result = row
    ? (table(api, "results").get(row.resultId) as unknown as
        ResultRow | undefined)
    : undefined;
  // An earlier day's entry for a recount opened again since waits for its own.
  if (!row || row.status !== "open" || !result || row.ends > api.state.date)
    return;
  // The game records no miscounted ballot, so the count run again on the
  // same ballots gives the same totals and the first count stands.
  // stopgapId: SG-GOV-recount-confirms-count
  api.stopgap("SG-GOV-recount-confirms-count");
  const totals = countTotals(
    Object.keys(result.totals),
    result.namedVotes,
    result.countedVotes,
    result.placeVotes,
  );
  const date = api.state.date;
  table(api, "recounts").put({
    ...row,
    status: "confirmed",
    certifiedOn: date,
  } as unknown as ModuleRow);
  table(api, "results").put({
    ...result,
    totals,
    certifiedOn: date,
  } as unknown as ModuleRow);
  api.emit({
    id: `recount-certified:${row.contestId}`,
    date,
    kind: "recount-certified",
    personIds: [row.leaderId, row.trailingId].filter((id) =>
      api.state.people.has(id),
    ),
    placeId: recountPlace(api, row),
    source: {
      tag: "SOURCED",
      citation: `The recount ${row.id} of ${result.id}`,
      asOf: date,
    },
    publicRecord: true,
    news: true,
    facts: {
      contestId: row.contestId,
      office: row.office,
      recountId: row.id,
      resultId: result.id,
      winnerId: result.winnerId ?? "",
      totals: JSON.stringify(totals),
    },
  });
}

/**
 * A winner whose result a recount still holds waits for the day it ends:
 * the seating goes back on the calendar for then. True when it waits.
 */
export function heldByRecount(
  api: CoreAPI,
  raceId: string,
  key: string,
  kind: string,
  sourceRecordId: string,
): boolean {
  const row = recountOf(api, raceId);
  if (row?.status !== "open" || row.ends <= api.state.date) return false;
  api.moduleCalendar(VOTING_MODULE_ID).schedule({
    key: `${key}:after-${row.id}:${row.ends}`,
    date: row.ends,
    kind,
    source: { tag: "SOURCED", citation: row.rule, asOf: api.state.date },
    sourceRecordIds: [sourceRecordId],
  });
  return true;
}

/**
 * Keep results, not their history (governing lead; speed, Oct 29): once a
 * town contest's election night has a result, the returns and places of the
 * town's older contests go. Every result stays, and the prior-election
 * records the opening paper reads are a separate table, so they stay whole.
 * A race the town does not vote in keeps its own. With bookkeeping on (tests
 * and proofs) every row stays.
 */
export function dropOlderTownReturns(
  api: CoreAPI,
  contestId: string,
  date: string,
): void {
  const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
  if (!contests.get(contestId)) return;
  const returns = table(api, "returns");
  const places = table(api, "places");
  const results = table(api, "results");
  for (const row of [
    ...(returns.rows() as unknown as { id: string; contestId: string }[]),
  ]) {
    if (row.contestId === contestId || !contests.get(row.contestId)) continue;
    const older = results.get(`result:${row.contestId}`) as unknown as
      { date: string } | undefined;
    if (!older || older.date >= date) continue;
    for (const place of [
      ...(places.query("byContest", [row.contestId]) as unknown as {
        id: string;
      }[]),
    ])
      places.remove(place.id);
    returns.remove(row.id);
  }
}

/** A count's Republican share of the two-party vote, by each candidate's side in its reasons; null where none voted. */
export function republicanShareOf(result: ResultRow): number | null {
  let republican = 0,
    democratic = 0;
  for (const c of result.electorateReasons ?? []) {
    const votes = result.totals[c.id] ?? 0;
    if (c.side > 0) republican += votes;
    else if (c.side < 0) democratic += votes;
  }
  return republican + democratic
    ? republican / (republican + democratic)
    : null;
}

/** One place reporting on election night, and where the race stands after it. */
export interface ReturnsReport {
  readonly placeId: string;
  readonly name: string;
  readonly cast: number;
  readonly votes: Readonly<Record<string, number>>;
  /** Every candidate's total once this place is in. */
  readonly running: Readonly<Record<string, number>>;
  /** The candidate ahead once this place is in; null when even. */
  readonly leaderId: string | null;
  readonly margin: number;
}

/** A contest's returns: the places in the order the night reports them. */
export interface ReturnsRow {
  readonly id: string;
  readonly contestId: string;
  readonly reports: readonly ReturnsReport[];
}

/**
 * Keep each place's votes, so the game can show where the race was won, and
 * the night's returns: the places report smallest first, as a small place's
 * tally is done first, each with the running totals once it is in.
 */
function recordPlaces(
  api: CoreAPI,
  contestId: string,
  places: readonly PlaceResult[],
): void {
  const rows = table(api, "places");
  for (const place of places)
    rows.put({
      ...place,
      id: `place:${contestId}:${place.id}`,
      placeId: place.id,
      contestId,
    } as unknown as ModuleRow);
  const running: Record<string, number> = {};
  for (const place of places)
    for (const id of Object.keys(place.votes)) running[id] = 0;
  const reports = [...places]
    .filter((place) => place.cast > 0)
    .sort((a, b) => a.cast - b.cast || a.id.localeCompare(b.id))
    .map((place): ReturnsReport => {
      for (const [id, votes] of Object.entries(place.votes))
        running[id] = running[id]! + votes;
      const order = Object.entries(running).sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      );
      const margin = (order[0]?.[1] ?? 0) - (order[1]?.[1] ?? 0);
      return {
        placeId: place.id,
        name: place.name,
        cast: place.cast,
        votes: place.votes,
        running: { ...running },
        leaderId: margin > 0 ? order[0]![0] : null,
        margin,
      };
    });
  table(api, "returns").put({
    id: `returns:${contestId}`,
    contestId,
    reports,
  } as unknown as ModuleRow);
}

/** A contest's election-night returns, as the count kept them. */
export function returnsOf(
  api: CoreAPI,
  contestId: string,
): ReturnsRow | undefined {
  return table(api, "returns").get(`returns:${contestId}`) as unknown as
    ReturnsRow | undefined;
}

/** Each place's votes in a contest. */
export function placesOf(
  api: CoreAPI,
  contestId: string,
): readonly (PlaceResult & { placeId: string })[] {
  return table(api, "places").query("byContest", [
    contestId,
  ]) as unknown as (PlaceResult & { placeId: string })[];
}

/** The winner takes the seat on the term's first day; the incumbent's term ends. */
export function takeOffice(api: CoreAPI, resultId: string): void {
  const result = table(api, "results").get(resultId) as unknown as ResultRow;
  if (!result?.winnerId) return;
  if (
    heldByRecount(
      api,
      result.contestId,
      `take-office:${result.contestId}`,
      "take-office",
      resultId,
    )
  )
    return;
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(result.contestId) as unknown as ContestRow;
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(contest.officeId) as unknown as OfficeInput;
  const winner = api.state.people.get(result.winnerId);
  const filing = ballot(api, contest.id).find(
    (f) => f.personId === (result.winnerCandidateId ?? result.winnerId),
  );
  // A named official who isn't a full person yet keeps (or gets) an identity;
  // a person keeps the identity their earlier terms recorded (a drawn
  // official later filled in keeps the gender drawn for them).
  const earlier = winner
    ? (terms.query("byPerson", [winner.id]) as unknown as TermRow[]).find(
        (t) => t.identity.gender !== "recorded",
      )
    : undefined;
  const identity = winner
    ? {
        givenName: winner.givenName,
        familyName: winner.familyName,
        gender: earlier?.identity.gender ?? "recorded",
        birthDate: winner.birthDate,
        homeState: town(api).stateKey,
      }
    : officialIdentity(api, contest, result.winnerId);
  seatWinner(api, {
    seatId: contest.seatId,
    officeId: contest.officeId,
    personId: winner ? winner.id : null,
    identity,
    party: filing?.party ?? null,
    // A special election's winner serves out the unexpired term; otherwise
    // the term runs to the start of the one elected a full term on.
    endDate: contest.special
      ? contest.special.termEnd
      : contestTermEnd(office, contest),
    reached: contest.special
      ? `elected in a special election ${contest.electionDate}`
      : `elected ${contest.electionDate}`,
    resultId: contest.id,
    title: contest.title,
    winnerId: result.winnerId,
    news: true,
    ...(contest.special ? { vacancyId: contest.special.vacancyId } : {}),
  });
  openNextCycle(api, contest.seatId);
}

/** The regular election a contest decides: a tie's second election keeps its date. */
/**
 * The day a regular contest's winner's term ends: the office's term after the
 * election, or what is left of a held-over seat's term (`ContestRow.termEnd`).
 */
export function contestTermEnd(
  office: OfficeInput,
  contest: ContestRow,
): string | null {
  return contest.termEnd ?? termEndAfter(office, regularElectionDate(contest));
}

export function regularElectionDate(contest: ContestRow): string {
  return (
    /:(\d{4}-\d{2}-\d{2})(?::second)+$/.exec(contest.id)?.[1] ??
    contest.electionDate
  );
}

function officialIdentity(
  api: CoreAPI,
  contest: ContestRow,
  candidateId: string,
) {
  const loaded = api
    .moduleState(OFFICES_MODULE_ID)
    .table("loaded")
    .get("town") as unknown as { worldSeed: string };
  const drawn = drawOfficialIdentity({
    worldSeed: loaded.worldSeed,
    seatKey: candidateId,
    stateUsps: town(api).stateKey.slice(3),
    role: "state-executive-challenger",
    referenceDate: api.state.date,
  });
  return {
    givenName: drawn.givenName,
    familyName: drawn.familyName,
    gender: drawn.gender,
    birthDate: drawn.birthDate,
    homeState: town(api).stateKey,
  };
}

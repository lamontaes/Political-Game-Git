/**
 * The count: holding the election, settling the count, an empty race and the mandate.
 *
 * Split out of voting.ts by scripts/elections/split-module.ts (structure only);
 * voting.ts re-exports every export of this file by name.
 */
import { bookkeeping } from "../bookkeeping";
import {
  countPlaces,
  countedAppeal,
  blockShares,
  countedChoices,
  countedResidents,
  countedShareRule,
  countedEndorsed,
  type CountedVoter,
} from "../electorate";
import { VOTING_MODULE_ID } from "../voting-module-id";
import {
  applyElectionLaws,
  prisonPartOfBarredShare,
  prisonersBarredHere,
} from "../laws-in-force";
import { breakElectionTie } from "../election-ties";
import { decisionLean, leanedYes } from "../trait-decisions";
import type { CoreAPI, CoreState } from "../types";
import type { ModuleRow } from "../module-data";
import { personLean } from "../campaign-views";
import type { LifeStake } from "../life-stake-rule";
import { campaignParameter, platformLead } from "../campaign-data";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  type ContestRow,
  type FilingRow,
  atLargeGroup,
  ticketOfficeContest,
} from "./elections";
import { townLean } from "./campaigns";
import {
  OFFICES_MODULE_ID,
  unfilledTerm,
  repeatSpecialElection,
  type TermRow,
} from "./offices";
import { holderOf } from "./officials";
import type { OfficeInput } from "./offices";
import { termStartAfter } from "../elections-calendar";
import {
  countedStanceProfile,
  VIEWS_MODULE_ID,
  VIEWS_SPEAKER_KEY,
} from "./views";
import { citizenShareOf } from "../electorate-places";
import { electorateChange } from "../electorate-inputs";
import { trustWeight } from "./news";
import { keepsWhy } from "../why-kept";
import {
  appealFor,
  candidateFacts,
  countedAdultsToday,
  countedDivision,
  countedField,
  countedPledges,
  countedWarmths,
  electorateRoll,
  incumbentLeanOf,
  townAdults,
} from "./voting-appeal";
import {
  ageOn,
  holdoverRule,
  holds,
  openNextCycle,
  recordChosenVote,
  seatHolder,
  table,
  town,
  turnoutRecord,
  votersOfList,
} from "./voting-base";
import type { ResultRow } from "./voting-base";
import {
  dropOldCountedBallots,
  heardOn,
  keptHeard,
} from "./voting-counted-ballots";
import {
  atThePolls,
  inWard,
  keepCountedPollDay,
  keepPollDay,
  pollsterCase,
  registrationReading,
  secondElection,
  wardsOf,
} from "./voting-polling-day";
import {
  contestTermEnd,
  electorateSample,
  keepCount,
  publicReasons,
  racePlaces,
  rankTotals,
  recountOf,
  regularElectionDate,
  takeOffice,
  tiedFirst,
} from "./voting-returns";
import { decideTicket } from "./voting-tickets";

/** Resolve a ballot's term alias before publishing a winner or taking office.
 * A person whose actual id starts with official: is already canonical.
 */
export function winningPersonId(api: CoreAPI, candidateId: string): string {
  if (api.state.people.has(candidateId)) return candidateId;
  const key = candidateId.startsWith("official:")
    ? candidateId.slice("official:".length)
    : candidateId;
  const term = api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .get(key) as unknown as TermRow | undefined;
  return term ? (holderOf(api, term).personId ?? candidateId) : candidateId;
}

/**
 * Who an at-large race's count put inside its seats: the top finishers, as
 * many as there are seats with a candidate ranked, each above the next, and
 * the names tied across the last seat (the place's tie law decides those).
 * Everyone else on the ballot missed the cut. With one seat, the cut is the
 * first finisher, or the names tied for first.
 */
function atLargeCut(
  ranked: readonly (readonly [string, number])[],
  seats: number,
): { top: string[]; straddled: string[] } {
  const live = ranked.filter(([, votes]) => votes > 0);
  const top: string[] = [];
  let straddled: string[] = [];
  for (const [n, [id, votes]] of live.entries()) {
    if (top.length >= seats) break;
    // A tie straddling the last seat decides none of the tied by the count.
    const next = live[n + 1];
    if (top.length === seats - 1 && next && next[1] === votes) {
      straddled = live.filter(([, v]) => v === votes).map(([tied]) => tied);
      break;
    }
    top.push(id);
  }
  return { top, straddled };
}

/**
 * The candidate a race's winner beat: the first finisher among those who
 * missed the cut, by the result record's `outIds` and `totals` (in an
 * at-large race the other winners are not beaten, they were seated too). A
 * record kept before `outIds` reads everyone but the winner. Ties go by id.
 */
export function beatenRunnerUp(
  facts: Readonly<Record<string, unknown>> | undefined,
  winnerId: string,
): { id: string; votes: number } | null {
  const totals = parseTally(facts?.totals);
  const out = facts?.outIds
    ? (JSON.parse(String(facts.outIds)) as string[])
    : Object.keys(totals).filter((id) => id !== winnerId);
  const best = out
    .filter((id) => id !== winnerId)
    .map((id) => ({ id, votes: totals[id] ?? 0 }))
    .sort((a, b) => b.votes - a.votes || a.id.localeCompare(b.id))[0];
  return best ?? null;
}

function parseTally(raw: unknown): Record<string, number> {
  try {
    return JSON.parse(String(raw ?? "{}")) as Record<string, number>;
  } catch {
    return {};
  }
}

/**
 * The winner an at-large race gives one of its seats: the top finishers, as
 * many as there are seats with a candidate ranked, each above the next; a
 * holder among them keeps their own seat, and the rest take the other seats
 * in seat order, by their place in the count. A seat no one is ranked for
 * stays with its holder or vacant until the next contest; a tie at the last
 * place goes to the place's tie law (`breakElectionTie`), as a single seat's.
 */
function atLargeWinner(
  api: CoreAPI,
  group: readonly ContestRow[],
  contest: ContestRow,
  ranked: readonly (readonly [string, number])[],
  electorate?: number,
): string | null {
  const seats = group.length;
  const { top, straddled } = atLargeCut(ranked, seats);
  const assigned = new Map<string, string>();
  const placed = new Set<string>();
  for (const row of group) {
    const holder = seatHolder(api, row);
    const keeps = top.find((id) => !placed.has(id) && holds(holder, id));
    if (keeps) {
      assigned.set(row.id, keeps);
      placed.add(keeps);
    }
  }
  const rest = top.filter((id) => !placed.has(id));
  for (const row of group)
    if (!assigned.has(row.id)) {
      const next = rest.shift();
      if (next) assigned.set(row.id, next);
    }
  const seated = assigned.get(contest.id);
  if (seated) return seated;
  // The last seat is the one nobody was assigned: the same tie law as a
  // single seat's decides it (a second election, a lot or the body).
  const lastSeat = group.filter((row) => !assigned.has(row.id))[0];
  return straddled.length && lastSeat?.id === contest.id
    ? breakElectionTie(api, contest, straddled, secondElection, electorate)
    : null;
}

/** Count a contest: named ballots, then the wider electorate's groups. */
export function holdElection(api: CoreAPI, contestId: string): ResultRow {
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
  // A midterm or off-cycle election draws fewer voters (audit 2, item 5).
  const cycleCost = cycleTurnout(contest.electionDate).cost;
  // A body's at-large seats up on one day are one race: one field, each
  // voter voting for up to as many as there are seats, the top finishers
  // seated (`atLargeGroup`). Each seat's contest counts the same race and
  // keeps the winner the ranking gives its seat.
  const group = atLargeGroup(api, contest);
  const seats = group.length;
  const filings =
    seats > 1
      ? group.flatMap((other) => ballot(api, other.id))
      : ballot(api, contestId);
  // The race is counted once, as its first seat's contest sees it, so every
  // seat's count reads the same appeal, pledges and chosen ballots.
  const counting = group[0]!;
  const date = api.state.date;
  const { townPlaceId } = town(api);
  const adultAge = api.parameter("votingAge");
  // A ward seat is chosen by the voters of its ward alone; an at-large seat
  // by the whole town. A named adult the state's law bars for a felony
  // conviction can't vote.
  const wards = wardsOf(api, contest);
  const ward = wards > 0 ? Number(contest.district) : 0;
  // stopgapId: SG-GOV-ward-map
  if (wards > 0) api.stopgap("SG-GOV-ward-map");
  const named = townAdults(api).filter(
    (p) => !wards || inWard(api, p, wards, ward),
  );
  const playerId = (api.state as CoreState).playerId ?? null;
  const namedVotes: Record<string, number> = {};
  const exitPoll: Record<string, number> = {};
  let voted = 0;
  for (const voter of named) {
    const { appeal, lean, recordReasons, basis } = appealFor(
      api,
      voter,
      counting,
      filings,
    );
    // A voter who chose their ballot (the player, by hand) votes as they
    // chose; with none chosen (a player skipping past election day), they
    // vote or stay home on their own reasons like everyone else.
    // The player's chosen ballot, kept on whichever seat's contest they
    // marked it in.
    const chosen = group
      .map(
        (row) =>
          table(api, "chosen").get(`${row.id}|${voter.id}`) as unknown as
            { candidateId: string | null } | undefined,
      )
      .find(Boolean);
    // The player's ballot is the player's own: the engine never casts it.
    // With none chosen, the player didn't vote in this race.
    if (voter.id === playerId && !chosen) {
      table(api, "ballots").put({
        id: `ballot:${contestId}:${voter.id}`,
        contestId,
        voterId: voter.id,
        date,
        voted: false,
        turnoutReasons: { duty: 0, interest: 0, cost: 0 },
        choice: null,
        appeal: {},
        basis: "party-name-incumbency",
        toldPollster: null,
      } as unknown as ModuleRow);
      continue;
    }
    const decided = atThePolls(api, voter, contest.electionDate, cycleCost);
    // A ballot the player marked still counts. In a state that registers at
    // the polls, a player who was not on the rolls registers there, the way
    // any named voter does, and the day keeps it. (Where the state would turn
    // them away the ballot is not yet refused: the player has no way to see
    // their standing or register until the polling-place scenes and the
    // register act's screen are built; `elections-player-registration-
    // shown-and-acted` holds that step.)
    const standing = chosen
      ? registrationReading(api, voter, contest.electionDate, 0)
      : null;
    if (chosen && standing && standing.why !== "on" && standing.sameDay)
      keepPollDay(
        api,
        voter,
        contest.electionDate,
        "registers-at-polls",
        standing.why,
      );
    if (chosen && !decided.votes) recordChosenVote(api, voter.id);
    const t = chosen ? { ...decided, votes: true } : decided;
    // The same choice rule as every voter's: the one they rank first where
    // something separates them from the next; a lone candidate only where
    // they are for them; else they leave the race blank.
    // A candidate in the race backs themselves; anyone else by the one
    // choice rule.
    // At large, a voter votes for up to as many as there are seats, by the
    // same choice rule (their first places); the first is kept as their choice.
    const choices: readonly string[] = chosen
      ? chosen.candidateId
        ? [chosen.candidateId]
        : []
      : !t.votes
        ? []
        : filings.some((f) => f.personId === voter.id)
          ? [
              voter.id,
              ...countedChoices(appeal, seats).filter((id) => id !== voter.id),
            ].slice(0, seats)
          : countedChoices(appeal, seats);
    const choice = choices[0] ?? null;
    const pollster =
      t.votes && choice !== null ? pollsterCase(api, voter, t.interest) : null;
    const told = !t.votes
      ? null
      : choice === null
        ? "left-blank"
        : !leanedYes(
              api.state,
              voter,
              "voting.exit-poll",
              "tell",
              "decline",
              pollster!.case,
            )
          ? "declined"
          : choice;
    if (t.votes) {
      voted += 1;
      exitPoll[told!] = (exitPoll[told!] ?? 0) + 1;
    }
    for (const id of choices) namedVotes[id] = (namedVotes[id] ?? 0) + 1;
    // The reasons behind a ballot (each candidate's appeal terms, the record
    // reasons, why they turned out) are kept for the player's circle (and
    // everyone's under the keep-everyone's-why switch); everyone else's ballot
    // keeps who voted and the choice,
    // which is all the turnout and results reads take.
    const why = keepsWhy(api.state as CoreState, voter.id);
    table(api, "ballots").put({
      id: `ballot:${contestId}:${voter.id}`,
      contestId,
      voterId: voter.id,
      date,
      voted: t.votes,
      choice,
      // At large, every candidate the voter picked, the first being `choice`.
      ...(choices.length > 1 ? { choices } : {}),
      toldPollster: told,
      ...(why
        ? {
            turnoutReasons: turnoutRecord(t),
            appeal,
            basis,
            lean,
            recordReasons,
            ...(pollster
              ? {
                  pollsterReasons: {
                    engagement: pollster.engagement,
                    interest: pollster.interest,
                    lean: decisionLean(
                      api.state,
                      voter,
                      "voting.exit-poll",
                      "tell",
                      "decline",
                    ),
                  },
                }
              : {}),
          }
        : {}),
    } as unknown as ModuleRow);
  }
  // The counted residents vote from their own records on the same appeal
  // and turnout rules: they see each candidate's name and party on the
  // ballot, each candidate's public standing, and know what the town knows
  // (the incumbent, who is well known and for what, the record as the town
  // knows it), but no campaign reached them personally. Each stands for the
  // town's people like them, so their vote counts at the share of them who
  // turn out. Each ballot is kept with its reasons, like a named voter's.
  const countedVotes: Record<string, number> = {};
  // What the counted voters tell the exit pollster, by the named voters'
  // rule (pollsterCase and the trait lean), at their turnout share.
  const countedExitPoll: Record<string, number> = {};
  let countedVoted = 0;
  let countedEligible = 0;
  const field = countedField(api, counting, filings);
  // The questions the field's platforms take a side on: what a counted
  // voter's group has heard of them is kept with the ballot.
  const questions = [
    ...new Set(field.flatMap((f) => f.platform.map((p) => p.question))),
  ];
  const kept = {
    voterIds: [] as string[],
    voted: [] as number[],
    lean: [] as number[],
    incumbentLean: [] as number[],
    trust: [] as number[],
    duty: [] as number[],
    interest: [] as number[],
    cost: [] as number[],
    weight: [] as number[],
    faith: [] as (number | null)[],
    college: [] as (number | null)[],
    heard: [] as (Readonly<Record<string, number>> | null)[],
    life: [] as (LifeStake | null)[],
    /** Each voter's door "yes" as it held on the day (null where they gave none, or where it held for one household of several). */
    pledges: [] as (Readonly<Record<string, number>> | null)[],
    warmths: [] as (Readonly<Record<string, number>> | null)[],
    /** What the groups whose cause each voter shares brought them, by candidate (null where none). */
    endorsed: [] as (Readonly<Record<string, number>> | null)[],
    /** Where one household of a record's several gave a door "yes": the field index it voted for on its word (-1 otherwise). */
    pledgedChoice: [] as number[],
    /** Each record's voters for each candidate before turnout, in field order (`countedDivision`). */
    split: [] as number[][],
  };
  const countedAdults = wards > 0 ? countedAdultsToday(api) : 0;
  let countedAdultIndex = 0;
  // How a record's people divide in this race, read once for the count.
  const oneSeat = countedShareRule(field);
  const shares =
    seats > 1
      ? (appeal: Parameters<typeof oneSeat>[0]) =>
          blockShares(oneSeat(appeal), seats)
      : oneSeat;
  for (const voter of countedVoters(api)) {
    if (voter.placeId !== townPlaceId) continue;
    const age = ageOn(voter, date);
    if (age < adultAge) continue;
    // Wards are drawn to equal population: the counted residents divide
    // among them in equal runs of the voters each stands for, as the named
    // households do.
    if (wards > 0) {
      const mine =
        Math.min(
          wards - 1,
          Math.floor((countedAdultIndex * wards) / Math.max(1, countedAdults)),
        ) + 1;
      countedAdultIndex += voter.weight;
      if (mine !== ward) continue;
    }
    countedEligible += voter.weight;
    const lean = personLean(api.state.people, voter, townLean(api));
    const incumbentLean = incumbentLeanOf(api, voter);
    const pledges = countedPledges(
      api,
      voter.id,
      trustWeight(api, lean),
      counting.id,
      field,
    );
    const warmths = countedWarmths(api, voter, field);
    const profile = countedStanceProfile(api, voter);
    const endorsed = countedEndorsed(lean, field, profile);
    // What the voter's group has heard, read once for each question the
    // field's platforms take a side on, for every candidate on the ballot,
    // and kept with it: the ballot reads exactly what its reasons keep.
    const heard = heardOn(profile, questions);
    const where = {
      inTown: true,
      local: true,
      incumbentLean,
      trust: trustWeight(api, lean),
      // The town's people hold each form of a rotated ballot in turn.
      ballotForm: kept.voterIds.length,
      profile: keptHeard(profile, heard),
      warmths,
      endorsed,
      divides: true,
    };
    const appeal = countedAppeal(lean, field, { ...where, pledges });
    const t = atThePolls(
      api,
      voter,
      contest.electionDate,
      cycleCost,
      voter.weeklyMinutes,
    );
    // The record's voters divide by the race's rule; a door reached one of
    // the households it stands for, whose word holds for that one
    // (`countedDivision`).
    const division = countedDivision(
      appeal,
      pledges,
      voter.weight,
      () => countedAppeal(lean, field, where),
      shares,
    );
    kept.voterIds.push(voter.id);
    kept.voted.push(t.propensity);
    kept.split.push(field.map((f) => division.votes[f.id] ?? 0));
    kept.lean.push(lean);
    kept.incumbentLean.push(incumbentLean);
    kept.trust.push(trustWeight(api, lean));
    kept.duty.push(t.duty);
    kept.interest.push(t.interest);
    kept.cost.push(t.cost);
    kept.weight.push(voter.weight);
    // Module data holds JSON: a missing distance is kept as null.
    kept.faith.push(profile.faithFromAverage ?? null);
    kept.college.push(profile.collegeFromAverage ?? null);
    kept.heard.push(heard);
    kept.life.push(profile.life ?? null);
    kept.pledges.push(division.wholePledged ? (pledges ?? null) : null);
    kept.warmths.push(warmths ?? null);
    kept.endorsed.push(endorsed ?? null);
    kept.pledgedChoice.push(
      !division.wholePledged && division.pledged
        ? field.findIndex((f) => f.id === division.pledged)
        : -1,
    );
    countedVoted += t.propensity * voter.weight;
    for (const [backed, weight] of Object.entries(division.votes))
      countedVotes[backed] =
        (countedVotes[backed] ?? 0) + t.propensity * weight;
    // The record tells the pollster as a named voter would: a reluctant one
    // declines, so its whole turnout share counts as declined.
    const tells = leanedYes(
      api.state,
      voter,
      "voting.exit-poll",
      "tell",
      "decline",
      pollsterCase(api, voter, t.interest).case,
    );
    // An at-large ballot divides several votes; the poll asks for the first
    // choice, so the record's turnout share divides in proportion.
    const cast = Object.values(division.votes).reduce((a, b) => a + b, 0);
    if (tells && cast > 0)
      for (const [backed, weight] of Object.entries(division.votes))
        countedExitPoll[backed] =
          (countedExitPoll[backed] ?? 0) +
          (t.propensity * voter.weight * weight) / cast;
    else if (!tells)
      countedExitPoll.declined =
        (countedExitPoll.declined ?? 0) + t.propensity * voter.weight;
  }
  if (!bookkeeping()) dropOldCountedBallots(api);
  table(api, "countedBallots").put({
    id: `counted:${contestId}`,
    contestId,
    date,
    field,
    // The world whose view of each question every voter's stance carries.
    seed: api.state.seed,
    ...kept,
  } as unknown as ModuleRow);
  // Each counted resident stands for the town's people like them; those who
  // aren't citizens (the place's ACS share) and those barred for a felony
  // conviction (the share a restoration law in force returns is counted
  // back) can't vote.
  const scale = countedScale(api);
  for (const id of Object.keys(countedVotes))
    countedVotes[id] = Math.round(countedVotes[id]! * scale);
  for (const id of Object.keys(countedExitPoll))
    exitPoll[id] =
      (exitPoll[id] ?? 0) + Math.round(countedExitPoll[id]! * scale);
  countedVoted = Math.round(countedVoted * scale);
  countedEligible = Math.round(countedEligible * scale);
  // The rest of the race's electorate, place by place, on the same engine.
  const places = racePlaces(api, contest, filings, {
    named: named.length,
    counted: countedEligible,
  });
  const wider = places.length
    ? countPlaces(
        electorateSample(api, contest.electionDate, cycleCost),
        places,
        field,
        undefined,
        seats,
      )
    : null;
  const takesOffice = termStartsOn(api, contest);
  const result = keepCount(api, {
    id: contestId,
    date,
    candidates: filings.map((f) => f.personId),
    named: {
      votes: namedVotes,
      turnout: voted,
      eligible: named.length,
      exitPoll,
    },
    counted: {
      votes: countedVotes,
      turnout: countedVoted,
      eligible: countedEligible,
    },
    wider,
    reasons: publicReasons(api, contest, filings),
    // The one with the most votes; a tie for first by the place's law for
    // the office; one name on the ballot wins unopposed, whatever the
    // turnout; no one wins on no votes (the seat stays with its holder, or
    // vacant, until the next contest).
    decide: (ranked, electorate) =>
      seats > 1
        ? atLargeWinner(api, group, contest, ranked, electorate)
        : tiedFirst(ranked)
          ? breakElectionTie(
              api,
              contest,
              ranked.filter((r) => r[1] === ranked[0]![1]).map((r) => r[0]),
              secondElection,
              electorate,
            )
          : ranked.length === 1
            ? ranked[0]![0]
            : ranked.length && ranked[0]![1] > 0
              ? ranked[0]![0]
              : null,
    winnerOf: (candidateId) => winningPersonId(api, candidateId),
    takesOffice,
    stateKey: town(api).stateKey,
    office: contest.title,
  });
  const decided = settleCount(api, {
    contest,
    group,
    filings,
    result,
    takesOffice,
  });
  // The office the law elects on the governor's ticket is decided with it.
  const ticket = ticketOfficeContest(api, contest);
  if (ticket) decideTicket(api, contest, ticket, decided);
  return decided;
}

/**
 * A count's outcome, once kept: the result the town and the press read, and
 * the winner seated on the office's day, or the seat's law for a race no
 * one won. Every count of a town contest ends here, a ticket office's too
 * (`decideTicket`).
 */
export function settleCount(
  api: CoreAPI,
  input: {
    readonly contest: ContestRow;
    /** A body's at-large seats up together, else the contest alone. */
    readonly group: readonly ContestRow[];
    readonly filings: readonly FilingRow[];
    readonly result: ResultRow;
    readonly takesOffice: string;
  },
): ResultRow {
  const { contest, group, filings, result, takesOffice } = input;
  const contestId = contest.id;
  const counting = group[0]!;
  const seats = group.length;
  const date = api.state.date;
  const { townPlaceId } = town(api);
  const tied = tiedFirst(rankTotals(result.totals));
  const { winnerId, totals } = result;
  const winnerCandidateId = result.winnerCandidateId ?? null;
  // The election laws in force were applied to this electorate: who was
  // mailed a ballot, who registered at the polls, and what the election's
  // administration cost the government that ran it.
  applyElectionLaws(api, "vote", electorateRoll(api), contestId, {
    pollDate: contest.electionDate,
  });
  keepCountedPollDay(api, contest.electionDate);
  // One race, one result every reader agrees on: those the count put inside
  // the race's seats, and those who missed the cut (`outIds`, on every seat's
  // record). A seat of an at-large race names its own winner, the names tied
  // across the last seat where it is that seat, and those who missed the cut
  // and filed for that seat (their campaign is that seat's): each candidate
  // is named once, so nobody is both elected and beaten by one count.
  // A tie across the last seat that this count settled (a lot, a vote of
  // the body) leaves the other tied names out; one still to be settled (a
  // second election) keeps them in the race.
  const cut = atLargeCut(rankTotals(totals), seats);
  const settledTie =
    !!winnerCandidateId && cut.straddled.includes(winnerCandidateId);
  const inside = new Set([
    ...cut.top,
    ...(settledTie ? [] : cut.straddled),
    ...(winnerCandidateId ? [winnerCandidateId] : []),
  ]);
  const person = (id: string) => winningPersonId(api, id);
  const missed = filings.filter((f) => !inside.has(f.personId));
  const out = missed
    .map((f) => person(f.personId))
    .filter((id) => api.state.people.has(id))
    .sort();
  const undecided = !winnerCandidateId || settledTie;
  const naming =
    seats > 1
      ? [
          ...(winnerCandidateId ? [winnerCandidateId] : []),
          ...(undecided ? cut.straddled : []),
        ].map(person)
      : filings.map((f) => person(f.personId));
  api.emit({
    id: `election-result:${contestId}`,
    date,
    kind: "election-result",
    personIds: [
      ...new Set([
        ...naming,
        ...(seats > 1
          ? missed
              .filter((f) => f.contestId === contestId)
              .map((f) => person(f.personId))
          : []),
      ]),
    ].filter((id) => api.state.people.has(id)),
    placeId: townPlaceId,
    source: { tag: "SOURCED", citation: `Count of ${contestId}`, asOf: date },
    publicRecord: true,
    news: true,
    ...mandate(api, contest, winnerCandidateId),
    facts: {
      contestId,
      office: contest.title,
      winnerId: winnerId ?? "",
      totals: JSON.stringify(totals),
      outIds: JSON.stringify(out),
      // An at-large race: the race (its first seat's contest) and its seats.
      ...(seats > 1 ? { race: counting.id, seats: String(seats) } : {}),
      ...mandateLean(api, winnerId),
      // A recount the margin opened, or the player's to ask for: the
      // election night scene and the paper read it by its id.
      ...(result.recountId
        ? {
            recountId: result.recountId,
            recount:
              recountOf(api, contestId)?.status === "offered"
                ? "offered"
                : (recountOf(api, contestId)?.kind ?? ""),
          }
        : {}),
    },
  });
  // Each person the count left out holds the loss against the one who won:
  // the drives engine reads this record and answers by the loser's own
  // temperament (a grudge, a cause or carrying on), never by a roll.
  const winnerPerson =
    winnerCandidateId && !undecided ? person(winnerCandidateId) : undefined;
  if (winnerPerson && api.state.people.has(winnerPerson))
    for (const loserId of out.filter((id) => id !== winnerPerson))
      api.emit({
        id: `race.lost:${contestId}:${loserId}`,
        date,
        kind: "race.lost",
        personIds: [loserId],
        placeId: townPlaceId,
        publicRecord: false,
        topic: winnerPerson,
        desiredChange: "race.lost",
        facts: { contestId, winnerId: winnerPerson },
        source: {
          tag: "SOURCED",
          citation: `Lost ${contestId}`,
          asOf: date,
        },
      });
  // The presidency is won in the electoral college (`electoralCollege`);
  // this count is the town's state's popular vote.
  if (contest.officeId === "office:US:president") return result;
  const seatedOn = result.takesOffice ?? takesOffice;
  if (winnerId && seatedOn > date)
    api.moduleCalendar(VOTING_MODULE_ID).schedule({
      key: `take-office:${contestId}`,
      date: seatedOn,
      kind: "take-office",
      source: {
        tag: "SOURCED",
        citation: `Result of ${contestId}`,
        asOf: date,
      },
      sourceRecordIds: [result.id],
    });
  else if (winnerId) takeOffice(api, result.id);
  else if (!tied) {
    // The place's law for the office decides: the holder serves on until a
    // successor qualifies, or the seat is vacant and the vacancy rule runs
    // (a repeated special election when this one was already a special).
    // Congressional terms end on a fixed day, so the House row governs both
    // chambers.
    const rule = holdoverRule(
      town(api).stateKey,
      contest.level === "federal" ? "usHouse" : contest.family,
    );
    const reason = rule.citation ?? rule.estimatedFrom ?? "";
    if (rule.tag === "ESTIMATED") {
      // stopgapId: SG-GOV-empty-race-law
      api.stopgap("SG-GOV-empty-race-law");
    }
    table(api, "emptyRaces").put({
      id: `empty:${contest.id}`,
      contestId: contest.id,
      resultId: result.id,
      seatId: contest.seatId,
      date,
      due: takesOffice,
      method: contest.special
        ? "repeat-special"
        : rule.rule === "holds-over"
          ? "holdover"
          : "vacancy",
      rule: rule.rule,
      ruleBasis: rule.basis,
      source: reason,
      status: "pending",
    });
    if (takesOffice > date)
      api.moduleCalendar(VOTING_MODULE_ID).schedule({
        key: `empty-term:${contest.id}`,
        date: takesOffice,
        kind: "empty-term",
        source: {
          tag: rule.tag as "SOURCED" | "ESTIMATED",
          citation: reason,
          asOf: date,
          ...(rule.tag === "ESTIMATED"
            ? { estimatedFrom: "SG-GOV-empty-race-law" }
            : {}),
        },
        sourceRecordIds: [contest.id],
      });
    else resolveEmptyRace(api, contest.id);
  }
  return result;
}

/**
 * The day a contest's winner takes office: at once for a special election;
 * otherwise the office's own start day after the regular election (a second
 * election after a tie keeps the regular one's term).
 */
export function termStartsOn(api: CoreAPI, contest: ContestRow): string {
  const date = api.state.date;
  const incumbent = contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(contest.officeId) as unknown as OfficeInput | undefined;
  return contest.special
    ? date
    : office
      ? termStartAfter(office, regularElectionDate(contest))
      : (incumbent?.endDate ??
        `${Number(contest.electionDate.slice(0, 4)) + 1}-01-01`);
}

/** Apply failure-to-elect law at the term boundary, never on election night. */
export function resolveEmptyRace(api: CoreAPI, contestId: string): void {
  const row = table(api, "emptyRaces").get(`empty:${contestId}`);
  if (!row || row.status !== "pending" || String(row.due) > api.state.date)
    return;
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(contest.officeId) as unknown as OfficeInput;
  // A holdover needs someone to hold over: a seat no one holds (an office
  // its law created since the last election) is vacant.
  const method =
    row.method === "holdover" &&
    !api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [contest.seatId, "serving"]).length
      ? "vacancy"
      : row.method;
  const vacancy =
    method === "vacancy"
      ? unfilledTerm(
          api,
          contest.seatId,
          String(row.resultId),
          contestTermEnd(office, contest),
        )
      : null;
  // An empty special leaves its vacancy open: the next special is dated now.
  const repeated =
    row.method === "repeat-special" && contest.special
      ? repeatSpecialElection(
          api,
          contest.special.vacancyId,
          contest.special.termEnd,
        )
      : null;
  table(api, "emptyRaces").put({
    ...row,
    method,
    status: "resolved",
    resolvedOn: api.state.date,
    vacancyId: vacancy?.id ?? repeated?.id ?? null,
    nextSpecialOn: repeated?.electionDate ?? null,
  });
  if (!contest.special) openNextCycle(api, contest.seatId);
}

/**
 * What a result tells the people who learn it about where the town is
 * going: the question the winner's campaign led with (`platformLead`: what
 * those who learn the result heard them make the race about), and which
 * way. The views engine reads it like a speech: it moves the stance on that question
 * of those who learn the result, most for those whose lean sits near the
 * winner's. None when no one won or the winner stated nothing.
 */
function mandate(
  api: CoreAPI,
  contest: ContestRow,
  winnerId: string | null,
): { topic?: string; desiredChange?: "enact" | "repeal" } {
  if (!winnerId) return {};
  const filing = ballot(api, contest.id).find((f) => f.personId === winnerId);
  if (!filing) return {};
  const top = platformLead(candidateFacts(api, filing, contest).platform);
  if (!top || top.position === 0) return {};
  return {
    topic: top.question,
    desiredChange: top.position > 0 ? "enact" : "repeal",
  };
}

/** The winner makes the case the result carries: the views engine weighs it by how each person stands with them. */
function mandateLean(
  api: CoreAPI,
  winnerId: string | null,
): Record<string, string> {
  if (!winnerId || !api.state.modules.has(VIEWS_MODULE_ID)) return {};
  return { [VIEWS_SPEAKER_KEY]: winnerId };
}

/**
 * Which kind of election a date is: a presidential November, a midterm
 * November, or an off-cycle date (an odd year, or a spring or summer local
 * election), whose turnout runs far lower.
 */
export function electionCycle(
  date: string,
): "presidential" | "midterm" | "off-cycle" {
  const year = Number(date.slice(0, 4));
  const november = date.slice(5, 7) === "11";
  if (!november || year % 2) return "off-cycle";
  return year % 4 === 0 ? "presidential" : "midterm";
}

/** The cycle's turnout against a presidential year's, and what it adds to the cost of voting. */
export function cycleTurnout(date: string): { share: number; cost: number } {
  const cycle = electionCycle(date);
  if (cycle === "presidential") return { share: 1, cost: 0 };
  if (cycle === "midterm")
    return {
      share: campaignParameter("midtermShareOfPresidential"),
      cost: campaignParameter("midtermTurnoutCost"),
    };
  return {
    share: campaignParameter("offCycleShareOfPresidential"),
    cost: campaignParameter("offCycleTurnoutCost"),
  };
}

/**
 * What one counted resident's vote stands for: the town's people like them
 * who are citizens (the place's ACS share, blended with its state's), less
 * the share barred for a felony conviction.
 */
export function countedScale(api: CoreAPI): number {
  const usps = town(api).stateKey.slice(3);
  // The prison part of the barred share is left out: those rooms are not in
  // the counted electorate where the state bars them (`countedVoters`).
  return (
    citizenShareOf(
      api.state.placeMetadata.placeKey as string | undefined,
      usps,
      api.state.seed,
    ) *
    (1 - (electorateChange(api).barred - prisonPartOfBarredShare(api)))
  );
}

/**
 * The counted residents who vote: every counted resident but those of adult
 * correctional rooms where the state's law bars people held in prison
 * (`incarceratedMayVote`, through `prisonersBarredHere`). The one list every
 * counted voter loop reads.
 */
export function countedVoters(api: CoreAPI): readonly CountedVoter[] {
  const all = countedResidents(api.state as CoreState);
  if (!prisonersBarredHere(api)) return all;
  // Kept for as long as `countedResidents` keeps the list (a day).
  const held = votersOfList.get(all);
  if (held) return held;
  const voters = all.filter((v) => v.quarters !== "adultCorrectional");
  votersOfList.set(all, voters);
  return voters;
}

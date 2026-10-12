/**
 * Elections, part two: election day, the count and taking office (golden path
 * steps 5 and 11).
 *
 * On a contest's election day, every named adult who lives where the seat is
 * elected decides whether to vote, from their own circumstances, and whom to
 * vote for, from what they know and think: their warmth toward each candidate
 * they've heard of (recorded causes), how far each known platform sits from
 * their own views, the candidates' parties and each incumbent's record. The
 * wider electorate the world doesn't name votes as groups by lean around the
 * district's real 2024 vote, sized to its real 2024 turnout, each group
 * recognizing candidates as the named people of its lean do (stand-in until
 * CORE's voter groups are populated: SG-GOV-voter-groups-stand-in). Nothing is
 * rolled. The winner takes the seat on the term's start date. Exit polls ask
 * named voters leaving the polls and report what they said.
 */
import federalExecutive from "../../../data/research/offices/federal-executive-2026.json" with { type: "json" };
import { countedResidents } from "../electorate";
import calibration from "../../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import {
  campaignParameter,
  personLean,
  platformAgreement,
  type Stance,
} from "../campaign-views";
import { townDistrict } from "../offices-state";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  type ContestRow,
  type FilingRow,
} from "./elections";
import {
  CAMPAIGNS_MODULE_ID,
  campaignFor,
  impressionOf,
  parsePlatform,
} from "./campaigns";
import { OFFICES_MODULE_ID, type TermRow } from "./offices";
import type { SeatInput } from "../offices-state";
import { drawOfficialIdentity } from "../officials-identity";
import { partiesHere, partyTie } from "./parties";
import { recordAppeal, type RecordReason } from "./record";

const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, "-");

export const VOTING_MODULE_ID = "core2-voting-v1";

/** One named person's vote, with its reasons. */
export interface BallotRow {
  readonly id: string;
  readonly contestId: string;
  readonly voterId: string;
  readonly date: string;
  readonly voted: boolean;
  /** Why they did or didn't turn out, as their own numbers. */
  readonly turnoutReasons: {
    readonly duty: number;
    readonly interest: number;
    readonly cost: number;
  };
  readonly choice: string | null;
  /** Each candidate's appeal to this voter, and its parts. */
  readonly appeal: Readonly<
    Record<
      string,
      {
        readonly total: number;
        readonly warmth: number;
        readonly agreement: number | null;
        readonly party: number;
        readonly record: number;
      }
    >
  >;
  /** What they told the exit pollster. */
  readonly toldPollster: string | null;
  /** Each incumbent's record as this voter weighed it, by candidate. */
  readonly recordReasons?: Readonly<Record<string, readonly RecordReason[]>>;
}

export interface ResultRow {
  readonly id: string;
  readonly contestId: string;
  readonly date: string;
  readonly namedVotes: Readonly<Record<string, number>>;
  /** The counted residents' votes, from their own records (two-level population). */
  readonly countedVotes: Readonly<Record<string, number>>;
  readonly countedTurnout: number;
  readonly countedEligible: number;
  readonly groupVotes: Readonly<Record<string, number>>;
  readonly totals: Readonly<Record<string, number>>;
  readonly namedTurnout: number;
  readonly namedEligible: number;
  readonly electorate: number;
  readonly winnerId: string | null;
  readonly takesOffice: string | null;
  readonly exitPoll: Readonly<Record<string, number>>;
}

export const VOTING_MODULE: CoreModule = {
  id: VOTING_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      ballots: {
        indexes: {
          byContest: { fields: ["contestId"] },
          byVoter: { fields: ["voterId"] },
        },
      },
      results: { indexes: { byContest: { fields: ["contestId"] } } },
    },
  },
  onCalendarWork: votingCalendarWork,
};

function table(api: CoreAPI, name: string) {
  return api.moduleState(VOTING_MODULE_ID).table(name);
}
const ageOn = (p: Readonly<Pick<PersonState, "birthDate">>, date: string) =>
  Number(date.slice(0, 4)) -
  Number(p.birthDate.slice(0, 4)) -
  (date.slice(5) < p.birthDate.slice(5) ? 1 : 0);

/** Put every contest's election day and the winner's first day on the calendar. */
export function openVoting(core: CoreState): void {
  if (!core.modules.has(VOTING_MODULE_ID)) registerModule(core, VOTING_MODULE);
  const api = coreAPI(core);
  const calendar = api.moduleCalendar(VOTING_MODULE_ID);
  for (const contest of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[]) {
    if (contest.electionDate <= core.date) continue;
    if (contest.filingDeadline > core.date)
      calendar.schedule({
        key: `filing-closes:${contest.id}`,
        date: contest.filingDeadline,
        kind: "filing-closes",
        source: {
          tag: "SOURCED",
          citation: contest.sources.join(" ; ") || "election calendar",
          asOf: core.date,
        },
        sourceRecordIds: [contest.id],
      });
    else fileStandingCandidates(api, contest.id);
    if (contest.primaryDate && contest.primaryDate > core.date)
      calendar.schedule({
        key: `primary:${contest.id}`,
        date: contest.primaryDate,
        kind: "primary",
        source: {
          tag: "SOURCED",
          citation: contest.sources.join(" ; ") || "election calendar",
          asOf: core.date,
        },
        sourceRecordIds: [contest.id],
      });
    calendar.schedule({
      key: `election:${contest.id}`,
      date: contest.electionDate,
      kind: "election-day",
      source: {
        tag: contest.basis === "read" ? "SOURCED" : "ESTIMATED",
        citation: contest.sources.join(" ; ") || "election calendar",
        asOf: core.date,
        ...(contest.basis === "read"
          ? {}
          : {
              estimatedFrom: contest.sources.join(" ; ") || "election calendar",
            }),
      },
      sourceRecordIds: [contest.id],
    });
  }
}

function votingCalendarWork(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  if (work.kind === "filing-closes")
    fileStandingCandidates(api, work.sourceRecordIds[0]!);
  if (work.kind === "primary") holdPrimary(api, work.sourceRecordIds[0]!);
  if (work.kind === "election-day") holdElection(api, work.sourceRecordIds[0]!);
  if (work.kind === "take-office") takeOffice(api, work.sourceRecordIds[0]!);
}

function town(api: CoreAPI) {
  return api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("town")
    .get("town") as unknown as {
    stateKey: string;
    geoid: string;
    townPlaceId: string;
  };
}
function townLean(api: CoreAPI): number {
  return (
    api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("town")
      .get("town") as unknown as { lean: number }
  ).lean;
}

/** A party's side of the left-right scale: -1 for the Democratic family, +1 Republican, 0 otherwise. */
function partySide(party: string | null): number {
  if (!party) return 0;
  if (/democrat|popular democr/i.test(party)) return -1;
  if (/republican|nuevo progresista/i.test(party)) return 1;
  return 0;
}

/**
 * What a candidate stands for, as the voter can know it: the stated platform
 * of a filing; an incumbent's record is the party side they sat with.
 */
function candidateFacts(api: CoreAPI, filing: FilingRow, contest: ContestRow) {
  const campaign = api
    .moduleState(CAMPAIGNS_MODULE_ID)
    .table("campaigns")
    .get(filing.id);
  const platform: readonly Stance[] = campaign
    ? (campaign as unknown as { platform: Stance[] }).platform
    : parsePlatform(filing.platform);
  const incumbent = contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  const isIncumbent = incumbent?.personId === filing.personId;
  return { platform, party: filing.party ?? null, isIncumbent };
}

/**
 * One named voter's appeal for each candidate: warmth from what reached them,
 * agreement with the platform they know, party (in a partisan race, the side
 * of their own lean), and an incumbent's record (stand-in until the record
 * engine: a known incumbent's familiarity).
 */
function appealFor(
  api: CoreAPI,
  voter: Readonly<PersonState>,
  contest: ContestRow,
  filings: readonly FilingRow[],
) {
  const lean = personLean(api.state.people, voter, townLean(api));
  const recordReasons: Record<string, readonly RecordReason[]> = {};
  const appeal: Record<
    string,
    {
      total: number;
      warmth: number;
      agreement: number | null;
      party: number;
      record: number;
    }
  > = {};
  for (const filing of filings) {
    const facts = candidateFacts(api, filing, contest);
    const impression = impressionOf(api, voter.id, filing.personId);
    const warmth = impression?.warmth ?? 0;
    const agreement = impression?.knowsPlatform
      ? platformAgreement(lean, facts.platform)
      : null;
    const tie = partyTie(api, voter.id);
    const loyal =
      tie?.partyId && facts.party && tie.partyId.endsWith(slug(facts.party))
        ? campaignParameter("partyLoyaltyWeight")
        : 0;
    const party = (facts.party ? lean * partySide(facts.party) : 0) + loyal;
    // The incumbent's record (votes, promises kept or broken), weighed by a
    // voter who knows the officeholder (golden path step 11).
    const knows =
      voter.knownIds.has(filing.personId) || (impression?.heardOf ?? false);
    const weighed = facts.isIncumbent
      ? recordAppeal(api, voter, filing.personId, lean, knows)
      : { total: 0, reasons: [] };
    const record = weighed.total;
    recordReasons[filing.personId] = weighed.reasons;
    appeal[filing.personId] = {
      total: warmth + (agreement ?? 0) + party + record,
      warmth,
      agreement,
      party,
      record,
    };
  }
  return { appeal, lean, recordReasons };
}

/** Whether a named adult votes: their sense of duty and interest in this race against what it costs them that day. */
export function turnout(
  api: CoreAPI,
  voter: Readonly<Pick<PersonState, "id" | "traits">>,
  appeal: Record<string, { total: number }>,
  /** A counted resident's scheduled weekly work, from their record. */
  recordedWeeklyMinutes?: number,
) {
  const duty =
    (voter.traits["personality-v1:facet-duty-bound"] ?? 0) +
    (voter.traits["people-mind-v1:reliability"] ?? 0) / 2;
  const totals = Object.values(appeal).map((a) => a.total);
  // How much they care: the strength of their strongest feeling in the race.
  const interest = totals.length ? Math.max(...totals.map(Math.abs)) : 0;
  const state = api.state as CoreState;
  const weeklyWork =
    recordedWeeklyMinutes ??
    [...(state.work.commitmentsByPerson.get(voter.id) ?? [])].reduce(
      (sum, id) =>
        sum + (state.work.commitments.get(id)?.expectedWeeklyMinutes ?? 0),
      0,
    );
  const cost =
    weeklyWork / campaignParameter("turnoutWorkWeekMinutes") -
    (voter.traits["people-mind-v1:deliberation"] ?? 0) / 2;
  return {
    duty,
    interest,
    cost,
    votes: duty + interest + campaignParameter("turnoutBase") > cost,
  };
}

/**
 * When filing closes: the incumbent stands again if they're alive and holding
 * the seat, and a state or federal race the town only sees from afar gets a
 * challenger from the other major party, a named official drawn from the
 * world seed. Stand-in until OPUS-PEOPLE's "who runs" decides each from their
 * own drives (M2-04): SG-GOV-who-runs-stand-in.
 */
export function fileStandingCandidates(api: CoreAPI, contestId: string): void {
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
  const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
  const onBallot = ballot(api, contestId);
  // stopgapId: SG-GOV-who-runs-stand-in
  api.stopgap("SG-GOV-who-runs-stand-in");
  const incumbent = contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  const put = (personId: string, party: string | null, how: string) => {
    if (onBallot.some((f) => f.personId === personId)) return;
    filings.put({
      id: `filing:${contestId}:${personId}`,
      contestId,
      personId,
      filedOn: api.state.date,
      filedWith: how,
      platform: [],
      party,
      feePaidMinor: 0,
      signatureCount: 0,
      status: "on-ballot",
    } as unknown as ModuleRow);
  };
  const alive =
    incumbent &&
    incumbent.status === "serving" &&
    (!incumbent.personId || api.state.people.get(incumbent.personId)?.alive);
  if (incumbent && alive && !termLimited(api, contest, incumbent))
    put(
      incumbent.personId ?? officialCandidateId(incumbent.id),
      incumbent.party,
      "incumbent stands again",
    );
  if (
    (contest.level === "federal" || contest.level === "state") &&
    incumbent &&
    partySide(incumbent.party) !== 0
  ) {
    const other = partySide(incumbent.party) > 0 ? "Democratic" : "Republican";
    put(officialCandidateId(`challenger:${contest.id}`), other, "challenger");
    // An open seat: the incumbent's party nominates someone new.
    if (termLimited(api, contest, incumbent))
      put(
        officialCandidateId(`nominee:${contest.id}`),
        incumbent.party,
        "nominee for an open seat",
      );
  }
}

/**
 * Whether the incumbent may not stand again. The presidency: no one is
 * elected more than twice (U.S. Const. amend. XXII), counting the opening
 * holder's terms from the record.
 */
function termLimited(
  api: CoreAPI,
  contest: ContestRow,
  incumbent: TermRow,
): boolean {
  if (contest.officeId !== "office:US:president") return false;
  const opening = (
    federalExecutive as unknown as { president: { termNumber?: number } }
  ).president.termNumber;
  const served =
    incumbent.reached === "in office at the opening"
      ? (opening ?? 1)
      : (
          api
            .moduleState(OFFICES_MODULE_ID)
            .table("terms")
            .query("bySeatStatus", [
              contest.seatId,
              "ended",
            ]) as unknown as TermRow[]
        ).filter(
          (t) =>
            t.identity.givenName === incumbent.identity.givenName &&
            t.identity.familyName === incumbent.identity.familyName,
        ).length + 1;
  return served >= 2;
}

/** A named official on the ballot who isn't a full person in the world yet. */
export function officialCandidateId(key: string): string {
  return `official:${key}`;
}

/**
 * The primary, by the state's method. A party primary picks one nominee per
 * party from that party's voters (and independents where the state lets
 * them in); a top-two or top-four primary puts every candidate before every
 * voter and sends the top finishers on. Candidates who don't advance leave
 * the November ballot. Counted from the named voters, the sample of the
 * party's electorate the world names.
 */
export function holdPrimary(
  api: CoreAPI,
  contestId: string,
): Readonly<Record<string, number>> {
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
  const filings = ballot(api, contestId);
  const parties = partiesHere(api);
  const method = parties[0]?.nominationMethod ?? "party-primary";
  const access = parties[0]?.voterAccess ?? "";
  const date = api.state.date;
  const { townPlaceId } = town(api);
  const voters = [...api.state.people.values()]
    .filter((p) => p.alive && p.placeId === townPlaceId && ageOn(p, date) >= 18)
    .sort((a, b) => a.id.localeCompare(b.id));
  const votes: Record<string, number> = {};
  const count = (field: readonly FilingRow[], who: readonly PersonState[]) => {
    for (const voter of who) {
      const { appeal } = appealFor(api, voter, contest, field);
      if (!turnout(api, voter, appeal).votes) continue;
      const ranked = Object.entries(appeal).sort(
        (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]),
      );
      if (ranked.length > 1 && ranked[0]![1].total === ranked[1]![1].total)
        continue;
      if (ranked[0]) votes[ranked[0][0]] = (votes[ranked[0][0]] ?? 0) + 1;
    }
  };
  const lose = (filing: FilingRow) =>
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .put({ ...filing, status: "withdrawn" } as unknown as ModuleRow);
  const advancing = method === "top-two" ? 2 : method === "top-four" ? 4 : 0;
  if (advancing) {
    count(filings, voters);
    filings
      .slice()
      .sort(
        (a, b) =>
          (votes[b.personId] ?? 0) - (votes[a.personId] ?? 0) ||
          a.personId.localeCompare(b.personId),
      )
      .slice(advancing)
      .forEach(lose);
  } else {
    const byParty = new Map<string, FilingRow[]>();
    for (const f of filings)
      if (f.party) byParty.set(f.party, [...(byParty.get(f.party) ?? []), f]);
    for (const [party, field] of byParty) {
      if (field.length < 2) continue;
      const open = /open|unaffiliated|independ/i.test(access);
      const electorate = voters.filter((v) => {
        const tie = partyTie(api, v.id);
        return (
          (tie?.partyId?.endsWith(slug(party)) ?? false) ||
          (open && tie?.tie !== "party")
        );
      });
      count(field, electorate);
      const ranked = field
        .slice()
        .sort(
          (a, b) =>
            (votes[b.personId] ?? 0) - (votes[a.personId] ?? 0) ||
            a.personId.localeCompare(b.personId),
        );
      // An exact tie at the top eliminates no one (the law's tie rule is
      // applied by the officials, not modeled yet).
      if (
        (votes[ranked[0]!.personId] ?? 0) === (votes[ranked[1]!.personId] ?? 0)
      )
        continue;
      const winner = ranked[0]!;
      field.filter((f) => f !== winner).forEach(lose);
    }
  }
  api.emit({
    id: `primary-result:${contestId}`,
    date,
    kind: "primary-result",
    personIds: filings
      .map((f) => f.personId)
      .filter((id) => api.state.people.has(id)),
    placeId: townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Primary count of ${contestId}`,
      asOf: date,
    },
    publicRecord: true,
    news: true,
    facts: { contestId, method, votes: JSON.stringify(votes) },
  });
  return votes;
}

/** Count a contest: named ballots, then the wider electorate's groups. */
export function holdElection(api: CoreAPI, contestId: string): ResultRow {
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
  const filings = ballot(api, contestId);
  const date = api.state.date;
  const { townPlaceId } = town(api);
  const named = [...api.state.people.values()]
    .filter((p) => p.alive && p.placeId === townPlaceId && ageOn(p, date) >= 18)
    .sort((a, b) => a.id.localeCompare(b.id));
  const namedVotes: Record<string, number> = {};
  const exitPoll: Record<string, number> = {};
  const byLean: { lean: number; heard: Set<string>; choice: string | null }[] =
    [];
  let voted = 0;
  for (const voter of named) {
    const { appeal, lean, recordReasons } = appealFor(
      api,
      voter,
      contest,
      filings,
    );
    const t = turnout(api, voter, appeal);
    const ranked = Object.entries(appeal).sort(
      (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]),
    );
    // A voter with nothing that separates the leading candidates leaves this
    // race blank rather than picking by ballot order.
    const separates =
      ranked.length === 1 ||
      (ranked.length > 1 && ranked[0]![1].total > ranked[1]![1].total);
    const choice = t.votes && separates ? ranked[0]![0] : null;
    const told = !t.votes
      ? null
      : choice === null
        ? "left-blank"
        : (voter.traits["people-mind-v1:conflict"] ?? 0) < 0
          ? "declined"
          : choice;
    if (t.votes) {
      voted += 1;
      exitPoll[told!] = (exitPoll[told!] ?? 0) + 1;
    }
    if (choice) namedVotes[choice] = (namedVotes[choice] ?? 0) + 1;
    byLean.push({
      lean,
      heard: new Set(
        filings
          .filter((f) => impressionOf(api, voter.id, f.personId)?.heardOf)
          .map((f) => f.personId),
      ),
      choice,
    });
    table(api, "ballots").put({
      id: `ballot:${contestId}:${voter.id}`,
      contestId,
      voterId: voter.id,
      date,
      voted: t.votes,
      turnoutReasons: { duty: t.duty, interest: t.interest, cost: t.cost },
      choice,
      appeal,
      toldPollster: told,
      recordReasons,
    } as unknown as ModuleRow);
  }
  // The counted residents vote from their own records: they see each
  // candidate's name and party on the ballot, but no campaign reached them,
  // so no platform or record moves them. With nothing to separate the
  // candidates (a nonpartisan race), they leave it blank.
  const countedVotes: Record<string, number> = {};
  let countedVoted = 0;
  let countedEligible = 0;
  for (const voter of countedResidents(api.state as CoreState)) {
    if (voter.placeId !== townPlaceId || ageOn(voter, date) < 18) continue;
    countedEligible += 1;
    const lean = personLean(api.state.people, voter, townLean(api));
    const appeal: Record<string, { total: number }> = {};
    for (const f of filings) {
      const party = candidateFacts(api, f, contest).party;
      appeal[f.personId] = { total: party ? lean * partySide(party) : 0 };
    }
    const t = turnout(api, voter, appeal, voter.weeklyMinutes);
    if (!t.votes) continue;
    countedVoted += 1;
    const ranked = Object.entries(appeal).sort(
      (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]),
    );
    const separates =
      ranked.length === 1
        ? ranked[0]![1].total > 0
        : ranked.length > 1 && ranked[0]![1].total > ranked[1]![1].total;
    const choice = separates ? ranked[0]![0] : null;
    if (choice) countedVotes[choice] = (countedVotes[choice] ?? 0) + 1;
    byLean.push({ lean, heard: new Set(), choice });
  }
  const { groupVotes, electorate } = groupVote(
    api,
    contest,
    filings,
    named.length + countedEligible,
    voted + countedVoted,
    byLean,
  );
  const totals: Record<string, number> = {};
  for (const f of filings)
    totals[f.personId] =
      (namedVotes[f.personId] ?? 0) +
      (countedVotes[f.personId] ?? 0) +
      (groupVotes[f.personId] ?? 0);
  const ranked = Object.entries(totals).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const winnerId = ranked.length ? ranked[0]![0] : null;
  const incumbent = contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  const takesOffice =
    incumbent?.endDate ??
    `${Number(contest.electionDate.slice(0, 4)) + 1}-01-01`;
  const result: ResultRow = {
    id: `result:${contestId}`,
    contestId,
    date,
    namedVotes,
    countedVotes,
    countedTurnout: countedVoted,
    countedEligible,
    groupVotes,
    totals,
    namedTurnout: voted,
    namedEligible: named.length,
    electorate,
    winnerId,
    takesOffice: winnerId ? takesOffice : null,
    exitPoll,
  };
  table(api, "results").put(result as unknown as ModuleRow);
  api.emit({
    id: `election-result:${contestId}`,
    date,
    kind: "election-result",
    personIds: filings
      .map((f) => f.personId)
      .filter((id) => api.state.people.has(id)),
    placeId: townPlaceId,
    source: { tag: "SOURCED", citation: `Count of ${contestId}`, asOf: date },
    publicRecord: true,
    news: true,
    facts: {
      contestId,
      office: contest.title,
      winnerId: winnerId ?? "",
      totals: JSON.stringify(totals),
    },
  });
  // The presidency is won in the electoral college (world-races.ts); this
  // count is the town's state's popular vote.
  if (contest.officeId === "office:US:president") return result;
  if (winnerId && takesOffice > date)
    api.moduleCalendar(VOTING_MODULE_ID).schedule({
      key: `take-office:${contestId}`,
      date: takesOffice,
      kind: "take-office",
      source: {
        tag: "SOURCED",
        citation: `Result of ${contestId}`,
        asOf: date,
      },
      sourceRecordIds: [result.id],
    });
  else if (winnerId) takeOffice(api, result.id);
  return result;
}

const districtVotes = new Map(
  (
    calibration as unknown as {
      house: { districtGeoid: string; totalVotes: number }[];
    }
  ).house.map((h) => [h.districtGeoid, h.totalVotes]),
);
const stateVotes = new Map(
  (
    calibration as unknown as {
      presidentialByState: { stateUsps: string; totalVotes: number }[];
    }
  ).presidentialByState.map((s) => [s.stateUsps, s.totalVotes]),
);

/** How many votes the race's whole electorate cast in 2024, where read. */
function electorateSize(
  api: CoreAPI,
  contest: ContestRow,
  namedCount: number,
): number {
  const { stateKey, geoid } = town(api);
  const usps = stateKey.slice(3);
  const seats = api
    .moduleState(OFFICES_MODULE_ID)
    .table("seats")
    .query("byOffice", [contest.officeId]) as unknown as SeatInput[];
  const state = stateVotes.get(usps) ?? null;
  if (contest.family === "usHouse") {
    const district = townDistrict(geoid, usps, "congressional", api.state.date);
    return (
      (district && districtVotes.get(district.geoid)) ??
      (state ? state / Math.max(1, seats.length) : namedCount)
    );
  }
  if (contest.family === "statewideExecutive") return state ?? namedCount;
  if (contest.family === "stateLegislative") {
    const districts = new Set(seats.map((s) => s.district)).size;
    return state ? Math.round(state / Math.max(1, districts)) : namedCount;
  }
  // stopgapId: SG-GOV-voter-groups-stand-in
  api.stopgap("SG-GOV-voter-groups-stand-in");
  const population = Number(api.state.placeMetadata.referencePopulation);
  return Number.isFinite(population) && population > 0
    ? Math.round(
        population * campaignParameter("localElectorateShareOfPopulation"),
      )
    : namedCount;
}

/** The Republican two-party share of the race's whole electorate in 2024, where read. */
function electorateRightShare(
  api: CoreAPI,
  contest: ContestRow,
): number | null {
  const { stateKey, geoid } = town(api);
  const usps = stateKey.slice(3);
  if (contest.family === "statewideExecutive") {
    const d = stateShares.get(usps);
    return d == null ? null : 1 - d;
  }
  if (contest.family === "usHouse") {
    const district = townDistrict(geoid, usps, "congressional", api.state.date);
    // An at-large seat (no district row) is the whole state.
    const d =
      (district ? districtShares.get(district.geoid) : undefined) ??
      stateShares.get(usps);
    return d == null ? null : 1 - d;
  }
  return null;
}

const stateShares = new Map(
  (
    calibration as unknown as {
      presidentialByState: {
        stateUsps: string;
        democraticTwoPartyShare: number | null;
      }[];
    }
  ).presidentialByState.map((s) => [s.stateUsps, s.democraticTwoPartyShare]),
);
const districtShares = new Map(
  (
    calibration as unknown as {
      house: {
        districtGeoid: string;
        democraticTwoPartyShare: number | null;
      }[];
    }
  ).house.map((h) => [h.districtGeoid, h.democraticTwoPartyShare]),
);

/**
 * The electorate the world doesn't name votes as groups: lean bands around the
 * town's lean, each sized from the electorate, turning out at the named
 * people's rate, and voting for the candidate their band's named people chose
 * most (a band with no named voters goes to the candidate whose platform and
 * party sit closest).
 */
function groupVote(
  api: CoreAPI,
  contest: ContestRow,
  filings: readonly FilingRow[],
  namedEligible: number,
  namedVoted: number,
  byLean: readonly {
    lean: number;
    heard: Set<string>;
    choice: string | null;
  }[],
) {
  const electorate = Math.max(
    namedVoted,
    electorateSize(api, contest, namedVoted),
  );
  const unnamed = Math.max(0, electorate - namedVoted);
  const groupVotes: Record<string, number> = {};
  if (!filings.length || unnamed === 0) return { groupVotes, electorate };
  const bands = campaignParameter("voterGroupBands");
  for (let b = 0; b < bands; b += 1) {
    const lo = -1 + (2 * b) / bands;
    const hi = -1 + (2 * (b + 1)) / bands;
    const mid = (lo + hi) / 2;
    const inBand = byLean.filter(
      (v) => v.lean >= lo && (v.lean < hi || b === bands - 1),
    );
    // The band's share of the electorate: of the race's whole electorate,
    // spread evenly around its real 2024 lean where read (a state, a House
    // district), else the named people's share.
    const right = electorateRightShare(api, contest);
    const share =
      right !== null
        ? // The edge bands hold everyone past either end of the scale.
          Math.max(
            0,
            Math.min(b === bands - 1 ? Infinity : hi, 2 * right) -
              Math.max(b === 0 ? -Infinity : lo, 2 * right - 2),
          ) / 2
        : byLean.length
          ? inBand.length / byLean.length
          : 1 / bands;
    const votes = Math.round(unnamed * share);
    if (!votes) continue;
    // The group splits the way its named people chose.
    const counts = new Map<string, number>();
    for (const v of inBand)
      if (v.choice) counts.set(v.choice, (counts.get(v.choice) ?? 0) + 1);
    const chose = [...counts.values()].reduce((sum, n) => sum + n, 0);
    if (chose) {
      for (const [id, n] of counts)
        groupVotes[id] =
          (groupVotes[id] ?? 0) + Math.round((votes * n) / chose);
      continue;
    }
    // A band none of the town's voters fall in never heard a platform: it
    // goes by the party on the ballot, and leaves a nonpartisan race blank.
    const closest = filings
      .map((f) => {
        const facts = candidateFacts(api, f, contest);
        return {
          id: f.personId,
          score: mid * partySide(facts.party),
        };
      })
      .sort((x, y) => y.score - x.score || x.id.localeCompare(y.id));
    if (closest.length > 1 && closest[0]!.score === closest[1]!.score) continue;
    groupVotes[closest[0]!.id] = (groupVotes[closest[0]!.id] ?? 0) + votes;
  }
  void namedEligible;
  return { groupVotes, electorate };
}

/** The winner takes the seat on the term's first day; the incumbent's term ends. */
function takeOffice(api: CoreAPI, resultId: string): void {
  const result = table(api, "results").get(resultId) as unknown as ResultRow;
  if (!result?.winnerId) return;
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(result.contestId) as unknown as ContestRow;
  const terms = api.moduleState(OFFICES_MODULE_ID).table("terms");
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(contest.officeId) as unknown as { termYears: number | null };
  for (const term of terms.query("bySeatStatus", [
    contest.seatId,
    "serving",
  ]) as unknown as TermRow[])
    terms.put({
      ...term,
      status: "ended",
      endDate: api.state.date,
      endEstimated: false,
      endedBy: "term ended",
    } as unknown as ModuleRow);
  const winner = api.state.people.get(result.winnerId);
  const filing = ballot(api, contest.id).find(
    (f) => f.personId === result.winnerId,
  );
  const previous = contest.incumbentTermId
    ? (terms.get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  // A named official who isn't a full person yet keeps (or gets) an identity.
  const identity = winner
    ? {
        givenName: winner.givenName,
        familyName: winner.familyName,
        gender: "recorded",
        birthDate: winner.birthDate,
        homeState: town(api).stateKey,
      }
    : previous &&
        result.winnerId === officialCandidateId(contest.incumbentTermId!)
      ? previous.identity
      : officialIdentity(api, contest, result.winnerId);
  terms.put({
    id: `term:${contest.seatId}:${api.state.date}:elected`,
    seatId: contest.seatId,
    officeId: contest.officeId,
    personId: winner ? winner.id : null,
    identity,
    party: filing?.party ?? null,
    startDate: api.state.date,
    endDate: office.termYears
      ? `${Number(api.state.date.slice(0, 4)) + office.termYears}${api.state.date.slice(4)}`
      : null,
    endEstimated: false,
    reached: `elected ${contest.electionDate}`,
    status: "serving",
  } as unknown as ModuleRow);
  api.emit({
    id: `took-office:${contest.seatId}:${api.state.date}`,
    date: api.state.date,
    kind: "took-office",
    personIds: winner ? [winner.id] : [],
    placeId: town(api).townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Result of ${contest.id}`,
      asOf: api.state.date,
    },
    publicRecord: true,
    news: true,
    facts: {
      office: contest.title,
      seatId: contest.seatId,
      winnerId: result.winnerId,
    },
  });
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

/** Why one named voter voted as they did. */
export function ballotOf(
  api: CoreAPI,
  contestId: string,
  voterId: string,
): BallotRow | null {
  return (
    (table(api, "ballots").get(`ballot:${contestId}:${voterId}`) as unknown as
      BallotRow | undefined) ?? null
  );
}

export function resultOf(api: CoreAPI, contestId: string): ResultRow | null {
  return (
    (table(api, "results").get(`result:${contestId}`) as unknown as
      ResultRow | undefined) ?? null
  );
}

export { campaignFor };

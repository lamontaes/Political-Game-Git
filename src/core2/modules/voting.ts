/**
 * Elections, part two: election day, the count and taking office (golden path
 * steps 5 and 11).
 *
 * On a contest's election day, every named adult who lives where the seat is
 * elected decides whether to vote, from their own circumstances, and whom to
 * vote for, from what they know and think: their warmth toward each candidate
 * they've heard of (recorded causes), how far each known platform sits from
 * their own views, the candidates' parties and each incumbent's record. The
 * town's counted residents vote from their own records on the one engine for
 * everyone the world doesn't name (`electorate.ts`), each ballot kept with
 * its reasons; the rest of the race's electorate (the rest of the town, the
 * county, district or state) is counted on that same engine at a coarser
 * level (`electorate-places.ts`). Nothing is rolled. The winner takes the
 * seat on the term's start date. Exit polls ask named voters leaving the
 * polls and report what they said.
 */
import federalExecutive from "../../../data/research/offices/federal-executive-2026.json" with { type: "json" };
import {
  NATIONAL_ENGAGEMENT,
  countPlaces,
  countedAppeal,
  countedChoice,
  countedResidents,
  customPolitics,
  engagementOf,
  type CountedAppeal,
  type CountedFieldEntry,
  type CountedVoter,
  type PlaceResult,
  type RacePlace,
  type SampleVoter,
} from "../electorate";
import { electionLawTurnoutCost } from "../law-reach/group-a-voting";
import ties from "../../../data/research/elections/tie-rules-2026.json" with { type: "json" };
import { coreAPI, registerModule } from "../state";
import { decisionLean } from "../trait-decisions";
import { parameter } from "../parameters";
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
  openNextContest,
  specialContestFor,
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
import {
  OFFICES_MODULE_ID,
  registerSpecialElections,
  vacancyFilled,
  type TermRow,
} from "./offices";
import { officialCandidate } from "./officials";
import type { SeatInput } from "../offices-state";
import type { OfficeInput } from "../offices-local";
import { termEndAfter, termStartAfter } from "../elections-calendar";
import { drawOfficialIdentity } from "../officials-identity";
export { candidateIdentity } from "../candidate-identity";
import { partiesHere, partyTie } from "./parties";
import { recordAppeal, type RecordReason } from "./record";
import { decisionOf } from "./candidacy";
import { VIEWS_DATA, VIEWS_MODULE_ID, viewOf } from "./views";
import {
  citizenShareOf,
  countyPlaceIdOf,
  cpsAgeBand,
  housePlaceByGeoid,
  legislativePlace,
  statePlaces,
  type ElectoratePlace,
} from "../electorate-places";
import {
  appealOfShare,
  candidateInputs,
  candidateReasons,
  electorateChange,
  raceConditions,
  rememberOpeningElectorate,
  type CandidateReasons,
} from "../electorate-inputs";

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
        /** The candidate's party side against the voter's own views. */
        readonly party: number;
        /** The pull of the voter's own party tie. */
        readonly partyTie?: number;
        readonly record: number;
        /** How they stand with the candidate personally, where they know them. */
        readonly relationship?: number;
      }
    >
  >;
  /**
   * What the choice rested on: the platforms the voter heard, or only what
   * the ballot and the town tell them (party, name, incumbency).
   */
  readonly basis?: "platform" | "party-name-incumbency";
  /** The voter's own left-right position the ballot weighed, -1 to 1. */
  readonly lean?: number;
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
  /** The counted votes by CPS age band (`residents:<place>:<age band>`), read from their ballots. */
  readonly countedByGroup?: Readonly<
    Record<string, Readonly<Record<string, number>>>
  >;
  readonly countedTurnout: number;
  readonly countedEligible: number;
  /** Votes the rest of the race's electorate cast, counted coarsely place by place. */
  readonly placeVotes: Readonly<Record<string, number>>;
  readonly totals: Readonly<Record<string, number>>;
  readonly namedTurnout: number;
  readonly namedEligible: number;
  readonly electorate: number;
  readonly winnerId: string | null;
  readonly takesOffice: string | null;
  readonly exitPoll: Readonly<Record<string, number>>;
  /** Each candidate's public standing, where the race weighs it (a partisan state or federal race). */
  readonly electorateReasons?: readonly CandidateReasons[];
  /** Ballots the rest of the race's electorate cast. */
  readonly placesCast?: number;
}

/** One counted resident's ballot, with its reasons. */
export interface CountedBallotRow {
  readonly id: string;
  readonly contestId: string;
  readonly voterId: string;
  readonly date: string;
  readonly counted: true;
  readonly voted: boolean;
  readonly turnoutReasons: {
    readonly duty: number;
    readonly interest: number;
    readonly cost: number;
  };
  readonly choice: string | null;
  readonly appeal: Readonly<Record<string, CountedAppeal>>;
  readonly basis: "party-name-incumbency";
  readonly lean: number;
}

export const VOTING_MODULE: CoreModule = {
  id: VOTING_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      chosen: {},
      ballots: {
        indexes: {
          byContest: { fields: ["contestId"] },
          byVoter: { fields: ["voterId"] },
        },
      },
      /** Each counted resident's ballot, with its reasons. */
      countedBallots: {
        indexes: {
          byContest: { fields: ["contestId"] },
          byVoter: { fields: ["voterId"] },
        },
      },
      results: { indexes: { byContest: { fields: ["contestId"] } } },
      /** Each place's votes in a contest, counted coarsely. */
      places: { indexes: { byContest: { fields: ["contestId"] } } },
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
  rememberOpeningElectorate(api);
  // A vacancy's special election runs as a real race.
  registerSpecialElections((a, race) => {
    if (!a.state.modules.has(VOTING_MODULE_ID)) return false;
    const contest = specialContestFor(a, race);
    if (contest) scheduleContest(a, contest);
    return contest !== null;
  });
  for (const contest of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[])
    scheduleContest(api, contest);
}

/** Put a contest's filing close, primary and election day on the calendar. */
function scheduleContest(api: CoreAPI, contest: ContestRow): void {
  const date = api.state.date;
  const calendar = api.moduleCalendar(VOTING_MODULE_ID);
  if (contest.electionDate <= date) return;
  const source = {
    tag: "SOURCED" as const,
    citation: contest.sources.join(" ; ") || "election calendar",
    asOf: date,
  };
  if (contest.filingDeadline > date)
    calendar.schedule({
      key: `filing-closes:${contest.id}`,
      date: contest.filingDeadline,
      kind: "filing-closes",
      source,
      sourceRecordIds: [contest.id],
    });
  else fileStandingCandidates(api, contest.id);
  if (contest.primaryDate && contest.primaryDate > date)
    calendar.schedule({
      key: `primary:${contest.id}`,
      date: contest.primaryDate,
      kind: "primary",
      source,
      sourceRecordIds: [contest.id],
    });
  calendar.schedule({
    key: `election:${contest.id}`,
    date: contest.electionDate,
    kind: "election-day",
    source:
      contest.basis === "read"
        ? source
        : { ...source, tag: "ESTIMATED", estimatedFrom: source.citation },
    sourceRecordIds: [contest.id],
  });
}

/** Once a seat's contest is decided, its next cycle's contest opens. */
export function openNextCycle(api: CoreAPI, seatId: string): void {
  const next = openNextContest(api, seatId);
  if (next) scheduleContest(api, next);
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
  // Read once a day: the counted electorate asks it once per voter.
  const held = townLeans.get(api.state);
  if (held?.date === api.state.date) return held.lean;
  const lean = (
    api
      .moduleState(CAMPAIGNS_MODULE_ID)
      .table("town")
      .get("town") as unknown as { lean: number }
  ).lean;
  townLeans.set(api.state, { date: api.state.date, lean });
  return lean;
}
const townLeans = new WeakMap<object, { date: string; lean: number }>();

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
 * A full person's own left-right position, -1 to 1: their recorded views
 * (the views engine's lean, -2 very liberal to +2 very conservative, scaled);
 * someone the views engine doesn't hold yet stands where their record ranks
 * them in town (`personLean`).
 */
export function voterLean(api: CoreAPI, voter: Readonly<PersonState>): number {
  if (api.state.modules.has(VIEWS_MODULE_ID)) {
    const view = viewOf(api, voter.id);
    if (view) return view.lean / VIEWS_DATA.parameters.leanMax!.value;
  }
  return personLean(api.state.people, voter, townLean(api));
}

/** How a voter stands with a candidate they know personally, -1 to 1. */
function relationshipWith(
  api: CoreAPI,
  voter: Readonly<PersonState>,
  candidateId: string,
): number {
  if (!voter.knownIds.has(candidateId)) return 0;
  let level = 0;
  for (const id of api.state.relationshipsByPerson.get(voter.id) ?? []) {
    const row = api.state.relationships.get(id);
    if (row && (row.otherId === candidateId || row.actorId === candidateId))
      level = Math.max(-1, Math.min(1, row.level));
  }
  return level;
}

/**
 * One named voter's appeal for each candidate: warmth from what reached them,
 * agreement with the platform they know (from their own views), party (in a
 * partisan race, the side of their own views, plus their party tie as one
 * influence), how they stand with a candidate they know personally, and an
 * incumbent's record.
 */
function appealFor(
  api: CoreAPI,
  voter: Readonly<PersonState>,
  contest: ContestRow,
  filings: readonly FilingRow[],
) {
  const lean = voterLean(api, voter);
  let heardPlatform = false;
  const recordReasons: Record<string, readonly RecordReason[]> = {};
  const appeal: Record<
    string,
    {
      total: number;
      warmth: number;
      agreement: number | null;
      party: number;
      partyTie: number;
      relationship: number;
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
    if (agreement !== null) heardPlatform = true;
    const tie = partyTie(api, voter.id);
    const loyal =
      tie?.partyId && facts.party && tie.partyId.endsWith(slug(facts.party))
        ? campaignParameter("partyLoyaltyWeight")
        : 0;
    // The candidate's party side against the voter's own views; their party
    // tie is one influence beside it, kept apart in the record.
    const party = facts.party ? lean * partySide(facts.party) : 0;
    // The incumbent's side of a voter's traits: stay with the known or try
    // someone new.
    const trait = facts.isIncumbent
      ? parameter("traitDecisionWeight") *
        decisionLean(
          api.state,
          voter,
          "voting.back-incumbent",
          "incumbent",
          "challenger",
        )
      : 0;
    // The incumbent's record (votes, promises kept or broken), weighed by a
    // voter who knows the officeholder (golden path step 11).
    const knows =
      voter.knownIds.has(filing.personId) || (impression?.heardOf ?? false);
    const weighed = facts.isIncumbent
      ? recordAppeal(api, voter, filing.personId, lean, knows)
      : { total: 0, reasons: [] };
    const record = weighed.total;
    recordReasons[filing.personId] = weighed.reasons;
    const relationship =
      campaignParameter("ballotRelationshipWeight") *
      relationshipWith(api, voter, filing.personId);
    appeal[filing.personId] = {
      total:
        warmth +
        (agreement ?? 0) +
        party +
        loyal +
        record +
        relationship +
        trait,
      warmth,
      agreement,
      party,
      partyTie: loyal,
      record,
      relationship,
    };
  }
  const basis: "platform" | "party-name-incumbency" = heardPlatform
    ? "platform"
    : "party-name-incumbency";
  return { appeal, lean, recordReasons, basis };
}

const countedFields = new WeakMap<
  object,
  Map<string, readonly CountedFieldEntry[]>
>();

/**
 * What a counted voter can know of each candidate on a contest's ballot: the
 * party label; the candidate's public standing where the race weighs one (a
 * partisan state or federal race), else the incumbent's name; and how well
 * known each candidate is in town, for the town's own people.
 */
function countedField(
  api: CoreAPI,
  contest: ContestRow,
  field: readonly FilingRow[],
): readonly CountedFieldEntry[] {
  const byKey = countedFields.get(api.state) ?? new Map();
  countedFields.set(api.state, byKey);
  const key = `${api.state.date}|${contest.id}|${field.map((f) => f.id).join(",")}`;
  const hit = byKey.get(key);
  if (hit) return hit;
  const { townPlaceId } = town(api);
  const date = api.state.date;
  const named = [...api.state.people.values()].filter(
    (p) => p.alive && p.placeId === townPlaceId && ageOn(p, date) >= 18,
  );
  const reasons = publicReasons(api, contest, field);
  const rows = field.map((f) => {
    const facts = candidateFacts(api, f, contest);
    const heard = named.filter(
      (p) =>
        p.id === f.personId ||
        p.knownIds.has(f.personId) ||
        (impressionOf(api, p.id, f.personId)?.heardOf ?? false),
    ).length;
    const standing = reasons?.find((r) => r.id === f.personId);
    return {
      id: f.personId,
      side: partySide(facts.party),
      isIncumbent: facts.isIncumbent,
      standing: standing
        ? appealOfShare(standing.total)
        : facts.isIncumbent
          ? campaignParameter("incumbentRecognition")
          : 0,
      localStanding: standing ? appealOfShare(standing.local) : 0,
      recognition: named.length ? heard / named.length : 0,
      platform: facts.platform,
    };
  });
  byKey.set(key, rows);
  return rows;
}

/** The incumbent's side of a voter's traits: stay with the known or try someone new. */
function incumbentLeanOf(
  api: CoreAPI,
  voter: Readonly<Pick<PersonState, "id" | "traits">>,
): number {
  return (
    parameter("traitDecisionWeight") *
    decisionLean(
      api.state,
      voter,
      "voting.back-incumbent",
      "incumbent",
      "challenger",
    )
  );
}

/** Whether a named adult votes: their sense of duty and interest in this race against what it costs them that day. */
export function turnout(
  api: CoreAPI,
  voter: Readonly<Pick<PersonState, "id" | "traits">>,
  appeal: Record<string, { total: number }>,
  /** A counted resident's scheduled weekly work, from their record. */
  recordedWeeklyMinutes?: number,
  /** What this election adds to the cost of voting (a primary's lower salience). */
  extraCost = 0,
) {
  // Their own sense of duty and reliability, with every trait's lean between
  // voting and staying home as one input beside them, and how closely they
  // follow politics, where PEOPLE's views engine runs (younger people follow
  // less: CES 2024).
  const engagement = engagementOf(api.state as CoreState, voter);
  const duty =
    (voter.traits["personality-v1:facet-duty-bound"] ?? 0) +
    (voter.traits["people-mind-v1:reliability"] ?? 0) / 2 +
    parameter("traitDecisionWeight") *
      decisionLean(api.state, voter, "voting.turnout", "vote", "stay-home") +
    (engagement === null
      ? 0
      : campaignParameter("turnoutEngagementWeight") *
        (engagement - NATIONAL_ENGAGEMENT));
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
  // The election laws in force (voter ID, registration, mail voting).
  // A custom world's turnout setting makes voting easier or harder for all.
  const cost =
    (weeklyWork / campaignParameter("turnoutWorkWeekMinutes") +
      electionLawTurnoutCost(api, voter, weeklyWork)) /
    customPolitics(state).turnout;
  return {
    duty,
    interest,
    cost,
    votes:
      duty + interest + campaignParameter("turnoutBase") > cost + extraCost,
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
  // Whoever holds the seat when filing closes stands as its incumbent: an
  // appointee to a vacancy, never a holder who died or moved away.
  const incumbent =
    (api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [contest.seatId, "serving"])[0] as unknown as
      TermRow | undefined) ??
    (contest.incumbentTermId
      ? (api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .get(contest.incumbentTermId) as unknown as TermRow | undefined)
      : undefined);
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
      status: "on-ballot",
    } as unknown as ModuleRow);
  };
  const alive =
    incumbent &&
    incumbent.status === "serving" &&
    (!incumbent.personId || api.state.people.get(incumbent.personId)?.alive);
  // An incumbent who weighed running (candidacy, PW-3) already filed or
  // chose to stay out; the stand-in files only those who never weighed it.
  const weighed = incumbent?.personId
    ? decisionOf(api, contestId, incumbent.personId)
    : null;
  const incumbentPerson = incumbent?.personId
    ? api.state.people.get(incumbent.personId)
    : undefined;
  // A full person stands from their own traits; a placeholder incumbent
  // keeps the standing rule.
  const stands =
    !incumbentPerson ||
    campaignParameter("votingStandAgainBase") +
      decisionLean(
        api.state,
        incumbentPerson,
        "voting.stand-again",
        "stand",
        "retire",
      ) >
      0;
  if (
    incumbent &&
    alive &&
    !weighed &&
    stands &&
    !termLimited(api, contest, incumbent)
  )
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
    // Only where no one from the other major party filed (the player, a
    // resident): a filed candidate is that party's challenger.
    if (
      !onBallot.some(
        (f) =>
          f.status === "on-ballot" &&
          partySide(f.party ?? null) === -partySide(incumbent.party),
      )
    )
      put(
        officialCandidate(api, contest, other) ??
          officialCandidateId(`challenger:${contest.id}`),
        other,
        "challenger",
      );
    // An open seat: the incumbent's party nominates someone new.
    if (termLimited(api, contest, incumbent))
      put(
        officialCandidate(api, contest, incumbent.party!) ??
          officialCandidateId(`nominee:${contest.id}`),
        incumbent.party,
        "nominee for an open seat",
      );
  }
  // A partisan state or federal seat with no one holding it (a special
  // election's vacancy): each major party with no filed candidate nominates.
  const seatParty = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("seats")
      .get(contest.seatId) as unknown as { party?: string | null } | undefined
  )?.party;
  if (
    (contest.level === "federal" || contest.level === "state") &&
    !(incumbent && alive) &&
    seatParty
  )
    for (const party of ["Democratic", "Republican"])
      if (
        !ballot(api, contestId).some(
          (f) =>
            f.status === "on-ballot" &&
            partySide(f.party ?? null) === partySide(party),
        )
      )
        put(
          officialCandidate(api, contest, party) ??
            officialCandidateId(`nominee:${party}:${contest.id}`),
          party,
          "nominee for an open seat",
        );
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
  const lean0 = townLean(api);
  const named = [...api.state.people.values()]
    .filter((p) => p.alive && p.placeId === townPlaceId && ageOn(p, date) >= 18)
    .sort((a, b) => a.id.localeCompare(b.id));
  const counted = countedResidents(api.state as CoreState).filter(
    (v) => v.placeId === townPlaceId && ageOn(v, date) >= 18,
  );
  // Who identifies with a party: the firmest leans in town, at the real
  // identifier share (the same rule the parties engine ties named people by).
  const leanOf = new Map<string, number>(
    [...named, ...counted].map((v) => [
      v.id,
      personLean(api.state.people, v, lean0),
    ]),
  );
  const firm = [...leanOf.values()].map(Math.abs).sort((a, b) => b - a);
  const cut =
    firm[
      Math.max(
        0,
        Math.round(firm.length * campaignParameter("partyIdentifierShare")) - 1,
      )
    ] ?? 0;
  const extraCost = campaignParameter("primaryTurnoutCost");
  const votes: Record<string, number> = {};
  let townVoted = 0;
  // Named voters: what reached them, as on election day.
  const countNamed = (
    field: readonly FilingRow[],
    who: readonly PersonState[],
  ) => {
    for (const voter of who) {
      const { appeal } = appealFor(api, voter, contest, field);
      const t = turnout(api, voter, appeal, undefined, extraCost);
      if (!t.votes) continue;
      townVoted += 1;
      const ranked = Object.entries(appeal).sort(
        (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]),
      );
      if (ranked.length > 1 && ranked[0]![1].total === ranked[1]![1].total)
        continue;
      if (ranked[0]) votes[ranked[0][0]] = (votes[ranked[0][0]] ?? 0) + 1;
    }
  };
  // Counted voters: no campaign reached them; the ballot names the
  // incumbent, and with no incumbent in the field they leave it blank.
  const primaryField = (field: readonly FilingRow[]): CountedFieldEntry[] =>
    field.map((f) => {
      const incumbent = candidateFacts(api, f, contest).isIncumbent;
      return {
        id: f.personId,
        side: 0,
        isIncumbent: incumbent,
        standing: incumbent ? campaignParameter("incumbentRecognition") : 0,
        localStanding: 0,
        recognition: 0,
        platform: [],
      };
    });
  const countCounted = (
    field: readonly FilingRow[],
    who: readonly CountedVoter[],
  ) => {
    const entries = primaryField(field);
    for (const voter of who) {
      const appeal = countedAppeal(leanOf.get(voter.id) ?? 0, entries, {
        inTown: false,
        local: false,
        incumbentLean: incumbentLeanOf(api, voter),
      });
      const t = turnout(api, voter, appeal, voter.weeklyMinutes, extraCost);
      if (!t.votes) continue;
      townVoted += 1;
      const choice = countedChoice(appeal);
      if (choice) votes[choice] = (votes[choice] ?? 0) + 1;
    }
  };
  // The primary's wider electorate (the rest of the town, county, district
  // or state) on the same engine: its places' party identifiers (and others
  // where the primary is open) at primary turnout.
  const townEligible = { named: named.length, counted: counted.length };
  const addWider = (field: readonly FilingRow[], side: number | null) => {
    const places = racePlaces(api, contest, filings, townEligible);
    if (!places.length) return;
    const wider = countPlaces(
      electorateSample(api, date, extraCost),
      places,
      primaryField(field),
      {
        side,
        cut,
        open: side === null || /open|unaffiliated|independ/i.test(access),
      },
    );
    for (const [id, n] of Object.entries(wider.votes))
      votes[id] = (votes[id] ?? 0) + n;
  };
  const lose = (filing: FilingRow) =>
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .put({ ...filing, status: "withdrawn" } as unknown as ModuleRow);
  const advancing = method === "top-two" ? 2 : method === "top-four" ? 4 : 0;
  if (advancing) {
    countNamed(filings, named);
    countCounted(filings, counted);
    addWider(filings, null);
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
      const side = partySide(party);
      countNamed(
        field,
        named.filter((v) => {
          const tie = partyTie(api, v.id);
          return (
            (tie?.partyId?.endsWith(slug(party)) ?? false) ||
            (open && tie?.tie !== "party")
          );
        }),
      );
      countCounted(
        field,
        counted.filter((v) => {
          const lean = leanOf.get(v.id) ?? 0;
          const identifies = Math.abs(lean) >= cut && lean !== 0;
          return (
            (identifies && side !== 0 && Math.sign(lean) === side) ||
            (open && !identifies)
          );
        }),
      );
      addWider(field, side);
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

const polls = new WeakMap<object, Map<string, ReturnType<typeof turnout>>>();

/**
 * Whether a voter goes to the polls on an election day: once for the whole
 * ballot, drawn by the race they feel most strongly about (a voter who turns
 * out for governor also sees the county races; with no preference in one,
 * they leave it blank).
 */
function atThePolls(
  api: CoreAPI,
  voter: Readonly<Pick<PersonState, "id" | "traits">> & {
    readonly birthDate: string;
  },
  date: string,
  cycleCost: number,
  recordedWeeklyMinutes?: number,
): ReturnType<typeof turnout> {
  const map = polls.get(api.state) ?? new Map();
  polls.set(api.state, map);
  const key = `${date}|${voter.id}`;
  const hit = map.get(key);
  if (hit) return hit;
  const named = api.state.people.get(voter.id);
  const lean = personLean(api.state.people, voter, townLean(api));
  let strongest = 0;
  for (const contest of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[]) {
    if (contest.electionDate !== date) continue;
    const field = ballot(api, contest.id);
    if (!field.length) continue;
    const totals = Object.values(
      named
        ? appealFor(api, named, contest, field).appeal
        : countedAppeal(lean, countedField(api, contest, field), {
            inTown: true,
            local: true,
            incumbentLean: 0,
          }),
    ).map((a) => a.total);
    for (const total of totals)
      strongest = Math.max(strongest, Math.abs(total));
  }
  const t = turnout(
    api,
    voter,
    { strongest: { total: strongest } },
    recordedWeeklyMinutes,
    cycleCost,
  );
  map.set(key, t);
  return t;
}

const tieRules = (
  ties as unknown as {
    states: Record<string, Record<string, { method: string; detail?: string }>>;
  }
).states;

/**
 * An exact tie, settled the way the state's law says
 * (`data/research/elections/tie-rules-2026.json`): by lot, by a second
 * election between the tied candidates, or by the legislature (statewide
 * offices) or local governing body choosing, each member for their own
 * reasons. Returns the winner, or null when a second election will decide.
 */
export function breakElectionTie(
  api: CoreAPI,
  contest: ContestRow,
  tied: readonly string[],
): string | null {
  const field =
    contest.family === "statewideExecutive"
      ? "statewideExecutiveTie"
      : contest.family === "stateLegislative"
        ? "legislativeTie"
        : contest.family === "countyOffice" ||
            contest.family === "municipalOffice"
          ? "localTie"
          : "generalElectionTie";
  const rule = tieRules[town(api).stateKey]?.[field]?.method ?? "lot";
  const sorted = [...tied].sort();
  if (rule === "new-election" || rule === "runoff") {
    secondElection(api, contest, sorted);
    return null;
  }
  if (rule === "legislature-decides" || rule === "board-decides") {
    const body = (
      api.moduleState(OFFICES_MODULE_ID).table("offices").rows() as unknown as {
        id: string;
        kind: string;
      }[]
    ).find((o) =>
      rule === "legislature-decides"
        ? o.kind.startsWith("legislature-")
        : o.kind === "council" || o.kind === "county-board",
    );
    const terms = body
      ? (
          api
            .moduleState(OFFICES_MODULE_ID)
            .table("seats")
            .query("byOffice", [body.id]) as unknown as { id: string }[]
        ).flatMap(
          (seat) =>
            api
              .moduleState(OFFICES_MODULE_ID)
              .table("terms")
              .query("bySeatStatus", [
                seat.id,
                "serving",
              ]) as unknown as TermRow[],
        )
      : [];
    // Each member backs the tied candidate whose party sits on their side.
    const filings = ballot(api, contest.id);
    const tally = new Map<string, number>();
    for (const term of terms) {
      const side = partySide(term.party);
      const pick = sorted.find(
        (id) =>
          partySide(filings.find((f) => f.personId === id)?.party ?? null) ===
            side && side !== 0,
      );
      if (pick) tally.set(pick, (tally.get(pick) ?? 0) + 1);
    }
    const best = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    if (best.length && (best.length === 1 || best[0]![1] > best[1]![1]))
      return best[0]![0];
  }
  // By lot, where the law says so: the game holds a second election between
  // the tied candidates instead, since no draw decides an outcome (owner's
  // no-dice rule; the question is in gov.md): SG-GOV-tie-by-lot.
  // stopgapId: SG-GOV-tie-by-lot
  api.stopgap("SG-GOV-tie-by-lot");
  secondElection(api, contest, sorted);
  return null;
}

/** A second election between the tied candidates, a tunable number of weeks on. */
function secondElection(
  api: CoreAPI,
  contest: ContestRow,
  tied: readonly string[],
): void {
  const date = new Date(
    Date.parse(`${api.state.date}T00:00:00Z`) +
      campaignParameter("tieElectionDays") * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);
  const next: ContestRow = {
    ...contest,
    id: `${contest.id}:second`,
    electionDate: date,
    primaryDate: null,
    filingDeadline: api.state.date,
  };
  api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .put(next as unknown as ModuleRow);
  for (const f of ballot(api, contest.id).filter((f) =>
    tied.includes(f.personId),
  ))
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .put({
        ...f,
        id: `${f.id}:second`,
        contestId: next.id,
      } as unknown as ModuleRow);
  api.moduleCalendar(VOTING_MODULE_ID).schedule({
    key: `election:${next.id}`,
    date,
    kind: "election-day",
    source: {
      tag: "ESTIMATED",
      citation: "second election after a tie",
      asOf: api.state.date,
      estimatedFrom: "tieElectionDays",
    },
    sourceRecordIds: [next.id],
  });
}

/**
 * A named voter's own ballot in a race, cast before election day (the
 * player's): a candidate, or null to leave the race blank.
 */
export function castBallot(
  api: CoreAPI,
  voterId: string,
  contestId: string,
  candidateId: string | null,
): void {
  if (
    candidateId !== null &&
    !ballot(api, contestId).some((f) => f.personId === candidateId)
  )
    throw new Error(`${candidateId} isn't on the ballot for ${contestId}`);
  table(api, "chosen").put({
    id: `${contestId}|${voterId}`,
    candidateId,
  } as unknown as ModuleRow);
}

/** Count a contest: named ballots, then the wider electorate's groups. */
export function holdElection(api: CoreAPI, contestId: string): ResultRow {
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
  // A midterm or off-cycle election draws fewer voters (audit 2, item 5).
  const cycleCost = cycleTurnout(contest.electionDate).cost;
  const filings = ballot(api, contestId);
  const date = api.state.date;
  const { townPlaceId } = town(api);
  const named = [...api.state.people.values()]
    .filter((p) => p.alive && p.placeId === townPlaceId && ageOn(p, date) >= 18)
    .sort((a, b) => a.id.localeCompare(b.id));
  const namedVotes: Record<string, number> = {};
  const exitPoll: Record<string, number> = {};
  let voted = 0;
  for (const voter of named) {
    const { appeal, lean, recordReasons, basis } = appealFor(
      api,
      voter,
      contest,
      filings,
    );
    // A voter who chose their ballot (the player, by hand) votes as they
    // chose; with none chosen (a player skipping past election day), they
    // vote or stay home on their own reasons like everyone else.
    const chosen = table(api, "chosen").get(
      `${contestId}|${voter.id}`,
    ) as unknown as { candidateId: string | null } | undefined;
    const decided = atThePolls(api, voter, contest.electionDate, cycleCost);
    const t = chosen ? { ...decided, votes: true } : decided;
    const ranked = Object.entries(appeal).sort(
      (a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]),
    );
    // A voter with nothing that separates the leading candidates leaves this
    // race blank rather than picking by ballot order; a lone candidate they
    // are against, they leave blank too.
    const separates =
      ranked.length === 1
        ? ranked[0]![1].total >= 0
        : ranked.length > 1 && ranked[0]![1].total > ranked[1]![1].total;
    const choice = chosen
      ? chosen.candidateId
      : t.votes && separates
        ? ranked[0]![0]
        : null;
    const told = !t.votes
      ? null
      : choice === null
        ? "left-blank"
        : decisionLean(
              api.state,
              voter,
              "voting.exit-poll",
              "tell",
              "decline",
            ) < 0
          ? "declined"
          : choice;
    if (t.votes) {
      voted += 1;
      exitPoll[told!] = (exitPoll[told!] ?? 0) + 1;
    }
    if (choice) namedVotes[choice] = (namedVotes[choice] ?? 0) + 1;
    table(api, "ballots").put({
      id: `ballot:${contestId}:${voter.id}`,
      contestId,
      voterId: voter.id,
      date,
      voted: t.votes,
      turnoutReasons: { duty: t.duty, interest: t.interest, cost: t.cost },
      choice,
      appeal,
      basis,
      lean,
      toldPollster: told,
      recordReasons,
    } as unknown as ModuleRow);
  }
  // The counted residents vote from their own records: they see each
  // candidate's name and party on the ballot, each candidate's public
  // standing, and know what the town knows (the incumbent, who is well known
  // and for what), but no campaign reached them personally. With nothing to
  // separate the candidates, they leave the race blank. Each ballot is kept
  // with its reasons, like a named voter's.
  const countedVotes: Record<string, number> = {};
  const countedByGroup: Record<string, Record<string, number>> = {};
  let countedVoted = 0;
  let countedEligible = 0;
  const field = countedField(api, contest, filings);
  const countedBallots = table(api, "countedBallots");
  for (const voter of countedResidents(api.state as CoreState)) {
    if (voter.placeId !== townPlaceId) continue;
    const age = ageOn(voter, date);
    if (age < 18) continue;
    countedEligible += 1;
    const lean = personLean(api.state.people, voter, townLean(api));
    const appeal = countedAppeal(lean, field, {
      inTown: true,
      local: true,
      incumbentLean: incumbentLeanOf(api, voter),
    });
    const t = atThePolls(
      api,
      voter,
      contest.electionDate,
      cycleCost,
      voter.weeklyMinutes,
    );
    const choice = t.votes ? countedChoice(appeal) : null;
    countedBallots.put({
      id: `ballot:${contestId}:${voter.id}`,
      contestId,
      voterId: voter.id,
      date,
      counted: true,
      voted: t.votes,
      turnoutReasons: { duty: t.duty, interest: t.interest, cost: t.cost },
      choice,
      appeal,
      basis: "party-name-incumbency",
      lean,
    } as unknown as ModuleRow);
    if (!t.votes) continue;
    countedVoted += 1;
    if (choice) {
      countedVotes[choice] = (countedVotes[choice] ?? 0) + 1;
      const group = `residents:${voter.placeId}:${cpsAgeBand(age) ?? "adults"}`;
      const votes = (countedByGroup[group] ??= {});
      votes[choice] = (votes[choice] ?? 0) + 1;
    }
  }
  // Each counted resident stands for the town's people like them; those who
  // aren't citizens (the place's ACS share) and those barred for a felony
  // conviction (the share a restoration law in force returns is counted
  // back) can't vote.
  const scale = countedScale(api);
  for (const id of Object.keys(countedVotes))
    countedVotes[id] = Math.round(countedVotes[id]! * scale);
  for (const votes of Object.values(countedByGroup))
    for (const id of Object.keys(votes))
      votes[id] = Math.round(votes[id]! * scale);
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
      )
    : null;
  if (wider) recordPlaces(api, contestId, wider.places);
  const placeVotes = wider?.votes ?? {};
  const electorate = voted + countedVoted + (wider?.cast ?? 0);
  const reasons = publicReasons(api, contest, filings);
  const totals: Record<string, number> = {};
  for (const f of filings)
    totals[f.personId] =
      (namedVotes[f.personId] ?? 0) +
      (countedVotes[f.personId] ?? 0) +
      (placeVotes[f.personId] ?? 0);
  const ranked = Object.entries(totals).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  // No one wins on no votes: the seat stays with its holder (or vacant)
  // until the next contest.
  const tied =
    ranked.length > 1 && ranked[0]![1] > 0 && ranked[0]![1] === ranked[1]![1];
  const winnerId = tied
    ? breakElectionTie(
        api,
        contest,
        ranked.filter((r) => r[1] === ranked[0]![1]).map((r) => r[0]),
      )
    : ranked.length && ranked[0]![1] > 0
      ? ranked[0]![0]
      : null;
  const incumbent = contest.incumbentTermId
    ? (api
        .moduleState(OFFICES_MODULE_ID)
        .table("terms")
        .get(contest.incumbentTermId) as unknown as TermRow | undefined)
    : undefined;
  // A special election's winner takes the vacant seat at once; otherwise
  // the new term starts on the office's own start day after the regular
  // election (a second election after a tie keeps the regular one's term).
  const office = api
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(contest.officeId) as unknown as OfficeInput | undefined;
  const takesOffice = contest.special
    ? date
    : office
      ? termStartAfter(office, regularElectionDate(contest))
      : (incumbent?.endDate ??
        `${Number(contest.electionDate.slice(0, 4)) + 1}-01-01`);
  const result: ResultRow = {
    id: `result:${contestId}`,
    contestId,
    date,
    namedVotes,
    countedVotes,
    countedByGroup,
    countedTurnout: countedVoted,
    countedEligible,
    placeVotes,
    totals,
    namedTurnout: voted,
    namedEligible: named.length,
    electorate,
    winnerId,
    takesOffice: winnerId ? takesOffice : null,
    exitPoll,
    ...(reasons ? { electorateReasons: reasons } : {}),
    ...(wider ? { placesCast: wider.cast } : {}),
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
  else openNextCycle(api, contest.seatId);
  return result;
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
function countedScale(api: CoreAPI): number {
  const usps = town(api).stateKey.slice(3);
  return (
    citizenShareOf(
      api.state.placeMetadata.placeKey as string | undefined,
      usps,
    ) *
    (1 - electorateChange(api).barred)
  );
}

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
  const date = api.state.date;
  let people = 0,
    adults = 0;
  for (const p of api.state.people.values())
    if (p.alive && p.placeId === townPlaceId) {
      people += 1;
      if (ageOn(p, date) >= 18) adults += 1;
    }
  for (const v of countedResidents(api.state as CoreState))
    if (v.placeId === townPlaceId) {
      people += 1;
      if (ageOn(v, date) >= 18) adults += 1;
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
 * The places a race's electorate lives in, before the town's own voters are
 * set apart: the state's counties (a statewide office, the presidency), the
 * House district or the legislative district; empty for a local race.
 * `home` is the place the town lies in, where one is recorded.
 */
function basePlaces(
  api: CoreAPI,
  contest: ContestRow,
): { places: readonly ElectoratePlace[]; home: string | null } {
  const { stateKey, geoid } = town(api);
  const usps = stateKey.slice(3);
  if (contest.family === "statewideExecutive") {
    const county = countyPlaceIdOf(
      api.state.placeMetadata.countyNames as string | undefined,
      usps,
    );
    const places = statePlaces(usps);
    return {
      places,
      home: places.some((p) => p.id === county) ? county : null,
    };
  }
  if (contest.family === "usHouse") {
    const district = townDistrict(geoid, usps, "congressional", api.state.date);
    const place = housePlaceByGeoid(usps, district?.geoid ?? null);
    return place
      ? { places: [place], home: place.id }
      : { places: [], home: null };
  }
  if (contest.family === "stateLegislative") {
    const seats = api
      .moduleState(OFFICES_MODULE_ID)
      .table("seats")
      .query("byOffice", [contest.officeId]) as unknown as SeatInput[];
    const districts = new Set(seats.map((s) => s.district)).size;
    const holder = contest.incumbentTermId
      ? (api
          .moduleState(OFFICES_MODULE_ID)
          .table("terms")
          .get(contest.incumbentTermId) as unknown as TermRow | undefined)
      : undefined;
    const county = countyPlaceIdOf(
      api.state.placeMetadata.countyNames as string | undefined,
      usps,
    );
    const own = county
      ? (statePlaces(usps).find((p) => p.id === county)?.rightShare ?? null)
      : null;
    const place = legislativePlace(
      usps,
      contest.seatId,
      districts,
      partySide(holder?.party ?? null),
      own,
    );
    return place
      ? { places: [place], home: place.id }
      : { places: [], home: null };
  }
  return { places: [], home: null };
}

/**
 * The rest of a race's electorate, place by place: the town's own named and
 * counted voters set apart from the place they live in (from every place in
 * proportion where none is recorded), and the rest of the town where its
 * population runs past them. Each place feels the town's jobs and crime
 * where the town lies in it.
 */
function racePlaces(
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
  const rest = restOfTown(api, known);
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
 * presidency too): incumbency, experience, scandal, the campaign's books,
 * the officeholder's record, the economy and the midterm penalty, as every
 * voter in the race sees them. Null for a local or nonpartisan race.
 */
function publicReasons(
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
  const right = votes
    ? places.reduce((s, p) => s + p.votes2024 * p.rightShare, 0) / votes
    : (1 + townLean(api)) / 2;
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
  });
  const reasons = filings.map((f) =>
    candidateReasons(
      candidateInputs(api, {
        id: f.personId,
        party: f.party ?? null,
        filingId: f.id,
        // The holder standing again, a full person or an official the world
        // doesn't name yet.
        incumbent:
          candidateFacts(api, f, contest).isIncumbent ||
          (seat !== undefined && f.personId === officialCandidateId(seat.id)),
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
  const today = api.state.date;
  const counted = countedResidents(api.state as CoreState).filter(
    (v) => v.placeId === townPlaceId && ageOn(v, today) >= 18,
  );
  const voters: {
    id: string;
    traits: Readonly<Record<string, number>>;
    birthDate: string;
    weeklyMinutes?: number;
  }[] = counted.length
    ? counted
    : [...api.state.people.values()].filter(
        (p) => p.alive && p.placeId === townPlaceId && ageOn(p, today) >= 18,
      );
  const lean0 = townLean(api);
  const base = campaignParameter("turnoutBase");
  const rows = voters
    .map((voter) => {
      const t = turnout(api, voter, {}, voter.weeklyMinutes, extraCost);
      return {
        id: voter.id,
        lean: personLean(api.state.people, voter, lean0),
        readiness: t.duty + base - t.cost - extraCost,
        incumbentLean: incumbentLeanOf(api, voter),
      };
    })
    .sort((a, b) => b.lean - a.lean || a.id.localeCompare(b.id));
  const sample = rows.map((row, i) => ({
    id: row.id,
    rank: (i + 0.5) / rows.length,
    readiness: row.readiness,
    incumbentLean: row.incumbentLean,
  }));
  byKey.clear();
  byKey.set(key, sample);
  return sample;
}

/** Keep each place's votes, so the game can show where the race was won. */
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
    .get(contest.officeId) as unknown as OfficeInput;
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
  // The incumbent who stood again: the seat's holder when filing closed.
  const previous = result.winnerId.startsWith(officialCandidateId(""))
    ? (terms.get(
        result.winnerId.slice(officialCandidateId("").length),
      ) as unknown as TermRow | undefined)
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
    : previous
      ? previous.identity
      : officialIdentity(api, contest, result.winnerId);
  const termId = `term:${contest.seatId}:${api.state.date}:elected`;
  terms.put({
    id: termId,
    seatId: contest.seatId,
    officeId: contest.officeId,
    personId: winner ? winner.id : null,
    identity,
    party: filing?.party ?? null,
    startDate: api.state.date,
    // A special election's winner serves out the unexpired term; otherwise
    // the term runs to the start of the one elected a full term on.
    endDate: contest.special
      ? contest.special.termEnd
      : termEndAfter(office, regularElectionDate(contest)),
    endEstimated: false,
    reached: contest.special
      ? `elected in a special election ${contest.electionDate}`
      : `elected ${contest.electionDate}`,
    status: "serving",
  } as unknown as ModuleRow);
  if (contest.special) vacancyFilled(api, contest.special.vacancyId, termId);
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
  openNextCycle(api, contest.seatId);
}

/** The regular election a contest decides: a tie's second election keeps its date. */
function regularElectionDate(contest: ContestRow): string {
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

/** Why one voter, named or counted, voted as they did. */
export function ballotOf(
  api: CoreAPI,
  contestId: string,
  voterId: string,
): BallotRow | null {
  return (
    (table(api, "ballots").get(`ballot:${contestId}:${voterId}`) as unknown as
      BallotRow | undefined) ??
    (table(api, "countedBallots").get(
      `ballot:${contestId}:${voterId}`,
    ) as unknown as BallotRow | undefined) ??
    null
  );
}

export function resultOf(api: CoreAPI, contestId: string): ResultRow | null {
  return (
    (table(api, "results").get(`result:${contestId}`) as unknown as
      ResultRow | undefined) ?? null
  );
}

export { campaignFor };

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
  partyStrength,
  engagementOf,
  type CountedAppeal,
  type CountedFieldEntry,
  type CountedVoter,
  type PlaceResult,
  type RacePlace,
  type SampleVoter,
} from "../electorate";
import {
  applyElectionLaws,
  barredFromVoting,
  recordRedistricting,
  electionLawTurnoutCost,
} from "../law-reach/group-a-voting";
import { breakElectionTie } from "../election-ties";
import {
  OPENING_CARRY,
  habitOf,
  interestOf,
  namedTurnout,
  propensityOf,
  reachOf,
  readinessOf,
  stakesOf,
  type TurnoutParts,
} from "../turnout";
import { coreAPI, registerModule } from "../state";
import { closenessBetween } from "../closeness";
import { decisionLean } from "../trait-decisions";
import { parameter } from "../parameters";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import { campaignParameter, personLean, type Stance } from "../campaign-views";
import { townDistrict } from "../offices-state";
import { holdoverRule } from "../office-holdover";
import electionParameters from "../data/elections/parameters.json" with { type: "json" };
import {
  announce,
  contestsOnDate,
  checkEligibility,
  filingRulesFor,
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
  unfilledTerm,
  repeatSpecialElection,
  type TermRow,
} from "./offices";
import { holderOf, officialCandidate } from "./officials";
import type { SeatInput } from "../offices-state";
import type { OfficeInput } from "../offices-local";
import { termEndAfter, termStartAfter } from "../elections-calendar";
import { drawOfficialIdentity } from "../officials-identity";
export { candidateIdentity } from "../candidate-identity";
import { PARTIES_MODULE_ID, partiesHere, partyTie } from "./parties";
import { ballotCuesOf, ballotForms, ballotOrderRule } from "../ballot-order";
import { nationalParty, partySide } from "../appointments";
import { recordAppeal, type RecordReason } from "./record";
import { decisionOf } from "./candidacy";
import {
  agreementWith,
  VIEWS_DATA,
  VIEWS_MODULE_ID,
  VIEWS_SPEAKER_KEY,
  viewOf,
} from "./views";
import {
  citizenShareOf,
  countyPlaceIdOf,
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
  electorateParameter,
  raceConditions,
  rememberOpeningElectorate,
  type CandidateReasons,
} from "../electorate-inputs";
import { scandalsOf } from "./corruption";
import {
  executiveTermLimit,
  termLimitReachedBy,
} from "../executive-term-limits";
import { convictionsOf } from "./justice";
import { newsKey, trustWeight } from "./news";
import { keepsWhy } from "../why-kept";

function electionsParameter(key: string): number {
  const row = (
    electionParameters as unknown as {
      parameters: Record<string, { value: number }>;
    }
  ).parameters[key];
  if (!row) throw new Error(`Unknown elections parameter: ${key}`);
  return row.value;
}

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
  readonly countedTurnout: number;
  readonly countedEligible: number;
  /** Votes the rest of the race's electorate cast, counted coarsely place by place. */
  readonly placeVotes: Readonly<Record<string, number>>;
  readonly totals: Readonly<Record<string, number>>;
  readonly namedTurnout: number;
  readonly namedEligible: number;
  readonly electorate: number;
  readonly winnerId: string | null;
  /** Ballot identity retained for vote totals and filing provenance. */
  readonly winnerCandidateId?: string | null;
  readonly takesOffice: string | null;
  readonly exitPoll: Readonly<Record<string, number>>;
  /** Each candidate's public standing, where the race weighs it (a partisan state or federal race). */
  readonly electorateReasons?: readonly CandidateReasons[];
  /** Ballots the rest of the race's electorate cast. */
  readonly placesCast?: number;
}

/**
 * Every counted resident's ballot in one contest, kept by column (a town
 * holds thousands): each voter's own lean, the incumbent side of their
 * traits, their turnout reasons and choice, and the field they saw. A
 * ballot's appeal and its parts are the engine's own reading of these
 * (`countedBallotOf`), the same numbers it decided by.
 */
interface CountedBallotsRow {
  readonly id: string;
  readonly contestId: string;
  readonly date: string;
  readonly field: readonly CountedFieldEntry[];
  readonly voterIds: readonly string[];
  /** The share of people like them who voted (their turnout propensity). */
  readonly voted: readonly number[];
  /** The field index of their choice; -1 none. */
  readonly choice: readonly number[];
  readonly lean: readonly number[];
  readonly incumbentLean: readonly number[];
  /** Each voter's trust in the press against the average reader (absent on rows kept before it was). */
  readonly trust?: readonly number[];
  readonly duty: readonly number[];
  readonly interest: readonly number[];
  readonly cost: readonly number[];
  /** Real voters each kept ballot stands for (absent on rows kept before the Census weight; one). */
  readonly weight?: readonly number[];
}

/** One voter's turnout on a ballot: its parts and the propensity they came to. */
export interface TurnoutReasonsRecord {
  readonly duty: number;
  readonly interest: number;
  readonly cost: number;
  readonly stakes?: number;
  readonly reach?: number;
  readonly habit?: number;
  readonly propensity?: number;
}

/** One counted resident's ballot, with its reasons. */
export interface CountedBallotRow {
  readonly id: string;
  readonly contestId: string;
  readonly voterId: string;
  readonly date: string;
  readonly counted: true;
  /** The share of the town's people like them who voted: their propensity. */
  readonly turnout: number;
  readonly turnoutReasons: TurnoutReasonsRecord;
  readonly choice: string | null;
  readonly appeal: Readonly<Record<string, CountedAppeal>>;
  readonly basis: "party-name-incumbency";
  readonly lean: number;
  /** Real voters this ballot stands for. */
  readonly weight: number;
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
      /** Each contest's counted residents' ballots, with their reasons. */
      countedBallots: {},
      /** Each named voter's record of election days: habit and carry. */
      turnout: {},
      /** The town's polling places, one per precinct, and who works each. */
      pollingPlaces: {},
      emptyRaces: { indexes: { byContest: { fields: ["contestId"] } } },
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
  pollingPlaces(api);
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
  if (work.kind === "empty-term")
    resolveEmptyRace(api, work.sourceRecordIds[0]!);
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

/**
 * Who holds a contest's seat today: the term serving on it, read from the
 * record (a winner, an appointee to a vacancy), never a term the contest
 * stored when it opened. Both tiers of voters read incumbency from here.
 */
export function seatHolder(
  api: CoreAPI,
  contest: Pick<ContestRow, "seatId">,
): TermRow | undefined {
  return api
    .moduleState(OFFICES_MODULE_ID)
    .table("terms")
    .query("bySeatStatus", [contest.seatId, "serving"])[0] as unknown as
    TermRow | undefined;
}

/** Whether a candidate id is a term's holder: the person, or the official the world doesn't name yet. */
function holds(term: TermRow | undefined, candidateId: string): boolean {
  return (
    !!term &&
    (term.personId === candidateId ||
      candidateId === officialCandidateId(term.id))
  );
}

/**
 * What a candidate stands for, as the voter can know it: the stated platform
 * of a filing, their party, and whether they hold the seat now.
 */
function candidateFacts(api: CoreAPI, filing: FilingRow, contest: ContestRow) {
  const campaign = api
    .moduleState(CAMPAIGNS_MODULE_ID)
    .table("campaigns")
    .get(filing.id);
  const platform: readonly Stance[] = campaign
    ? (campaign as unknown as { platform: Stance[] }).platform
    : parsePlatform(filing.platform);
  const isIncumbent = holds(seatHolder(api, contest), filing.personId);
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
  return closenessBetween(api.state, voter.id, candidateId);
}

/** One candidate's appeal to a named voter: the parts every voter weighs, and what only they know. */
export interface NamedAppeal extends CountedAppeal {
  /** Warmth from what reached them (campaign contacts, retellings). */
  readonly warmth: number;
  /** Their agreement with the platform, where a campaign told it to them. */
  readonly agreement: number | null;
  /** The pull of their own party tie, by its strength. */
  readonly partyTie: number;
  /** How they stand with a candidate they know personally. */
  readonly relationship: number;
  /** The incumbent's record as they weigh it, where they know the officeholder. */
  readonly record: number;
}

/**
 * One named voter's appeal for each candidate, on the one appeal function
 * every voter uses (`countedAppeal`): the candidate's party against their own
 * lean, the candidate's public standing, the incumbent side of their traits
 * and what being known brings. A named voter's knowledge is their own, not
 * the town's share: whether they have heard of the candidate and, where a
 * campaign told them the platform, how they agree with it. Only a named voter
 * adds what they personally know: warmth from what reached them, their party
 * tie by its strength, how they stand with a candidate they know, and the
 * incumbent's record as they weigh it in place of the record as the town
 * knows it.
 */
function appealFor(
  api: CoreAPI,
  voter: Readonly<PersonState>,
  contest: ContestRow,
  filings: readonly FilingRow[],
) {
  const lean = voterLean(api, voter);
  const view = contestView(api, contest, filings);
  const base = countedAppeal(lean, view.field, {
    inTown: true,
    local: true,
    incumbentLean: incumbentLeanOf(api, voter),
    // The form of the ballot their own precinct prints.
    ballotForm: precinctIndexOf(api, voter),
  });
  const tie = partyTie(api, voter.id);
  let heardPlatform = false;
  const recordReasons: Record<string, readonly RecordReason[]> = {};
  const appeal: Record<string, NamedAppeal> = {};
  for (const entry of view.field) {
    const parts = base[entry.id]!;
    const filing = filings.find((f) => f.personId === entry.id)!;
    const impression = impressionOf(api, voter.id, entry.id);
    const heard =
      entry.id === voter.id ||
      voter.knownIds.has(entry.id) ||
      (impression?.heardOf ?? false);
    const agreement = impression?.knowsPlatform
      ? agreementWith(api, voter.id, lean, entry.platform)
      : null;
    if (agreement !== null) heardPlatform = true;
    // Their own knowledge in place of the town's share of it.
    const recognition = heard
      ? campaignParameter("countedRecognitionWeight") + (agreement ?? 0)
      : 0;
    const warmth = impression?.warmth ?? 0;
    // A party tie pulls toward its own candidate by how firmly it is held.
    const partyTieTerm =
      tie?.tie === "party" &&
      tie.partyId &&
      filing.party &&
      tie.partyId.endsWith(slug(filing.party))
        ? campaignParameter("partyLoyaltyWeight") *
          Math.min(1, Math.abs(tie.lean))
        : 0;
    // The incumbent's record (votes, promises kept or broken), weighed by a
    // voter who knows the officeholder (golden path step 11), in place of
    // the record as the town knows it.
    const weighed =
      entry.isIncumbent && heard
        ? recordAppeal(api, voter, entry.id, lean, true)
        : null;
    recordReasons[entry.id] = weighed?.reasons ?? [];
    const record = weighed ? weighed.total : 0;
    const standing = weighed
      ? parts.standing - (view.publicRecord[entry.id] ?? 0)
      : parts.standing;
    const relationship =
      campaignParameter("ballotRelationshipWeight") *
      relationshipWith(api, voter, entry.id);
    // Their own knowledge of a scandal in place of the town's share of it,
    // weighed by how far they trust the press.
    const scandal = scandalTerm(api, voter.id, entry.id, lean);
    appeal[entry.id] = {
      total:
        parts.party +
        standing +
        parts.incumbent +
        recognition +
        warmth +
        partyTieTerm +
        relationship +
        record +
        parts.ballot +
        scandal,
      party: parts.party,
      standing,
      incumbent: parts.incumbent,
      recognition,
      warmth,
      agreement,
      partyTie: partyTieTerm,
      relationship,
      record,
      ballot: parts.ballot,
      scandal,
    };
  }
  const basis: "platform" | "party-name-incumbency" = heardPlatform
    ? "platform"
    : "party-name-incumbency";
  return { appeal, lean, recordReasons, basis };
}

/**
 * What each candidate's place on the printed ballot brings every voter, in
 * appeal units, on each form of the ballot: the first-listed edge, sliding to
 * nothing at the bottom, in the order the place's law sets
 * (`ballot-order.ts`): a primary's ballot on the primary date, the general
 * election's otherwise.
 */
function ballotCues(
  api: CoreAPI,
  contest: ContestRow,
  field: readonly FilingRow[],
): Map<string, number[]> {
  const holder = seatHolder(api, contest);
  const shares = api.state.modules.has(PARTIES_MODULE_ID)
    ? new Map(partiesHere(api).map((p) => [p.name, p.share]))
    : new Map<string, number>();
  const stateKey = town(api).stateKey;
  // Until the race's primary is held, its ballot is the primary's.
  const stage =
    contest.primaryDate && api.state.date <= contest.primaryDate
      ? "primary"
      : "general";
  if (ballotOrderRule(stateKey, stage)?.estimate) {
    // stopgapId: SG-GOV-ballot-order-estimates
    api.stopgap("SG-GOV-ballot-order-estimates");
  }
  const forms = ballotForms({
    stateKey,
    stage,
    contestId: contest.id,
    year: contest.electionDate.slice(0, 4),
    candidates: field.map((f) => ({
      id: f.personId,
      surname: api.state.people.get(f.personId)?.familyName ?? f.personId,
      party: f.party ?? null,
      isIncumbent: holds(holder, f.personId),
      filedOn: f.filedOn,
      filingId: f.id,
    })),
    partyShare: (party) => shares.get(party) ?? 0,
  });
  if (!forms) throw new Error(`No ballot-order law for ${town(api).stateKey}.`);
  return ballotCuesOf(
    forms,
    appealOfShare(electionsParameter("ballotFirstPositionShare")),
  );
}

/**
 * What every voter can know of a contest's ballot, for the day: each
 * candidate as the one appeal function reads them, and the incumbent's record
 * as the town knows it (inside their standing), which a named voter who knows
 * the officeholder replaces with their own weighing.
 */
interface ContestView {
  readonly field: readonly CountedFieldEntry[];
  readonly publicRecord: Readonly<Record<string, number>>;
}

const contestViews = new WeakMap<object, Map<string, ContestView>>();

/** Someone the town's common knowledge of a record is weighed for: no promise heard. */
const TOWN_KNOWLEDGE = { id: "electorate:town" } as unknown as PersonState;

/**
 * What a counted voter can know of each candidate on a contest's ballot: the
 * party label; the candidate's public standing where the race weighs one (a
 * partisan state or federal race), else the incumbent's name and record as
 * the town knows it; and how well known each candidate is in town, for the
 * town's own people.
 */
function contestView(
  api: CoreAPI,
  contest: ContestRow,
  field: readonly FilingRow[],
): ContestView {
  const byKey = contestViews.get(api.state) ?? new Map<string, ContestView>();
  contestViews.set(api.state, byKey);
  const key = `${api.state.date}|${contest.id}|${field.map((f) => f.id).join(",")}`;
  const hit = byKey.get(key);
  if (hit) return hit;
  const named = townAdults(api);
  const reasons = publicReasons(api, contest, field);
  const holder = seatHolder(api, contest);
  const publicRecord: Record<string, number> = {};
  const cues = ballotCues(api, contest, field);
  const rows = field.map((f) => {
    const facts = candidateFacts(api, f, contest);
    const heard = named.filter(
      (p) =>
        p.id === f.personId ||
        p.knownIds.has(f.personId) ||
        (impressionOf(api, p.id, f.personId)?.heardOf ?? false),
    ).length;
    const standing = reasons?.find((r) => r.id === f.personId);
    // The record as the town knows it: in a partisan race, the part of the
    // candidate's public standing the record makes; in a local race, the
    // incumbent's votes as a voter at the town's own lean weighs them.
    publicRecord[f.personId] = standing
      ? appealOfShare(standing.record)
      : facts.isIncumbent && holder?.personId
        ? recordAppeal(
            api,
            TOWN_KNOWLEDGE,
            holder.personId,
            townLean(api),
            true,
          ).total
        : 0;
    return {
      id: f.personId,
      // A custom world's party strength scales how hard the label pulls.
      side: partySide(facts.party) * partyStrength(api.state, facts.party),
      isIncumbent: facts.isIncumbent,
      standing: standing
        ? appealOfShare(standing.total)
        : facts.isIncumbent
          ? campaignParameter("incumbentRecognition") +
            publicRecord[f.personId]!
          : 0,
      localStanding: standing ? appealOfShare(standing.local) : 0,
      // The town's share who know the candidate: the named adults who have
      // heard of them and the counted adults the campaign's doors and mail
      // reached, over all the town's adults.
      recognition: townShareKnowing(api, named.length, heard, f.id),
      platform: facts.platform,
      ballotCues: cues.get(f.personId) ?? [],
      // A reported scandal as far as its story reached the town's people.
      scandal: scandalAppeal(api, f.personId, named),
    };
  });
  const view = { field: rows, publicRecord };
  byKey.set(key, view);
  return view;
}

/**
 * A reported scandal in appeal units, times the share of the town's named
 * adults whose news reached them (the counted adults are read at the same
 * share; a named voter reads their own knowledge). Zero where none was
 * reported or none of it reached anyone.
 */
function scandalAppeal(
  api: CoreAPI,
  candidateId: string,
  named: readonly Readonly<PersonState>[],
): number {
  const stories = scandalStoriesOf(api, candidateId, api.state.date);
  if (!stories.length || !named.length) return 0;
  const reached = named.filter((p) => heardScandal(api, p.id, stories)).length;
  return (
    appealOfShare(electorateParameter("scandalShare")) *
    (reached / named.length)
  );
}

/**
 * The news stories that make a candidate's scandal, by the date: a taken
 * bribe someone reported to the press, and a conviction the court made
 * public. Voters read only the ones that reached them.
 */
export function scandalStoriesOf(
  api: CoreAPI,
  candidateId: string,
  date: string,
): readonly string[] {
  return [
    ...scandalsOf(api, candidateId, date),
    ...convictionsOf(api, candidateId, date).map(
      (row) => `justice.convicted:${row.id}`,
    ),
  ];
}

/**
 * What a voter's own knowledge of a candidate's scandal does to the candidate's
 * appeal with them: negative, weighed by how far they trust the press, only
 * when a story about it reached them (never a flag); zero for everyone else.
 */
export function scandalTerm(
  api: CoreAPI,
  voterId: string,
  candidateId: string,
  lean: number,
): number {
  return heardScandal(
    api,
    voterId,
    scandalStoriesOf(api, candidateId, api.state.date),
  )
    ? -appealOfShare(electorateParameter("scandalShare")) *
        trustWeight(api, lean)
    : 0;
}

/** Whether a scandal story about the candidate reached this person. */
function heardScandal(
  api: CoreAPI,
  personId: string,
  stories: readonly string[],
): boolean {
  return stories.some((storyId) => api.knows(personId, newsKey(storyId)));
}

export function countedField(
  api: CoreAPI,
  contest: ContestRow,
  field: readonly FilingRow[],
): readonly CountedFieldEntry[] {
  return contestView(api, contest, field).field;
}

/** A candidate's recognition in town: the share of the named adults who heard of them, or of all adults counting those the campaign reached, whichever is wider. */
function townShareKnowing(
  api: CoreAPI,
  namedAdults: number,
  namedHeard: number,
  filingId: string,
): number {
  const counted = countedAdultsToday(api);
  const reached = api.state.modules.has(CAMPAIGNS_MODULE_ID)
    ? ((
        api
          .moduleState(CAMPAIGNS_MODULE_ID)
          .table("campaigns")
          .get(filingId) as unknown as { countedReached?: number } | undefined
      )?.countedReached ?? 0)
    : 0;
  // The named adults stand for the town as its sample; the counted adults a
  // campaign's doors and mail reached raise that where they reach further.
  const sample = namedAdults ? namedHeard / namedAdults : 0;
  const all = namedAdults + counted;
  const reach = all ? (namedHeard + Math.min(counted, reached)) / all : 0;
  return Math.min(1, Math.max(sample, reach));
}

/** The town's counted adults today. */
function countedAdultsToday(api: CoreAPI): number {
  const held = countedByDay.get(api.state);
  if (held?.date === api.state.date) return held.n;
  const { townPlaceId } = town(api);
  const date = api.state.date;
  let n = 0;
  for (const v of countedResidents(api.state as CoreState))
    if (v.placeId === townPlaceId && ageOn(v, date) >= 18) n += v.weight;
  countedByDay.set(api.state, { date, n });
  return n;
}
const countedByDay = new WeakMap<object, { date: string; n: number }>();

/** The town's named adults today, from the place index. */
function townAdults(api: CoreAPI): readonly PersonState[] {
  const held = adultsByDay.get(api.state);
  if (held?.date === api.state.date && held.size === api.state.people.size)
    return held.rows;
  const { townPlaceId } = town(api);
  const date = api.state.date;
  const rows = [...(api.state.peopleByPlace.get(townPlaceId) ?? [])]
    .map((id) => api.state.people.get(id))
    .filter(
      (p): p is PersonState =>
        !!p &&
        p.alive &&
        p.placeId === townPlaceId &&
        ageOn(p, date) >= 18 &&
        !barredFromVoting(api, p.id),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  adultsByDay.set(api.state, {
    date,
    size: api.state.people.size,
    rows,
  });
  return rows;
}
const adultsByDay = new WeakMap<
  object,
  { date: string; size: number; rows: readonly PersonState[] }
>();

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

/** A named person's scheduled weekly work, from their commitments. */
function weeklyWorkOf(state: CoreState, personId: string): number {
  return [...(state.work.commitmentsByPerson.get(personId) ?? [])].reduce(
    (sum, id) =>
      sum + (state.work.commitments.get(id)?.expectedWeeklyMinutes ?? 0),
    0,
  );
}

/** One voter on the roll the election laws are applied to: a named person, or a counted group. */
export interface RollVoter {
  readonly id: string;
  readonly target: "person" | "group";
  /** The people it stands for (a counted group's weight times its citizen scale). */
  readonly count: number;
  readonly birthDate: string;
  readonly traits: Readonly<Record<string, number>>;
  readonly weeklyMinutes: number;
}

/**
 * The town's adults the election laws apply to today: its named adults the
 * state does not bar, and its counted adults, each standing for the people
 * like them who are citizens and not barred.
 */
export function electorateRoll(api: CoreAPI): readonly RollVoter[] {
  const state = api.state as CoreState;
  const { townPlaceId } = town(api);
  const date = state.date;
  const rows: RollVoter[] = townAdults(api).map((p) => ({
    id: p.id,
    target: "person",
    count: 1,
    birthDate: p.birthDate,
    traits: p.traits,
    weeklyMinutes: weeklyWorkOf(state, p.id),
  }));
  const scale = countedScale(api);
  for (const v of countedResidents(state))
    if (v.placeId === townPlaceId && ageOn(v, date) >= 18)
      rows.push({
        id: v.id,
        target: "group",
        count: v.weight * scale,
        birthDate: v.birthDate,
        traits: v.traits,
        weeklyMinutes: v.weeklyMinutes,
      });
  return rows;
}

/**
 * A voter's reasons to vote apart from the race: their own sense of duty and
 * reliability, every trait's lean between voting and staying home, how
 * closely they follow politics (where PEOPLE's views engine runs; younger
 * people follow less, CES 2024), against what voting costs them that day
 * (their work hours, the election laws in force, a custom world's turnout
 * setting, and what the election adds: a midterm's, an off-cycle date's or a
 * primary's lower salience).
 */
export function turnoutReasons(
  api: CoreAPI,
  voter: Readonly<Pick<PersonState, "id" | "traits">>,
  /** A counted resident's scheduled weekly work, from their record. */
  recordedWeeklyMinutes?: number,
  /** What this election adds to the cost of voting. */
  extraCost = 0,
): { readonly duty: number; readonly cost: number } {
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
  const state = api.state as CoreState;
  const weeklyWork = recordedWeeklyMinutes ?? weeklyWorkOf(state, voter.id);
  const cost =
    (weeklyWork / campaignParameter("turnoutWorkWeekMinutes") +
      electionLawTurnoutCost(api, voter, weeklyWork)) /
      customPolitics(state).turnout +
    extraCost;
  return { duty, cost };
}

/** One voter's turnout on one day: its parts, the propensity, and (a named voter) the act. */
export interface TurnoutDecision extends TurnoutParts {
  /** The gap between the candidates in their own eyes, across the day's races. */
  readonly interest: number;
  readonly propensity: number;
  /** A named voter's act; a counted voter votes at their propensity. */
  readonly votes: boolean;
}

/** A named voter's record of election days: what their habit reads, and their carry. */
interface TurnoutRecordRow {
  readonly id: string;
  readonly elections: number;
  readonly voted: number;
  readonly carry: number;
  readonly lastDate: string;
}

const decisions = new WeakMap<object, Map<string, TurnoutDecision>>();

/**
 * Decide one voter's turnout for a day, once: a named voter from their own
 * record (habit, the carry their past elections left, the campaigns that
 * reached them), a counted voter from theirs (no individual record kept:
 * habit is the record of people like them, which their duty already carries;
 * the campaigns' reach is the town's).
 */
function decideTurnout(
  api: CoreAPI,
  voter: Readonly<Pick<PersonState, "id" | "traits">>,
  input: {
    readonly date: string;
    readonly interest: number;
    readonly extraCost: number;
    readonly contacts: number;
    readonly recordedWeeklyMinutes?: number;
  },
): TurnoutDecision {
  const map = decisions.get(api.state) ?? new Map<string, TurnoutDecision>();
  decisions.set(api.state, map);
  const key = `${input.date}|${voter.id}`;
  const hit = map.get(key);
  if (hit) return hit;
  const named = api.state.people.has(voter.id);
  const { duty, cost } = turnoutReasons(
    api,
    voter,
    input.recordedWeeklyMinutes,
    input.extraCost,
  );
  // Kept where the voting engine runs (a measure or recall can be counted
  // without it, with no record kept).
  const records = api.state.modules.has(VOTING_MODULE_ID)
    ? table(api, "turnout")
    : null;
  const record = named
    ? (records?.get(voter.id) as unknown as TurnoutRecordRow | undefined)
    : undefined;
  const parts: TurnoutParts = {
    duty,
    stakes: stakesOf(input.interest),
    reach: reachOf(input.contacts),
    habit: record ? habitOf(record.voted, record.elections) : 0,
    cost,
  };
  const propensity = propensityOf(parts);
  let votes = false;
  if (named) {
    const act = namedTurnout(record?.carry ?? OPENING_CARRY, propensity);
    votes = act.votes;
    records?.put({
      id: voter.id,
      elections: (record?.elections ?? 0) + 1,
      voted: (record?.voted ?? 0) + (votes ? 1 : 0),
      carry: act.carry,
      lastDate: input.date,
    } as unknown as ModuleRow);
  }
  const decision = { ...parts, interest: input.interest, propensity, votes };
  map.set(key, decision);
  return decision;
}

/**
 * When filing closes: the incumbent stands again if they're alive and holding
 * the seat, and a state or federal race the town only sees from afar gets a
 * challenger from the other major party, a named official drawn from the
 * world seed. Stand-in until OPUS-PEOPLE's "who runs" decides each from their
 * own drives (M2-04): SG-GOV-who-runs-stand-in.
 */
export function fileStandingCandidates(api: CoreAPI, contestId: string): void {
  // Installed candidacy owns autonomous choices, including deciding to stay out.
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
  if (
    (contest.level === "state" || contest.level === "federal") &&
    api.state.modules.has("candidacy")
  )
    return;
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
  // Each stands where the place's records say filings go, on the same
  // rules any candidate meets, and the filing is announced. A full person
  // who doesn't meet the rules isn't put on the ballot. The stand-in files
  // for them when filing closes; when they would have filed is the
  // stand-in's to fake, so its filing counts as on time.
  const put = (personId: string, party: string | null, how: string) => {
    if (ballot(api, contestId).some((f) => f.personId === personId)) return;
    if (
      api.state.people.has(personId) &&
      checkEligibility(api, personId, contestId, party).some(
        (c) => !c.met && c.rule !== "filing-deadline",
      )
    )
      return;
    const filing: FilingRow = {
      id: `filing:${contestId}:${personId}`,
      contestId,
      personId,
      filedOn: api.state.date,
      filedWith: filingRulesFor(api, contest, party ? "party" : "independent")
        .filedWith,
      platform: [],
      party,
      status: "on-ballot",
      how,
    };
    filings.put(filing as unknown as ModuleRow);
    announce(api, filing, contest);
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
    const other = partyOnSide(api, -partySide(incumbent.party));
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
  // The seat's party: its record's, else its last holder's.
  const lastHolder = (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("terms")
      .query("bySeatStatus", [contest.seatId, "ended"]) as unknown as TermRow[]
  )
    .slice()
    .sort((a, b) => (b.endDate ?? "").localeCompare(a.endDate ?? ""))[0];
  const seatParty =
    (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("seats")
        .get(contest.seatId) as unknown as { party?: string | null } | undefined
    )?.party ?? lastHolder?.party;
  if (
    (contest.level === "federal" || contest.level === "state") &&
    !(incumbent && alive) &&
    seatParty
  )
    for (const party of [-1, 1].map((side) => partyOnSide(api, side)))
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
 * The party that stands for a side of the scale in the town's state: the
 * largest party on that side in the state's own record (its 2024 ballot or
 * legislature), else the national party of that side (party-sides data).
 */
function partyOnSide(api: CoreAPI, side: number): string {
  const best = partiesHere(api)
    .filter((p) => p.side === side)
    .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name))[0];
  return best?.name ?? nationalParty(side);
}

/**
 * Whether the incumbent may not stand again. The presidency: no one is
 * elected more than twice (U.S. Const. amend. XXII), counting the opening
 * holder's terms from the record. A statewide executive: the state's own
 * limit (`executive-term-limits.ts`).
 */
function termLimited(
  api: CoreAPI,
  contest: ContestRow,
  incumbent: TermRow,
): boolean {
  if (contest.officeId !== "office:US:president") {
    // A statewide executive's limit, from the state's own constitution (data).
    const office = api
      .moduleState(OFFICES_MODULE_ID)
      .table("offices")
      .get(contest.officeId) as
      { level?: string; jurisdiction?: string; kind?: string } | undefined;
    if (office?.level !== "state" || !office.jurisdiction || !office.kind)
      return false;
    const limit = executiveTermLimit(office.jurisdiction, office.kind);
    if (limit.kind === "none") return false;
    // Service in this seat: the holder's ended terms, and the one under way
    // (an opening holder's earlier terms are not recorded, so one counts).
    const before = (
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
    ).length;
    return termLimitReachedBy(limit, before + 1);
  }
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
): {
  /** Every candidate's votes, named, counted and wider electorate together. */
  readonly votes: Readonly<Record<string, number>>;
  /** The named voters' share of them. */
  readonly namedVotes: number;
} {
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
    .filter(
      (p) =>
        p.alive &&
        p.placeId === townPlaceId &&
        ageOn(p, date) >= 18 &&
        !barredFromVoting(api, p.id),
    )
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
  let namedVotes = 0;
  // Named voters: what reached them, as on election day.
  const countNamed = (
    field: readonly FilingRow[],
    who: readonly PersonState[],
  ) => {
    const candidates = new Set(field.map((f) => f.personId));
    for (const voter of who) {
      // The player's ballot is the player's own (`castBallot`): counted only
      // where they chose a candidate in this field.
      if (voter.id === (api.state as CoreState).playerId) {
        const chosen = (
          table(api, "chosen").get(`${contestId}|${voter.id}`) as unknown as
            { candidateId: string | null } | undefined
        )?.candidateId;
        if (chosen && field.some((f) => f.personId === chosen)) {
          votes[chosen] = (votes[chosen] ?? 0) + 1;
          namedVotes += 1;
        }
        continue;
      }
      const { appeal } = appealFor(api, voter, contest, field);
      const t = decideTurnout(api, voter, {
        date,
        interest: interestOf(appeal),
        extraCost,
        contacts: contactsOf(api, voter.id, candidates),
      });
      if (!t.votes) continue;
      const choice = field.some((f) => f.personId === voter.id)
        ? voter.id
        : countedChoice(appeal);
      if (choice) {
        votes[choice] = (votes[choice] ?? 0) + 1;
        namedVotes += 1;
      }
    }
  };
  // The wider electorate sees the field as the town's counted voters do: the
  // candidates' public standing, the incumbent's name and record, and their
  // places on the ballot (CTO, Oct 14: a race is never left blank by most
  // voters for want of a platform to tell candidates apart).
  const primaryField = (field: readonly FilingRow[]) =>
    countedField(api, contest, field);
  const countCounted = (
    field: readonly FilingRow[],
    who: readonly CountedVoter[],
  ) => {
    // The same view of the field the town's named voters have.
    const entries = countedField(api, contest, field);
    const reached = townContacts(
      api,
      date,
      new Set(field.map((f) => f.personId)),
    );
    for (const [form, voter] of who.entries()) {
      const appeal = countedAppeal(leanOf.get(voter.id) ?? 0, entries, {
        inTown: true,
        local: true,
        incumbentLean: incumbentLeanOf(api, voter),
        trust: trustWeight(api, leanOf.get(voter.id) ?? 0),
        // The town's people hold each form of a rotated ballot in turn.
        ballotForm: form,
      });
      // Each counted voter stands for the town's people like them: their
      // vote counts at the share of them who turn out.
      const t = decideTurnout(api, voter, {
        date,
        interest: interestOf(appeal),
        extraCost,
        contacts: reached,
        recordedWeeklyMinutes: voter.weeklyMinutes,
      });
      const choice = countedChoice(appeal);
      // A record stands for `weight` real voters like it (one model, two tiers).
      if (choice)
        votes[choice] = (votes[choice] ?? 0) + t.propensity * voter.weight;
    }
  };
  // The primary's wider electorate (the rest of the town, county, district
  // or state) on the same engine: its places' party identifiers (and others
  // where the primary is open) at primary turnout.
  const townEligible = {
    named: named.length,
    counted: counted.reduce((n, v) => n + v.weight, 0),
  };
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
      // A party's one name is counted like any other field: the nominee
      // stands unopposed with the votes that came out for them.
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
      // applied by the officials, not modeled yet); a sole name has no one to eliminate.
      if (
        ranked.length < 2 ||
        (votes[ranked[0]!.personId] ?? 0) === (votes[ranked[1]!.personId] ?? 0)
      )
        continue;
      const winner = ranked[0]!;
      field.filter((f) => f !== winner).forEach(lose);
    }
  }
  // Votes are whole: a record standing for many voters counts them at its
  // turnout share, and the total is rounded once at the end.
  for (const id of Object.keys(votes)) votes[id] = Math.round(votes[id]!);
  api.emit({
    id: `primary-result:${contestId}`,
    date,
    kind: "primary-result",
    personIds: filings
      .map((f) => winningPersonId(api, f.personId))
      .filter((id) => api.state.people.has(id)),
    placeId: townPlaceId,
    source: {
      tag: "SOURCED",
      citation: `Primary count of ${contestId}`,
      asOf: date,
    },
    publicRecord: true,
    news: true,
    facts: {
      contestId,
      method,
      votes: JSON.stringify(votes),
      namedVotes: String(namedVotes),
    },
  });
  return { votes, namedVotes };
}

/**
 * Whether a named voter goes to the polls today for a question on the ballot
 * (a measure, a recall), on the one turnout rule: what is at stake for them
 * in it (the gap between their choices), their own record and what voting
 * costs them. A voter who already went today for a race keeps that trip.
 */
export function turnoutOn(
  api: CoreAPI,
  voter: Readonly<Pick<PersonState, "id" | "traits">>,
  appeal: Readonly<Record<string, { readonly total: number }>>,
): TurnoutDecision {
  const date = api.state.date;
  return decideTurnout(api, voter, {
    date,
    interest: interestOf(appeal),
    extraCost: cycleTurnout(date).cost,
    contacts: 0,
  });
}

/** A voter's turnout as their ballot keeps it. */
function turnoutRecord(t: TurnoutDecision): TurnoutReasonsRecord {
  return {
    duty: t.duty,
    interest: t.interest,
    cost: t.cost,
    stakes: t.stakes,
    reach: t.reach,
    habit: t.habit,
    propensity: t.propensity,
  };
}

/** A voter who cast their own ballot by hand voted: their record says so. */
function recordChosenVote(api: CoreAPI, voterId: string): void {
  const records = table(api, "turnout");
  const row = records.get(voterId) as unknown as TurnoutRecordRow | undefined;
  if (row)
    records.put({ ...row, voted: row.voted + 1 } as unknown as ModuleRow);
}

/** The contests on the ballot on a date, with their fields, read once a day. */
function contestsOn(
  api: CoreAPI,
  date: string,
): readonly {
  readonly contest: ContestRow;
  readonly field: readonly FilingRow[];
}[] {
  const byKey = ballotsByDay.get(api.state) ?? new Map();
  ballotsByDay.set(api.state, byKey);
  const key = `${api.state.date}|${date}`;
  const hit = byKey.get(key);
  if (hit) return hit;
  const races = contestsOnDate(api, date)
    .map((contest) => ({ contest, field: ballot(api, contest.id) }))
    .filter((race) => race.field.length > 0);
  byKey.clear();
  byKey.set(key, races);
  return races;
}
const ballotsByDay = new WeakMap<
  object,
  Map<
    string,
    readonly {
      readonly contest: ContestRow;
      readonly field: readonly FilingRow[];
    }[]
  >
>();

/** How many times the campaigns of a day's candidates reached a named voter. */
function contactsOf(
  api: CoreAPI,
  voterId: string,
  candidateIds: ReadonlySet<string>,
): number {
  if (!api.state.modules.has(CAMPAIGNS_MODULE_ID)) return 0;
  // Each impression carries its running count of contacts (every cause adds one).
  let n = 0;
  for (const row of api
    .moduleState(CAMPAIGNS_MODULE_ID)
    .table("impressions")
    .query("byVoter", [voterId]) as unknown as {
    candidateId: string;
    causes: number;
  }[])
    if (candidateIds.has(row.candidateId)) n += row.causes;
  return n;
}

/**
 * The campaigns' reach in town on a day's races: the contacts the town's
 * named adults received, per adult. A counted resident stands for the
 * town's people like them, reached as the town was.
 */
function townContacts(
  api: CoreAPI,
  date: string,
  candidateIds: ReadonlySet<string>,
): number {
  const key = `${api.state.date}|${date}`;
  const held = townReach.get(api.state);
  if (held?.key === key) return held.contacts;
  const adults = townAdults(api);
  let n = 0;
  for (const p of adults) n += contactsOf(api, p.id, candidateIds);
  const contacts = adults.length ? n / adults.length : 0;
  townReach.set(api.state, { key, contacts });
  return contacts;
}
const townReach = new WeakMap<object, { key: string; contacts: number }>();

/**
 * Whether a voter goes to the polls on an election day: once for the whole
 * ballot, by how much the day's races matter to them (a voter who turns out
 * for governor also sees the county races; with no preference in one, they
 * leave it blank), how often the campaigns reached them, their own record and
 * what voting costs them that day.
 */
function atThePolls(
  api: CoreAPI,
  voter: Readonly<Pick<PersonState, "id" | "traits">> & {
    readonly birthDate: string;
  },
  date: string,
  cycleCost: number,
  recordedWeeklyMinutes?: number,
): TurnoutDecision {
  const hit = decisions.get(api.state)?.get(`${date}|${voter.id}`);
  if (hit) return hit;
  const named = api.state.people.get(voter.id);
  const races = contestsOn(api, date);
  const candidates = new Set(
    races.flatMap((race) => race.field.map((f) => f.personId)),
  );
  let interest = 0;
  if (named)
    for (const race of races)
      interest = Math.max(
        interest,
        interestOf(appealFor(api, named, race.contest, race.field).appeal),
      );
  else {
    const lean = personLean(api.state.people, voter, townLean(api));
    const incumbentLean = incumbentLeanOf(api, voter);
    for (const race of races)
      interest = Math.max(
        interest,
        interestOf(
          countedAppeal(lean, countedField(api, race.contest, race.field), {
            inTown: true,
            local: true,
            incumbentLean,
          }),
        ),
      );
  }
  return decideTurnout(api, voter, {
    date,
    interest,
    extraCost: cycleCost,
    contacts: named
      ? contactsOf(api, voter.id, candidates)
      : townContacts(api, date, candidates),
    ...(recordedWeeklyMinutes === undefined ? {} : { recordedWeeklyMinutes }),
  });
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

/** Where a precinct's voters cast their ballots on election day, and who works it. */
export interface PollingPlaceRow {
  readonly id: string;
  readonly placeId: string;
  /** The precinct, numbered from 1 in the order of the town's households. */
  readonly precinct: number;
  readonly precincts: number;
  /** The building: the town government's own, where the records hold one. */
  readonly buildingId: string | null;
  readonly kind: "government-building" | "unread";
  /** Who works the polls on the day asked (read, never stored). */
  readonly pollWorkers: {
    readonly date: string;
    readonly ids: readonly string[];
  } | null;
  readonly source: string;
}

const PLACES_SOURCE =
  "EAC 2022 EAVS Data Brief (United States): 203,660,564 active registered voters, 94,793 voting locations and 645,219 poll workers";

/**
 * The town's polling places, one per precinct: as many as its registered
 * voters need at the national count of voters per voting location, each in
 * the town government's building where the records hold one.
 */
export function pollingPlaces(api: CoreAPI): readonly PollingPlaceRow[] {
  const rows = table(api, "pollingPlaces");
  if (rows.size)
    return (rows.rows() as unknown as PollingPlaceRow[])
      .slice()
      .sort((a, b) => a.precinct - b.precinct);
  const { townPlaceId } = town(api);
  const voters =
    (townAdults(api).length + countedAdultsToday(api)) * countedScale(api);
  const precincts = Math.max(
    1,
    Math.ceil(voters / electionsParameter("votersPerVotingLocation")),
  );
  const core = api.state as CoreState;
  const building =
    [...core.organizations.values()]
      .filter(
        (o) =>
          o.placeId === townPlaceId &&
          ((o as { classification?: string }).classification?.startsWith(
            "government:",
          ) ||
            o.kind === "government" ||
            o.kind === "local-government"),
      )
      .map((o) => o.id)
      .sort()[0] ?? null;
  if (!building) {
    // stopgapId: SG-GOV-polling-place-kind
    api.stopgap("SG-GOV-polling-place-kind");
  }
  const out: PollingPlaceRow[] = [];
  for (let precinct = 1; precinct <= precincts; precinct += 1) {
    const row: PollingPlaceRow = {
      id: `polling-place:${townPlaceId}:${precinct}`,
      placeId: townPlaceId,
      precinct,
      precincts,
      buildingId: building,
      kind: building ? "government-building" : "unread",
      pollWorkers: null,
      source: PLACES_SOURCE,
    };
    rows.put(row as unknown as ModuleRow);
    out.push(row);
  }
  return out;
}

/** The precinct a household votes in: its place in the order of the town's households. */
function precinctOfHousehold(
  api: CoreAPI,
  householdId: string,
  precincts: number,
): number {
  const memo = precinctMemo.get(api.state);
  const map =
    memo?.date === api.state.date && memo.precincts === precincts
      ? memo.map
      : precinctMap(api, precincts);
  return map.get(householdId) ?? 1;
}

/** Every town household's precinct, once a day. */
function precinctMap(api: CoreAPI, precincts: number): Map<string, number> {
  const homes = [
    ...new Set(
      townAdults(api).map(
        (p) => (p as { householdId?: string }).householdId ?? p.id,
      ),
    ),
  ].sort();
  const map = new Map(
    homes.map((home, index) => [
      home,
      Math.min(precincts - 1, Math.floor((index * precincts) / homes.length)) +
        1,
    ]),
  );
  precinctMemo.set(api.state, { date: api.state.date, precincts, map });
  return map;
}
const precinctMemo = new WeakMap<
  object,
  { date: string; precincts: number; map: Map<string, number> }
>();

/**
 * How many wards a council contest's seat is one of: the seats its office
 * elects by part of town. 0 for an at-large seat or any other office.
 */
function wardsOf(api: CoreAPI, contest: ContestRow): number {
  if (contest.family !== "municipalOffice" || contest.district === null)
    return 0;
  return (
    api
      .moduleState(OFFICES_MODULE_ID)
      .table("seats")
      .query("byOffice", [contest.officeId]) as unknown as SeatInput[]
  ).filter((s) => s.district !== null).length;
}

/**
 * Whether a named voter's household is in the ward a contest's seat
 * represents. Wards are drawn to near equal population: the town's
 * households in their recorded order are cut where each ward has its share
 * of the town's adults, a household falling in the ward its middle adult
 * does. The town has no street map, so no ward has a boundary
 * (SG-GOV-ward-map).
 */
function inWard(
  api: CoreAPI,
  voter: Readonly<PersonState>,
  wards: number,
  ward: number,
): boolean {
  const home = (voter as { householdId?: string }).householdId ?? voter.id;
  const memo = wardMemo.get(api.state);
  const map =
    memo?.date === api.state.date && memo.wards === wards
      ? memo.map
      : wardMap(api, wards);
  return (map.get(home) ?? 1) === ward;
}

/** Every town household's ward, once a day. */
function wardMap(api: CoreAPI, wards: number): Map<string, number> {
  const adults = new Map<string, number>();
  for (const p of townAdults(api)) {
    const home = (p as { householdId?: string }).householdId ?? p.id;
    adults.set(home, (adults.get(home) ?? 0) + 1);
  }
  const total = [...adults.values()].reduce((a, b) => a + b, 0);
  const map = new Map<string, number>();
  let before = 0;
  for (const home of [...adults.keys()].sort()) {
    const n = adults.get(home)!;
    map.set(
      home,
      Math.min(
        wards - 1,
        Math.floor(((before + n / 2) * wards) / Math.max(1, total)),
      ) + 1,
    );
    before += n;
  }
  wardMemo.set(api.state, { date: api.state.date, wards, map });
  recordRedistricting(api, wards);
  return map;
}
const wardMemo = new WeakMap<
  object,
  { date: string; wards: number; map: Map<string, number> }
>();

/** A named voter's precinct, from 0: which form of a rotated ballot they hold. */
function precinctIndexOf(api: CoreAPI, voter: Readonly<PersonState>): number {
  const precincts = pollingPlaces(api).length;
  if (!precincts) return 0;
  const home = (voter as { householdId?: string }).householdId ?? voter.id;
  return precinctOfHousehold(api, home, precincts) - 1;
}

/**
 * A voter's polling place on an election day, with who works it that day
 * (a reading of the records; nothing is written):
 * the precinct's named adults who rank first by their own sense of duty, how
 * closely they follow politics and the hours their work leaves free that
 * day, as many as the national count of poll workers per voting location.
 * Null for someone who doesn't live in town.
 */
export function pollingPlaceOf(
  api: CoreAPI,
  personId: string,
  date: string,
): PollingPlaceRow | null {
  const person = api.state.people.get(personId);
  const { townPlaceId } = town(api);
  if (!person || person.placeId !== townPlaceId) return null;
  const places = pollingPlaces(api);
  if (!places.length) return null;
  const home = (person as { householdId?: string }).householdId ?? person.id;
  const place = places[precinctOfHousehold(api, home, places.length) - 1]!;
  const precinctOf = new Map<string, number>();
  const ranked = townAdults(api)
    .filter((p) => {
      const h = (p as { householdId?: string }).householdId ?? p.id;
      if (!precinctOf.has(h))
        precinctOf.set(h, precinctOfHousehold(api, h, places.length));
      return (
        precinctOf.get(h) === place.precinct && !barredFromVoting(api, p.id)
      );
    })
    .map((p) => {
      const { duty, cost } = turnoutReasons(api, p, undefined, 0);
      return { id: p.id, score: duty - cost };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, Math.round(electionsParameter("pollWorkersPerVotingLocation")));
  // Read only: who works it is the reading of the records on the day asked.
  return { ...place, pollWorkers: { date, ids: ranked.map((r) => r.id) } };
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
  // A ward seat is chosen by the voters of its ward alone; an at-large seat
  // by the whole town. A named adult the state's law bars for a felony
  // conviction can't vote.
  const wards = wardsOf(api, contest);
  const ward = wards > 0 ? Number(contest.district) : 0;
  // stopgapId: SG-GOV-ward-map
  if (wards > 0) api.stopgap("SG-GOV-ward-map");
  const named = townAdults(api).filter(
    (p) =>
      !barredFromVoting(api, p.id) && (!wards || inWard(api, p, wards, ward)),
  );
  const playerId = (api.state as CoreState).playerId ?? null;
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
    if (chosen && !decided.votes) recordChosenVote(api, voter.id);
    const t = chosen ? { ...decided, votes: true } : decided;
    // The same choice rule as every voter's: the one they rank first where
    // something separates them from the next; a lone candidate only where
    // they are for them; else they leave the race blank.
    // A candidate in the race backs themselves; anyone else by the one
    // choice rule.
    const choice = chosen
      ? chosen.candidateId
      : !t.votes
        ? null
        : filings.some((f) => f.personId === voter.id)
          ? voter.id
          : countedChoice(appeal);
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
    // The reasons behind a ballot (each candidate's appeal terms, the record
    // reasons, why they turned out) are kept for the player's circle and when
    // bookkeeping is on; everyone else's ballot keeps who voted and the choice,
    // which is all the turnout and results reads take.
    const why = keepsWhy(api.state as CoreState, voter.id);
    table(api, "ballots").put({
      id: `ballot:${contestId}:${voter.id}`,
      contestId,
      voterId: voter.id,
      date,
      voted: t.votes,
      choice,
      toldPollster: told,
      ...(why
        ? {
            turnoutReasons: turnoutRecord(t),
            appeal,
            basis,
            lean,
            recordReasons,
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
  let countedVoted = 0;
  let countedEligible = 0;
  const field = countedField(api, contest, filings);
  const kept = {
    voterIds: [] as string[],
    voted: [] as number[],
    choice: [] as number[],
    lean: [] as number[],
    incumbentLean: [] as number[],
    trust: [] as number[],
    duty: [] as number[],
    interest: [] as number[],
    cost: [] as number[],
    weight: [] as number[],
  };
  const countedAdults = wards > 0 ? countedAdultsToday(api) : 0;
  let countedAdultIndex = 0;
  for (const voter of countedResidents(api.state as CoreState)) {
    if (voter.placeId !== townPlaceId) continue;
    const age = ageOn(voter, date);
    if (age < 18) continue;
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
    const appeal = countedAppeal(lean, field, {
      inTown: true,
      local: true,
      incumbentLean,
      trust: trustWeight(api, lean),
      // The town's people hold each form of a rotated ballot in turn.
      ballotForm: kept.voterIds.length,
    });
    const t = atThePolls(
      api,
      voter,
      contest.electionDate,
      cycleCost,
      voter.weeklyMinutes,
    );
    const choice = countedChoice(appeal);
    kept.voterIds.push(voter.id);
    kept.voted.push(t.propensity);
    kept.choice.push(choice ? field.findIndex((f) => f.id === choice) : -1);
    kept.lean.push(lean);
    kept.incumbentLean.push(incumbentLean);
    kept.trust.push(trustWeight(api, lean));
    kept.duty.push(t.duty);
    kept.interest.push(t.interest);
    kept.cost.push(t.cost);
    kept.weight.push(voter.weight);
    countedVoted += t.propensity * voter.weight;
    if (choice)
      countedVotes[choice] =
        (countedVotes[choice] ?? 0) + t.propensity * voter.weight;
  }
  table(api, "countedBallots").put({
    id: `counted:${contestId}`,
    contestId,
    date,
    field,
    ...kept,
  } as unknown as ModuleRow);
  // Each counted resident stands for the town's people like them; those who
  // aren't citizens (the place's ACS share) and those barred for a felony
  // conviction (the share a restoration law in force returns is counted
  // back) can't vote.
  const scale = countedScale(api);
  for (const id of Object.keys(countedVotes))
    countedVotes[id] = Math.round(countedVotes[id]! * scale);
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
  const placeVotes = Object.fromEntries(
    Object.entries(wider?.votes ?? {}).map(([id, n]) => [id, Math.round(n)]),
  );
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
  const winnerCandidateId = tied
    ? breakElectionTie(
        api,
        contest,
        ranked.filter((r) => r[1] === ranked[0]![1]).map((r) => r[0]),
        secondElection,
        electorate,
      )
    : ranked.length === 1
      ? // One name on the ballot wins unopposed, whatever the turnout.
        ranked[0]![0]
      : ranked.length && ranked[0]![1] > 0
        ? ranked[0]![0]
        : null;
  const winnerId = winnerCandidateId
    ? winningPersonId(api, winnerCandidateId)
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
    countedTurnout: countedVoted,
    countedEligible,
    placeVotes,
    totals,
    namedTurnout: voted,
    namedEligible: named.length,
    electorate,
    winnerId,
    winnerCandidateId,
    takesOffice: winnerId ? takesOffice : null,
    exitPoll,
    ...(reasons ? { electorateReasons: reasons } : {}),
    ...(wider ? { placesCast: wider.cast } : {}),
  };
  table(api, "results").put(result as unknown as ModuleRow);
  // The election laws in force were applied to this electorate: who was
  // mailed a ballot, who registered at the polls, and what the election's
  // administration cost the government that ran it.
  applyElectionLaws(api, "vote", electorateRoll(api), contestId);
  api.emit({
    id: `election-result:${contestId}`,
    date,
    kind: "election-result",
    personIds: filings
      .map((f) => winningPersonId(api, f.personId))
      .filter((id) => api.state.people.has(id)),
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
      ...mandateLean(api, winnerId),
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
  const vacancy =
    row.method === "vacancy"
      ? unfilledTerm(
          api,
          contest.seatId,
          String(row.resultId),
          termEndAfter(office, regularElectionDate(contest)),
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
    status: "resolved",
    resolvedOn: api.state.date,
    vacancyId: vacancy?.id ?? repeated?.id ?? null,
    nextSpecialOn: repeated?.electionDate ?? null,
  });
  if (!contest.special) openNextCycle(api, contest.seatId);
}

/**
 * What a result tells the people who learn it about where the town is
 * going: the question the winner stood for most firmly, and which way. The
 * views engine reads it like a speech: it moves the stance on that question
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
  const top = [...candidateFacts(api, filing, contest).platform].sort(
    (a, b) =>
      Math.abs(b.position) - Math.abs(a.position) ||
      a.question.localeCompare(b.question),
  )[0];
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
      people += v.weight;
      if (ageOn(v, date) >= 18) adults += v.weight;
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
    weight?: number;
  }[] = counted.length
    ? counted
    : [...api.state.people.values()].filter(
        (p) =>
          p.alive &&
          p.placeId === townPlaceId &&
          ageOn(p, today) >= 18 &&
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
          habit: 0,
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
    (f) => f.personId === (result.winnerCandidateId ?? result.winnerId),
  );
  // The incumbent who stood again: the seat's holder when filing closed.
  const previous = result.winnerId.startsWith(officialCandidateId(""))
    ? (terms.get(
        result.winnerId.slice(officialCandidateId("").length),
      ) as unknown as TermRow | undefined)
    : undefined;
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

function countedRow(
  api: CoreAPI,
  contestId: string,
): CountedBallotsRow | undefined {
  return table(api, "countedBallots").get(`counted:${contestId}`) as unknown as
    CountedBallotsRow | undefined;
}

/** The engine's own reading of one kept counted ballot. */
function countedBallotAt(row: CountedBallotsRow, i: number): CountedBallotRow {
  const choice = row.choice[i]!;
  return {
    id: `ballot:${row.contestId}:${row.voterIds[i]!}`,
    contestId: row.contestId,
    voterId: row.voterIds[i]!,
    date: row.date,
    counted: true,
    turnout: row.voted[i]!,
    turnoutReasons: {
      duty: row.duty[i]!,
      interest: row.interest[i]!,
      cost: row.cost[i]!,
      propensity: row.voted[i]!,
    },
    choice: choice >= 0 ? row.field[choice]!.id : null,
    appeal: countedAppeal(row.lean[i]!, row.field, {
      inTown: true,
      local: true,
      incumbentLean: row.incumbentLean[i]!,
      trust: row.trust?.[i] ?? 1,
      ballotForm: i,
    }),
    basis: "party-name-incumbency",
    lean: row.lean[i]!,
    weight: row.weight?.[i] ?? 1,
  };
}

/** Why one counted resident voted as they did: their ballot and its reasons. */
export function countedBallotOf(
  api: CoreAPI,
  contestId: string,
  voterId: string,
): CountedBallotRow | null {
  const row = countedRow(api, contestId);
  const i = row ? row.voterIds.indexOf(voterId) : -1;
  return row && i >= 0 ? countedBallotAt(row, i) : null;
}

/** Every counted resident's ballot in a contest, with its reasons. */
export function countedBallotsOf(
  api: CoreAPI,
  contestId: string,
): readonly CountedBallotRow[] {
  const row = countedRow(api, contestId);
  return row ? row.voterIds.map((_, i) => countedBallotAt(row, i)) : [];
}

export function resultOf(api: CoreAPI, contestId: string): ResultRow | null {
  return (
    (table(api, "results").get(`result:${contestId}`) as unknown as
      ResultRow | undefined) ?? null
  );
}

export { campaignFor };

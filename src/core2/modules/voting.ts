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
 *
 * The same engine counts every race the town doesn't vote in, at every level
 * (the end of this file): a state or federal seat elsewhere and each state's
 * electors for the presidency. Every count, here or there, is kept by one
 * writer (`keepCount`) and seated by the one term writer (`seatWinner`).
 */
import senateClasses from "../../../data/research/offices/senate-classes-2026.json" with { type: "json" };
import contingentData from "../data/elections/contingent-election.json" with { type: "json" };
import electorsData from "../data/elections/electoral-votes.json" with { type: "json" };
import { contingentElection } from "../contingent-election";
import { lawChain } from "./laws";
import { placeStateKeys } from "../places";
import territoryPlaces from "../data/places/territory-places.json" with { type: "json" };
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
import { ageOnElection, turnoutWeb } from "../turnout-web";
import {
  openingVoterCarry,
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
import {
  decisionLean,
  decisionTraitWeight,
  leanedYes,
  reportOutcome,
} from "../trait-decisions";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import { campaignParameter, personLean, type Stance } from "../campaign-views";
import { basePlaces } from "../race-places";
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
  isLocalFamily,
  registerWardResidency,
  keepPetitionCheck,
  openPetition,
  petitionOf,
  type ContestRow,
  type FilingRow,
} from "./elections";
import {
  CAMPAIGNS_MODULE_ID,
  townLean,
  campaignFor,
  impressionOf,
  parsePlatform,
  pledgesOf,
  registerDoorChoice,
  type DoorVisit,
  type PledgeRow,
} from "./campaigns";
import {
  OFFICES_MODULE_ID,
  registerSpecialElections,
  seatWinner,
  townSeats,
  endServingTerms,
  unfilledTerm,
  repeatSpecialElection,
  type TermRow,
} from "./offices";
import { holderOf, officialCandidate } from "./officials";
import {
  governorPartyAtOpening,
  stateOffices,
  type SeatInput,
} from "../offices-state";
import type { OfficeInput } from "../offices-local";
import {
  novemberGeneralElectionDay,
  termEndAfter,
  termStartAfter,
} from "../elections-calendar";
import { drawOfficialIdentity } from "../officials-identity";
export { candidateIdentity } from "../candidate-identity";
export { citizenShareOf } from "../electorate-places";
import {
  PARTIES_MODULE_ID,
  joinParty,
  partiesHere,
  partyTie,
  stateParties,
} from "./parties";
import { ballotCuesOf, ballotForms, ballotOrderRule } from "../ballot-order";
import { caucusSide, nationalParty, partySide } from "../appointments";
import { promisesOf, recordAppeal, votesOf, type RecordReason } from "./record";
import { candidacyModule, CANDIDACY_MODULE_ID } from "./candidacy";
import {
  agreementWith,
  countedStanceProfile,
  VIEWS_DATA,
  VIEWS_MODULE_ID,
  VIEWS_SPEAKER_KEY,
  viewOf,
  viewsModule,
} from "./views";
import {
  citizenShareOf,
  housePlace,
  legislativePlace,
  publishedSenateSeats,
  statePlaces,
  worldRoster,
  worldSeatParty,
  type ElectoratePlace,
} from "../electorate-places";
import {
  appealOfShare,
  candidateInputs,
  candidateReasons,
  electorateChange,
  electorateParameter,
  presidentSide,
  raceConditions,
  rememberOpeningElectorate,
  type CandidateInputs,
  type CandidateReasons,
} from "../electorate-inputs";
import { scandalsOf } from "./corruption";
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
    /** Their door "yes" as a word to vote, where they gave one. */
    readonly pledge?: number;
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
        /** Their own "yes" at the candidate's door, as far as it still holds. */
        readonly pledge?: number;
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
  /** Why they told or declined: how closely they follow politics and how much the day's races mattered to them. */
  readonly pollsterReasons?: {
    readonly engagement: number;
    readonly interest: number;
    /** Their trait lean toward telling, before the decision's weight. */
    readonly lean: number;
  };
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
  /** Each voter's faith and degree against their age band's average (null where none is recorded; absent on rows kept before the loadings). */
  readonly faith?: readonly (number | null)[];
  readonly college?: readonly (number | null)[];
  /** Each voter's door "yes" as it held on the day (null where they gave none; absent on rows kept before pledges). */
  readonly pledges?: readonly (Readonly<Record<string, number>> | null)[];
  /** Where one household of a record's several gave a door "yes", the field index it voted for on its word (-1 otherwise). */
  readonly pledgedChoice?: readonly number[];
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
  /** Their door "yes" as a word to vote, where they gave one. */
  readonly pledge?: number;
  /** The outcome web's month record that moved the propensity, and the links in it. */
  readonly web?: {
    readonly recordId: string;
    readonly links: readonly string[];
  };
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
      /** Each contest's returns as the night reports them, place by place. */
      returns: {},
      /** The races the town doesn't vote in: each seat's race and the presidency's electors. */
      races: { indexes: { byDate: { fields: ["date"] } } },
      /** Congress seats outside the town's state: who holds them now. */
      seats: {},
      /** A presidential election the electors left to the House and the Senate: every vote, with its parts. */
      contingent: {},
      /** Whether the world counts the races the town doesn't vote in. */
      world: {},
    },
  },
  onCalendarWork: votingCalendarWork,
  // A filing's petition opens the day it is filed, and the clerk's check of
  // it goes on the calendar (`openFilingPetition`).
  eventKinds: ["candidate-filed"],
  onEvent: (api, event) => {
    const filingId = event.facts?.filingId;
    if (typeof filingId === "string") openFilingPetition(api, filingId);
  },
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
  // Who runs is decided by people from their own records in every world
  // (engine map line 23): candidacy is the one way onto a ballot besides the
  // player's own filing and a party's statewide nominee. It weighs what each
  // person thinks, so a world that votes keeps its people's views.
  if (!core.modules.has(VIEWS_MODULE_ID)) registerModule(core, viewsModule);
  if (!core.modules.has(CANDIDACY_MODULE_ID))
    registerModule(core, candidacyModule);
  const api = coreAPI(core);
  registerWardResidency(candidateInWard);
  registerDoorChoice(doorChoiceOf);
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

/**
 * Open a petitioning filing's petition: the signatures its side's law asks,
 * the count this world's clerk checks (`petitionNeededHere`) and its
 * deadline, with the clerk's check on the calendar the morning after it.
 */
function openFilingPetition(api: CoreAPI, filingId: string): void {
  const filing = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("filings")
    .get(filingId) as unknown as FilingRow | undefined;
  if (filing?.status !== "petitioning") return;
  const held = petitionOf(api, filingId);
  if (held && !held.check && held.opened === filing.filedOn) return;
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(filing.contestId) as unknown as ContestRow;
  const rule = filingRulesFor(
    api,
    contest,
    filing.party ? "party" : "independent",
  ).petition;
  const petition = openPetition(api, filing, {
    rule,
    needed: petitionNeededHere(api, contest, rule.count),
  });
  // Where the law asks no signatures, the clerk takes the filing at the
  // counter: nothing to circulate.
  if (petition.needed === 0) {
    keepPetitionCheck(api, filing.id, { valid: 0, struckIds: [] });
    return;
  }
  const key = `petition-check:${filing.id}:${petition.opened}`;
  const calendar = api.moduleCalendar(VOTING_MODULE_ID);
  if (calendar.get(key)) return;
  calendar.schedule({
    key,
    date: dayAfter(petition.due),
    kind: "petition-check",
    source: {
      tag: rule.basis === "read" ? "SOURCED" : "ESTIMATED",
      citation: rule.source,
      asOf: api.state.date,
      ...(rule.basis === "read"
        ? {}
        : { estimatedFrom: "SG-GOV-petition-count-estimated" }),
    },
    sourceRecordIds: [petition.id],
  });
}

/**
 * The signatures a petition needs in this world: the law's count where the
 * town is the district. Where the district reaches past the town, the
 * world holds no one outside it to sign, so the clerk counts the town's
 * share of the law's count by eligible voters, at least one; where the
 * district's voters are not on record (an island area's), by the town's
 * share of its people (`districtPeopleShare`).
 */
function petitionNeededHere(
  api: CoreAPI,
  contest: ContestRow,
  count: number,
): number {
  if (count <= 0) return 0;
  const { places } = basePlaces(api, contest);
  const total = places.reduce((n, p) => n + p.eligible, 0);
  const share =
    places.length && total > 0
      ? Math.min(
          1,
          electorateRoll(api).reduce((n, v) => n + v.count, 0) / total,
        )
      : contest.level === "state" || contest.level === "federal"
        ? districtPeopleShare(api, contest)
        : 1;
  if (share >= 1) return count;
  // stopgapId: SG-GOV-petition-town-share
  api.stopgap("SG-GOV-petition-town-share");
  return Math.max(1, Math.ceil(count * share));
}

const islandPeople = new Map<string, number>();
for (const row of territoryPlaces.rows as readonly (readonly unknown[])[])
  islandPeople.set(
    String(row[2]),
    (islandPeople.get(String(row[2])) ?? 0) + Number(row[5]),
  );

/**
 * The town's share of a state or federal district's people where its
 * voters are not on record: the town's people over the island area's
 * villages' people (their 2020 counts), shared among the office's
 * districts; the whole count where neither is recorded.
 */
function districtPeopleShare(api: CoreAPI, contest: ContestRow): number {
  const people = islandPeople.get(town(api).stateKey.slice(3)) ?? 0;
  const districts =
    contest.family === "stateLegislative"
      ? new Set(
          (
            api
              .moduleState(OFFICES_MODULE_ID)
              .table("seats")
              .query("byOffice", [contest.officeId]) as unknown as {
              district?: string | null;
            }[]
          ).map((s) => s.district ?? ""),
        ).size || 1
      : 1;
  const own = Number(api.state.placeMetadata.referencePopulation);
  return people > 0 && own > 0 ? Math.min(1, (own * districts) / people) : 1;
}

/**
 * The clerk's check of a petition, the morning after its deadline: each
 * signature stands where its signer is on the count's roll that day (alive,
 * living in the town, of voting age, not barred), and is struck otherwise.
 * Enough standing puts the filing on the ballot; too few leave it short.
 */
function checkPetition(api: CoreAPI, petitionId: string): void {
  const filingId = petitionId.slice("petition:".length);
  const petition = petitionOf(api, filingId);
  if (!petition || petition.check) return;
  const roll = new Set(electorateRoll(api).map((v) => v.id));
  const struckIds = petition.signers
    .filter((s) => !roll.has(s.personId))
    .map((s) => s.personId);
  keepPetitionCheck(api, filingId, {
    valid: petition.signers.length - struckIds.length,
    struckIds,
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
  if (work.kind === "petition-check")
    checkPetition(api, work.sourceRecordIds[0]!);
  if (work.kind === "primary") holdPrimary(api, work.sourceRecordIds[0]!);
  if (work.kind === "election-day") holdElection(api, work.sourceRecordIds[0]!);
  if (work.kind === "take-office") takeOffice(api, work.sourceRecordIds[0]!);
  if (work.kind === "empty-term")
    resolveEmptyRace(api, work.sourceRecordIds[0]!);
  raceWork(api, work);
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

/**
 * The candidates a named voter told at the door they would vote for in this
 * contest, each with how far that word still holds: 1 as given, less by
 * what heavy they learned since (`pledgeDoubt`). Nothing is rolled.
 */
function namedPledges(
  api: CoreAPI,
  voter: Readonly<PersonState>,
  lean: number,
  contestId: string,
  field: readonly CountedFieldEntry[],
): Readonly<Record<string, number>> | undefined {
  // Only a "yes" to a candidate on this ballot counts.
  const pledges = pledgesOf(api, voter.id).filter(
    (p) =>
      p.contestId === contestId && field.some((f) => f.id === p.candidateId),
  );
  if (!pledges.length) return undefined;
  const held: Record<string, number> = {};
  for (const pledge of pledges)
    held[pledge.candidateId] = 1 - pledgeDoubt(api, voter, lean, pledge, field);
  return held;
}

/**
 * How far something heavy the voter learned since their "yes" at the door
 * undoes it, 0 to 1, read from their own records (owner, Oct 29: near-binding
 * unless something heavy changes their mind): a scandal story about the
 * candidate that reached them after they said it, by how far they trust the
 * press; a rival in the race they are closer to than the candidate; and the
 * candidate's promises they heard made that the candidate's votes have broken
 * since. Each slides; none flips.
 */
export function pledgeDoubt(
  api: CoreAPI,
  voter: Readonly<PersonState>,
  lean: number,
  pledge: PledgeRow,
  field: readonly { readonly id: string }[],
): number {
  const scandal = scandalStoriesOf(
    api,
    pledge.candidateId,
    api.state.date,
  ).some(
    (storyId) =>
      (api.knows(voter.id, newsKey(storyId))?.learnedAt ?? "") > pledge.date,
  )
    ? trustWeight(api, lean)
    : 0;
  const own = relationshipWith(api, voter, pledge.candidateId);
  let rival = 0;
  for (const entry of field)
    if (entry.id !== pledge.candidateId)
      rival = Math.max(rival, relationshipWith(api, voter, entry.id) - own);
  const heard = promisesOf(api, pledge.candidateId).filter(
    (status) =>
      status.status !== "open" && api.knows(voter.id, status.promise.id),
  );
  const votes = heard.length ? votesOf(api, pledge.candidateId) : [];
  const broken = heard.filter(
    (status) =>
      status.status === "broken" &&
      (votes.find((v) => v.id === status.voteId)?.date ?? "") > pledge.date,
  ).length;
  const brokenShare = heard.length ? broken / heard.length : 0;
  return Math.min(1, Math.max(0, scandal + rival + brokenShare));
}

/**
 * A counted voter's door "yes" in this contest, each held by how far the
 * town's scandal story about the candidate reached the town's people and the
 * voter trusts it: the one heavy reason a counted record can know (it has no
 * ties and hears no promises), times its count like every other term.
 */
function countedPledges(
  api: CoreAPI,
  voterId: string,
  trust: number,
  contestId: string,
  field: readonly CountedFieldEntry[],
): Readonly<Record<string, number>> | undefined {
  // Only a "yes" to a candidate on this ballot counts.
  const pledges = pledgesOf(api, voterId).filter(
    (p) =>
      p.contestId === contestId && field.some((f) => f.id === p.candidateId),
  );
  if (!pledges.length) return undefined;
  const scandalFull = appealOfShare(electorateParameter("scandalShare"));
  const held: Record<string, number> = {};
  for (const pledge of pledges) {
    const entry = field.find((f) => f.id === pledge.candidateId);
    const reached = scandalFull > 0 ? (entry?.scandal ?? 0) / scandalFull : 0;
    held[pledge.candidateId] = 1 - Math.min(1, Math.max(0, reached * trust));
  }
  return held;
}

/**
 * How a counted record's voters divide when it carries a door "yes": a door
 * reaches one household, never the whole record, so where the record stands
 * for several, that one votes on its word and the others as they would have
 * without it (one model, two tiers). Without a pledge, the whole record votes
 * one way.
 */
function countedSplit(
  choice: string | null,
  pledges: Readonly<Record<string, number>> | undefined,
  weight: number,
  without: () => string | null,
): readonly (readonly [string | null, number])[] {
  if (!pledges || weight <= 1) return [[choice, weight]];
  return [
    [choice, 1],
    [without(), weight - 1],
  ];
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
    // Their faith and degree, where the views engine runs in this world.
    profile: api.state.modules.has(VIEWS_MODULE_ID)
      ? viewOf(api, voter.id)
      : undefined,
    pledges: namedPledges(api, voter, lean, contest.id, view.field),
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
        scandal +
        parts.pledge,
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
      pledge: parts.pledge,
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
      // The race's standing carries the average incumbency advantage: the
      // town's average incumbent lean is what each voter's own is read against.
      ...(standing && facts.isIncumbent
        ? { incumbentLeanCenter: townIncumbentLean(api) }
        : {}),
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
  const adultAge = api.parameter("votingAge");
  const date = api.state.date;
  let n = 0;
  for (const v of countedResidents(api.state as CoreState))
    if (v.placeId === townPlaceId && ageOn(v, date) >= adultAge) n += v.weight;
  countedByDay.set(api.state, { date, n });
  return n;
}
const countedByDay = new WeakMap<object, { date: string; n: number }>();

/** The town's named adults today, from the place index. */
/**
 * Whether a named person votes in the town's contests on a date, by the
 * count's own rule (the one rule every reader of it uses: the count, the
 * director's polling place, the household who go along): alive, living in
 * the town, of voting age that day, and not barred by the law in force.
 */
export function mayVoteOn(
  api: CoreAPI,
  personId: string,
  date: string,
): boolean {
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return false;
  const person = api.state.people.get(personId);
  return Boolean(
    person?.alive &&
    person.placeId === town(api).townPlaceId &&
    ageOn(person, date) >= api.parameter("votingAge") &&
    !barredFromVoting(api, person.id),
  );
}

function townAdults(api: CoreAPI): readonly PersonState[] {
  const held = adultsByDay.get(api.state);
  if (held?.date === api.state.date && held.size === api.state.people.size)
    return held.rows;
  const { townPlaceId } = town(api);
  const date = api.state.date;
  const rows = [...(api.state.peopleByPlace.get(townPlaceId) ?? [])]
    .map((id) => api.state.people.get(id))
    .filter((p): p is PersonState => !!p && mayVoteOn(api, p.id, date))
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

const incumbentLeanByDay = new WeakMap<
  object,
  { readonly date: string; readonly mean: number }
>();

/** The town's adults' average incumbent side of their traits, each counted record weighed by the people it stands for. */
function townIncumbentLean(api: CoreAPI): number {
  const held = incumbentLeanByDay.get(api.state);
  if (held?.date === api.state.date) return held.mean;
  const { townPlaceId } = town(api);
  const adultAge = api.parameter("votingAge");
  let sum = 0,
    weight = 0;
  for (const voter of countedResidents(api.state as CoreState)) {
    if (
      voter.placeId !== townPlaceId ||
      ageOn(voter, api.state.date) < adultAge
    )
      continue;
    sum += incumbentLeanOf(api, voter) * voter.weight;
    weight += voter.weight;
  }
  const mean = weight > 0 ? sum / weight : 0;
  incumbentLeanByDay.set(api.state, { date: api.state.date, mean });
  return mean;
}

/** Each day's counted residents by id, for a door's answer (one map a day). */
const countedById = new WeakMap<
  object,
  { key: string; byId: Map<string, CountedVoter> }
>();

/**
 * Each candidate's appeal to a voter in this contest today, by the same rule
 * the ballot uses (their earlier word at a door included), for a campaign's
 * door to read as the resident's answer (`campaigns.ts` answerAtDoor): a full
 * person's own appeal; a counted resident's by their record, with a door
 * visit just now read as a full person's knowledge is (`appealFor`): they
 * know the candidate and the platform in person, in place of the town's share
 * of it, and the visit's warmth. Null where they are not of voting age or the
 * contest is not on a ballot; undefined where the world counts no ballots.
 */
export function doorAppealOf(
  api: CoreAPI,
  voterId: string,
  contestId: string,
  visit?: DoorVisit,
): Readonly<Record<string, CountedAppeal>> | null | undefined {
  if (!api.state.modules.has(VOTING_MODULE_ID)) return undefined;
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow | undefined;
  if (!contest) return null;
  const filings = ballot(api, contestId);
  if (!filings.length) return null;
  const adultAge = api.parameter("votingAge");
  const named = api.state.people.get(voterId);
  if (named) {
    if (!named.alive || ageOn(named, api.state.date) < adultAge) return null;
    return appealFor(api, named, contest, filings).appeal;
  }
  const core = api.state as CoreState;
  const all = countedResidents(core);
  const key = `${core.date}|${all.length}`;
  let held = countedById.get(core);
  if (held?.key !== key) {
    held = { key, byId: new Map(all.map((v) => [v.id, v])) };
    countedById.set(core, held);
  }
  const voter = held.byId.get(voterId);
  if (!voter || ageOn(voter, api.state.date) < adultAge) return null;
  const lean = personLean(api.state.people, voter, townLean(api));
  const field = countedField(api, contest, filings);
  const appeal: Record<string, CountedAppeal> = countedAppeal(lean, field, {
    inTown: true,
    local: true,
    incumbentLean: incumbentLeanOf(api, voter),
    trust: trustWeight(api, lean),
    profile: countedStanceProfile(api, voter),
    pledges: countedPledges(
      api,
      voter.id,
      trustWeight(api, lean),
      contestId,
      field,
    ),
  });
  const met = visit ? appeal[visit.candidateId] : undefined;
  if (visit && met) {
    const recognition =
      campaignParameter("countedRecognitionWeight") + visit.agreement;
    appeal[visit.candidateId] = {
      ...met,
      recognition,
      total: met.total - met.recognition + recognition + visit.warmth,
    };
  }
  return appeal;
}

/** Who a voter would vote for in this contest today (`doorAppealOf`'s first choice), or null for nobody; undefined where the world counts no ballots. */
export function doorChoiceOf(
  api: CoreAPI,
  voterId: string,
  contestId: string,
  visit?: DoorVisit,
): string | null | undefined {
  const appeal = doorAppealOf(api, voterId, contestId, visit);
  return appeal ? countedChoice(appeal) : appeal;
}

/** The incumbent's side of a voter's traits: stay with the known or try someone new. */
export function incumbentLeanOf(
  api: CoreAPI,
  voter: Readonly<Pick<PersonState, "id" | "traits">>,
): number {
  return (
    decisionTraitWeight(api.state, "voting.back-incumbent") *
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
  const adultAge = api.parameter("votingAge");
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
    if (v.placeId === townPlaceId && ageOn(v, date) >= adultAge)
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
 * A voter's reasons to vote apart from the race: every trait's lean between
 * voting and staying home (one term, weighted from the personality and civic
 * engagement study: duty and reliability reach it through the same lean),
 * how closely they follow politics (where PEOPLE's views engine runs; younger
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
): {
  readonly duty: number;
  readonly cost: number;
  /** The trait term inside the duty (the decision's weight times the lean), and the lean. */
  readonly trait: number;
  readonly lean: number;
} {
  const engagement = engagementOf(api.state as CoreState, voter);
  const lean = decisionLean(
    api.state,
    voter,
    "voting.turnout",
    "vote",
    "stay-home",
  );
  const trait = decisionTraitWeight(api.state, "voting.turnout") * lean;
  const duty =
    trait +
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
  return { duty, cost, trait, lean };
}

/** One voter's turnout on one day: its parts, the propensity, and (a named voter) the act. */
export interface TurnoutDecision extends TurnoutParts {
  /** The gap between the candidates in their own eyes, across the day's races. */
  readonly interest: number;
  readonly propensity: number;
  /** The web record behind the propensity's factor (absent where it did not move it). */
  readonly web?: {
    readonly recordId: string;
    readonly links: readonly string[];
  };
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
    /** Whether the day's ballot carries a local race (the web's local-turnout links move it). */
    readonly local?: boolean;
    /** How far their door "yes" to a candidate on the day's ballot still holds, 0 to 1 (a word to vote as well as how). */
    readonly pledged?: number;
  },
): TurnoutDecision {
  const map = decisions.get(api.state) ?? new Map<string, TurnoutDecision>();
  decisions.set(api.state, map);
  const key = `${input.date}|${voter.id}`;
  const hit = map.get(key);
  if (hit) return hit;
  const named = api.state.people.has(voter.id);
  const { duty, cost, trait, lean } = turnoutReasons(
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
    pledge: campaignParameter("doorPledgeTurnoutWeight") * (input.pledged ?? 0),
  };
  // The web's links the engine does not read itself, by this voter's age and place.
  const who = (api.state.people.get(voter.id) ?? voter) as {
    readonly placeId?: string;
    readonly birthDate?: string;
  };
  const web =
    who.placeId && who.birthDate
      ? turnoutWeb(
          api,
          who.placeId,
          ageOnElection(who.birthDate, input.date),
          undefined,
          input.local ?? false,
        )
      : null;
  const propensity = Math.min(1, propensityOf(parts) * (web ? web.factor : 1));
  // The audit's probe (off in play) sees the propensity with and without the trait term.
  reportOutcome("voting.turnout", voter.id, lean, "probability", (withTerm) =>
    withTerm
      ? propensity
      : Math.min(
          1,
          propensityOf({ ...parts, duty: parts.duty - trait }) *
            (web ? web.factor : 1),
        ),
  );
  let votes = false;
  if (named) {
    const act = namedTurnout(
      record?.carry ?? openingVoterCarry(voter.id),
      propensity,
    );
    votes = act.votes;
    records?.put({
      id: voter.id,
      elections: (record?.elections ?? 0) + 1,
      voted: (record?.voted ?? 0) + (votes ? 1 : 0),
      carry: act.carry,
      lastDate: input.date,
    } as unknown as ModuleRow);
  }
  const decision = {
    ...parts,
    interest: input.interest,
    propensity,
    votes,
    ...(web?.recordId && web.links.length
      ? { web: { recordId: web.recordId, links: web.links } }
      : {}),
  };
  map.set(key, decision);
  return decision;
}

/**
 * When filing closes: who runs is candidacy's, from people's own records
 * (installed in every world by `openVoting`). A statewide partisan race (no
 * district) still draws each major party's nominee where no one of that side
 * filed, since parties field statewide tickets: a named official, or a person
 * filled in to run for the party (SG-GOV-who-runs-stand-in).
 */
export function fileStandingCandidates(api: CoreAPI, contestId: string): void {
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(contestId) as unknown as ContestRow;
  const filings = api.moduleState(ELECTIONS_MODULE_ID).table("filings");
  // Whoever holds the seat when filing closes: an appointee to a vacancy,
  // never a holder who died or moved away.
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
  // Each nominee stands where the place's records say filings go, on the
  // same rules any candidate meets, and the filing is announced. A full
  // person who doesn't meet the rules isn't put on the ballot. The party's
  // nomination is made when filing closes, so its filing counts as on time.
  const put = (personId: string, party: string) => {
    if (ballot(api, contestId).some((f) => f.personId === personId)) return;
    if (
      api.state.people.has(personId) &&
      checkEligibility(api, personId, contestId, party).some(
        (c) => !c.met && c.rule !== "filing-deadline",
      )
    )
      return;
    // stopgapId: SG-GOV-who-runs-stand-in
    api.stopgap("SG-GOV-who-runs-stand-in");
    const filing: FilingRow = {
      id: `filing:${contestId}:${personId}`,
      contestId,
      personId,
      filedOn: api.state.date,
      filedWith: filingRulesFor(api, contest, "party").filedWith,
      platform: [],
      party,
      status: "on-ballot",
      how: "party nominee",
    };
    filings.put(filing as unknown as ModuleRow);
    announce(api, filing, contest);
  };
  const partisan =
    incumbent?.party ??
    (
      api
        .moduleState(OFFICES_MODULE_ID)
        .table("seats")
        .get(contest.seatId) as unknown as { party?: string | null } | undefined
    )?.party;
  if (
    (contest.level !== "federal" && contest.level !== "state") ||
    contest.district ||
    !partisan
  )
    return;
  for (const party of [-1, 1].map((side) => partyOnSide(api, side)))
    if (
      !ballot(api, contestId).some(
        (f) => partySide(f.party ?? null) === partySide(party),
      )
    ) {
      const nominee =
        officialCandidate(api, contest, party) ??
        officialCandidateId(`nominee:${party}:${contest.id}`);
      // The party's nominee is its member: a person filled in to run for it
      // joins it the day they file.
      const partyHere = api.state.modules.has(PARTIES_MODULE_ID)
        ? partiesHere(api).find((row) => row.name === party)
        : undefined;
      if (partyHere && api.state.people.has(nominee) && !partyTie(api, nominee))
        joinParty(api, nominee, partyHere.id);
      put(nominee, party);
    }
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
  // One trip to the polls covers the whole ballot: a local race on it counts.
  const localDay = localOnBallot(api, date);
  const { townPlaceId } = town(api);
  const adultAge = api.parameter("votingAge");
  const lean0 = townLean(api);
  const named = [...api.state.people.values()]
    .filter(
      (p) =>
        p.alive &&
        p.placeId === townPlaceId &&
        ageOn(p, date) >= adultAge &&
        !barredFromVoting(api, p.id),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const counted = countedResidents(api.state as CoreState).filter(
    (v) => v.placeId === townPlaceId && ageOn(v, date) >= adultAge,
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
        local: localDay,
        pledged: heldPledge(appeal),
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
      const trust = trustWeight(api, leanOf.get(voter.id) ?? 0);
      const where = {
        inTown: true,
        local: true,
        incumbentLean: incumbentLeanOf(api, voter),
        trust,
        // The town's people hold each form of a rotated ballot in turn.
        ballotForm: form,
        profile: countedStanceProfile(api, voter),
      };
      const pledges = countedPledges(api, voter.id, trust, contest.id, entries);
      const appeal = countedAppeal(leanOf.get(voter.id) ?? 0, entries, {
        ...where,
        pledges,
      });
      // Each counted voter stands for the town's people like them: their
      // vote counts at the share of them who turn out.
      const t = decideTurnout(api, voter, {
        date,
        interest: interestOf(appeal),
        extraCost,
        contacts: reached,
        pledged: heldPledge(appeal) / Math.max(1, voter.weight),
        recordedWeeklyMinutes: voter.weeklyMinutes,
        local: localDay,
      });
      const choice = countedChoice(appeal);
      // A record stands for `weight` real voters like it (one model, two tiers).
      for (const [backed, weight] of countedSplit(
        choice,
        pledges,
        voter.weight,
        () =>
          countedChoice(
            countedAppeal(leanOf.get(voter.id) ?? 0, entries, where),
          ),
      ))
        if (backed)
          votes[backed] = (votes[backed] ?? 0) + t.propensity * weight;
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
  // Who the primary puts out, named on its record so each hears it.
  const out: string[] = [];
  const lose = (filing: FilingRow) => {
    out.push(filing.personId);
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("filings")
      .put({ ...filing, status: "withdrawn" } as unknown as ModuleRow);
  };
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
      office: contest.title,
      method,
      votes: JSON.stringify(votes),
      namedVotes: String(namedVotes),
      outIds: JSON.stringify(
        out
          .map((id) => winningPersonId(api, id))
          .filter((id) => api.state.people.has(id))
          .sort(),
      ),
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
  /** Whether the question is a local one (a recall of a town seat), which the web's local-turnout links move. */
  local = false,
): TurnoutDecision {
  const date = api.state.date;
  return decideTurnout(api, voter, {
    date,
    interest: interestOf(appeal),
    extraCost: cycleTurnout(date).cost,
    contacts: 0,
    local,
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
    ...(t.pledge ? { pledge: t.pledge } : {}),
    ...(t.web ? { web: t.web } : {}),
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
/**
 * Whether the day's ballot carries a local race with candidates, a primary
 * or a general: a voter decides once a day whether to go, and one trip to the
 * polls covers the whole ballot, so a local race anywhere on it lets the web's
 * local-turnout links move them. Read once a day.
 */
function localOnBallot(api: CoreAPI, date: string): boolean {
  const key = `${api.state.date}|${date}`;
  const hit = localBallotByDay.get(api.state);
  if (hit?.key === key) return hit.local;
  const local = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  ).some(
    (c) =>
      (c.electionDate === date || c.primaryDate === date) &&
      isLocalFamily(c.family) &&
      ballot(api, c.id).length > 0,
  );
  localBallotByDay.set(api.state, { key, local });
  return local;
}
const localBallotByDay = new WeakMap<object, { key: string; local: boolean }>();

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
/**
 * A voter's reasons to tell the exit pollster how they voted, before
 * temperament: a base reluctance to stop for a stranger's questionnaire, more
 * readiness the more closely they follow politics (engaged people are the
 * ones surveys over-reach, Pew Research Center 2017) and the more the day's
 * races mattered to them (their own gap between the candidates).
 */
function pollsterCase(
  api: CoreAPI,
  voter: {
    readonly id: string;
    readonly birthDate?: string;
    readonly placeId?: string;
  },
  interest: number,
): {
  readonly case: number;
  readonly engagement: number;
  readonly interest: number;
} {
  const engagement =
    engagementOf(api.state as CoreState, voter) ?? NATIONAL_ENGAGEMENT;
  return {
    case:
      electionsParameter("exitPollBase") +
      electionsParameter("exitPollEngagementWeight") *
        (engagement - NATIONAL_ENGAGEMENT) +
      electionsParameter("exitPollInterestWeight") * interest,
    engagement,
    interest,
  };
}

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
  // Their door "yes" to a candidate on the day's ballot is also their word
  // that they will vote, as far as it holds (the pledge part of the appeal).
  let pledged = 0;
  if (named)
    for (const race of races) {
      const { appeal } = appealFor(api, named, race.contest, race.field);
      interest = Math.max(interest, interestOf(appeal));
      pledged = Math.max(pledged, heldPledge(appeal));
    }
  else {
    const lean = personLean(api.state.people, voter, townLean(api));
    const incumbentLean = incumbentLeanOf(api, voter);
    for (const race of races) {
      const appeal = countedAppeal(
        lean,
        countedField(api, race.contest, race.field),
        {
          inTown: true,
          local: true,
          incumbentLean,
          pledges: countedPledges(
            api,
            voter.id,
            1,
            race.contest.id,
            countedField(api, race.contest, race.field),
          ),
        },
      );
      interest = Math.max(interest, interestOf(appeal));
      // A door reached one of the households a counted record stands for:
      // its word to vote moves that share of the record (one model, two tiers).
      const weight = (voter as { readonly weight?: number }).weight ?? 1;
      pledged = Math.max(pledged, heldPledge(appeal) / Math.max(1, weight));
    }
  }
  return decideTurnout(api, voter, {
    date,
    interest,
    extraCost: cycleCost,
    contacts: named
      ? contactsOf(api, voter.id, candidates)
      : townContacts(api, date, candidates),
    ...(recordedWeeklyMinutes === undefined ? {} : { recordedWeeklyMinutes }),
    // One trip to the polls covers the whole ballot: a local race on it counts.
    local: localOnBallot(api, date),
    pledged,
  });
}

/** How far a voter's door "yes" in one race still holds, 0 to 1, read from the pledge part of their appeal. */
function heldPledge(
  appeal: Readonly<Record<string, { readonly pledge?: number }>>,
): number {
  const weight = campaignParameter("doorPledgeWeight");
  let held = 0;
  for (const a of Object.values(appeal))
    held = Math.max(held, weight > 0 ? (a.pledge ?? 0) / weight : 0);
  return Math.min(1, held);
}

/** A second election between the tied candidates, a tunable number of weeks on. */
export function secondElection(
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
/** The classification a town's own government is recorded under. */
const MUNICIPAL_GOVERNMENT = "service:municipal-government";

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
  // The town's own government, recorded as the disasters engine and the law
  // reach read it; a place with none on record has no building yet.
  const building =
    [...core.organizations.values()]
      .filter(
        (o) =>
          o.placeId === townPlaceId &&
          o.classification === MUNICIPAL_GOVERNMENT,
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

/**
 * The ward a contest's seat represents and the ward a would-be candidate's
 * household lives in; null for an at-large seat, or for a person whose
 * household the town's wards do not place.
 */
function candidateInWard(
  api: CoreAPI,
  contest: ContestRow,
  person: Readonly<PersonState>,
): { readonly seatWard: number; readonly homeWard: number } | null {
  const wards = wardsOf(api, contest);
  if (!wards) return null;
  const home = (person as { householdId?: string }).householdId ?? person.id;
  const memo = wardMemo.get(api.state);
  const map =
    memo?.date === api.state.date && memo.wards === wards
      ? memo.map
      : wardMap(api, wards);
  const ward = map.get(home);
  return ward === undefined
    ? null
    : { seatWard: Number(contest.district), homeWard: ward };
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
    if (choice) namedVotes[choice] = (namedVotes[choice] ?? 0) + 1;
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
    faith: [] as (number | null)[],
    college: [] as (number | null)[],
    /** Each voter's door "yes" as it held on the day (null where they gave none, or where it held for one household of several). */
    pledges: [] as (Readonly<Record<string, number>> | null)[],
    /** Where one household of a record's several gave a door "yes": the field index it voted for on its word (-1 otherwise). */
    pledgedChoice: [] as number[],
  };
  const countedAdults = wards > 0 ? countedAdultsToday(api) : 0;
  let countedAdultIndex = 0;
  for (const voter of countedResidents(api.state as CoreState)) {
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
      contestId,
      field,
    );
    const where = {
      inTown: true,
      local: true,
      incumbentLean,
      trust: trustWeight(api, lean),
      // The town's people hold each form of a rotated ballot in turn.
      ballotForm: kept.voterIds.length,
      profile: countedStanceProfile(api, voter),
    };
    const appeal = countedAppeal(lean, field, { ...where, pledges });
    const t = atThePolls(
      api,
      voter,
      contest.electionDate,
      cycleCost,
      voter.weeklyMinutes,
    );
    const pledgedChoice = countedChoice(appeal);
    // A door reached one of the households the record stands for: its word
    // holds for that one, and the record's kept choice is the rest's.
    const split = countedSplit(pledgedChoice, pledges, voter.weight, () =>
      countedChoice(countedAppeal(lean, field, where)),
    );
    const choice = split.at(-1)![0];
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
    const profile = countedStanceProfile(api, voter);
    // Module data holds JSON: a missing distance is kept as null.
    kept.faith.push(profile.faithFromAverage ?? null);
    kept.college.push(profile.collegeFromAverage ?? null);
    kept.pledges.push(split.length === 1 ? (pledges ?? null) : null);
    kept.pledgedChoice.push(
      split.length > 1 && pledgedChoice
        ? field.findIndex((f) => f.id === pledgedChoice)
        : -1,
    );
    countedVoted += t.propensity * voter.weight;
    for (const [backed, weight] of split)
      if (backed)
        countedVotes[backed] =
          (countedVotes[backed] ?? 0) + t.propensity * weight;
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
      tiedFirst(ranked)
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
  });
  const tied = tiedFirst(rankTotals(result.totals));
  const { winnerId, totals } = result;
  const winnerCandidateId = result.winnerCandidateId ?? null;
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
  // The presidency is won in the electoral college (`electoralCollege`);
  // this count is the town's state's popular vote.
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
      api.state.seed,
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
  const adultAge = api.parameter("votingAge");
  const today = api.state.date;
  const counted = countedResidents(api.state as CoreState).filter(
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

/** A count's candidates by votes, most first (ties by id). */
export function rankTotals(
  totals: Readonly<Record<string, number>>,
): [string, number][] {
  return Object.entries(totals).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}

/** Two or more candidates share first place on some votes. */
const tiedFirst = (ranked: readonly (readonly [string, number])[]) =>
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
function keepCount(
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
  const totals: Record<string, number> = {};
  for (const id of input.candidates)
    totals[id] =
      (named.votes[id] ?? 0) + (counted.votes[id] ?? 0) + (placeVotes[id] ?? 0);
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
  return result;
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
      : termEndAfter(office, regularElectionDate(contest)),
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
      pledges: row.pledges?.[i] ?? undefined,
      profile:
        row.faith && row.college && Number.isFinite(row.faith[i])
          ? {
              faithFromAverage: row.faith[i]!,
              ...(Number.isFinite(row.college[i])
                ? { collegeFromAverage: row.college[i]! }
                : {}),
            }
          : null,
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

// ---- The races the town doesn't vote in (M2-10) ----
//
// Every state and federal seat the town only sees from afar is elected on the
// real general election day, and its winner seated on the real date, by this
// same engine. Each race is counted on the one engine for everyone the world
// doesn't name (`electorate.ts`), at a coarser level: its places (a House
// district, a state's counties for the Senate, a governor and the presidency,
// a state legislative district's share of its state; `electorate-places.ts`)
// vote as the town's counted residents would on each place's own 2024 lean,
// weighted to its eligible voters. Nothing is rolled.

/** Whether this world counts the races the town doesn't vote in. */
export function worldRacesOpen(api: CoreAPI): boolean {
  return (
    api.state.modules.has(VOTING_MODULE_ID) &&
    table(api, "world").get("open") !== undefined
  );
}

/**
 * A race the town doesn't vote in: its seat, the lean of its places and who
 * won. Its count (each party's votes, each candidate's reasons, every
 * place's votes and the night's returns) is the one count's result record,
 * `resultId`.
 */
export interface RaceRow {
  readonly id: string;
  readonly seatId: string;
  readonly office: string;
  readonly date: string;
  readonly incumbentParty: string | null;
  /** The Republican two-party share of its places' 2024 vote. */
  readonly lean: number;
  readonly winnerParty: string;
  readonly seatedOn: string;
  readonly leanSource: string;
  /** The race's count, kept by the one count writer (`resultOf`). */
  readonly resultId: string;
}

/** A count by its result record's id (`ResultRow.id`). */
export function countRecord(api: CoreAPI, resultId: string): ResultRow | null {
  return (
    (table(api, "results").get(resultId) as unknown as ResultRow | undefined) ??
    null
  );
}

/** A race's count: the one count writer's result record. */
export function raceResult(api: CoreAPI, race: RaceRow): ResultRow | null {
  return countRecord(api, race.resultId);
}

/** Each major party's votes in a race the town doesn't vote in. */
export function raceVotes(
  api: CoreAPI,
  race: RaceRow,
): { readonly republican: number; readonly democratic: number } {
  const totals = raceResult(api, race)?.totals ?? {};
  return {
    republican: totals["party:R"] ?? 0,
    democratic: totals["party:D"] ?? 0,
  };
}

/** A race's Republican two-party share: its count's, else its places' lean where no one was counted. */
export function raceShare(api: CoreAPI, race: RaceRow): number {
  const result = raceResult(api, race);
  return (result && republicanShareOf(result)) ?? race.lean;
}

/**
 * Put the races the town doesn't vote in on the voting engine's calendar:
 * every state and federal seat it sees from afar, and the presidency's
 * electors (M2-10). The same count and the same term writer as the town's
 * own races.
 */
export function openWorldRaces(core: CoreState): void {
  if (!core.modules.has(VOTING_MODULE_ID)) registerModule(core, VOTING_MODULE);
  const api = coreAPI(core);
  table(api, "world").put({
    id: "open",
    since: core.date,
  } as unknown as ModuleRow);
  rememberOpeningElectorate(api);
  // A vacancy outside the town is filled by a race the world counts.
  registerSpecialElections(openSpecialRace, "world-races");
  let year = Number(core.date.slice(0, 4));
  if (novemberGeneralElectionDay(year) <= core.date) year += 1;
  scheduleElection(api, nextRaceYear(api, year));
}

/**
 * The first general election from `from`: every even year, and an odd year
 * when a legislative seat in the town's state outside the town is up then
 * (New Jersey and Virginia elect their legislatures in odd years).
 */
function nextRaceYear(api: CoreAPI, from: number): number {
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const legislative = new Set(
    (
      offices.table("offices").rows() as unknown as {
        id: string;
        kind: string;
        elected: boolean;
      }[]
    )
      .filter((o) => o.elected && o.kind.startsWith("legislature-"))
      .map((o) => o.id),
  );
  const oddYears = new Set(
    (
      offices.table("seats").rows() as unknown as {
        officeId: string;
        coversTown: boolean;
        electionYear?: number;
      }[]
    )
      .filter((s) => !s.coversTown && legislative.has(s.officeId))
      .map((s) => s.electionYear)
      .filter((y): y is number => y !== undefined && y % 2 === 1),
  );
  let year = from;
  while (
    year % 2 === 1 &&
    !oddYears.has(year) &&
    !governorRaces(api, year).length
  )
    year += 1;
  return year;
}

/**
 * Every other state's governor race held in `year`, by the state's own
 * cycle and term in its research row; the winner takes office on the
 * state's inauguration day for a November election.
 */
function governorRaces(api: CoreAPI, year: number): readonly Race[] {
  const townState = lawChain(api).stateKey;
  const electionDay = novemberGeneralElectionDay(year);
  const races: Race[] = [];
  for (const stateKey of placeStateKeys()) {
    if (stateKey === townState) continue;
    const office = stateOffices(stateKey, "", api.state.date).find(
      (entry) => entry.office.kind === "governor",
    )?.office;
    if (!office?.elected || !office.termYears || !office.nextElectionYear)
      continue;
    if ((year - office.nextElectionYear) % office.termYears !== 0) continue;
    // A territory's electorate has no counted places or major-party record.
    if (!statePlaces(stateKey.slice(3), api.state.seed).length) {
      // stopgapId: SG-GOV-territory-governor-race (a territory's governor race is not run: its electorate's places and its own parties are not on record)
      api.stopgap("SG-GOV-territory-governor-race");
      continue;
    }
    const seatId = `seat:${stateKey}:governor`;
    races.push({
      seatId,
      office: "governor",
      usps: stateKey.slice(3),
      code: "00",
      // The world's governor at Start: the published holder, unless this
      // world's vote carries the state across even against that party.
      incumbentParty: currentParty(
        api,
        seatId,
        worldSeatParty(
          api.state.seed,
          { kind: "governor", level: "state", jurisdiction: stateKey },
          { id: seatId, party: governorPartyAtOpening(stateKey) },
        ),
      ),
      leanSource: "2024 presidential vote in the state's counties",
      seatedOn: termStartAfter(office, electionDay),
    });
  }
  if (races.length) {
    // stopgapId: SG-GOV-world-governor-executive (another state's elected governor is kept as its seat's party and date; no engine acts as that state's executive)
    api.stopgap("SG-GOV-world-governor-executive");
  }
  return races;
}

function scheduleElection(api: CoreAPI, year: number): void {
  const date = novemberGeneralElectionDay(year);
  api.moduleCalendar(VOTING_MODULE_ID).schedule({
    key: `general:${year}`,
    date,
    kind: "general-election",
    source: {
      tag: "SOURCED",
      citation:
        "2 U.S.C. § 7; 3 U.S.C. § 1 (the Tuesday after the first Monday in November)",
      asOf: api.state.date,
    },
    sourceRecordIds: [String(year)],
  });
}

const classes = (
  senateClasses as unknown as {
    states: Record<
      string,
      { class: number; party: string; nextElection: number }[]
    >;
  }
).states;
const electors = electorsData as unknown as {
  toWin: number;
  states: Record<string, number>;
};
/** The vacancy a special race fills and the end of the term it serves. */
interface SpecialRace {
  readonly vacancyId: string;
  readonly termEnd: string | null;
}

/** A party's candidate in a special race, named. */
interface SpecialCandidate {
  readonly party: string;
  readonly side: number;
  readonly incumbent: boolean;
  readonly identity: TermRow["identity"];
}

interface Race {
  readonly seatId: string;
  readonly office: string;
  readonly usps: string;
  /** A House district's two-digit code. */
  readonly code: string;
  readonly incumbentParty: string | null;
  readonly leanSource: string;
  readonly seatedOn: string;
  readonly offices?: {
    readonly seatId: string;
    readonly officeId: string;
    readonly termYears: number | null;
  };
}

function raceWork(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  if (work.kind === "general-election") {
    const year = Number(work.sourceRecordIds[0]);
    scheduleElection(api, nextRaceYear(api, year + 1));
    for (const race of racesIn(api, year)) decide(api, race, year);
    if (year % 4 === 0)
      api.moduleCalendar(VOTING_MODULE_ID).schedule({
        key: `electors:${year}`,
        date: electorsMeet(year),
        kind: "electors-meet",
        source: {
          tag: "SOURCED",
          citation:
            "3 U.S.C. § 7 (electors meet the first Tuesday after the second Wednesday in December)",
          asOf: api.state.date,
        },
        sourceRecordIds: [String(year)],
      });
    return;
  }
  if (work.kind === SPECIAL_KIND) decideSpecial(api, work);
  if (work.kind === "seat-winner")
    seatRaceWinner(api, work.sourceRecordIds[0]!);
  if (work.kind === "electors-meet")
    electoralCollege(api, Number(work.sourceRecordIds[0]));
  if (work.kind === "contingent-election")
    decideContingent(api, Number(work.sourceRecordIds[0]));
  if (work.kind === "inauguration") inaugurate(api, work.sourceRecordIds[0]!);
}

const SPECIAL_KIND = "special-race";

/** The winner takes the seat the day after the count. */
const dayAfter = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);

/**
 * A vacancy in a seat outside the town (a House district or a state
 * legislative district) is filled by a real race: on the special election
 * day its places vote as they do in the general election, between the two
 * major parties' named candidates, and the winner serves the unexpired term.
 * Returns false for any other seat, which the other engines or the
 * stand-in fill.
 */
function openSpecialRace(
  api: CoreAPI,
  input: {
    readonly vacancyId: string;
    readonly seatId: string;
    readonly electionDate: string;
    readonly termEnd: string | null;
  },
): boolean {
  if (!worldRacesOpen(api)) return false;
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const seat = offices.table("seats").get(input.seatId) as unknown as
    { coversTown: boolean; officeId: string } | undefined;
  const office = seat
    ? (offices.table("offices").get(seat.officeId) as unknown as
        { kind: string; elected: boolean } | undefined)
    : undefined;
  if (!seat || !office?.elected || seat.coversTown) return false;
  if (office.kind !== "us-house" && !office.kind.startsWith("legislature-"))
    return false;
  // The town's own seats are the voting engine's.
  if (townSeats(api).some((entry) => entry.seat.id === input.seatId))
    return false;
  // A special election whose day has already come is held the day after
  // (the calendar takes only a day not yet run).
  api.moduleCalendar(VOTING_MODULE_ID).schedule({
    key: `special:${input.vacancyId}:${input.electionDate}`,
    date:
      input.electionDate > api.state.date
        ? input.electionDate
        : dayAfter(api.state.date),
    kind: SPECIAL_KIND,
    source: {
      tag: "SOURCED",
      citation: `Special election for ${input.vacancyId}`,
      asOf: api.state.date,
    },
    sourceRecordIds: [input.vacancyId, input.seatId, input.termEnd ?? ""],
  });
  return true;
}

/** Count a special race on its election day. */
function decideSpecial(api: CoreAPI, work: Readonly<ModuleCalendarWork>): void {
  const [vacancyId, seatId, termEnd] = work.sourceRecordIds;
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const vacancy = offices.table("vacancies").get(vacancyId!) as unknown as
    { status: string } | undefined;
  if (!vacancy || vacancy.status !== "awaiting-election") return;
  const seat = offices.table("seats").get(seatId!) as unknown as
    | {
        id: string;
        officeId: string;
        district: string | null;
        electionYear?: number;
      }
    | undefined;
  const office = seat
    ? (offices.table("offices").get(seat.officeId) as unknown as
        | { kind: string; termYears: number | null; jurisdiction?: string }
        | undefined)
    : undefined;
  if (!seat || !office) return;
  const year = Number(api.state.date.slice(0, 4));
  decide(
    api,
    {
      ...seatRace(api, seat, office, year),
      seatedOn: dayAfter(api.state.date),
    },
    year,
    { vacancyId: vacancyId!, termEnd: termEnd || null },
  );
}

/**
 * The two parties' candidates in a special race, each with a name drawn from
 * the race's id: the party of the seat's holder stands its holder.
 */
function specialCandidates(
  api: CoreAPI,
  race: Race,
  parties: readonly { party: string; side: number; incumbent: boolean }[],
  raceId: string,
): readonly SpecialCandidate[] {
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const holder = (
    offices
      .table("terms")
      .query("bySeatStatus", [race.seatId, "serving"]) as unknown as TermRow[]
  )[0];
  const loaded = offices.table("loaded").get("town") as unknown as {
    worldSeed: string;
  };
  const stateKey = `US-${race.usps}`;
  return parties.map((c) => {
    if (holder && holder.party === c.party)
      return {
        party: c.party,
        side: c.side,
        incumbent: true,
        identity: holder.identity,
      };
    const drawn = drawOfficialIdentity({
      worldSeed: loaded.worldSeed,
      seatKey: `${raceId}:${c.party}`,
      stateUsps: race.usps,
      role: "state-executive-challenger",
      referenceDate: api.state.date,
    });
    return {
      party: c.party,
      side: c.side,
      incumbent: false,
      identity: {
        givenName: drawn.givenName,
        familyName: drawn.familyName,
        gender: drawn.gender,
        birthDate: drawn.birthDate,
        homeState: stateKey,
      },
    };
  });
}

/** The first Tuesday after the second Wednesday in December. */
export function electorsMeet(year: number): string {
  let wednesdays = 0;
  for (let day = 1; day <= 31; day += 1) {
    const d = new Date(Date.UTC(year, 11, day));
    if (d.getUTCDay() === 3) wednesdays += 1;
    if (wednesdays === 2 && d.getUTCDay() === 3) {
      for (let next = day + 1; next <= day + 7; next += 1) {
        const t = new Date(Date.UTC(year, 11, next));
        if (t.getUTCDay() === 2) return t.toISOString().slice(0, 10);
      }
    }
  }
  throw new Error(`No electors' day in ${year}`);
}

export interface PresidentialRow {
  readonly id: string;
  readonly year: number;
  readonly states: readonly {
    readonly stateKey: string;
    readonly electors: number;
    /** The Republican two-party share of the state's counties' 2024 vote. */
    readonly lean: number;
    /** The state's popular vote, kept by the one count writer. */
    readonly resultId: string | null;
    readonly winnerSide: number;
    readonly from: string;
  }[];
  readonly electoral: {
    readonly republican: number;
    readonly democratic: number;
  };
  readonly winnerParty: string;
  readonly winnerId: string;
  /** The vice president's party, or null when no vice president takes office with the president. */
  readonly vicePresidentParty: string | null;
  /** Who acts as president when the House chose no one (amend. XX, § 3). */
  readonly acting?: "vice-president-elect" | "speaker";
  /** Set when no ticket won a majority of the electors: the House and the Senate choose in January. */
  readonly contingent?: {
    readonly status: "pending" | "decided" | "deadlocked";
    readonly recordId: string;
    readonly on: string;
  };
  readonly inauguration: string;
}

/**
 * The electors vote: each state's electors go to its statewide winner. The
 * town's state is its own popular vote, counted from named and counted
 * voters and the state's counties (voting.ts); every other state is counted
 * in its own counties on the same engine, with the same candidates where the
 * town's ballot names them. A majority of electors (270) wins; a tie goes to
 * the House, voting by state delegation, and the Senate chooses the vice
 * president (U.S. Const. amend. XII), in January once the new Congress sits
 * (`decideContingent`). `toWin` is the majority the law sets; a test may pass
 * a higher one to force a split.
 */
export function electoralCollege(
  api: CoreAPI,
  year: number,
  toWin: number = electors.toWin,
): void {
  const { stateKey } = lawChain(api);
  const town = townPresidentialVote(api, year);
  const date = api.state.date;
  const conditions = raceConditions(api, {
    federal: true,
    family: "president",
    cycle: "presidential",
    raceVotes: 0,
    townPlaceId: null,
  });
  const holder = presidentSide(api);
  const sample = sampleFor(api, date);
  const change = electorateChange(api);
  const states = Object.entries(electors.states).map(([key, count]) => {
    const own = key === stateKey && town ? town.republicanShare : null;
    const places =
      own === null ? statePlaces(key.slice(3), api.state.seed) : [];
    const votes = places.reduce((s, b) => s + b.votes2024, 0);
    const lean = votes
      ? places.reduce((s, b) => s + b.votes2024 * b.rightShare, 0) / votes
      : 0.5;
    const field = town?.inputs.length
      ? town.inputs
      : [-1, 1].map((side) =>
          candidateInputs(api, {
            id: `party:${side > 0 ? "R" : "D"}`,
            party: nationalParty(side),
            filingId: null,
            incumbent: false,
            seatParty: null,
            raceLean: 2 * lean - 1,
            side,
            seatSide: holder,
          }),
        );
    let share = own;
    let resultId = own === null ? null : town!.resultId;
    if (share === null) {
      const reasons = field.map((c) =>
        candidateReasons(c, { ...conditions, raceVotes: votes }),
      );
      const counted = countPlaces(
        sample,
        coarse(places, key === stateKey, change),
        partyField(reasons, field),
      );
      // The state's popular vote is a count like any other: kept by the one
      // writer, its winner the side its electors go to.
      const result = keepCount(api, {
        id: `presidential:${year}:${key}`,
        date,
        candidates: field.map((c) => c.id),
        wider: counted,
        reasons,
        // The ticket the state's electors go to: the leading candidate of
        // the side with more of the two-party vote.
        decide: (ranked) => {
          const sideOfId = (id: string) =>
            field.find((c) => c.id === id)?.side ?? 0;
          let r = 0,
            d = 0;
          for (const [id, n] of ranked)
            if (sideOfId(id) > 0) r += n;
            else if (sideOfId(id) < 0) d += n;
          const side = r > d ? 1 : d > r ? -1 : 0;
          return side
            ? (ranked.find(([id]) => sideOfId(id) === side)?.[0] ?? null)
            : null;
        },
        winnerOf: (id) => id,
        takesOffice: `${year + 1}-01-20`,
      });
      resultId = result.id;
      share = republicanShareOf(result) ?? lean;
    }
    return {
      stateKey: key,
      electors: count,
      lean,
      resultId,
      winnerSide: share > 0.5 ? 1 : share < 0.5 ? -1 : 0,
      from:
        own !== null
          ? "the state's own count"
          : "the state's counties, counted on the election engine",
    };
  });
  const republican = states
    .filter((s) => s.winnerSide > 0)
    .reduce((a, s) => a + s.electors, 0);
  const democratic = states
    .filter((s) => s.winnerSide < 0)
    .reduce((a, s) => a + s.electors, 0);
  let side = republican >= toWin ? 1 : democratic >= toWin ? -1 : 0;
  // No majority: the sitting president's side holds the row until the House
  // and the Senate choose, in January (`decideContingent`).
  const split = side === 0;
  if (split) side = holder;
  const winnerParty = nationalParty(side);
  const winnerId =
    town?.candidates.find((c) => partySide(c.party) === side)?.personId ??
    `official:president:${year}:${winnerParty}`;
  const contingentOn = `${year + 1}-${String(contingentData.meets.month).padStart(2, "0")}-${String(contingentData.meets.day).padStart(2, "0")}`;
  const row: PresidentialRow = {
    id: `presidential:${year}`,
    year,
    states,
    electoral: { republican, democratic },
    winnerParty,
    winnerId,
    vicePresidentParty: winnerParty,
    ...(split
      ? {
          contingent: {
            status: "pending" as const,
            recordId: `contingent:${year}`,
            on: contingentOn,
          },
        }
      : {}),
    inauguration: `${year + 1}-01-20`,
  };
  table(api, "races").put({
    ...row,
    seatId: "seat:US:president",
    office: "president",
    date: api.state.date,
  } as unknown as ModuleRow);
  const calendar = api.moduleCalendar(VOTING_MODULE_ID);
  if (!calendar.get(`inauguration:${year + 1}`))
    calendar.schedule({
      key: `inauguration:${year + 1}`,
      date: row.inauguration,
      kind: "inauguration",
      source: {
        tag: "SOURCED",
        citation: "U.S. Const. amend. XX, § 1 (noon, January 20)",
        asOf: api.state.date,
      },
      sourceRecordIds: [row.id],
    });
  if (split && !calendar.get(`contingent:${year + 1}`))
    calendar.schedule({
      key: `contingent:${year + 1}`,
      date: contingentOn,
      kind: "contingent-election",
      source: {
        tag: "SOURCED",
        citation:
          "U.S. Const. amend. XII; 3 U.S.C. § 15 (the Congress meets January 6)",
        asOf: api.state.date,
      },
      sourceRecordIds: [String(year)],
    });
}

/**
 * January 6: no ticket won a majority of the electors, so the House chooses
 * the president by state delegation and the Senate the vice president. Every
 * member's vote and the parts of it are kept (the `contingent` table); the
 * presidency row takes the choice, or the one who acts when the House
 * chose no one by the start of the term.
 */
function decideContingent(api: CoreAPI, year: number): void {
  const row = table(api, "races").get(`presidential:${year}`) as unknown as
    PresidentialRow | undefined;
  if (!row?.contingent || row.contingent.status !== "pending") return;
  const result = contingentElection(api, {
    year,
    electors: Object.fromEntries(
      row.states.map((state) => [state.stateKey, state.winnerSide]),
    ),
    // A contingent election votes by state delegation: places with
    // electors but no House delegation (from the data) have no vote.
    states: row.states.filter(
      (state) => !electorsData.withoutHouseDelegation.includes(state.stateKey),
    ).length,
  });
  table(api, "contingent").put({
    id: row.contingent.recordId,
    ...result,
  } as unknown as ModuleRow);
  const town = townPresidentialVote(api, year);
  // The sitting president's side stands in only when nobody could act.
  const side = result.presidentSide || presidentSide(api);
  const winnerParty = nationalParty(side);
  const decided = result.house.chosenSide !== 0;
  table(api, "races").put({
    ...row,
    winnerParty,
    winnerId:
      town?.candidates.find((c) => partySide(c.party) === side)?.personId ??
      `official:president:${year}:${winnerParty}`,
    vicePresidentParty: result.vicePresidentSide
      ? nationalParty(result.vicePresidentSide)
      : null,
    ...(result.acting ? { acting: result.acting } : {}),
    contingent: {
      ...row.contingent,
      status: decided ? "decided" : "deadlocked",
    },
    seatId: "seat:US:president",
    office: "president",
    date: row.contingent.on,
  } as unknown as ModuleRow);
}

/** The town's state's count of the presidential race, where the town voted on it. */
function townPresidentialVote(
  api: CoreAPI,
  year: number,
): {
  republicanShare: number;
  /** The town's count of the race. */
  resultId: string;
  candidates: { personId: string; party: string | null }[];
  /** The same candidates as every other state's voters see them. */
  inputs: CandidateInputs[];
} | null {
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return null;
  const contests = (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  ).filter(
    (c) =>
      c.officeId === "office:US:president" &&
      c.electionDate.startsWith(String(year)),
  );
  for (const contest of contests) {
    const result = resultOf(api, contest.id);
    if (!result) continue;
    const candidates = ballot(api, contest.id).map((f) => ({
      personId: f.personId,
      party: f.party ?? null,
    }));
    let r = 0;
    let d = 0;
    for (const c of candidates) {
      const side = partySide(c.party);
      if (side > 0) r += result.totals[c.personId] ?? 0;
      if (side < 0) d += result.totals[c.personId] ?? 0;
    }
    const lean = r + d ? r / (r + d) : 0.5;
    const inputs = ballot(api, contest.id).map((f) =>
      candidateInputs(api, {
        id: f.personId,
        party: f.party ?? null,
        filingId: f.id,
        incumbent:
          (result.electorateReasons?.find((c) => c.id === f.personId)
            ?.incumbency ?? 0) > 0,
        seatParty: null,
        raceLean: 2 * lean - 1,
      }),
    );
    if (r + d > 0)
      return {
        republicanShare: r / (r + d),
        resultId: result.id,
        candidates,
        inputs,
      };
  }
  return null;
}

/** Noon, January 20: the president-elect and their running mate take office. */
function inaugurate(api: CoreAPI, rowId: string): void {
  const row = table(api, "races").get(rowId) as unknown as
    PresidentialRow | undefined;
  if (!row) return;
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const terms = offices.table("terms");
  const loaded = offices.table("loaded").get("town") as unknown as {
    worldSeed: string;
  };
  for (const [seatId, officeId, key, party] of [
    ["seat:US:president", "office:US:president", row.winnerId, row.winnerParty],
    [
      "seat:US:vice-president",
      "office:US:vice-president",
      `running-mate:${row.winnerId}`,
      row.vicePresidentParty,
    ],
  ] as const) {
    // No vice president takes office when the vice president-elect is the one
    // acting as president (amend. XX, § 3), or the Senate chose no one.
    if (party === null) {
      endServingTerms(api, seatId, "term ended");
      continue;
    }
    // The running mate isn't the president's relative: no shared family name.
    const president = (
      terms.query("bySeatStatus", [
        "seat:US:president",
        "serving",
      ]) as unknown as TermRow[]
    )[0];
    const drawn = drawOfficialIdentity({
      worldSeed: loaded.worldSeed,
      seatKey: key,
      stateUsps: lawChain(api).stateKey.slice(3),
      role: "state-executive-challenger",
      referenceDate: api.state.date,
      ...(seatId === "seat:US:vice-president" && president
        ? { avoidFamilyNames: [president.identity.familyName] }
        : {}),
    });
    const office = offices.table("offices").get(officeId) as
      { readonly title?: string } | undefined;
    seatWinner(api, {
      seatId,
      officeId,
      personId: null,
      identity: {
        givenName: drawn.givenName,
        familyName: drawn.familyName,
        gender: drawn.gender,
        birthDate: drawn.birthDate,
        homeState: lawChain(api).stateKey,
      },
      party,
      endDate: `${Number(api.state.date.slice(0, 4)) + 4}-01-20`,
      reached:
        seatId === "seat:US:president" && row.acting
          ? `acting president, ${row.acting} (amend. XX, § 3), ${row.year}`
          : row.contingent?.status === "decided"
            ? `chosen by Congress ${row.year}`
            : `elected ${row.year}`,
      resultId: rowId,
      title: office?.title ?? officeId,
      winnerId: key,
      news: true,
    });
  }
  if (api.state.modules.has(ELECTIONS_MODULE_ID))
    openNextCycle(api, "seat:US:president");
}

/** The race for a seat the offices engine holds outside the town, in `year`. */
function seatRace(
  api: CoreAPI,
  seat: {
    readonly id: string;
    readonly officeId: string;
    readonly district: string | null;
    readonly electionYear?: number;
  },
  office: {
    readonly kind: string;
    readonly termYears: number | null;
    readonly jurisdiction?: string;
  },
  year: number,
): Race {
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const house = office.kind === "us-house";
  const stateKey = office.jurisdiction?.startsWith("US-")
    ? office.jurisdiction
    : lawChain(api).stateKey;
  const holder = (
    offices
      .table("terms")
      .query("bySeatStatus", [seat.id, "serving"]) as unknown as TermRow[]
  )[0];
  const code = (seat.district ?? "00").padStart(2, "0");
  return {
    seatId: seat.id,
    office: office.kind,
    usps: stateKey.slice(3),
    code,
    incumbentParty: holder?.party ?? null,
    leanSource: house
      ? "2024 House vote in the district"
      : "the state's 2024 two-party vote over its districts, the holder's party at the typical margin",
    seatedOn: house
      ? `${year + 1}-01-03`
      : (holder?.endDate ?? `${year + 1}-01-01`),
    offices: {
      seatId: seat.id,
      officeId: seat.officeId,
      termYears: office.termYears,
    },
  };
}

/** Every race this year the town's named voters don't decide. */
function racesIn(api: CoreAPI, year: number): readonly Race[] {
  const races: Race[] = [];
  const stateKey = lawChain(api).stateKey;
  // Seats in the town's own state the town doesn't vote for.
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const officeRows = new Map(
    (
      offices.table("offices").rows() as unknown as {
        id: string;
        kind: string;
        termYears: number | null;
        elected: boolean;
      }[]
    ).map((o) => [o.id, o]),
  );
  for (const seat of offices.table("seats").rows() as unknown as {
    id: string;
    officeId: string;
    district: string | null;
    coversTown: boolean;
    electionYear?: number;
  }[]) {
    const office = officeRows.get(seat.officeId);
    if (!office?.elected || seat.coversTown) continue;
    const house = office.kind === "us-house";
    const legislature = office.kind.startsWith("legislature-");
    if (!house && !legislature) continue;
    // Congress is elected in even years only.
    if (house && year % 2) continue;
    if (legislature && seat.electionYear !== year) continue;
    races.push(seatRace(api, seat, office, year));
  }
  // Every other state's governor its cycle elects this year.
  races.push(...governorRaces(api, year));
  const congressStart = `${year + 1}-01-03`;
  // Congress outside the town's state, in even years.
  if (year % 2) return races.sort((a, b) => a.seatId.localeCompare(b.seatId));
  for (const [state, seats] of Object.entries(
    worldRoster(api.state.seed).congress,
  )) {
    if (state === stateKey) continue;
    const usps = state.slice(3);
    for (const [district, parties] of Object.entries(seats)) {
      if (district === "senate") continue;
      const code = district.padStart(2, "0");
      const seatId = `seat:${state}:us-house:${code}`;
      races.push({
        seatId,
        office: "us-house",
        usps,
        code,
        incumbentParty: currentParty(api, seatId, parties[0] ?? null),
        leanSource: "2024 House vote in the district",
        seatedOn: congressStart,
      });
    }
    // Senate seats whose class is up this year: a class pairs with its seat
    // by the published holder; this world's holder stands for it.
    const sorted = publishedSenateSeats(state);
    const held = seats.senate ?? [];
    const used = new Set<number>();
    for (const cls of classes[state] ?? []) {
      const index = sorted.findIndex((p, i) => p === cls.party && !used.has(i));
      if (index < 0) continue;
      used.add(index);
      if ((year - cls.nextElection) % 6 !== 0 || year < cls.nextElection)
        continue;
      const seatId = `seat:${state}:us-senate:${index}`;
      races.push({
        seatId,
        office: "us-senate",
        usps,
        code: "00",
        incumbentParty: currentParty(api, seatId, held[index] ?? cls.party),
        leanSource: "2024 presidential vote in the state's counties",
        seatedOn: congressStart,
      });
    }
  }
  return races.sort((a, b) => a.seatId.localeCompare(b.seatId));
}

function currentParty(
  api: CoreAPI,
  seatId: string,
  start: string | null,
): string | null {
  const row = table(api, "seats").get(seatId) as unknown as
    { party: string; since: string } | undefined;
  return row && row.since <= api.state.date ? row.party : start;
}

/** A race's places: the House district, the state's counties, or the legislative district. */
function worldRacePlaces(api: CoreAPI, race: Race): readonly ElectoratePlace[] {
  const usps = race.usps;
  if (race.office === "us-house") {
    const place = housePlace(usps, race.code, api.state.seed);
    if (place) return [place];
    // A delegate's seat with no House vote on record (a territory): the
    // place at its 2024 delegate race's lean, its size not yet read.
    // stopgapId: SG-GOV-delegate-race-size
    api.stopgap("SG-GOV-delegate-race-size");
    const delegate = statePlaces(usps, api.state.seed, 1)[0];
    return delegate ? [{ ...delegate, eligible: 0 }] : [];
  }
  if (race.office === "us-senate" || race.office === "governor")
    return statePlaces(usps, api.state.seed);
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const districts = new Set(
    (
      offices
        .table("seats")
        .query("byOffice", [race.offices!.officeId]) as unknown as {
        district: string | null;
      }[]
    ).map((s) => s.district),
  ).size;
  const place = legislativePlace(
    usps,
    race.seatId,
    districts,
    sideOf(race.incumbentParty),
    null,
    api.state.seed,
  );
  return place ? [place] : [];
}

/**
 * The town's counted voters as every place counted from afar sees them, at
 * the cycle's cost of voting; none where the town's elections aren't
 * modeled.
 */
function sampleFor(api: CoreAPI, date: string): readonly SampleVoter[] {
  if (
    !api.state.modules.has(ELECTIONS_MODULE_ID) ||
    !api.state.modules.has(CAMPAIGNS_MODULE_ID)
  )
    return [];
  return electorateSample(api, date, cycleTurnout(date).cost);
}

/**
 * A race's places as the engine counts them: in the town's own state the
 * barred share today against the opening's, which the 2024 vote they are
 * sized from reflects; elsewhere the opening's election laws (the town's
 * state's changes don't reach them).
 */
function coarse(
  places: readonly ElectoratePlace[],
  townsState: boolean,
  change: ReturnType<typeof electorateChange>,
): readonly RacePlace[] {
  const scale = townsState
    ? (1 - change.barred) / Math.max(1e-9, 1 - change.openingBarred)
    : 1;
  return places.map((p) => ({
    ...p,
    scale,
    readinessShift: townsState ? 0 : change.lawCost,
  }));
}

/** Each candidate as a counted voter sees them on a race the town doesn't vote in. */
function partyField(
  reasons: readonly CandidateReasons[],
  field: readonly CandidateInputs[],
): readonly CountedFieldEntry[] {
  return field.map((c, i) => ({
    id: c.id,
    side: c.side,
    isIncumbent: c.incumbent,
    standing: appealOfShare(reasons[i]!.total),
    localStanding: 0,
    recognition: 0,
    platform: [],
  }));
}

/**
 * The party that stands for a side of the scale in a state: the largest on
 * that side in the state's own record (its 2024 ballot or legislature), else
 * the national party of that side (party-sides data).
 */
function partyOnSideIn(stateKey: string, side: number, seed: string): string {
  const best = stateParties(stateKey, seed)
    .filter((p) => partySide(p.name) === side)
    .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name))[0];
  return best?.name ?? nationalParty(side);
}

/** A member's side, with the side an independent caucuses with (party-sides data). */
const sideOf = caucusSide;

/**
 * Decide a race the town doesn't vote in: its blocks count it on the same
 * engine as the town's own races. The seat's holder stands for their party
 * (an incumbent official the world doesn't name, with the typical
 * campaign); the other major party fields a typical challenger.
 */
function decide(
  api: CoreAPI,
  race: Race,
  year: number,
  special?: SpecialRace,
): void {
  const side = sideOf(race.incumbentParty);
  // stopgapId: SG-GOV-world-race-lean
  api.stopgap("SG-GOV-world-race-lean");
  const places = worldRacePlaces(api, race);
  const date = api.state.date;
  const votesAt2024 = places.reduce((s, b) => s + b.votes2024, 0);
  const lean = votesAt2024
    ? places.reduce((s, b) => s + b.votes2024 * b.rightShare, 0) / votesAt2024
    : (places[0]?.rightShare ??
      0.5 + side * campaignParameter("legislativeSeatMargin"));
  const cycle = electionCycle(date);
  const townsState = `US-${race.usps}` === lawChain(api).stateKey;
  const conditions = raceConditions(api, {
    federal: race.office.startsWith("us-"),
    family:
      race.office === "us-house"
        ? "usHouse"
        : race.office === "us-senate" || race.office === "governor"
          ? "statewideExecutive"
          : "stateLegislative",
    cycle,
    raceVotes: votesAt2024 * cycleTurnout(date).share,
    townPlaceId: null,
  });
  const stateKey = `US-${race.usps}`;
  const parties =
    side === 0
      ? [-1, 1].map((s) => ({
          party: partyOnSideIn(stateKey, s, api.state.seed),
          side: s,
          incumbent: false,
        }))
      : [
          { party: race.incumbentParty!, side, incumbent: true },
          {
            party: partyOnSideIn(stateKey, -side, api.state.seed),
            side: -side,
            incumbent: false,
          },
        ];
  const candidates = parties.map((c) =>
    candidateInputs(api, {
      id: `party:${c.side > 0 ? "R" : "D"}`,
      party: c.party,
      filingId: null,
      incumbent: c.incumbent,
      seatParty: race.incumbentParty,
      raceLean: 2 * lean - 1,
      side: c.side,
      seatSide: side,
    }),
  );
  const reasons = candidates.map((c) => candidateReasons(c, conditions));
  const counted = countPlaces(
    sampleFor(api, date),
    coarse(places, townsState, electorateChange(api)),
    partyField(reasons, candidates),
  );
  const raceId = special
    ? `race:${race.seatId}:${date}:special`
    : `race:${race.seatId}:${year}`;
  // The two parties' votes decide it; where no one in the race's places
  // could be counted, the places' own lean does, and an even split keeps
  // the seat with its holder's side.
  // Named by the count's decision; a seat with no holder (a special
  // election's vacancy) has no side until the count gives it one.
  let winnerParty = race.incumbentParty ?? "";
  const result = keepCount(api, {
    id: raceId,
    date,
    candidates: candidates.map((c) => c.id),
    wider: counted,
    reasons,
    decide: () => {
      const rep = counted.votes["party:R"] ?? 0,
        dem = counted.votes["party:D"] ?? 0;
      const share = rep + dem ? rep / (rep + dem) : lean;
      const winnerSide = share > 0.5 ? 1 : share < 0.5 ? -1 : side;
      // An even split of a seat with no holder's side names no winner.
      if (!winnerSide) return null;
      winnerParty =
        winnerSide === side && race.incumbentParty
          ? race.incumbentParty
          : partyOnSideIn(stateKey, winnerSide, api.state.seed);
      return `party:${winnerSide > 0 ? "R" : "D"}`;
    },
    winnerOf: () => `${raceId}:${winnerParty}`,
    takesOffice: race.seatedOn,
  });
  const row: RaceRow = {
    id: raceId,
    seatId: race.seatId,
    office: race.office,
    date,
    incumbentParty: race.incumbentParty,
    lean,
    winnerParty,
    seatedOn: race.seatedOn,
    leanSource: race.leanSource,
    resultId: result.id,
  };
  table(api, "races").put({
    ...row,
    offices: race.offices ?? null,
    ...(special
      ? { special, candidates: specialCandidates(api, race, parties, row.id) }
      : {}),
  } as unknown as ModuleRow);
  // An even split with no holder's side seats no one.
  if (!winnerParty) return;
  // The winner is seated on the term's first day; where that day has come
  // by the count's own day, the morning after (the calendar takes only a
  // day not yet run).
  api.moduleCalendar(VOTING_MODULE_ID).schedule({
    key: `seat:${row.id}`,
    date:
      race.seatedOn > api.state.date ? race.seatedOn : dayAfter(api.state.date),
    kind: "seat-winner",
    source: {
      tag: "SOURCED",
      citation: `Result of ${row.id}`,
      asOf: api.state.date,
    },
    sourceRecordIds: [row.id],
  });
}

/** Seat the winner on the term's first day. */
function seatRaceWinner(api: CoreAPI, raceId: string): void {
  const race = table(api, "races").get(raceId) as unknown as
    | (RaceRow & {
        offices: Race["offices"] | null;
        special?: SpecialRace;
        candidates?: readonly SpecialCandidate[];
      })
    | undefined;
  if (!race) return;
  if (!race.offices) {
    table(api, "seats").put({
      id: race.seatId,
      party: race.winnerParty,
      since: api.state.date,
      raceId,
    } as unknown as ModuleRow);
    return;
  }
  // A seat the offices engine holds: the one term writer ends the term and
  // starts the winner's.
  const offices = api.moduleState(OFFICES_MODULE_ID);
  const serving = offices
    .table("terms")
    .query("bySeatStatus", [race.seatId, "serving"]) as unknown as TermRow[];
  const reelected = serving[0] && serving[0].party === race.winnerParty;
  const loaded = offices.table("loaded").get("town") as unknown as {
    worldSeed: string;
  };
  const named = race.candidates?.find((c) => c.party === race.winnerParty);
  const identity = reelected
    ? serving[0]!.identity
    : named
      ? named.identity
      : (() => {
          const drawn = drawOfficialIdentity({
            worldSeed: loaded.worldSeed,
            seatKey: raceId,
            stateUsps: lawChain(api).stateKey.slice(3),
            role: "state-executive-challenger",
            referenceDate: api.state.date,
          });
          return {
            givenName: drawn.givenName,
            familyName: drawn.familyName,
            gender: drawn.gender,
            birthDate: drawn.birthDate,
            homeState: lawChain(api).stateKey,
          };
        })();
  const years = race.offices.termYears;
  const personId = reelected ? serving[0]!.personId : null;
  const office = offices.table("offices").get(race.offices.officeId) as
    { readonly title?: string } | undefined;
  seatWinner(api, {
    seatId: race.seatId,
    officeId: race.offices.officeId,
    personId,
    identity,
    party: race.winnerParty,
    // A special election's winner serves what was left of the term.
    endDate: race.special
      ? race.special.termEnd
      : years
        ? `${Number(api.state.date.slice(0, 4)) + years}${api.state.date.slice(4)}`
        : null,
    reached: race.special
      ? `elected in a special election ${race.date}`
      : `elected ${race.date}`,
    resultId: raceId,
    title: office?.title ?? race.office,
    winnerId: personId ?? `${raceId}:${race.winnerParty}`,
    news: false,
    ...(race.special ? { vacancyId: race.special.vacancyId } : {}),
  });
  if (race.special) return;
  const seatRow = offices.table("seats").get(race.seatId) as unknown as
    { electionYear?: number } | undefined;
  if (seatRow && years)
    offices.table("seats").put({
      ...seatRow,
      electionYear: Number(race.date.slice(0, 4)) + years,
    } as unknown as ModuleRow);
}

export function racesOf(api: CoreAPI): readonly RaceRow[] {
  return (table(api, "races").rows() as unknown as RaceRow[]).filter(
    (r) => r.office !== "president",
  );
}

export function presidentialOf(
  api: CoreAPI,
  year: number,
): PresidentialRow | null {
  return (
    (table(api, "races").get(`presidential:${year}`) as unknown as
      PresidentialRow | undefined) ?? null
  );
}

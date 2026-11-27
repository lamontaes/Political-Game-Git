import { VOTING_MODULE_ID } from "../voting-module-id";
import { interestOf } from "../turnout";
import { coreAPI, registerModule } from "../state";
import type { CoreAPI, CoreModule, CoreState, PersonState } from "../types";
import type { ModuleCalendarWork } from "../module-calendar";
import type { ModuleRow } from "../module-data";
import { campaignParameter } from "../campaign-data";
import { wideElectorate } from "../race-places";
import { shareValue } from "../shares";
import {
  contestsOnDate,
  filingRulesFor,
  filingSideFor,
  specialContestFor,
  ELECTIONS_MODULE_ID,
  registerWardResidency,
  keepPetitionCheck,
  openPetition,
  resizePetition,
  petitionOf,
  petitionSigners,
  petitionSignatures,
  SCALED_PETITION_ESTIMATE,
  type ContestRow,
  type PetitionRule,
  type FilingRow,
  ticketGovernorContest,
} from "./elections";
import {
  campaignFor,
  registerDoorChoice,
  registerPetitionRoll,
} from "./campaigns";
import { registerSpecialElections, officeById, officeSeats } from "./offices";
import { novemberGeneralElectionDay } from "../elections-calendar";
import {
  candidacyModule,
  CANDIDACY_MODULE_ID,
  registerClosedContestWeighed,
} from "./candidacy";
import { VIEWS_MODULE_ID, viewsModule } from "./views";
import { rememberOpeningElectorate } from "../electorate-inputs";
import { doorChoiceOf, electorateRoll } from "./voting-appeal";
import { partySide, scheduleContest, table, town } from "./voting-base";
import type { ResultRow } from "./voting-base";
import { dayAfter, openSpecialRace, raceWork } from "./voting-college";
import { cycleTurnout, holdElection, resolveEmptyRace } from "./voting-count";
import { nextRaceYear, scheduleElection } from "./voting-outside-races";
import {
  REGISTRATION_REVIEW,
  candidateInWard,
  pollingPlaces,
  registrations,
  scheduleRegistrationReview,
} from "./voting-polling-day";
import { fileStandingCandidates, holdPrimary } from "./voting-primary";
import { answerRecountOffer, endRecount, takeOffice } from "./voting-returns";
import { formTickets } from "./voting-tickets";
import { decideTurnout } from "./voting-turnout";
import type { TurnoutDecision } from "./voting-turnout";
export {
  countedDivision,
  countedField,
  doorAppealOf,
  doorChoiceOf,
  electorateRoll,
  electorateSides,
  endorsedOn,
  incumbentLeanOf,
  mayVoteOn,
  pledgeDoubt,
  scandalStoriesOf,
  scandalTerm,
  voterLean,
  votersWhoHeardOf,
  weeklyWorkOf,
} from "./voting-appeal";
export type {
  CountedDivision,
  ElectorateSides,
  NamedAppeal,
  RollVoter,
} from "./voting-appeal";
export { countedHabit, turnoutReasons } from "./voting-turnout";
export type { TurnoutDecision } from "./voting-turnout";
export {
  contestRightShare,
  fileStandingCandidates,
  holdPrimary,
  officialCandidateId,
} from "./voting-primary";
export {
  castBallot,
  pollingPlaceOf,
  pollingPlaces,
  pollingStatus,
  registerToVote,
  registeredAtPollsShare,
  registeredShareOfRoll,
  reviewVoterRegistrations,
  secondElection,
} from "./voting-polling-day";
export type { PollingPlaceRow, PollingStatus } from "./voting-polling-day";
export {
  beatenRunnerUp,
  countedVoters,
  cycleTurnout,
  electionCycle,
  holdElection,
  resolveEmptyRace,
  winningPersonId,
} from "./voting-count";
export {
  dropOlderTownReturns,
  electorateSample,
  placesOf,
  rankTotals,
  recountOf,
  republicanShareOf,
  returnsOf,
} from "./voting-returns";
export type { RecountRow, ReturnsReport, ReturnsRow } from "./voting-returns";
export {
  ballotOf,
  countedBallotAt,
  countedBallotOf,
  countedBallotsOf,
  dropOldCountedBallots,
  onContestRoll,
  resultOf,
} from "./voting-counted-ballots";
export {
  countRecord,
  countedPlace,
  foldOutsideRaces,
  ownConditionsOf,
  partyField,
  placeLeanRow,
  raceById,
  raceResult,
  raceShare,
  raceVotes,
  seatLastMargin,
  setOpeningLean,
  worldRacesOpen,
} from "./voting-outside-races";
export type { FoldedRace, RaceRow, SeatRacePast } from "./voting-outside-races";
export { electoralCollege, electorsMeet } from "./voting-college";
export type { PresidentialRow } from "./voting-college";
export {
  chooseRunningMate,
  formTickets,
  nameRunningMate,
  presidentialOf,
  racesOf,
  runningMateChoice,
} from "./voting-tickets";
export { openNextCycle, seatHolder } from "./voting-base";
export type {
  BallotRow,
  CountedBallotRow,
  CountedBallotsRow,
  ResultRow,
  TurnoutReasonsRecord,
} from "./voting-base";

export { candidateIdentity } from "../candidate-identity";
export { citizenShareOf } from "../electorate-places";

export { VOTING_MODULE_ID };

const VOTING_MODULE: CoreModule = {
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
      /** Each named adult's voter registration: on the rolls or not, at which address, since when. */
      registrations: {},
      /** The share of each age band that keeps off the rolls, found at the opening. */
      registrationBase: {},
      /** The precinct each household votes in, kept until a move on record changes it. */
      householdPrecincts: {},
      /** What an election day did to people not on the rolls: turned away, or registered at the polls. */
      pollDays: {},
      emptyRaces: { indexes: { byContest: { fields: ["contestId"] } } },
      results: { indexes: { byContest: { fields: ["contestId"] } } },
      /** A close count's recount, by the place's own rule (recount-rules-2026). */
      recounts: {},
      /** Each place's votes in a contest, counted coarsely. */
      places: { indexes: { byContest: { fields: ["contestId"] } } },
      /** Where each counted place's people stand now: one row a place, moved by its own last result (place-leans.ts). */
      leans: {},
      /** Each contest's returns as the night reports them, place by place. */
      returns: {},
      /** The races the town doesn't vote in: each seat's race and the presidency's electors. */
      races: {
        indexes: {
          byDate: { fields: ["date"] },
          bySeat: { fields: ["seatId"] },
        },
      },
      /** Congress seats outside the town's state: who holds them now. */
      seats: {},
      /** A presidential election the electors left to the House and the Senate: every vote, with its parts. */
      contingent: {},
      /** Whether the world counts the races the town doesn't vote in. */
      world: {},
    },
  },
  onCalendarWork: votingCalendarWork,
  // A filing's petition opens the day it is filed, or the day its candidate
  // announced, and the clerk's check of it goes on the calendar once it is
  // filed (`openFilingPetition`).
  eventKinds: ["candidate-filed", "candidate-announced", "concession"],
  onEvent: (api, event) => {
    if (event.kind === "concession") {
      answerRecountOffer(api, event);
      return;
    }
    const filingId = event.facts?.filingId;
    if (typeof filingId !== "string") return;
    openFilingPetition(api, filingId);
    if (event.kind === "candidate-announced") return;
    // A governor candidate whose state's law joins the ticket at filing
    // files with a running mate.
    const contestId = event.facts?.contestId;
    if (typeof contestId === "string") {
      const contest = api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .get(contestId) as unknown as ContestRow | undefined;
      if (contest) formTickets(api, contest, "filing");
    }
  },
};

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
  registerPetitionRoll(onRollToday);
  rememberOpeningElectorate(api);
  pollingPlaces(api);
  // The world opens already in motion: who is registered, and who moved
  // lately and has not yet registered at the new address.
  registrations(api);
  scheduleRegistrationReview(api);
  // A vacancy's special election runs as a real race.
  registerSpecialElections((a, race) => {
    if (!a.state.modules.has(VOTING_MODULE_ID)) return false;
    const contest = specialContestFor(a, race);
    if (contest) scheduleContest(a, contest);
    return contest !== null;
  });
  // A race whose filing closed before the record began is finished once
  // candidacy has weighed it, so its own runners stand before any stand-in.
  registerClosedContestWeighed(closeAtOpening);
  for (const contest of api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .rows() as unknown as ContestRow[])
    scheduleContest(api, contest, true);
}

/**
 * A race closed before the record began, after candidacy has weighed it: the
 * parties with no runner of their own get their nominees, and a primary whose
 * day has already come is held now by the engine's own count, its losers
 * leaving the general ballot, so November never carries two runners of one
 * party where the state's primary would have chosen one.
 */
function closeAtOpening(api: CoreAPI, contest: ContestRow): void {
  if (contest.electionDate <= api.state.date) return;
  fileStandingCandidates(api, contest.id);
  if (contest.primaryDate && contest.primaryDate <= api.state.date)
    holdPrimary(api, contest.id);
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
  if (filing?.status !== "petitioning" && filing?.status !== "announced")
    return;
  const held = petitionOf(api, filingId);
  // The petition an announced candidate circulated is the one they file:
  // its signatures stand, and the law of the side they file on sizes it.
  const carried =
    !!held &&
    !held.check &&
    !!filing.announcedOn &&
    held.opened === filing.announcedOn;
  if (held && !held.check && held.opened === filing.filedOn && !carried) return;
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(filing.contestId) as unknown as ContestRow;
  const rule = filingRulesFor(
    api,
    contest,
    filingSideFor(api, contest, filing.party),
  ).petition;
  const needed = petitionNeededHere(api, contest, rule, filing.party ?? null);
  const petition = carried
    ? resizePetition(api, held!, { rule, needed })
    : openPetition(api, filing, { rule, needed });
  // The clerk checks a petition only once it is filed.
  if (filing.status === "announced") return;
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
      tag: rule.scale ? "ESTIMATED" : "SOURCED",
      citation: rule.source,
      asOf: api.state.date,
      ...(rule.scale ? { estimatedFrom: SCALED_PETITION_ESTIMATE } : {}),
    },
    sourceRecordIds: [petition.id],
  });
}

/**
 * The votes cast for an office at its most recent recorded election in this
 * world, with the result record they came from; none where no election for it
 * has been held in the run. Read by the recall engine's signature base and by
 * a scaled petition's "votes" base.
 */
export function lastVotesForOffice(
  api: CoreAPI,
  officeId: string,
): { readonly votes: number; readonly recordId: string } | undefined {
  if (!api.state.modules.has(VOTING_MODULE_ID)) return undefined;
  const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
  let best: { votes: number; recordId: string; date: string } | undefined;
  for (const result of api
    .moduleState(VOTING_MODULE_ID)
    .table("results")
    .rows() as unknown as ResultRow[]) {
    const contest = contests.get(result.contestId) as unknown as
      ContestRow | undefined;
    const votes = Object.values(result.totals).reduce((n, v) => n + v, 0);
    if (contest?.officeId !== officeId || votes <= 0) continue;
    if (
      !best ||
      result.date > best.date ||
      (result.date === best.date && result.id < best.recordId)
    )
      best = { votes, recordId: result.id, date: result.date };
  }
  return best && { votes: best.votes, recordId: best.recordId };
}

/**
 * The town's own residents' votes (named and counted) for one kind of office
 * at its most recent recorded election in this world, with the result record
 * they came from; none where no such race has been held in the run or the
 * world seats no such office for the town. The rest of the race's electorate
 * (`placeVotes`) is not the town's.
 */
export function lastTownVotesForKind(
  api: CoreAPI,
  officeKind: string,
): { readonly votes: number; readonly recordId: string } | undefined {
  if (!api.state.modules.has(VOTING_MODULE_ID)) return undefined;
  const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
  let best: { votes: number; recordId: string; date: string } | undefined;
  for (const result of api
    .moduleState(VOTING_MODULE_ID)
    .table("results")
    .rows() as unknown as ResultRow[]) {
    const contest = contests.get(result.contestId) as unknown as
      ContestRow | undefined;
    const office = contest
      ? (officeById(api, contest.officeId) as unknown as
          { kind?: string } | undefined)
      : undefined;
    if (office?.kind !== officeKind) continue;
    const votes =
      Object.values(result.namedVotes).reduce((n, v) => n + v, 0) +
      Object.values(result.countedVotes).reduce((n, v) => n + v, 0);
    if (votes <= 0) continue;
    if (
      !best ||
      result.date > best.date ||
      (result.date === best.date && result.id < best.recordId)
    )
      best = { votes, recordId: result.id, date: result.date };
  }
  return best && { votes: best.votes, recordId: best.recordId };
}

/**
 * The votes cast at the most recent recorded election of one level in this
 * world: the most cast in any one of its contests that day, with the result
 * record they came from. None where no election of that level has been held
 * in the run.
 */
export function lastVotesAtLevel(
  api: CoreAPI,
  level: string,
): { readonly votes: number; readonly recordId: string } | undefined {
  if (!api.state.modules.has(VOTING_MODULE_ID)) return undefined;
  const contests = api.moduleState(ELECTIONS_MODULE_ID).table("contests");
  const rows = (
    api
      .moduleState(VOTING_MODULE_ID)
      .table("results")
      .rows() as unknown as ResultRow[]
  ).flatMap((result) => {
    const contest = contests.get(result.contestId) as unknown as
      ContestRow | undefined;
    const votes = Object.values(result.totals).reduce((n, v) => n + v, 0);
    return contest?.level === level && votes > 0
      ? [{ votes, recordId: result.id, date: result.date }]
      : [];
  });
  const date = rows.reduce((d, r) => (r.date > d ? r.date : d), "");
  const top = rows
    .filter((r) => r.date === date)
    .sort(
      (a, b) => b.votes - a.votes || a.recordId.localeCompare(b.recordId),
    )[0];
  return top && { votes: top.votes, recordId: top.recordId };
}

/**
 * The recorded votes a scaled petition's base names, read from the voting
 * records: this office's last election ("office"), the last election of the
 * same level ("level"), or the town's own votes for another kind of office
 * the law counts (governor, secretary of state, lower chamber). None before
 * that race has been held in the run, or where the world seats no such
 * office for the town; the caller then sizes the base from the town's people.
 */
export function recordedBase(
  api: CoreAPI,
  contest: ContestRow,
  scale: PetitionRule["scale"] & object,
): number | undefined {
  if (scale.base !== "votes") return undefined;
  if (scale.election === "office")
    return lastVotesForOffice(api, contest.officeId)?.votes;
  if (scale.election === "level")
    return lastVotesAtLevel(api, contest.level)?.votes;
  return scale.election
    ? lastTownVotesForKind(api, scale.election)?.votes
    : undefined;
}

/**
 * The part of its county a district seat's petition is sized to: one over the
 * body's districts for a county board elected by district, the whole county
 * (one) for any other race. No district map is read for local bodies, so the
 * districts are taken as even shares of the county's voters.
 */
// stopgapId: SG-GOV-county-petition-even-districts
function districtPartOfCounty(api: CoreAPI, contest: ContestRow): number {
  if (contest.family !== "countyOffice") return 1;
  const office = officeById(api, contest.officeId) as unknown as
    { districted?: boolean } | undefined;
  if (!office?.districted) return 1;
  const districts = new Set(
    (
      officeSeats(api, contest.officeId) as unknown as {
        district?: string | null;
      }[]
    ).map((seat) => seat.district ?? ""),
  ).size;
  if (districts <= 1) return 1;
  api.stopgap("SG-GOV-county-petition-even-districts");
  return 1 / districts;
}

/**
 * The signatures a petition needs in this world: the number the race's own
 * law sets for the race's own electorate (owner, Nov 14). A town race reads
 * the town's voters, and its petition asks no more names than the town has.
 * A county, district, state or federal race reads its whole electorate
 * (`wideElectorate`): the law's count, or its formula computed from those
 * voters (the votes the world recorded for the office, else the two-party
 * votes the race's places last cast), gathered in the town and, outside it,
 * by the campaign's paid circulators (`circulatorShift`).
 */
export function petitionNeededHere(
  api: CoreAPI,
  contest: ContestRow,
  rule: PetitionRule,
  party: string | null,
): number {
  const voters = electorateRoll(api).reduce((n, v) => n + v.count, 0);
  const population = Number(api.state.placeMetadata.referencePopulation) || 0;
  const wide = wideElectorate(api, contest, { voters, population });
  // A county board seat chosen by district asks the law's count of its
  // district's voters ("5% of registered voters in the county or district"),
  // not the whole county's.
  const part = wide ? districtPartOfCounty(api, contest) : 1;
  if (rule.basis === "scaled" && rule.scale) {
    if (!wide)
      return petitionSignatures(rule.scale, {
        eligible: voters,
        votesCast: recordedBase(api, contest, rule.scale),
        population,
      });
    const side = partySide(party);
    const recorded =
      rule.scale.election === "office"
        ? lastVotesForOffice(api, contest.officeId)?.votes
        : undefined;
    return petitionSignatures(rule.scale, {
      eligible: wide.eligible * part,
      population: voters > 0 ? (wide.eligible * part * population) / voters : 0,
      votesCast:
        recorded !== undefined
          ? recorded * part
          : wide.votes > 0
            ? wide.votes *
              part *
              namedElectionTurnout(api, contest, rule.scale.election)
            : undefined,
      aligned:
        side > 0
          ? wide.rightShare
          : side < 0
            ? 1 - wide.rightShare
            : shareValue("evenSplit"),
      winnerShare: Math.max(wide.rightShare, 1 - wide.rightShare),
    });
  }
  const count = rule.count;
  if (count <= 0) return 0;
  // No petition asks more names than its electorate has voters.
  const most = Math.floor(wide ? wide.eligible * part : voters);
  return most > 0 ? Math.max(1, Math.min(count, most)) : count;
}

/**
 * The turnout of the election a petition's law names, against the
 * presidential year whose votes the race's places last cast: a president's
 * race whole; a U.S. House race at the last even-year November before the
 * contest; a governor's or secretary of state's at their own race's cycle
 * where the world has one open, else a midterm's; the office's own (and any
 * other) at the contest's own cycle (`cycleTurnout`).
 */
function namedElectionTurnout(
  api: CoreAPI,
  contest: ContestRow,
  election: string | undefined,
): number {
  if (election === "president") return 1;
  if (election === "us-house") {
    const year = Number(contest.electionDate.slice(0, 4));
    const last = year % 2 ? year - 1 : year - 2;
    return cycleTurnout(`${last}-11-03`).share;
  }
  if (election === "governor" || election === "secretary-of-state") {
    const theirs = (
      api
        .moduleState(ELECTIONS_MODULE_ID)
        .table("contests")
        .rows() as unknown as ContestRow[]
    ).find(
      (c) =>
        (
          officeById(api, c.officeId) as unknown as
            { kind?: string } | undefined
        )?.kind === election,
    );
    return theirs
      ? cycleTurnout(theirs.electionDate).share
      : campaignParameter("midtermShareOfPresidential");
  }
  return cycleTurnout(contest.electionDate).share;
}

/**
 * Whether a person is on the count's roll today, the roll the clerk checks a
 * petition against and a campaign reads to size its target. The roll's ids
 * are held for the day.
 */
function onRollToday(api: CoreAPI, personId: string): boolean {
  const held = rollIdsByDay.get(api.state);
  if (held?.date === api.state.date && held.size === api.state.people.size)
    return held.ids.has(personId);
  const ids = new Set(electorateRoll(api).map((v) => v.id));
  rollIdsByDay.set(api.state, {
    date: api.state.date,
    size: api.state.people.size,
    ids,
  });
  return ids.has(personId);
}
const rollIdsByDay = new WeakMap<
  object,
  { date: string; size: number; ids: ReadonlySet<string> }
>();

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
  // One standing signature row is one signature, a counted resident's as a
  // full person's (pool item elections-petition-check-miscount): the clerk
  // counts names on paper, so every row ends up counted or struck.
  const signers = petitionSigners(api, filingId);
  const struckIds = signers
    .filter((s) => !onRollToday(api, s.personId))
    .map((s) => s.personId);
  // The signatures circulators gathered outside the town are the counted
  // voters of the race's places beyond it, on that place's roll.
  const outside = Object.values(petition.outsideSigned ?? {}).reduce(
    (n, k) => n + k,
    0,
  );
  keepPetitionCheck(api, filingId, {
    valid: signers.length - struckIds.length + outside,
    struckIds,
  });
}

/**
 * The notice of election: a public record the town's paper prints, naming the
 * election day and every office the town votes on that day. Its offices are
 * read from the contests when the paper prints it (the record keeps their ids).
 */
function postElectionNotice(api: CoreAPI, electionDate: string): void {
  const contests = contestsOnDate(api, electionDate).filter(
    (c) => c.electionDate === electionDate,
  );
  if (!contests.length) return;
  const { townPlaceId } = town(api);
  api.emit({
    id: `election-notice:${townPlaceId}:${electionDate}`,
    date: api.state.date,
    kind: "election-notice",
    personIds: [],
    placeId: townPlaceId,
    topic: `election-notice:${electionDate}`,
    source: {
      tag: "ESTIMATED",
      citation: "electionNoticeLeadDays",
      asOf: api.state.date,
      estimatedFrom:
        "The lead before election day is a tagged parameter (electionNoticeLeadDays)",
    },
    publicRecord: true,
    news: true,
    facts: {
      electionDate,
      contestIds: JSON.stringify(contests.map((c) => c.id).sort()),
    },
  });
}

function votingCalendarWork(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): void {
  if (work.kind === "filing-closes")
    fileStandingCandidates(api, work.sourceRecordIds[0]!);
  if (work.kind === "petition-check")
    checkPetition(api, work.sourceRecordIds[0]!);
  if (work.kind === REGISTRATION_REVIEW) {
    registrations(api);
    scheduleRegistrationReview(api);
  }
  if (work.kind === "primary") holdPrimary(api, work.sourceRecordIds[0]!);
  // A ticket office's count is the governor race's (`decideTicket`).
  if (work.kind === "election-day" && !decidedWithGovernor(api, work))
    holdElection(api, work.sourceRecordIds[0]!);
  if (work.kind === "election-notice")
    postElectionNotice(api, work.sourceRecordIds[0]!);
  if (work.kind === "take-office") takeOffice(api, work.sourceRecordIds[0]!);
  if (work.kind === "recount-ends") endRecount(api, work.sourceRecordIds[0]!);
  if (work.kind === "empty-term")
    resolveEmptyRace(api, work.sourceRecordIds[0]!);
  raceWork(api, work);
}

/** Whether a contest's election day is its governor race's: a ticket office decided with it. */
function decidedWithGovernor(
  api: CoreAPI,
  work: Readonly<ModuleCalendarWork>,
): boolean {
  const contest = api
    .moduleState(ELECTIONS_MODULE_ID)
    .table("contests")
    .get(work.sourceRecordIds[0]!) as unknown as ContestRow | undefined;
  return !!contest && ticketGovernorContest(api, contest) !== null;
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

export { campaignFor };

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

/**
 * Election day at the polls (owner, Oct 14, 2026): election day is a scene,
 * and the ballot is the scene's choice. On the eve of an election the voter's
 * day stops at the polling place; the contests on their ballot are the
 * elections engine's, each candidate as the ballot lists them, and what the
 * voter marks is cast through the voting engine's own `castBallot`, so the
 * count that opens election day reads it. The scene filter decides whether
 * the visit interrupts: a voter who leaves the polling place out of the
 * scenes that stop their day votes or stays home on their own reasons, like
 * everyone else. Words come from no hand-written bank: the screen shows the
 * ballot's record data and control names.
 */
import { coreAPI } from "../core2/state";
import { barredFromVoting } from "../core2/law-reach/group-a-voting";
import {
  ELECTIONS_MODULE_ID,
  ballot,
  type ContestRow,
} from "../core2/modules/elections";
import {
  VOTING_MODULE_ID,
  castBallot,
  pollingPlaceOf,
} from "../core2/modules/voting";
import { ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import type { CoreAPI, CoreState, PersonId } from "../core2/types";
import type { IsoDate } from "../core2/kernel/brands";
import type { Ledger, PollingVisitRecord } from "./types";
import pollingData from "./data/polling-place.json" with { type: "json" };

const DATA = pollingData as unknown as {
  situationKey: string;
  place: string;
  votingAge: { value: number };
};

export interface PollingCandidate {
  readonly personId: PersonId;
  readonly name: string;
  /** The party label on the ballot, or null for one running without one. */
  readonly party: string | null;
  readonly filingId: string;
}

export interface PollingContest {
  readonly id: string;
  readonly title: string;
  readonly level: string;
  readonly candidates: readonly PollingCandidate[];
  readonly sourceRecordIds: readonly string[];
}

/** The visit as the screen plays it: the ballot, who goes along, what is marked. */
export interface PollingVisit {
  readonly record: PollingVisitRecord;
  /** The situation type the scene is (`polling-place`) and the place's picture. */
  readonly situationKey: string;
  readonly place: string;
  readonly contests: readonly PollingContest[];
  /** Household members who may vote too, who go along. */
  readonly withIds: readonly PersonId[];
  /** The voting engine's polling place for the voter's precinct, and who works it that day. */
  readonly pollingPlaceId: string | null;
  readonly pollWorkerIds: readonly PersonId[];
}

const visitId = (personId: PersonId, date: IsoDate) => `${personId}:${date}`;

function town(api: CoreAPI): { townPlaceId: string } | undefined {
  // A world without the elections engine holds no elections.
  if (!api.state.modules.has(ELECTIONS_MODULE_ID)) return undefined;
  return api.moduleState(ELECTIONS_MODULE_ID).table("town").get("town") as
    { townPlaceId: string } | undefined;
}

/** May this person vote in the town's contests on this date, by the count's own rule? */
function mayVote(
  api: CoreAPI,
  townPlaceId: string,
  personId: PersonId,
  date: IsoDate,
): boolean {
  const person = api.state.people.get(personId);
  return Boolean(
    person?.alive &&
    // Someone serving a prison term where the law takes the vote is not taken to the polls.
    !barredFromVoting(api, personId) &&
    person.placeId === townPlaceId &&
    ageOnDate(makeIsoDate(person.birthDate), date) >= DATA.votingAge.value,
  );
}

/** The contests the town votes in on a date, as the elections engine holds them. */
function contestsOn(api: CoreAPI, date: IsoDate): readonly ContestRow[] {
  return (
    api
      .moduleState(ELECTIONS_MODULE_ID)
      .table("contests")
      .rows() as unknown as ContestRow[]
  )
    .filter((row) => row.electionDate === date)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function pollingContest(
  core: Readonly<CoreState>,
  api: CoreAPI,
  contest: ContestRow,
): PollingContest {
  const filings = ballot(api, contest.id);
  return {
    id: contest.id,
    title: contest.title,
    level: contest.level,
    candidates: filings.flatMap((filing) => {
      const person = core.people.get(filing.personId);
      return person
        ? [
            {
              personId: filing.personId,
              name: `${person.givenName} ${person.familyName}`,
              party: filing.party ?? null,
              filingId: filing.id,
            },
          ]
        : [];
    }),
    sourceRecordIds: [contest.id, ...filings.map((filing) => filing.id)],
  };
}

/**
 * The visit due for a voter on an election date, or null: no contest that
 * day, the voter may not vote, they have been already, or they left the
 * polling place out of the scenes that stop their day. Reads only.
 */
export function pollingVisitDue(
  core: Readonly<CoreState>,
  ledger: Ledger,
  personId: PersonId,
  date: IsoDate,
): PollingVisit | null {
  const api = coreAPI(core as CoreState);
  const place = town(api);
  if (!place || !mayVote(api, place.townPlaceId, personId, date)) return null;
  const kept = ledger.pollingVisits.get(visitId(personId, date));
  if (kept && kept.status !== "open") return null;
  const filter = ledger.sceneFilters.get(personId);
  if (filter && !filter.allowedKinds.includes(DATA.situationKey)) return null;
  const contests = contestsOn(api, date).map((row) =>
    pollingContest(core, api, row),
  );
  if (!contests.length) return null;
  const household = core.households.get(core.people.get(personId)!.householdId);
  return {
    record: kept ?? {
      id: visitId(personId, date),
      personId,
      electionDate: date,
      contestIds: contests.map((row) => row.id),
      marked: {},
      status: "open",
    },
    situationKey: DATA.situationKey,
    place: DATA.place,
    contests,
    withIds: (household?.memberIds ?? []).filter(
      (id) => id !== personId && mayVote(api, place.townPlaceId, id, date),
    ),
    ...pollingPlaceFields(api, personId, date),
  };
}

/** The voting engine's polling place and poll workers, where it keeps them. */
function pollingPlaceFields(api: CoreAPI, personId: PersonId, date: IsoDate) {
  const row = api.state.modules.has(VOTING_MODULE_ID)
    ? pollingPlaceOf(api, personId, date)
    : null;
  return {
    pollingPlaceId: row?.id ?? null,
    pollWorkerIds: (row?.pollWorkers?.ids ?? []).filter(
      (id) => id !== personId,
    ) as PersonId[],
  };
}

/**
 * The voter marks one contest: a candidate on its ballot, or null to leave
 * it blank. The voting engine keeps the mark and counts it on election day.
 * Once every contest is marked, the visit is done.
 */
export function markBallot(
  core: CoreState,
  ledger: Ledger,
  visit: PollingVisit,
  contestId: string,
  candidateId: string | null,
): PollingVisitRecord {
  const contest = visit.contests.find((row) => row.id === contestId);
  if (!contest) throw new Error("That race isn't on this ballot.");
  if (
    candidateId !== null &&
    !contest.candidates.some((row) => row.personId === candidateId)
  )
    throw new Error("That candidate isn't on the ballot for this race.");
  castBallot(coreAPI(core), visit.record.personId, contestId, candidateId);
  const marked = { ...visit.record.marked, [contestId]: candidateId };
  const record: PollingVisitRecord = {
    ...visit.record,
    marked,
    status: visit.record.contestIds.every((id) => id in marked)
      ? "voted"
      : "open",
  };
  ledger.pollingVisits.set(record.id, record);
  return record;
}

/**
 * The voter leaves before marking every race: what they marked stands, and
 * the rest they vote or leave on their own reasons, like everyone else.
 */
export function leavePollingPlace(
  ledger: Ledger,
  visit: PollingVisit,
): PollingVisitRecord {
  const record: PollingVisitRecord = { ...visit.record, status: "left" };
  ledger.pollingVisits.set(record.id, record);
  return record;
}

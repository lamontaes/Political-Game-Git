/**
 * The polling day: what is on the ballot, polling places, wards, precincts, registration and casting a ballot.
 *
 * Split out of voting.ts by scripts/elections/split-module.ts (structure only);
 * voting.ts re-exports every export of this file by name.
 */
import { addDays, makeIsoDate } from "../kernel/dates";
import {
  NATIONAL_ENGAGEMENT,
  countedAppeal,
  engagementOf,
  countedEndorsed,
} from "../electorate";
import { VOTING_MODULE_ID } from "../voting-module-id";
import {
  barredFromVoting,
  recordRedistricting,
  automaticRegistrationInForce,
  sameDayRegistrationInForce,
} from "../laws-in-force";
import {
  countedParts,
  ensureKeptOff,
  keptOffOf,
  addressKeyOf,
  onTheList,
  registrationRow,
  reviewRegistrations,
  waitAnchor,
  daysSince,
  type RegistrationDeps,
  type RollEntry,
} from "../electorate-registration";
import { departureRateFor, withinCountyRateFor } from "./moves";
import { dwellingMovedIn } from "./housing";
import { interestOf } from "../turnout";
import type { CoreAPI, CoreState, PersonState } from "../types";
import type { ModuleRow } from "../module-data";
import { personLean } from "../campaign-views";
import { campaignParameter } from "../campaign-data";
import {
  contestsOnDate,
  ELECTIONS_MODULE_ID,
  ballot,
  isLocalFamily,
  type ContestRow,
  type FilingRow,
} from "./elections";
import { CAMPAIGNS_MODULE_ID, townLean } from "./campaigns";
import { officeSeats } from "./offices";
import type { SeatInput } from "./offices";
import { cpsAgeBand, cpsRegistered } from "../electorate-places";
import {
  appealFor,
  countedAdultsToday,
  countedField,
  countedPledges,
  countedWarmths,
  electorateRoll,
  incumbentLeanOf,
  mayVoteOn,
  townAdults,
} from "./voting-appeal";
import { ageOn, electionsParameter, table, town } from "./voting-base";
import { countedScale, countedVoters } from "./voting-count";
import { decideTurnout, decisions, turnoutReasons } from "./voting-turnout";
import type { TurnoutDecision } from "./voting-turnout";

/** The contests on the ballot on a date, with their fields, read once a day. */
/**
 * Whether the day's ballot carries a local race with candidates, a primary
 * or a general: a voter decides once a day whether to go, and one trip to the
 * polls covers the whole ballot, so a local race anywhere on it lets the web's
 * local-turnout links move them. Read once a day.
 */
export function localOnBallot(api: CoreAPI, date: string): boolean {
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
export function contactsOf(
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
export function townContacts(
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
export function pollsterCase(
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

export function atThePolls(
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
          warmths: countedWarmths(
            api,
            voter,
            countedField(api, race.contest, race.field),
          ),
          endorsed: countedEndorsed(
            lean,
            countedField(api, race.contest, race.field),
            null,
          ),
          pledges: countedPledges(
            api,
            voter.id,
            1,
            race.contest.id,
            countedField(api, race.contest, race.field),
          ),
          divides: true,
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
export function heldPledge(
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

/**
 * The precinct a household votes in, assigned once and kept: the precinct
 * with the fewest households when the household first votes here (ties to the
 * lowest number), and changed only by a move on record (its home's start day
 * changes). Other households coming and going never move it.
 */
function precinctOfHousehold(
  api: CoreAPI,
  householdId: string,
  precincts: number,
): number {
  const rows = table(api, "householdPrecincts");
  const dwelt = dwellingMovedIn(api, householdId) ?? "";
  const held = rows.get(`household-precinct:${householdId}`) as unknown as
    { precinct: number; movedIn: string } | undefined;
  if (held && held.movedIn === dwelt && held.precinct <= precincts)
    return held.precinct;
  const fill = precinctFill(api, precincts);
  let precinct = 1;
  for (let i = 2; i <= precincts; i += 1)
    if (fill[i - 1]! < fill[precinct - 1]!) precinct = i;
  if (held && held.precinct <= precincts) fill[held.precinct - 1]! -= 1;
  fill[precinct - 1]! += 1;
  rows.put({
    id: `household-precinct:${householdId}`,
    householdId,
    precinct,
    movedIn: dwelt,
    since: api.state.date,
  } as unknown as ModuleRow);
  return precinct;
}

/** How many households each precinct holds, read from the kept assignments once and then kept in step. */
function precinctFill(api: CoreAPI, precincts: number): number[] {
  const held = precinctFills.get(api.state);
  if (held && held.length === precincts) return held;
  const fill = new Array<number>(precincts).fill(0);
  for (const row of table(api, "householdPrecincts").rows() as unknown as {
    precinct: number;
  }[])
    if (row.precinct <= precincts) fill[row.precinct - 1]! += 1;
  precinctFills.set(api.state, fill);
  return fill;
}
const precinctFills = new WeakMap<object, number[]>();

/**
 * How many wards a council contest's seat is one of: the seats its office
 * elects by part of town. 0 for an at-large seat or any other office.
 */
export function wardsOf(api: CoreAPI, contest: ContestRow): number {
  if (contest.family !== "municipalOffice" || contest.district === null)
    return 0;
  return (officeSeats(api, contest.officeId) as unknown as SeatInput[]).filter(
    (s) => s.district !== null,
  ).length;
}

/**
 * Whether a named voter's household is in the ward a contest's seat
 * represents. Wards are drawn to near equal population: the town's
 * households in their recorded order are cut where each ward has its share
 * of the town's adults, a household falling in the ward its middle adult
 * does. The town has no street map, so no ward has a boundary
 * (SG-GOV-ward-map).
 */
export function inWard(
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
export function candidateInWard(
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
export function precinctIndexOf(
  api: CoreAPI,
  voter: Readonly<PersonState>,
): number {
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

// --- voter registration ----------------------------------------------------

/** What the registration records need from this engine (`electorate-registration.ts`). */
function registrationDeps(api: CoreAPI): RegistrationDeps {
  return {
    api,
    table: (name) => table(api, name),
    adults: () => townAdults(api),
    dutyOf: (person) => turnoutReasons(api, person, undefined, 0, true).duty,
    usps: town(api).stateKey.slice(3),
    automatic: () => automaticRegistrationInForce(api),
  };
}

/** The opening roll's people, for the part of each age band that keeps off the rolls. */
function registrationRoll(api: CoreAPI): readonly RollEntry[] {
  const date = api.state.date;
  const adultAge = api.parameter("votingAge");
  const automatic = automaticRegistrationInForce(api);
  const deadlineDays = campaignParameter("registrationDeadlineDays");
  const { townPlaceId } = town(api);
  const named = townAdults(api).map((person): RollEntry => {
    const { anchor, grown } = waitAnchor(api, person);
    const age = ageOn(person, date);
    return {
      age,
      weight: 1,
      inputs: {
        duty: turnoutReasons(api, person, undefined, 0, true).duty,
        yearsInPlace: Math.floor(daysSince(anchor, date) / 365),
        yearsAdult: Math.floor(daysSince(grown, date) / 365),
        moveRate: 0,
        automatic,
        deadlineDays,
      },
    };
  });
  const scale = countedScale(api);
  const counted = countedVoters(api)
    .filter((v) => v.placeId === townPlaceId && ageOn(v, date) >= adultAge)
    .map((v): RollEntry => {
      const age = ageOn(v, date);
      return {
        age,
        weight: v.weight * scale,
        inputs: {
          duty: turnoutReasons(api, v, v.weeklyMinutes, 0, true).duty,
          yearsInPlace: v.yearsInPlace,
          yearsAdult: age - adultAge,
          moveRate:
            departureRateFor(townPlaceId, age) +
            withinCountyRateFor(townPlaceId, age),
          automatic,
          deadlineDays,
        },
      };
    });
  return [...named, ...counted];
}

/** The registration records, found at the opening and brought up to the day. */
export function registrations(api: CoreAPI): RegistrationDeps {
  const deps = registrationDeps(api);
  ensureKeptOff(deps, () => registrationRoll(api));
  reviewRegistrations(deps);
  assignPrecincts(api);
  return deps;
}

/** Every household that votes here has its precinct, assigned the day it is first seen (so a reading writes nothing). */
function assignPrecincts(api: CoreAPI): void {
  if (assigned.get(api.state) === api.state.date) return;
  assigned.set(api.state, api.state.date);
  const precincts = pollingPlaces(api).length;
  if (!precincts) return;
  for (const home of new Set(townAdults(api).map((p) => p.householdId)))
    precinctOfHousehold(api, home, precincts);
}
const assigned = new WeakMap<object, string>();

/**
 * The registration records brought up to today (a review of who moved and
 * who finished registering), for the engines and tests that read them.
 */
export function reviewVoterRegistrations(api: CoreAPI): RegistrationDeps {
  return registrations(api);
}

/**
 * The share of the town's adult citizens on the rolls today: a named person
 * by their record, a counted record by the same rule at its weight.
 */
export function registeredShareOfRoll(api: CoreAPI): number {
  registrations(api);
  const date = api.state.date;
  const counted = new Map(countedVoters(api).map((c) => [c.id, c]));
  let people = 0,
    registered = 0;
  for (const v of electorateRoll(api)) {
    const voter = api.state.people.get(v.id) ?? counted.get(v.id)!;
    const { duty } = turnoutReasons(api, voter, v.weeklyMinutes, 0, true);
    const reading = registrationReading(api, voter, date, duty);
    people += v.count;
    registered += v.count * reading.share;
  }
  return people ? registered / people : 0;
}

export const REGISTRATION_REVIEW = "registration-review";

/** Books the next month's review of who has registered or moved, on its first day. */
export function scheduleRegistrationReview(api: CoreAPI): void {
  const date = addDays(makeIsoDate(api.state.date), 30);
  api.moduleCalendar(VOTING_MODULE_ID).schedule({
    key: `${REGISTRATION_REVIEW}:${date}`,
    date,
    kind: REGISTRATION_REVIEW,
    source: {
      tag: "ESTIMATED",
      citation:
        "Each month the voting engine sees who moved and who finished registering (registrationLagMedianDays).",
      asOf: api.state.date,
      estimatedFrom: "src/core2/data/campaigns/parameters.json",
    },
    sourceRecordIds: ["registration-base"],
  });
}

/** What an election day found about one voter's registration, as the turnout rule reads it. */
interface RegistrationReading {
  /** The share of the voter's people who are on the rolls in time: 1 or 0 for a named person. */
  readonly share: number;
  /** Why a named person is not on the rolls. */
  readonly why: "on" | "old-address" | "not-registered" | "after-deadline";
  /** The survey's registered share of citizens like them (the turnout calibration's), 0 to 1. */
  readonly surveyShare: number;
  readonly sameDay: boolean;
}

/** One voter's registration on a day: the record for a named person, the same rule's share for a counted record. */
export function registrationReading(
  api: CoreAPI,
  voter: Readonly<Pick<PersonState, "id" | "traits">>,
  date: string,
  duty: number,
): RegistrationReading {
  const deps = registrations(api);
  const sameDay = sameDayRegistrationInForce(api);
  const deadlineDays = sameDay
    ? 0
    : campaignParameter("registrationDeadlineDays");
  const person = api.state.people.get(voter.id);
  const birthDate =
    (voter as { birthDate?: string }).birthDate ?? person?.birthDate;
  const age = birthDate ? ageOn({ birthDate }, date) : 40;
  const usps = deps.usps;
  const rate =
    cpsRegistered(usps, cpsAgeBand(age)) ?? cpsRegistered(usps) ?? 0.7;
  if (person) {
    const deadline = sameDay ? null : addDays(makeIsoDate(date), -deadlineDays);
    const why = onTheList(deps, person, deadline);
    return { share: why === "on" ? 1 : 0, why, surveyShare: rate, sameDay };
  }
  const counted = voter as {
    readonly weight?: number;
    readonly yearsInPlace?: number;
    readonly placeId?: string;
  };
  const placeId = counted.placeId ?? town(api).townPlaceId;
  const adultAge = api.parameter("votingAge");
  const { a, b } = countedParts({
    duty,
    yearsInPlace: counted.yearsInPlace,
    yearsAdult: age - adultAge,
    moveRate:
      departureRateFor(placeId, age) + withinCountyRateFor(placeId, age),
    automatic: automaticRegistrationInForce(api),
    deadlineDays,
  });
  const share = Math.min(1, Math.max(0, (1 - keptOffOf(deps, age)) * a + b));
  return { share, why: "on", surveyShare: rate, sameDay };
}

/**
 * A named person who goes to the polls and is not on the rolls: where the
 * state registers people there they register and vote; elsewhere they are
 * turned away. The day keeps what happened.
 */
export function keepPollDay(
  api: CoreAPI,
  person: PersonState,
  date: string,
  outcome: "registers-at-polls" | "not-on-the-list",
  why: string,
): void {
  const precincts = pollingPlaces(api).length;
  table(api, "pollDays").put({
    id: `poll-day:${date}:${person.id}`,
    date,
    personId: person.id,
    outcome,
    why,
    precinct: precincts
      ? precinctOfHousehold(api, person.householdId, precincts)
      : 1,
    addressKey: `${person.householdId}@${dwellingMovedIn(api, person.householdId) ?? ""}`,
  } as unknown as ModuleRow);
  if (outcome !== "registers-at-polls") return;
  const rows = table(api, "registrations");
  const row = rows.get(`registration:${person.id}`) as unknown as
    Record<string, unknown> | undefined;
  if (row)
    rows.put({
      ...row,
      registered: true,
      addressKey: `${person.householdId}@${dwellingMovedIn(api, person.householdId) ?? ""}`,
      since: date,
      how: "at-the-polls",
      staleSince: null,
      lastAddress: `${person.householdId}@${dwellingMovedIn(api, person.householdId) ?? ""}`,
    } as unknown as ModuleRow);
}

/**
 * What the election day did to the counted residents not on the rolls, as
 * the one record of the day's count (the named people's are one row each):
 * how many of them registered at the polls and voted, and how many who
 * would have voted were not on the list.
 */
export function keepCountedPollDay(api: CoreAPI, date: string): void {
  const held = decisions.get(api.state);
  if (!held) return;
  const scale = countedScale(api);
  let registeredAtPolls = 0,
    notOnTheList = 0;
  for (const v of countedVoters(api)) {
    const d = held.get(`${date}|${v.id}`);
    if (!d) continue;
    const people = v.weight * scale;
    registeredAtPolls += people * d.atPolls;
    notOnTheList += people * d.turnedAway;
  }
  if (registeredAtPolls < 0.5 && notOnTheList < 0.5) return;
  table(api, "pollDays").put({
    id: `poll-day:${date}:counted`,
    date,
    registeredAtPolls: Math.round(registeredAtPolls),
    notOnTheList: Math.round(notOnTheList),
  } as unknown as ModuleRow);
}

/** The share of a voter's people who registered at the polls and voted on the day (named: 1 or 0), for the law's record. */
export function registeredAtPollsShare(
  api: CoreAPI,
  voterId: string,
  date: string,
): number {
  return decisions.get(api.state)?.get(`${date}|${voterId}`)?.atPolls ?? 0;
}

/** Where a named person stands with the rolls for an election day: on them, able to register at the polls (a state that does), or why not. */
export type PollingStatus =
  "on" | "same-day" | "old-address" | "not-registered" | "after-deadline";

/** The one read of a named person's standing for a day's election, from their registration record and the state's laws in force. */
export function pollingStatus(
  api: CoreAPI,
  personId: string,
  date: string,
): PollingStatus {
  const person = api.state.people.get(personId);
  if (!person) return "not-registered";
  const reading = registrationReading(api, person, date, 0);
  return reading.why === "on"
    ? "on"
    : reading.sameDay
      ? "same-day"
      : reading.why;
}

/**
 * A person registers to vote at the address they live at, today, by their
 * own act (a form, in a state that has one). It counts for an election whose
 * deadline is still ahead; the record names who acted. False where they are
 * on the rolls at this address already or may not vote here.
 */
export function registerToVote(api: CoreAPI, personId: string): boolean {
  const person = api.state.people.get(personId);
  if (!person || !mayVoteOn(api, personId, api.state.date)) return false;
  const deps = registrations(api);
  const row = registrationRow(deps, personId);
  if (!row) return false;
  const key = addressKeyOf(api, person);
  if (row.registered && row.addressKey === key) return false;
  table(api, "registrations").put({
    ...row,
    registered: true,
    addressKey: key,
    since: api.state.date,
    how: "by-the-player",
    staleSince: null,
    lastAddress: key,
    willing: true,
  } as unknown as ModuleRow);
  return true;
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

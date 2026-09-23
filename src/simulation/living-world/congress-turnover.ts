import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import type { CharacterHistoryContextPersonInput } from "../character-history";
import { makeIsoDate } from "../dates";
import { electionContestResult } from "../election-contests";
import { stateJurisdictionForKey } from "../life-places";
import { drawCanonicalNamedIdentity, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import { LIVING_WORLD_SCENARIO_PROFILE as PROFILE } from "./contract";
import { MINIMUM_AGE, congressSeats, seatTermWindow } from "./congress-seats";
import type { CongressSeat } from "./congress-seats";
import {
  LIVING_WORLD_KEYS,
  LIVING_WORLD_WRITER_VERSION,
  SEAT_CAUCUS_TAG,
  SEAT_PARTY_TAG,
  SEAT_TENURE_EVENT,
  SEAT_VACANCY_EVENT,
  congressSeatTitle,
  livingWorldEstablished,
  livingWorldOrganizationId,
} from "./opening";

/**
 * CONGRESS CONTINUITY — the regular elections the opening snapshot does not
 * contain.
 *
 * The opening records one term per seat. Without this, every House seat and
 * one Senate class read "no current record" once January 3, 2027 passed.
 * Time now carries each seat forward:
 *
 * - On the general election day (2 U.S.C. § 7: the Tuesday after the first
 *   Monday in November of every even year) the seats whose terms end the
 *   following January 3 are decided, and one public results record names the
 *   winners. A successor who is new to the World is created then.
 * - On January 3 each winner's new term record is written, dated that day.
 *   A member-elect who died in between leaves an actual vacancy with its cause.
 *
 * Who wins is the game's disclosed turnover profile, not a forecast or real
 * results. Only dates the clock actually crosses act: reading or reopening a
 * save writes nothing, a save that already passed these dates keeps its
 * record, and no incumbent is extended without an election.
 */

export const CONGRESS_TURNOVER_VERSION = "congress-turnover/v1";

/**
 * PROVISIONAL, and awaiting SOURCED RATES rather than anyone's sign-off. The
 * election day below is sourced to 2 U.S.C. section 7; none of these four is
 * sourced to anything. Filed as executive-terms-and-incumbency-turnover.
 */
export const CONGRESS_TURNOVER_PROFILE = {
  id: "ocd-congress-turnover-game-profile/v1",
  /** Chance an incumbent runs again and wins, per mille. */
  incumbentReturnPermille: { "us-house": 850, "us-senate": 800 },
  /** Incumbents this old or older retire. */
  retirementAge: 82,
  /** Chance an open seat stays with the departing member's party, per mille. */
  samePartyPermille: 750,
} as const;

export const CONGRESS_ELECTION_SOURCE = {
  citation: "2 U.S.C. § 7",
  url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title2-section7&num=0&edition=prelim",
  excerpt:
    "The Tuesday next after the 1st Monday in November, in every even numbered year, is established as the day for the election",
} as const;

export const CONGRESS_RESULTS_EVENT = "election.congress-general-results";

const resultsKey = (year: number) =>
  `${CONGRESS_TURNOVER_VERSION}:results:${year}`;

export function congressionalElectionDay(year: number): IsoDate {
  const first = new Date(Date.UTC(year, 10, 1));
  const toMonday = (8 - first.getUTCDay()) % 7;
  return makeIsoDate(
    new Date(Date.UTC(year, 10, 2 + toMonday)).toISOString().slice(0, 10),
  );
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

function latestSeatRecords(world: World): Map<string, HistoricalEvent> {
  const bySeat = new Map<string, HistoricalEvent>();
  for (const event of world.history.events) {
    if (
      (event.type !== SEAT_TENURE_EVENT && event.type !== SEAT_VACANCY_EVENT) ||
      !event.tags.includes(LIVING_WORLD_WRITER_VERSION)
    )
      continue;
    const seatKey = tagValue(event, "seat:");
    if (!seatKey) continue;
    const current = bySeat.get(seatKey);
    if (
      !current ||
      event.occurredAt > current.occurredAt ||
      (event.occurredAt === current.occurredAt &&
        event.sequence > current.sequence)
    )
      bySeat.set(seatKey, event);
  }
  return bySeat;
}

function aliveOn(world: World, personId: EntityId, date: IsoDate): boolean {
  return (
    Boolean(world.people[personId]) &&
    !world.history.personDeaths.some(
      (death) => death.personId === personId && death.diedAt <= date,
    )
  );
}

function ageOn(birthDate: IsoDate, date: IsoDate): number {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

interface SeatOutcome {
  readonly seat: CongressSeat;
  readonly incumbentPersonId: EntityId | null;
  readonly successorKey: string | null;
  /** Set when a recorded contest, not the profile, chose this winner. */
  readonly recordedWinnerPersonId?: EntityId | null;
  readonly party: string;
  readonly caucus: string;
  readonly serviceSince: IsoDate;
}

/** The world's own contest for this seat and day, if one was scheduled. */
export function recordedSeatContest(
  world: World,
  seat: CongressSeat,
  electionDay: IsoDate,
) {
  return (world.history.electionContests ?? []).find(
    (contest) =>
      contest.electionDate === electionDay &&
      (contest.office.seatKey === seat.seatKey ||
        contest.office.officeKey === seat.seatKey),
  );
}

/**
 * Whether the sitting member is seeking another term, as a recorded decision
 * of its own. It is written before the election and read by it, so standing
 * again, the result, and taking office stay three separate facts.
 */
const SEEKS_TERM_EVENT = "election.congress-candidacy-intent";

function seekingKey(seatKey: string, year: number): string {
  return `${CONGRESS_TURNOVER_VERSION}:seeking:${seatKey}:${year}`;
}

export function recordSeatCandidacyIntent(
  world: World,
  seat: CongressSeat,
  year: number,
  incumbentPersonId: EntityId | null,
  seeking: boolean,
  reason: string,
): World {
  const stableKey = seekingKey(seat.seatKey, year);
  if (world.history.events.some((event) => event.stableKey === stableKey))
    return world;
  const chamberId = livingWorldOrganizationId(
    world,
    LIVING_WORLD_KEYS.chamber(seat.chamberKey),
  );
  const title = congressSeatTitle(seat);
  return recordWorldEvent(world, {
    stableKey,
    type: SEEKS_TERM_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id,
    involvedEntityIds: [
      ...new Set([
        chamberId,
        ...(incumbentPersonId ? [incumbentPersonId] : []),
      ]),
    ].sort(),
    participants: incumbentPersonId
      ? [
          {
            personId: incumbentPersonId,
            role: "focus:subject",
            detail: seeking ? "seeking-another-term" : "not-seeking",
          },
        ]
      : [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CONGRESS_TURNOVER_VERSION,
      `seat:${seat.seatKey}`,
      `intent:${seeking ? "seeking" : "not-seeking"}`,
      `provenance:${CONGRESS_TURNOVER_PROFILE.id}`,
    ],
    summary: seeking
      ? `The ${title} is seeking another term.`
      : `The ${title} is not seeking another term: ${reason}`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** The recorded intent, or null when nobody has recorded one. */
export function seatCandidacyIntent(
  world: World,
  seatKey: string,
  year: number,
): boolean | null {
  const event = world.history.events.find(
    (candidate) => candidate.stableKey === seekingKey(seatKey, year),
  );
  return event ? event.tags.includes("intent:seeking") : null;
}

/** Whether this is the person being played, whose seat only their own race decides. */
function isControlled(world: World, personId: EntityId): boolean {
  return world.control.kind === "person" && world.control.personId === personId;
}

function decideSeat(
  world: World,
  seat: CongressSeat,
  record: HistoricalEvent | undefined,
  year: number,
  newStart: IsoDate,
  electionDay: IsoDate,
): SeatOutcome | null {
  const rng = new SeededRng(world.seed).fork(
    `${CONGRESS_TURNOVER_VERSION}:${seat.seatKey}:${year}`,
  );
  const majors: string[] = PROFILE.majorParties.map((party) => party.key);
  const incumbent =
    record?.type === SEAT_TENURE_EVENT
      ? record.participants.find((p) => p.role === "focus:subject")?.personId
      : undefined;
  const recordedParty = record ? tagValue(record, SEAT_PARTY_TAG) : null;
  const recordedCaucus = record ? tagValue(record, SEAT_CAUCUS_TAG) : null;
  const person = incumbent ? world.people[incumbent] : undefined;
  const eligible =
    incumbent !== undefined &&
    person !== undefined &&
    aliveOn(world, incumbent, electionDay) &&
    ageOn(person.birthDate, electionDay) <
      CONGRESS_TURNOVER_PROFILE.retirementAge;
  // A contest this world actually scheduled decides its own seat. The
  // turnover profile is a fallback for seats nobody contested here, and it
  // never overwrites a recorded result.
  const contest = recordedSeatContest(world, seat, electionDay);
  if (contest) {
    const result = electionContestResult(world, contest.id);
    if (!result) return null;
    const incumbentWon = result.winnerPersonId === incumbent;
    return {
      seat,
      incumbentPersonId: incumbentWon ? result.winnerPersonId : null,
      successorKey: null,
      recordedWinnerPersonId: result.winnerPersonId,
      party: incumbentWon ? (recordedParty ?? "none") : "none",
      caucus: incumbentWon ? (recordedCaucus ?? "none") : "none",
      serviceSince: incumbentWon
        ? ((record
            ? (tagValue(record, "service-since:") as IsoDate | null)
            : null) ??
          record?.occurredAt ??
          newStart)
        : newStart,
    };
  }
  // The person being played keeps a seat only by winning it. With no contest
  // of theirs on the ballot, the background model neither returns them nor
  // retires them by chance: they did not file, so the seat goes to someone
  // new, the same as any member who stands down.
  if (incumbent !== undefined && isControlled(world, incumbent)) {
    const party =
      recordedParty && majors.includes(recordedParty)
        ? recordedParty
        : rng.pick(majors);
    return {
      seat,
      incumbentPersonId: null,
      successorKey: `${LIVING_WORLD_KEYS.seat(seat.seatKey)}:term:${newStart}:member`,
      party,
      caucus: party,
      serviceSince: newStart,
    };
  }
  const intent = seatCandidacyIntent(world, seat.seatKey, year);
  // Standing again is its own recorded decision. Only the contest that
  // follows decides whether they keep the seat.
  const seeking =
    intent ??
    (eligible &&
      rng.integer(0, 1000) <
        CONGRESS_TURNOVER_PROFILE.incumbentReturnPermille[seat.chamberKey]);
  const returns = eligible && seeking;
  if (returns && incumbent) {
    return {
      seat,
      incumbentPersonId: incumbent,
      successorKey: null,
      party: recordedParty ?? "none",
      caucus: recordedCaucus ?? rng.pick(majors),
      serviceSince:
        (record
          ? (tagValue(record, "service-since:") as IsoDate | null)
          : null) ??
        record?.occurredAt ??
        newStart,
    };
  }
  const priorParty =
    recordedParty && majors.includes(recordedParty) ? recordedParty : null;
  const party = !priorParty
    ? rng.pick(majors)
    : rng.integer(0, 1000) < CONGRESS_TURNOVER_PROFILE.samePartyPermille
      ? priorParty
      : majors.find((key) => key !== priorParty)!;
  return {
    seat,
    incumbentPersonId: null,
    successorKey: `${LIVING_WORLD_KEYS.seat(seat.seatKey)}:term:${newStart}:member`,
    party,
    caucus: party,
    serviceSince: newStart,
  };
}

/** Election day: decide the seats whose terms end next January 3. */
function holdCongressElection(world: World, year: number): World {
  if (world.history.events.some((e) => e.stableKey === resultsKey(year)))
    return world;
  const electionDay = congressionalElectionDay(year);
  const newStart = makeIsoDate(`${year + 1}-01-03`);
  const seats = congressSeats().filter(
    (seat) => seatTermWindow(seat, electionDay).endExclusive === newStart,
  );
  const latest = latestSeatRecords(world);
  let intents = world;
  for (const seat of seats) {
    const record = latest.get(seat.seatKey);
    const incumbent =
      record?.type === SEAT_TENURE_EVENT
        ? (record.participants.find((p) => p.role === "focus:subject")
            ?.personId ?? null)
        : null;
    const person = incumbent ? intents.people[incumbent] : undefined;
    const rng = new SeededRng(intents.seed).fork(
      `${CONGRESS_TURNOVER_VERSION}:intent:${seat.seatKey}:${year}`,
    );
    const tooOld =
      person !== undefined &&
      ageOn(person.birthDate, electionDay) >=
        CONGRESS_TURNOVER_PROFILE.retirementAge;
    const alive = incumbent ? aliveOn(intents, incumbent, electionDay) : false;
    const played = incumbent !== null && isControlled(intents, incumbent);
    const filed = recordedSeatContest(intents, seat, electionDay) !== undefined;
    const seeking =
      incumbent !== null &&
      alive &&
      !tooOld &&
      (played ? filed : true) &&
      (played ||
        rng.integer(0, 1000) <
          CONGRESS_TURNOVER_PROFILE.incumbentReturnPermille[seat.chamberKey]);
    intents = recordSeatCandidacyIntent(
      intents,
      seat,
      year,
      incumbent,
      seeking,
      !incumbent
        ? "the seat has no sitting member."
        : !alive
          ? "the seat is vacant."
          : played && !filed
            ? "they did not file for another term."
            : tooOld
              ? `they are ${CONGRESS_TURNOVER_PROFILE.retirementAge} or older.`
              : "they are standing down.",
    );
  }
  // A seat whose own contest has not been decided yet is left undecided here:
  // no winner is invented to fill it.
  const outcomes = seats.flatMap((seat) => {
    const decided = decideSeat(
      intents,
      seat,
      latest.get(seat.seatKey),
      year,
      newStart,
      electionDay,
    );
    return decided ? [decided] : [];
  });
  const inputs: CharacterHistoryContextPersonInput[] = outcomes.flatMap(
    (outcome) => {
      if (!outcome.successorKey) return [];
      const rng = new SeededRng(world.seed).fork(outcome.successorKey);
      const age = rng.integer(MINIMUM_AGE[outcome.seat.chamberKey] + 3, 70);
      return [
        {
          stableKey: outcome.successorKey,
          ...drawCanonicalNamedIdentity(
            rng.fork("name"),
            generatePersonIdentity(rng.fork("identity")),
          ),
          birthDate: makeIsoDate(
            `${year - age}-${pad(rng.integer(1, 13))}-${pad(rng.integer(1, 29))}`,
          ),
          homeJurisdictionId: stateJurisdictionForKey(
            `US-${outcome.seat.stateUsps}`,
          )!.id,
        },
      ];
    },
  );
  let next =
    inputs.length > 0
      ? createCharacterHistoryContextPeople(intents, inputs)
      : intents;
  const returning = outcomes.filter((o) => o.incumbentPersonId).length;
  const winnerIds = outcomes.map(
    (outcome) =>
      outcome.recordedWinnerPersonId ??
      outcome.incumbentPersonId ??
      characterHistoryContextPersonId(next, outcome.successorKey!),
  );
  next = recordWorldEvent(next, {
    stableKey: resultsKey(year),
    type: CONGRESS_RESULTS_EVENT,
    occurredAt: electionDay,
    recordedAt: next.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [
      livingWorldOrganizationId(next, LIVING_WORLD_KEYS.chamber("us-house")),
      livingWorldOrganizationId(next, LIVING_WORLD_KEYS.chamber("us-senate")),
      ...new Set(winnerIds),
    ],
    participants: outcomes.map((outcome, index) => ({
      personId: winnerIds[index]!,
      role: "focus:winner" as const,
      detail: [
        outcome.seat.seatKey,
        outcome.party,
        outcome.caucus,
        outcome.incumbentPersonId ? "returning" : "new",
        outcome.serviceSince,
      ].join("|"),
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CONGRESS_TURNOVER_VERSION,
      CONGRESS_TURNOVER_PROFILE.id,
      `term-start:${newStart}`,
    ],
    summary: `Voters chose ${outcomes.length} members of Congress in the ${year} general election: ${returning} incumbents return and ${outcomes.length - returning} seats get new members.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return next;
}

/** January 3: seat each recorded winner for the new term. */
function seatCongressWinners(world: World, year: number): World {
  const results = world.history.events.find(
    (event) => event.stableKey === resultsKey(year),
  );
  if (!results) return world;
  const newStart = makeIsoDate(`${year + 1}-01-03`);
  const seatsByKey = new Map(congressSeats().map((s) => [s.seatKey, s]));
  let next = world;
  for (const participant of results.participants) {
    const [seatKey, party, caucus, , serviceSince] = (
      participant.detail ?? ""
    ).split("|");
    const seat = seatKey ? seatsByKey.get(seatKey) : undefined;
    if (!seat || !party || !caucus || !serviceSince) continue;
    const stableKey = `${LIVING_WORLD_KEYS.seat(seat.seatKey)}:term:${newStart}`;
    const vacancyKey = `${LIVING_WORLD_KEYS.seat(seat.seatKey)}:vacancy:${newStart}`;
    if (
      next.history.events.some(
        (event) =>
          event.stableKey === stableKey || event.stableKey === vacancyKey,
      )
    )
      continue;
    const window = seatTermWindow(seat, newStart);
    const jurisdictionId = stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id;
    const chamberId = livingWorldOrganizationId(
      next,
      LIVING_WORLD_KEYS.chamber(seat.chamberKey),
    );
    const seatTags = [
      LIVING_WORLD_WRITER_VERSION,
      CONGRESS_TURNOVER_VERSION,
      `office:${seat.chamberKey}`,
      `seat:${seat.seatKey}`,
      `state:${seat.stateUsps}`,
      `term-start:${window.startsAt}`,
      `term-end:${window.endExclusive}`,
    ];
    const context = {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    };
    const title = congressSeatTitle(seat);
    if (!aliveOn(next, participant.personId, newStart)) {
      next = recordWorldEvent(next, {
        stableKey: vacancyKey,
        type: SEAT_VACANCY_EVENT,
        occurredAt: newStart,
        recordedAt: next.currentDate,
        jurisdictionId,
        involvedEntityIds: [chamberId],
        participants: [],
        personFactConstraints: [],
        visibility: "public",
        tags: [...seatTags, "vacancy-cause:member-elect-died"],
        summary: `The seat of the ${title} is vacant: the member-elect died before the term began.`,
        context,
      });
      continue;
    }
    next = recordWorldEvent(next, {
      stableKey,
      type: SEAT_TENURE_EVENT,
      occurredAt: newStart,
      recordedAt: next.currentDate,
      jurisdictionId,
      involvedEntityIds: [participant.personId, chamberId],
      participants: [
        {
          personId: participant.personId,
          role: "focus:subject",
          detail: title,
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        ...seatTags,
        `service-since:${serviceSince}`,
        `${SEAT_PARTY_TAG}${party}`,
        `${SEAT_CAUCUS_TAG}${caucus}`,
        `provenance:${CONGRESS_TURNOVER_PROFILE.id}`,
      ],
      summary: `${personName(next.people[participant.personId]!)} begins a term as ${title}.`,
      context,
    });
  }
  return next;
}

/**
 * Called whenever the canonical clock moves from `before` to the World's
 * current date. Only dates actually crossed act.
 */
export function applyCongressTurnover(before: IsoDate, world: World): World {
  const after = world.currentDate;
  if (after <= before || !livingWorldEstablished(world)) return world;
  let next = world;
  const firstYear = Number(before.slice(0, 4)) - 1;
  const lastYear = Number(after.slice(0, 4));
  for (let year = firstYear; year <= lastYear; year += 1) {
    if (year % 2 !== 0) continue;
    const electionDay = congressionalElectionDay(year);
    if (before < electionDay && electionDay <= after)
      next = holdCongressElection(next, year);
    const newStart = makeIsoDate(`${year + 1}-01-03`);
    if (before < newStart && newStart <= after)
      next = seatCongressWinners(next, year);
  }
  return next;
}

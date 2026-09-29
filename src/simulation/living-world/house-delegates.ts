import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import type { CharacterHistoryContextPersonInput } from "../character-history";
import { makeIsoDate } from "../dates";
import { createStableId } from "../ids";
import { stateJurisdictionForKey } from "../life-places";
import { recordByStableKey, recordsWithFieldValue } from "../history-index";
import { drawCanonicalNamedIdentity, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import { aggregateCongressAffiliation } from "./congress-aggregate-outcome";
import { LIVING_WORLD_WRITER_VERSION } from "./opening-keys";

/**
 * THE NONVOTING MEMBERS OF THE U.S. HOUSE.
 *
 * The District of Columbia, Puerto Rico, Guam, the Virgin Islands, American
 * Samoa and the Northern Mariana Islands each send one member who sits on
 * committees and speaks on the floor but casts no final vote. They are not
 * among the 435 voting seats, so `congressSeats()` does not list them and the
 * chamber totals stay 435. This module seats one persistent fictional holder
 * for each at the opening and carries the seat forward on its own term.
 *
 * One rule for all six places. A member's term is the length the statute sets
 * (two years; four for Puerto Rico's Resident Commissioner) counted from
 * January 3, 2025. At a term's end the seat is decided the way the game
 * decides an unobserved House seat: a sitting member who is alive stands
 * again, and the party the seat's lean projects wins it, with the same
 * incumbency bonus a voting seat gets. A member who died or lost is replaced
 * by a new fictional person.
 */

const V = LIVING_WORLD_WRITER_VERSION;
const OPENING_KEY = `${V}:opening`;

export const HOUSE_DELEGATE_TENURE_EVENT =
  "world.house-delegate-tenure" as const;
export const HOUSE_DELEGATE_PROVENANCE = "provenance:house-delegate" as const;

/** The 2024 race, and how it maps to the two House caucuses. */
export interface HouseDelegateLean {
  /**
   * The Democratic (or Democratic-caucus) share of the votes cast for the two
   * caucuses' candidates in the 2024 race, or null where the race was
   * nonpartisan and no such share exists.
   */
  readonly democraticShare: number | null;
  /** The caucus the seat's 2024 winner sat with; used only when share is null. */
  readonly baselineCaucus: "democratic" | "republican";
  /** A nonpartisan race records no party label for its winner. */
  readonly nonpartisan: boolean;
  /** How the numbers were read, and whether they are an estimate. */
  readonly basis: string;
}

export interface HouseDelegateSeat {
  readonly seatKey: string;
  readonly stateUsps: string;
  readonly title: "Delegate" | "Resident Commissioner";
  /** Years in one term (48 U.S.C. § 891: four for Puerto Rico; two elsewhere). */
  readonly termYears: 2 | 4;
  readonly lean: HouseDelegateLean;
}

const LEAN_SOURCE =
  "2024 U.S. House election results for the six nonvoting seats (Wikipedia's 2024 U.S. House elections page, which cites each territory's election office and the Clerk of the House)";

/**
 * Starting lean from each place's own 2024 result, read by one rule: the
 * share of the Democratic-caucus candidate against the Republican-caucus
 * candidate, the independents left out.
 */
export const HOUSE_DELEGATE_SEATS: readonly HouseDelegateSeat[] = [
  {
    seatKey: "us-house-delegate:AS",
    stateUsps: "AS",
    title: "Delegate",
    termYears: 2,
    lean: {
      democraticShare: null,
      baselineCaucus: "republican",
      nonpartisan: true,
      basis: `ESTIMATED FROM AVERAGE: American Samoa's race is nonpartisan, so there is no two-caucus share; the 2024 winner (74.8%) sat with the House Republican Conference. ${LEAN_SOURCE}.`,
    },
  },
  {
    seatKey: "us-house-delegate:DC",
    stateUsps: "DC",
    title: "Delegate",
    termYears: 2,
    lean: {
      democraticShare: 80.1 / (80.1 + 6.3),
      baselineCaucus: "democratic",
      nonpartisan: false,
      basis: `Democratic 80.1% against Republican 6.3%; Statehood Green and independent candidates left out. ${LEAN_SOURCE}.`,
    },
  },
  {
    seatKey: "us-house-delegate:GU",
    stateUsps: "GU",
    title: "Delegate",
    termYears: 2,
    lean: {
      democraticShare: 46.8 / (46.8 + 52.7),
      baselineCaucus: "republican",
      nonpartisan: false,
      basis: `Democratic 46.8% against Republican 52.7%. ${LEAN_SOURCE}.`,
    },
  },
  {
    seatKey: "us-house-delegate:MP",
    stateUsps: "MP",
    title: "Delegate",
    termYears: 2,
    lean: {
      democraticShare: 33.3 / (33.3 + 40.3),
      baselineCaucus: "republican",
      nonpartisan: false,
      basis: `Democratic 33.3% against Republican 40.3%; two independents (24.4% together) left out, so ESTIMATED FROM AVERAGE for the share of voters they stand for. ${LEAN_SOURCE}.`,
    },
  },
  {
    seatKey: "us-house-delegate:PR",
    stateUsps: "PR",
    title: "Resident Commissioner",
    termYears: 4,
    lean: {
      democraticShare: 44.6 / (44.6 + 35.0),
      baselineCaucus: "democratic",
      nonpartisan: false,
      basis: `ESTIMATED FROM AVERAGE: Puerto Rico's parties do not map to national ones; the Popular Democratic candidate (44.6%, sits with House Democrats) against the New Progressive candidate (35.0%, sits with House Republicans); other parties left out. ${LEAN_SOURCE}.`,
    },
  },
  {
    seatKey: "us-house-delegate:VI",
    stateUsps: "VI",
    title: "Delegate",
    termYears: 2,
    lean: {
      democraticShare: 73.4 / (73.4 + 9.5),
      baselineCaucus: "democratic",
      nonpartisan: false,
      basis: `Democratic 73.4% against Republican 9.5%; independent left out. ${LEAN_SOURCE}.`,
    },
  },
];

/** The seat for a place, or undefined where it sends no nonvoting member. */
export function houseDelegateSeat(
  stateUsps: string,
): HouseDelegateSeat | undefined {
  return HOUSE_DELEGATE_SEATS.find((seat) => seat.stateUsps === stateUsps);
}

const MINIMUM_AGE = 25;
const REFERENCE_YEAR = 2025;

/** The term in progress on a date: every term begins on January 3. */
export function houseDelegateTermWindow(
  seat: HouseDelegateSeat,
  onDate: IsoDate,
): { readonly startsAt: IsoDate; readonly endExclusive: IsoDate } {
  const onYear = Number(onDate.slice(0, 4));
  let startYear =
    REFERENCE_YEAR +
    Math.floor((onYear - REFERENCE_YEAR) / seat.termYears) * seat.termYears;
  if (`${startYear}-01-03` > onDate) startYear -= seat.termYears;
  return {
    startsAt: makeIsoDate(`${startYear}-01-03`),
    endExclusive: makeIsoDate(`${startYear + seat.termYears}-01-03`),
  };
}

const seatStableKey = (seat: HouseDelegateSeat) => `${V}:seat:${seat.seatKey}`;
const termKey = (seat: HouseDelegateSeat, startsAt: IsoDate) =>
  `${seatStableKey(seat)}:term:${startsAt}`;
const memberKey = (seat: HouseDelegateSeat, startsAt: IsoDate) =>
  `${termKey(seat, startsAt)}:member`;

function chamberOrganizationId(world: World): EntityId {
  return createStableId("organization", `${world.id}:${V}:chamber:us-house`);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

function aliveOn(world: World, personId: EntityId, date: IsoDate): boolean {
  return (
    Boolean(world.people[personId]) &&
    !recordsWithFieldValue(
      world.history.personDeaths,
      "personId",
      personId,
    ).some((death) => death.diedAt <= date)
  );
}

/** The seat's party and caucus for a winning caucus, by the seat's rule. */
function partyFor(
  seat: HouseDelegateSeat,
  caucus: "democratic" | "republican",
): string {
  return seat.lean.nonpartisan ? "none" : caucus;
}

/** The caucus the seat's lean projects for the coming term. */
function projectedCaucus(
  seat: HouseDelegateSeat,
  incumbentCaucus: string | null,
  incumbentSeeking: boolean,
): "democratic" | "republican" {
  const projected = aggregateCongressAffiliation({
    democraticShare: seat.lean.democraticShare,
    baselineAffiliation: seat.lean.baselineCaucus,
    incumbentAffiliation: incumbentCaucus,
    incumbentSeeking,
  });
  return projected === "democratic" || projected === "republican"
    ? projected
    : seat.lean.baselineCaucus;
}

interface Term {
  readonly seat: HouseDelegateSeat;
  readonly startsAt: IsoDate;
  readonly endExclusive: IsoDate;
  readonly caucus: "democratic" | "republican";
  /** A returning member keeps the person; otherwise a new person is drawn. */
  readonly returningPersonId: EntityId | null;
  readonly serviceSince: IsoDate;
}

function newMemberInput(
  world: World,
  seat: HouseDelegateSeat,
  startsAt: IsoDate,
): CharacterHistoryContextPersonInput {
  const key = memberKey(seat, startsAt);
  const rng = new SeededRng(world.seed).fork(key);
  const age = rng.integer(MINIMUM_AGE + 7, 72);
  const year = Number(startsAt.slice(0, 4));
  return {
    stableKey: key,
    ...drawCanonicalNamedIdentity(
      rng.fork("name"),
      generatePersonIdentity(rng.fork("identity")),
    ),
    birthDate: makeIsoDate(
      `${year - age - 1}-${pad(rng.integer(1, 13))}-${pad(rng.integer(1, 29))}`,
    ),
    homeJurisdictionId: stateJurisdictionForKey(`US-${seat.stateUsps}`)!.id,
  };
}

function writeTerms(
  world: World,
  terms: readonly Term[],
  date: IsoDate,
): World {
  // A place's record is added the way the opening adds each state's.
  let seated = world;
  for (const usps of new Set(terms.map((term) => term.seat.stateUsps))) {
    const jurisdiction = stateJurisdictionForKey(`US-${usps}`);
    if (!jurisdiction) throw new Error(`No jurisdiction: ${usps}`);
    if (!seated.jurisdictions[jurisdiction.id])
      seated = {
        ...seated,
        jurisdictions: {
          ...seated.jurisdictions,
          [jurisdiction.id]: jurisdiction,
        },
        jurisdictionOrder: [...seated.jurisdictionOrder, jurisdiction.id],
      };
  }
  const inputs = terms
    .filter((term) => term.returningPersonId === null)
    .map((term) => newMemberInput(world, term.seat, term.startsAt));
  let next =
    inputs.length > 0
      ? createCharacterHistoryContextPeople(seated, inputs)
      : seated;
  const chamberId = chamberOrganizationId(next);
  for (const term of terms) {
    const stableKey = termKey(term.seat, term.startsAt);
    if (recordByStableKey(next.history.events, stableKey)) continue;
    const personId =
      term.returningPersonId ??
      characterHistoryContextPersonId(
        next,
        memberKey(term.seat, term.startsAt),
      );
    const title = `${term.seat.title} to the U.S. House`;
    next = recordWorldEvent(next, {
      stableKey,
      type: HOUSE_DELEGATE_TENURE_EVENT,
      occurredAt: term.startsAt,
      recordedAt: date,
      jurisdictionId: stateJurisdictionForKey(`US-${term.seat.stateUsps}`)!.id,
      involvedEntityIds: [personId, chamberId],
      participants: [{ personId, role: "focus:subject", detail: title }],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        V,
        HOUSE_DELEGATE_PROVENANCE,
        "office:us-house-delegate",
        `seat:${term.seat.seatKey}`,
        `state:${term.seat.stateUsps}`,
        `term-start:${term.startsAt}`,
        `term-end:${term.endExclusive}`,
        `service-since:${term.serviceSince}`,
        `party:${partyFor(term.seat, term.caucus)}`,
        `caucus:${term.caucus}`,
      ],
      summary: `${personName(next.people[personId]!)} serves as ${title} in this fictional world.`,
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
  return next;
}

/**
 * Seats the six nonvoting members for the term in progress on the world's
 * date. Called once by a current opening, after the chambers exist. The
 * caucus is the one each place's lean projects with no incumbent standing.
 */
export function seatHouseDelegates(world: World): World {
  const date = world.currentDate;
  const terms: Term[] = HOUSE_DELEGATE_SEATS.map((seat) => {
    const window = houseDelegateTermWindow(seat, date);
    // Service predates the term by a number of terms drawn from the seat's
    // own stream, the way the voting seats' members get theirs.
    const rng = new SeededRng(world.seed).fork(
      `${memberKey(seat, window.startsAt)}:prior-terms`,
    );
    const priorTerms = rng.integer(0, 6);
    const startYear = Number(window.startsAt.slice(0, 4));
    return {
      seat,
      startsAt: window.startsAt,
      endExclusive: window.endExclusive,
      caucus: projectedCaucus(seat, null, false),
      returningPersonId: null,
      serviceSince: makeIsoDate(
        `${startYear - priorTerms * seat.termYears}-01-03`,
      ),
    };
  });
  return writeTerms(world, terms, date);
}

function latestTenure(
  world: World,
  seat: HouseDelegateSeat,
): HistoricalEvent | undefined {
  let latest: HistoricalEvent | undefined;
  for (const event of recordsWithFieldValue(
    world.history.events,
    "type",
    HOUSE_DELEGATE_TENURE_EVENT,
  )) {
    if (!event.tags.includes(`seat:${seat.seatKey}`)) continue;
    if (
      !latest ||
      event.occurredAt > latest.occurredAt ||
      (event.occurredAt === latest.occurredAt &&
        event.sequence > latest.sequence)
    )
      latest = event;
  }
  return latest;
}

/**
 * Carries each seat across the term starts the clock crossed in
 * (`before`, `world.currentDate`]. A world that never seated its delegates
 * (an older save) is left as it is.
 */
export function applyHouseDelegateTurnover(
  before: IsoDate,
  world: World,
): World {
  const after = world.currentDate;
  if (after <= before) return world;
  if (!recordByStableKey(world.history.events, OPENING_KEY)) return world;
  let next = world;
  for (const seat of HOUSE_DELEGATE_SEATS) {
    if (!latestTenure(next, seat)) continue;
    for (
      let year = Number(before.slice(0, 4));
      year <= Number(after.slice(0, 4));
      year += 1
    ) {
      const startsAt = makeIsoDate(`${year}-01-03`);
      if (startsAt <= before || startsAt > after) continue;
      if ((year - REFERENCE_YEAR) % seat.termYears !== 0) continue;
      if (recordByStableKey(next.history.events, termKey(seat, startsAt)))
        continue;
      const record = latestTenure(next, seat);
      if (!record || record.occurredAt >= startsAt) continue;
      const incumbent = record.participants.find(
        (participant) => participant.role === "focus:subject",
      )?.personId;
      // The seat is decided on the eve of the new term: a member who is
      // alive then stands again.
      const alive =
        incumbent !== undefined && aliveOn(next, incumbent, startsAt);
      const recordedCaucus = tagValue(record, "caucus:");
      const caucus = projectedCaucus(seat, recordedCaucus, alive);
      const returns = alive && recordedCaucus === caucus;
      next = writeTerms(
        next,
        [
          {
            seat,
            startsAt,
            endExclusive: makeIsoDate(`${year + seat.termYears}-01-03`),
            caucus,
            returningPersonId: returns ? incumbent! : null,
            serviceSince: returns
              ? ((tagValue(record, "service-since:") as IsoDate | null) ??
                record.occurredAt)
              : startsAt,
          },
        ],
        next.currentDate,
      );
    }
  }
  return next;
}

export type HouseDelegateOccupant =
  | {
      readonly kind: "member";
      readonly personId: EntityId;
      readonly personName: string;
      readonly caucus: string | null;
      readonly party: string | null;
      readonly startedAt: IsoDate;
      readonly endExclusive: IsoDate;
    }
  | { readonly kind: "no-current-record"; readonly lastTermEnded: IsoDate }
  | { readonly kind: "not-seated" };

/**
 * Who holds a place's nonvoting seat on a date. `not-seated` is a save whose
 * opening did not seat delegates; the seat's holder there is not recorded.
 */
export function houseDelegateOccupant(
  world: World,
  stateUsps: string,
  asOf: IsoDate = world.currentDate,
): HouseDelegateOccupant {
  const seat = houseDelegateSeat(stateUsps);
  if (!seat) return { kind: "not-seated" };
  let event: HistoricalEvent | undefined;
  for (const candidate of recordsWithFieldValue(
    world.history.events,
    "type",
    HOUSE_DELEGATE_TENURE_EVENT,
  )) {
    if (!candidate.tags.includes(`seat:${seat.seatKey}`)) continue;
    if (candidate.occurredAt > asOf || candidate.recordedAt > world.currentDate)
      continue;
    if (
      !event ||
      candidate.occurredAt > event.occurredAt ||
      (candidate.occurredAt === event.occurredAt &&
        candidate.sequence > event.sequence)
    )
      event = candidate;
  }
  if (!event) return { kind: "not-seated" };
  const endExclusive = tagValue(event, "term-end:") as IsoDate;
  if (asOf >= endExclusive)
    return { kind: "no-current-record", lastTermEnded: endExclusive };
  const personId = event.participants.find(
    (participant) => participant.role === "focus:subject",
  )?.personId;
  const person = personId ? world.people[personId] : undefined;
  if (!person || !aliveOn(world, person.id, asOf))
    return { kind: "no-current-record", lastTermEnded: asOf };
  return {
    kind: "member",
    personId: person.id,
    personName: personName(person),
    caucus: tagValue(event, "caucus:"),
    party: tagValue(event, "party:"),
    startedAt: event.occurredAt,
    endExclusive,
  };
}

import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import type { CharacterHistoryContextPersonInput } from "../character-history";
import { makeIsoDate } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import { recordByStableKey, recordsWithFieldValue } from "../history-index";
import { stateJurisdictionForKey } from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { drawCanonicalNamedIdentity, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import { STATES } from "../state-reference";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { recordWorldEvent } from "../world";
import statehood from "../../../data/research/congress/statehood-seats.json" with { type: "json" };
import {
  SENATE_CLASSES_BY_STATE,
  congressSeats,
  seatTermWindow,
  MINIMUM_AGE,
  type CongressSeat,
} from "./congress-seats";
import {
  houseDelegateOccupant,
  houseDelegateProjectedCaucus,
  houseDelegateAliveOn,
  houseDelegateTagValue,
} from "./house-delegates";
import {
  LIVING_WORLD_KEYS,
  LIVING_WORLD_OPENING_KEY,
  SEAT_CAUCUS_TAG,
  SEAT_PARTY_TAG,
  SEAT_TENURE_EVENT,
  livingWorldOrganizationId,
} from "./opening";
import { LIVING_WORLD_WRITER_VERSION } from "./opening-keys";

/**
 * STATEHOOD FOR A NONVOTING PLACE.
 *
 * When an Act of Congress answering the statehood question "yes" takes effect,
 * the place gains a voting seat in the House and two seats in the Senate, and
 * the chambers grow with them: nothing counts the House at 435 or the Senate
 * at 100, because each chamber is the seats the world has. Which place, and
 * how many seats of each kind, are read from
 * `data/research/congress/statehood-seats.json`, not written here.
 *
 * Seating is a HARDWIRED simplification of the special election the real
 * bills call for: on the day the law takes effect the Delegate in office
 * becomes the Representative for the rest of the term, and the two Senate
 * seats are filled by new fictional people. Every seat goes to the caucus the
 * place's own 2024 result favors (`house-delegates.ts`), the same rule that
 * decides the place's Delegate. At each term's end a living member stands
 * again and returns if the place's leaning still favors their caucus.
 */

const V = LIVING_WORLD_WRITER_VERSION;
export const STATEHOOD_PROVENANCE = "provenance:statehood-seat" as const;

const QUESTION_KEY: string = statehood.questionKey;
const PLACE: string = statehood.place;

/** The place the law would make a state, from the data file. */
export function statehoodPlace(): string {
  return PLACE;
}

let cachedSeats: readonly CongressSeat[] | null = null;

/**
 * The seats the law adds. The Senate seats take the classes with the fewest
 * seats (ties to the lower class), so the three classes stay even.
 */
export function statehoodSeats(): readonly CongressSeat[] {
  if (cachedSeats) return cachedSeats;
  const counts = new Map<1 | 2 | 3, number>([
    [1, 0],
    [2, 0],
    [3, 0],
  ]);
  for (const classes of Object.values(SENATE_CLASSES_BY_STATE))
    for (const senateClass of classes)
      counts.set(senateClass, (counts.get(senateClass) ?? 0) + 1);
  const classes = [...counts.entries()]
    .sort((a, b) => a[1] - b[1] || a[0] - b[0])
    .slice(0, statehood.senateSeats)
    .map(([senateClass]) => senateClass)
    .sort();
  const seats: CongressSeat[] = [];
  for (let index = 0; index < statehood.houseSeats; index += 1)
    seats.push({
      seatKey: `us-house:${PLACE}-${statehood.houseDistrictCode}`,
      chamberKey: "us-house",
      stateUsps: PLACE,
      district: statehood.houseDistrictCode,
      senateClass: null,
    });
  for (const senateClass of classes)
    seats.push({
      seatKey: `us-senate:${PLACE}:class-${senateClass}`,
      chamberKey: "us-senate",
      stateUsps: PLACE,
      district: null,
      senateClass,
    });
  cachedSeats = seats;
  return seats;
}

const questionIds = new WeakMap<object, EntityId | null>();

function statehoodQuestionId(world: World): EntityId | null {
  const catalog = world.policyCatalog as object | undefined;
  if (!catalog) return null;
  if (questionIds.has(catalog)) return questionIds.get(catalog)!;
  const found =
    Object.values(world.policyCatalog.propositions ?? {}).find(
      (definition) => definition.stableKey === QUESTION_KEY,
    )?.id ?? null;
  questionIds.set(catalog, found);
  return found;
}

/**
 * The day the enacted law on statehood took effect, or null while none has.
 * The starting law is left out: no place began as a state it was not.
 */
export function statehoodTookEffect(
  world: World,
  asOf: IsoDate = world.currentDate,
): IsoDate | null {
  if (!world.history.legislativeEnactments?.length) return null;
  const propositionId = statehoodQuestionId(world);
  if (!propositionId) return null;
  const law = lawInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    propositionId,
    asOf,
    "enacted-only",
  );
  return law && law.answer === "yes" && law.origin === "enacted"
    ? law.operativeAt
    : null;
}

const seatStableKey = (seat: CongressSeat) =>
  LIVING_WORLD_KEYS.seat(seat.seatKey);
const termKey = (seat: CongressSeat, startsAt: IsoDate) =>
  `${seatStableKey(seat)}:term:${startsAt}`;
const memberKey = (seat: CongressSeat, startsAt: IsoDate) =>
  `${termKey(seat, startsAt)}:member`;

/**
 * Every seat the world has on a date: the 435 and 100 the Constitution and
 * apportionment give the states, and the seats statehood added once they are
 * filled. The same list the base seats come from when no law has passed.
 */
export function congressSeatsIn(
  world: World,
  asOf: IsoDate = world.currentDate,
): readonly CongressSeat[] {
  const base = congressSeats();
  if (!world.history.legislativeEnactments?.length) return base;
  const admitted = statehoodTookEffect(world, asOf);
  if (!admitted || admitted > asOf) return base;
  const added = statehoodSeats().filter(
    (seat) =>
      recordByStableKey(world.history.events, termKey(seat, admitted)) !==
      undefined,
  );
  return added.length === 0 ? base : [...base, ...added];
}

function seatTitle(seat: CongressSeat): string {
  const name = STATES[seat.stateUsps]?.name ?? seat.stateUsps;
  return seat.chamberKey === "us-senate"
    ? `U.S. Senator from ${name}`
    : `U.S. Representative for ${name}'s at-large congressional district`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

interface Term {
  readonly seat: CongressSeat;
  readonly startsAt: IsoDate;
  readonly endExclusive: IsoDate;
  readonly caucus: "democratic" | "republican";
  readonly returningPersonId: EntityId | null;
  readonly serviceSince: IsoDate;
}

function newMemberInput(
  world: World,
  seat: CongressSeat,
  startsAt: IsoDate,
): CharacterHistoryContextPersonInput {
  const key = memberKey(seat, startsAt);
  const rng = new SeededRng(world.seed).fork(key);
  const age = rng.integer(MINIMUM_AGE[seat.chamberKey] + 7, 72);
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
  const inputs = terms
    .filter((term) => term.returningPersonId === null)
    .map((term) => newMemberInput(world, term.seat, term.startsAt));
  let next =
    inputs.length > 0
      ? createCharacterHistoryContextPeople(world, inputs)
      : world;
  for (const term of terms) {
    const stableKey = termKey(term.seat, term.startsAt);
    if (recordByStableKey(next.history.events, stableKey)) continue;
    const personId =
      term.returningPersonId ??
      characterHistoryContextPersonId(
        next,
        memberKey(term.seat, term.startsAt),
      );
    const chamberId = livingWorldOrganizationId(
      next,
      LIVING_WORLD_KEYS.chamber(term.seat.chamberKey),
    );
    const title = seatTitle(term.seat);
    next = recordWorldEvent(next, {
      stableKey,
      type: SEAT_TENURE_EVENT,
      occurredAt: term.startsAt,
      recordedAt: date,
      jurisdictionId: stateJurisdictionForKey(`US-${term.seat.stateUsps}`)!.id,
      involvedEntityIds: [personId, chamberId],
      participants: [{ personId, role: "focus:subject", detail: title }],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        V,
        STATEHOOD_PROVENANCE,
        `office:${term.seat.chamberKey}`,
        `seat:${term.seat.seatKey}`,
        `state:${term.seat.stateUsps}`,
        `term-start:${term.startsAt}`,
        `term-end:${term.endExclusive}`,
        `service-since:${term.serviceSince}`,
        `${SEAT_PARTY_TAG}${term.caucus}`,
        `${SEAT_CAUCUS_TAG}${term.caucus}`,
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

function latestTenure(
  world: World,
  seat: CongressSeat,
): HistoricalEvent | undefined {
  let latest: HistoricalEvent | undefined;
  for (const event of recordsWithFieldValue(
    world.history.events,
    "type",
    SEAT_TENURE_EVENT,
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

/** The caucus the place's own 2024 result projects for a seat's next term. */
function projected(
  incumbentCaucus: string | null,
  incumbentSeeking: boolean,
): "democratic" | "republican" {
  return houseDelegateProjectedCaucus(PLACE, incumbentCaucus, incumbentSeeking);
}

/**
 * Fills the seats the day the law takes effect, and carries each across the
 * term starts the clock crossed in (`before`, `world.currentDate`]. A world
 * that never opened its Congress is left as it is.
 */
export function applyStatehoodTurnover(before: IsoDate, world: World): World {
  const after = world.currentDate;
  if (after <= before) return world;
  if (!world.history.legislativeEnactments?.length) return world;
  if (!recordByStableKey(world.history.events, LIVING_WORLD_OPENING_KEY))
    return world;
  const admitted = statehoodTookEffect(world, after);
  if (!admitted) return world;
  let next = world;
  for (const seat of statehoodSeats()) {
    if (!recordByStableKey(next.history.events, termKey(seat, admitted))) {
      const window = seatTermWindow(seat, admitted);
      // The Delegate in office when the law takes effect becomes the
      // Representative for the rest of the term.
      const delegate =
        seat.chamberKey === "us-house"
          ? houseDelegateOccupant(next, seat.stateUsps, admitted)
          : null;
      const returning = delegate?.kind === "member" ? delegate : null;
      const caucus = returning
        ? projected(returning.caucus, true)
        : projected(null, false);
      next = writeTerms(
        next,
        [
          {
            seat,
            startsAt: admitted,
            endExclusive: window.endExclusive,
            caucus,
            returningPersonId: returning ? returning.personId : null,
            serviceSince: admitted,
          },
        ],
        next.currentDate,
      );
    }
    // Each later term begins on a January 3.
    for (let guard = 0; guard < 200; guard += 1) {
      const record = latestTenure(next, seat);
      if (!record) break;
      const endExclusive = houseDelegateTagValue(
        record,
        "term-end:",
      ) as IsoDate | null;
      if (!endExclusive || endExclusive > after) break;
      const window = seatTermWindow(seat, endExclusive);
      const incumbent = record.participants.find(
        (participant) => participant.role === "focus:subject",
      )?.personId;
      const alive =
        incumbent !== undefined &&
        houseDelegateAliveOn(next, incumbent, endExclusive);
      const recordedCaucus = houseDelegateTagValue(record, SEAT_CAUCUS_TAG);
      const caucus = projected(recordedCaucus, alive);
      const returns = alive && recordedCaucus === caucus;
      next = writeTerms(
        next,
        [
          {
            seat,
            startsAt: endExclusive,
            endExclusive: window.endExclusive,
            caucus,
            returningPersonId: returns ? incumbent! : null,
            serviceSince: returns
              ? ((houseDelegateTagValue(
                  record,
                  "service-since:",
                ) as IsoDate | null) ?? record.occurredAt)
              : endExclusive,
          },
        ],
        next.currentDate,
      );
    }
  }
  return next;
}

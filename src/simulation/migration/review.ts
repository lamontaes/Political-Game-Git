/**
 * The quarterly migration review: waves take their step, some households in
 * the player's town leave, and some newcomers arrive.
 *
 * Why the player's town only: it is the one town the world seats with
 * residents. Everybody else lives at state level (Congress, executives), is
 * tied to a seat, or is not a resident of anywhere in particular. When other
 * towns are seated this loop covers each of them the same way.
 *
 * Cost: every scheduled transition costs the runner two whole-world
 * serializations and an integrity check, so the review runs four times a year,
 * not monthly (a monthly review measurably timed out long election tests).
 * Inside it: one pass over the town's residents, the tie records read only
 * when somebody's departure draw succeeds, a person reviewed once a year in
 * their own quarter, no integrity check per move, and one batched person
 * writer for the quarter's arrivals.
 */

import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPeople,
} from "../character-history";
import type { CharacterHistoryContextPersonInput } from "../character-history";
import { addDays, ageOnDate, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import { drawCanonicalName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  MIGRATION_ARRIVED_EVENT,
  MIGRATION_CONTRACT_VERSION,
  MIGRATION_REVIEW_TRANSITION_KEY,
  type MoveReasonKey,
} from "./contract";
import {
  applyMoves,
  deadPeople,
  moveTies,
  planMove,
  playerHouseholdPeople,
  type PlannedMove,
} from "./relocate";
import { activeWavesCovering, stepWaves, wavePressure } from "./waves";

/**
 * BLANKET: the chance an eligible adult resident leaves town in a year.
 *
 * Not researched. Chosen so a town visibly turns over across a career rather
 * than never or all at once. The research question
 * `migration-rates-and-reasons` asks for the real rate by age and distance.
 */
export const BLANKET_DEPARTURE_CHANCE_PER_YEAR = 0.04;

/**
 * BLANKET: newcomers per resident per year. Equal to the departure chance so
 * the recorded town is replaced rather than emptied. Not researched.
 */
export const BLANKET_ARRIVALS_PER_RESIDENT_PER_YEAR = 0.04;

/** BLANKET: share of departures that stay in their own state. Not researched. */
export const BLANKET_SAME_STATE_SHARE = 0.5;

/** BLANKET: a newcomer's age on arrival, inclusive-exclusive. Not researched. */
export const BLANKET_ARRIVAL_AGE = [20, 66] as const;

/** Reviews per year; each person is considered in one of them. */
export const MIGRATION_REVIEWS_PER_YEAR = 4;
export const MIGRATION_REVIEW_INTERVAL_DAYS = 91;

const REVIEW_KEY_PREFIX = "migration:review:";

/** Schedules the first review for a life opened at the current version. Idempotent. */
export function ensureMigrationSchedule(world: World): World {
  const stableKey = `${REVIEW_KEY_PREFIX}0`;
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: addDays(world.currentDate, MIGRATION_REVIEW_INTERVAL_DAYS),
    transitionKey: MIGRATION_REVIEW_TRANSITION_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: {
      kind: "initialization",
      reference: MIGRATION_CONTRACT_VERSION,
    },
  });
}

export function migrationReviewHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== MIGRATION_REVIEW_TRANSITION_KEY)
    throw new Error("The migration review received another transition.");
  const index = Number(dueItem.stableKey.slice(REVIEW_KEY_PREFIX.length));
  let next = reviewTown(world, index);
  next = scheduleFutureDueItem(next, {
    stableKey: `${REVIEW_KEY_PREFIX}${index + 1}`,
    dueAt: addDays(next.currentDate, MIGRATION_REVIEW_INTERVAL_DAYS),
    transitionKey: MIGRATION_REVIEW_TRANSITION_KEY,
    entityIds: [next.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [next.id] },
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: "migration:reviewed",
    context: null,
    outcomeEventId: null,
  };
}

/** The player's town, when the player lives in a seated town. */
export function migrationTown(world: World): EntityId | null {
  if (world.control.kind !== "person") return null;
  const home = world.people[world.control.personId]?.homeJurisdictionId;
  if (!home) return null;
  return world.jurisdictions[home]?.kind === "census-place" ? home : null;
}

/** The yearly rates a review applies before wave pressure. */
export interface MigrationRates {
  readonly departureChancePerYear: number;
  readonly arrivalsPerResidentPerYear: number;
}

export const BLANKET_MIGRATION_RATES: MigrationRates = {
  departureChancePerYear: BLANKET_DEPARTURE_CHANCE_PER_YEAR,
  arrivalsPerResidentPerYear: BLANKET_ARRIVALS_PER_RESIDENT_PER_YEAR,
};

/**
 * One review of the player's town on the world's current date, as the
 * quarterly handler runs it. `index` is the review's count since opening. Exposed so a
 * scenario or a test can apply other rates; play always uses the blanket.
 */
export function reviewTown(
  world: World,
  index: number,
  rates: MigrationRates = BLANKET_MIGRATION_RATES,
): World {
  const town = migrationTown(world);
  if (!town) return world;
  let next = stepWaves(world, town);
  const active = activeWavesCovering(next, town);
  const departure = wavePressure(active, "departure-pressure");
  const arrival = wavePressure(active, "arrival-pressure");

  const dead = deadPeople(next);
  const residents = next.personOrder.filter((id) => {
    const person = next.people[id]!;
    return (
      person.homeJurisdictionId === town &&
      !dead.has(id) &&
      person.birthDate <= next.currentDate
    );
  });
  // Read only once somebody's draw says they leave; most reviews move nobody.
  let context: Parameters<typeof planMove>[2] | null = null;
  const destinations = destinationPool(next, town);
  const chance = rates.departureChancePerYear * departure.multiplier;
  const reason: MoveReasonKey = departure.waveKey
    ? `wave:${departure.waveKey}`
    : "life-course:unrecorded";

  const moving = new Set<EntityId>();
  const moves: PlannedMove[] = [];
  for (const personId of residents) {
    if (moving.has(personId)) continue;
    if (reviewQuarter(personId) !== index % MIGRATION_REVIEWS_PER_YEAR)
      continue;
    if (ageOnDate(next.people[personId]!.birthDate, next.currentDate) < 18)
      continue;
    const rng = new SeededRng(next.seed).fork(
      `${MIGRATION_CONTRACT_VERSION}:depart:${index}:${personId}`,
    );
    if (rng.next() >= chance) continue;
    context ??= {
      ties: moveTies(next),
      playerHousehold: playerHouseholdPeople(next),
      dead,
    };
    const plan = planMove(
      next,
      {
        stableKey: `${index}:${personId}`,
        personId,
        toJurisdictionId: chooseDestination(
          rng.fork("destination"),
          destinations,
        ),
        reason,
        waveKey: departure.waveKey,
      },
      context,
    );
    if (plan.kind === "refused") continue;
    if (plan.move.personIds.some((id) => moving.has(id))) continue;
    for (const id of plan.move.personIds) moving.add(id);
    moves.push(plan.move);
  }
  next = applyMoves(next, moves);

  const arrivals = arrivalInputs(
    next,
    town,
    index,
    residents.length,
    rates.arrivalsPerResidentPerYear * arrival.multiplier,
    destinations,
  );
  if (arrivals.length === 0) return next;
  next = createCharacterHistoryContextPeople(next, arrivals);
  for (const input of arrivals) {
    const personId = characterHistoryContextPersonId(next, input.stableKey);
    const origin = input.birthplaceJurisdictionId!;
    const person = next.people[personId]!;
    next = recordWorldEvent(next, {
      stableKey: `migration:arrived:${input.stableKey}`,
      type: MIGRATION_ARRIVED_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: town,
      involvedEntityIds: [personId, town, origin],
      participants: [{ personId, role: "agency:mover", detail: null }],
      personFactConstraints: [],
      visibility: "limited",
      tags: [
        `reason:life-course:unrecorded`,
        `from:${origin}`,
        `to:${town}`,
        ...(arrival.waveKey ? [`wave:${arrival.waveKey}`] : []),
      ],
      summary: `${person.givenName} ${person.familyName} moved to ${next.jurisdictions[town]!.name} from ${next.jurisdictions[origin]!.name}.`,
      context: {
        location: {
          jurisdictionId: town,
          label: next.jurisdictions[town]!.name,
          setting: null,
        },
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: "life-course:unrecorded",
        immediateReaction: null,
      },
    });
  }
  return next;
}

/** Which quarter of the year a person is reviewed in: fixed per person. */
function reviewQuarter(personId: EntityId): number {
  let hash = 0;
  for (let i = 0; i < personId.length; i += 1)
    hash = (hash * 31 + personId.charCodeAt(i)) >>> 0;
  return hash % MIGRATION_REVIEWS_PER_YEAR;
}

interface DestinationPool {
  readonly ownState: EntityId | null;
  readonly otherStates: readonly EntityId[];
}

/**
 * BLANKET (`where-people-go`): somewhere else in the town's own state, or
 * another state. The world's state-level jurisdictions are the only other
 * places it holds.
 */
function destinationPool(world: World, town: EntityId): DestinationPool {
  const states = world.jurisdictionOrder.filter(
    (id) => world.jurisdictions[id]?.kind === "state-placeholder",
  );
  const stateKey = lifePlaceByJurisdictionId(town)?.stateJurisdictionKey;
  const ownStateId = stateKey ? stateJurisdictionForKey(stateKey)?.id : null;
  const ownState =
    ownStateId && states.includes(ownStateId) ? ownStateId : null;
  return {
    ownState,
    otherStates: states.filter((id) => id !== ownState),
  };
}

function chooseDestination(rng: SeededRng, pool: DestinationPool): EntityId {
  if (pool.ownState && rng.next() < BLANKET_SAME_STATE_SHARE)
    return pool.ownState;
  return pool.otherStates[rng.integer(0, pool.otherStates.length)]!;
}

/**
 * This quarter's newcomers. BLANKET (`arrivals`, `arrival-history`,
 * `arriving-families`): single adults, born where they came from, with a
 * canonical name and identity and nothing else yet.
 */
function arrivalInputs(
  world: World,
  town: EntityId,
  index: number,
  residentCount: number,
  ratePerResidentPerYear: number,
  pool: DestinationPool,
): readonly CharacterHistoryContextPersonInput[] {
  const rng = new SeededRng(world.seed).fork(
    `${MIGRATION_CONTRACT_VERSION}:arrive:${index}`,
  );
  const expected =
    (residentCount * ratePerResidentPerYear) / MIGRATION_REVIEWS_PER_YEAR;
  const count = Math.floor(expected) + (rng.next() < expected % 1 ? 1 : 0);
  const year = Number(world.currentDate.slice(0, 4));
  const inputs: CharacterHistoryContextPersonInput[] = [];
  for (let n = 0; n < count; n += 1) {
    const personRng = rng.fork(`newcomer:${n}`);
    const age = personRng.integer(
      BLANKET_ARRIVAL_AGE[0],
      BLANKET_ARRIVAL_AGE[1],
    );
    const origin = chooseDestination(personRng.fork("origin"), pool);
    inputs.push({
      stableKey: `migration:newcomer:${town}:${index}:${n}`,
      ...drawCanonicalName(personRng.fork("name")),
      identity: generatePersonIdentity(personRng.fork("identity")),
      birthDate: makeIsoDate(
        `${year - age}-${String(personRng.integer(1, 13)).padStart(2, "0")}-${String(personRng.integer(1, 29)).padStart(2, "0")}`,
      ),
      homeJurisdictionId: town,
      birthplaceJurisdictionId: origin,
    });
  }
  return inputs;
}

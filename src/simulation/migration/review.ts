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
import { drawCanonicalNamedIdentity } from "../people";
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
import { crisisRecords } from "../crisis/records";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../life";
import {
  activeWorkRelationshipsAt,
  kinshipRelationshipsAt,
  peopleInHouseholdAt,
  workRelationshipHistoryForPerson,
  workStatusAt,
} from "../life-queries";
import {
  UNRESEARCHED_LOCAL_CRIME,
  UNRESEARCHED_TOWN_POLICE_LOG,
} from "../crime/contract";
import { localCrimeFigures } from "../crime/producer";
import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import { activeDwellingOccupanciesAt } from "../resource-queries";
import {
  applyMoves,
  deadPeople,
  moveTieReader,
  planMove,
  playerHouseholdPeople,
  type PlannedMove,
} from "./relocate";
import {
  latestReadings,
  pushOf,
  stateWeights,
  stepPressure,
} from "../pressure";
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

/**
 * BLANKET: the chance a household whose home a disaster destroyed or damaged
 * leaves town for good rather than staying to rebuild. The owner, September
 * 22, 2026: after Hurricane Katrina, many people never came back. Not
 * researched; filed as `disaster-displacement-and-return`.
 */
export const BLANKET_DISPLACED_LEAVE_CHANCE = {
  destroyed: 0.4,
  damaged: 0.05,
} as const;

/**
 * BLANKET: how much more likely somebody is to leave town in the year after
 * losing a job, when they have not found another. Not researched; filed as
 * `why-americans-move-causes-and-strengths`.
 */
export const BLANKET_JOB_LOSS_MULTIPLIER = 3;

/**
 * BLANKET: how much a reported assault or robbery in town beyond the police
 * log's usual quarter adds to the chance a free household leaves. Not
 * researched.
 */
export const BLANKET_TOWN_CRIME_PUSH_PER_EXCESS_REPORT = 0.05;

/**
 * BLANKET: how much more a leaving household weighs a state where a relative
 * lives. Not researched.
 */
export const BLANKET_FAMILY_PULL = 3;

/**
 * BLANKET: how much each percentage point of the town's recorded unemployment
 * above the nation's adds to the chance a free household leaves (and below
 * it, takes away, never below half). Not researched.
 */
export const BLANKET_TOWN_UNEMPLOYMENT_GAP_PUSH = 0.05;

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
  // The state pressures step first, so this review's movers read this
  // quarter's pull and push.
  let next = reviewTown(stepPressure(world), index);
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
  readonly displacedLeaveChance?: Readonly<
    Record<keyof typeof BLANKET_DISPLACED_LEAVE_CHANCE, number>
  >;
}

export const BLANKET_MIGRATION_RATES: MigrationRates = {
  departureChancePerYear: BLANKET_DEPARTURE_CHANCE_PER_YEAR,
  arrivalsPerResidentPerYear: BLANKET_ARRIVALS_PER_RESIDENT_PER_YEAR,
  displacedLeaveChance: BLANKET_DISPLACED_LEAVE_CHANCE,
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
  const chance =
    rates.departureChancePerYear *
    departure.multiplier *
    statePushOnTown(next, town) *
    townCrimePush(next, town) *
    townJobsPush(next, town);
  const reason: MoveReasonKey = departure.waveKey
    ? `wave:${departure.waveKey}`
    : "life-course:unrecorded";

  const moving = new Set<EntityId>();
  const moves: PlannedMove[] = [];
  const planned = (plan: ReturnType<typeof planMove>) => {
    if (plan.kind === "refused") return;
    if (plan.move.personIds.some((id) => moving.has(id))) return;
    for (const id of plan.move.personIds) moving.add(id);
    moves.push(plan.move);
  };

  // Households whose homes a disaster destroyed or damaged since the last
  // review, whatever quarter they are reviewed in (`disaster-displacement`).
  // A household and its dwelling can both be recorded as damaged; one draw.
  const considered = new Set<EntityId>();
  for (const home of displacedHomes(next, town)) {
    if (home.personIds.some((id) => considered.has(id))) continue;
    for (const id of home.personIds) considered.add(id);
    const rng = new SeededRng(next.seed).fork(
      `${MIGRATION_CONTRACT_VERSION}:displaced:${home.damageId}`,
    );
    const leaveChance = (rates.displacedLeaveChance ??
      BLANKET_DISPLACED_LEAVE_CHANCE)[home.level];
    if (rng.next() >= leaveChance) continue;
    context ??= {
      ties: moveTieReader(next),
      playerHousehold: playerHouseholdPeople(next),
      dead,
    };
    const personId = home.personIds.find((id) => !dead.has(id));
    if (!personId || moving.has(personId)) continue;
    planned(
      planMove(
        next,
        {
          stableKey: `${index}:displaced:${home.damageId}`,
          personId,
          toJurisdictionId: chooseDestination(
            rng.fork("destination"),
            destinations,
          ),
          reason: `disaster:home-${home.level}`,
          waveKey: null,
          endsHousing: true,
          causeId: home.damageId,
        },
        context,
      ),
    );
  }

  for (const personId of residents) {
    if (moving.has(personId)) continue;
    if (reviewQuarter(personId) !== index % MIGRATION_REVIEWS_PER_YEAR)
      continue;
    if (ageOnDate(next.people[personId]!.birthDate, next.currentDate) < 18)
      continue;
    const rng = new SeededRng(next.seed).fork(
      `${MIGRATION_CONTRACT_VERSION}:depart:${index}:${personId}`,
    );
    const jobLost = lostJobWithinYear(next, personId);
    const own = jobLost ? chance * BLANKET_JOB_LOSS_MULTIPLIER : chance;
    if (rng.next() >= own) continue;
    context ??= {
      ties: moveTieReader(next),
      playerHousehold: playerHouseholdPeople(next),
      dead,
    };
    const kin = kinStates(next, personId, destinations);
    const to = chooseDestination(
      rng.fork("destination"),
      destinations,
      "pull",
      kin,
    );
    const why: MoveReasonKey = departure.waveKey
      ? reason
      : jobLost
        ? "work:job-lost"
        : kin.has(to)
          ? "family:near-kin"
          : reason;
    const plan = planMove(
      next,
      {
        stableKey: `${index}:${personId}`,
        personId,
        toJurisdictionId: to,
        reason: why,
        waveKey: departure.waveKey,
      },
      context,
    );
    planned(plan);
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
    next = seatNewcomerHousehold(
      next,
      personId,
      input.stableKey,
      town,
      next.history.events.at(-1)!.id,
    );
  }
  return next;
}

/**
 * BLANKET (`arriving-families`): a newcomer lives alone in a household of
 * their own, located in town. It is what lets a disaster in town reach them
 * and what a later family or partner joins; it carries no dwelling yet.
 */
function seatNewcomerHousehold(
  world: World,
  personId: EntityId,
  stableKey: string,
  town: EntityId,
  eventId: EntityId,
): World {
  const provenance = { kind: "simulated-event" as const, eventId };
  const person = world.people[personId]!;
  let next = createHousehold(world, {
    stableKey: `${stableKey}:household`,
    formedAt: world.currentDate,
    label: `${person.givenName} ${person.familyName}'s household`,
    provenance,
  });
  const householdId = next.history.households.at(-1)!.id;
  next = recordHouseholdLocation(next, {
    stableKey: `${stableKey}:household-location`,
    householdId,
    effectiveAt: next.currentDate,
    jurisdictionId: town,
    label: next.jurisdictions[town]!.name,
    kind: "residence:arrived",
    provenance,
    supersedesLocationId: null,
  });
  return startHouseholdMembership(next, {
    stableKey: `${stableKey}:household-membership`,
    personId,
    householdId,
    startedAt: next.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance,
  });
}

/**
 * How hard the town's own state is pushing people out, from the pressure
 * layer's latest reading: 1 with nothing recorded. A flood or a tax rise in
 * the state raises the chance a free household in town leaves (`town-movers`).
 */
export function statePushOnTown(world: World, town: EntityId): number {
  const stateKey = lifePlaceByJurisdictionId(town)?.stateJurisdictionKey;
  return stateKey ? pushOf(latestReadings(world).get(stateKey)) : 1;
}

interface DisplacedHome {
  readonly damageId: EntityId;
  readonly level: keyof typeof BLANKET_DISPLACED_LEAVE_CHANCE;
  readonly personIds: readonly EntityId[];
}

/**
 * Homes in town a disaster destroyed or damaged since the last review, with
 * who lived there. A damaged dwelling is read through who occupies it today.
 */
function displacedHomes(
  world: World,
  town: EntityId,
): readonly DisplacedHome[] {
  const since = addDays(world.currentDate, -MIGRATION_REVIEW_INTERVAL_DAYS);
  const homes: DisplacedHome[] = [];
  let occupancies: ReturnType<typeof activeDwellingOccupanciesAt> | null = null;
  for (const record of crisisRecords(world)) {
    if (record.kind !== "disaster-damage") continue;
    if (record.jurisdictionId !== town) continue;
    if (record.level !== "destroyed" && record.level !== "damaged") continue;
    if (record.effectiveAt <= since || record.effectiveAt > world.currentDate)
      continue;
    let personIds: readonly EntityId[] = [];
    if (record.targetKind === "household") {
      personIds = peopleInHouseholdAt(world, record.targetId);
    } else if (record.targetKind === "dwelling") {
      occupancies ??= activeDwellingOccupanciesAt(world);
      personIds = occupancies
        .filter((occupancy) => occupancy.dwellingId === record.targetId)
        .flatMap((occupancy) =>
          occupancy.occupant.kind === "person"
            ? [occupancy.occupant.personId]
            : peopleInHouseholdAt(world, occupancy.occupant.householdId),
        );
    }
    if (personIds.length > 0)
      homes.push({ damageId: record.id, level: record.level, personIds });
  }
  return homes;
}

/**
 * Crime in town beyond the usual (`cause-crime`): 1 when the last review
 * period's reported assaults and robberies are no more than the police log's
 * expected share, rising by a blanket step for each report beyond it. Every
 * town has the same expected log today, so only an unusually bad quarter
 * pushes anyone.
 */
export function townCrimePush(world: World, town: EntityId): number {
  const figures = localCrimeFigures(
    world,
    town,
    addDays(world.currentDate, 1 - MIGRATION_REVIEW_INTERVAL_DAYS),
    world.currentDate,
  );
  const violent = figures.reported.assault + figures.reported.robbery;
  const weight = (offense: string) => {
    const rule = UNRESEARCHED_LOCAL_CRIME.offenses.find(
      (row) => row.offense === offense,
    )!;
    return rule.annualRate * rule.reportedShare;
  };
  const all = UNRESEARCHED_LOCAL_CRIME.offenses.reduce(
    (sum, rule) => sum + weight(rule.offense),
    0,
  );
  const expected =
    ((UNRESEARCHED_TOWN_POLICE_LOG.reportedPerMonth *
      MIGRATION_REVIEW_INTERVAL_DAYS) /
      30.4) *
    ((weight("assault") + weight("robbery")) / all);
  const excess = Math.max(0, violent - expected);
  return 1 + excess * BLANKET_TOWN_CRIME_PUSH_PER_EXCESS_REPORT;
}

/**
 * Jobs in town against the nation (`cause-state-economy`, town side): 1 when
 * the economy records no month of the town's own, which is the case until a
 * disaster or public spending there gives it one.
 */
export function townJobsPush(world: World, town: EntityId): number {
  const local = macroConditionsAt(
    world,
    macroScopeForJurisdiction(town),
    world.currentDate,
  );
  if (!local) return 1;
  const nation = (world.macroEconomy?.months ?? []).find(
    (row) => row.scope === "national" && row.periodEnd === local.periodEnd,
  );
  if (!nation) return 1;
  const gap = local.unemploymentPct - nation.unemploymentPct;
  return Math.max(0.5, 1 + gap * BLANKET_TOWN_UNEMPLOYMENT_GAP_PUSH);
}

/**
 * Somebody whose job ended in the last year and who has no other job
 * (`cause-job-loss`). Reviewed once a year, so the whole year counts.
 */
export function lostJobWithinYear(world: World, personId: EntityId): boolean {
  if (activeWorkRelationshipsAt(world, personId).length > 0) return false;
  const since = addDays(world.currentDate, -365);
  return workRelationshipHistoryForPerson(world, personId).some((job) => {
    const status = workStatusAt(world, job.id);
    return status?.status === "ended" && status.effectiveAt > since;
  });
}

/**
 * Other states where a living relative of this person lives today
 * (`cause-family`). A relative in town or in the town's own state adds
 * nothing to the choice between other states.
 */
function kinStates(
  world: World,
  personId: EntityId,
  pool: DestinationPool,
): ReadonlySet<EntityId> {
  const others = new Set(pool.otherStates);
  const states = new Set<EntityId>();
  for (const relationship of kinshipRelationshipsAt(world, personId)) {
    const kinId = relationship.personIds.find((id) => id !== personId)!;
    const kin = world.people[kinId];
    if (!kin || world.history.personDeaths.some((d) => d.personId === kinId))
      continue;
    const state = stateOf(world, kin.homeJurisdictionId);
    if (state && others.has(state)) states.add(state);
  }
  return states;
}

/** The other states where this person has a living relative, for `town`. */
export function statesWithRelatives(
  world: World,
  personId: EntityId,
  town: EntityId,
): ReadonlySet<EntityId> {
  return kinStates(world, personId, destinationPool(world, town));
}

function stateOf(world: World, jurisdictionId: EntityId): EntityId | null {
  if (world.jurisdictions[jurisdictionId]?.kind === "state-placeholder")
    return jurisdictionId;
  const key = lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey;
  return key ? (stateJurisdictionForKey(key)?.id ?? null) : null;
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
  /** Pull of each other state, for a destination; all 1 with no readings. */
  readonly pull: readonly number[];
  /** Push of each other state, for a newcomer's origin. */
  readonly push: readonly number[];
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
  const otherStates = states.filter((id) => id !== ownState);
  return {
    ownState,
    otherStates,
    pull: stateWeights(world, otherStates, "pull"),
    push: stateWeights(world, otherStates, "push"),
  };
}

/**
 * Own state or another, and which other state weighted by the pressure
 * layer's latest readings (`town-movers`): pull for a household leaving, push
 * for where a newcomer came from. Even weights when nothing is recorded.
 */
function chooseDestination(
  rng: SeededRng,
  pool: DestinationPool,
  weighting: "pull" | "push" = "pull",
  kin: ReadonlySet<EntityId> = new Set(),
): EntityId {
  if (pool.ownState && rng.next() < BLANKET_SAME_STATE_SHARE)
    return pool.ownState;
  const weights = (weighting === "pull" ? pool.pull : pool.push).map(
    (weight, index) =>
      kin.has(pool.otherStates[index]!) ? weight * BLANKET_FAMILY_PULL : weight,
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let draw = rng.next() * total;
  for (let index = 0; index < pool.otherStates.length; index += 1) {
    draw -= weights[index]!;
    if (draw < 0) return pool.otherStates[index]!;
  }
  return pool.otherStates.at(-1)!;
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
    const origin = chooseDestination(personRng.fork("origin"), pool, "push");
    inputs.push({
      stableKey: `migration:newcomer:${town}:${index}:${n}`,
      ...drawCanonicalNamedIdentity(
        personRng.fork("name"),
        generatePersonIdentity(personRng.fork("identity")),
      ),
      birthDate: makeIsoDate(
        `${year - age}-${String(personRng.integer(1, 13)).padStart(2, "0")}-${String(personRng.integer(1, 29)).padStart(2, "0")}`,
      ),
      homeJurisdictionId: town,
      birthplaceJurisdictionId: origin,
    });
  }
  return inputs;
}

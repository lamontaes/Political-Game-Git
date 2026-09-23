/**
 * What movements do each quarter. Runs once per pressure quarter, right after
 * `stepPressureEvents`, and reads only the readings, the unrest and the laws
 * the world already holds. See `contract.ts` for the causes and the rules.
 */

import { ageOnDate } from "../dates";
import { measureById } from "../legislation";
import { personName } from "../people";
import { homeStateKeyOf } from "../pressure/anger";
import type { PressureReading } from "../pressure/contract";
import {
  BLANKET_POLITICAL_VIOLENCE,
  UNREST_EVENT,
  prominentPeopleIn,
} from "../pressure/events";
import { latestReadings } from "../pressure/flows";
import { worldStates } from "../pressure/step";
import { SeededRng } from "../rng";
import type {
  EntityId,
  EventParticipant,
  HistoricalEvent,
  IsoDate,
  Jurisdiction,
  PolicyPropositionDefinition,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import {
  BLANKET_MOVEMENTS,
  MOVEMENTS_CONTRACT_VERSION,
  MOVEMENT_BACKLASH_EVENT,
  MOVEMENT_FADED_EVENT,
  MOVEMENT_FOUNDED_EVENT,
  MOVEMENT_LEADER_EVENT,
  MOVEMENT_MARCH_EVENT,
  MOVEMENT_WON_EVENT,
  type Movement,
  type MovementCause,
} from "./contract";
import {
  activeMovements,
  enactedAnswers,
  federalJurisdictionIds,
  isMovementActive,
  movementDemand,
  movementLeader,
  movementPeople,
  movementStore,
  movementTitle,
  personAlive,
  principleBearing,
  standingAnswers,
} from "./queries";

const RIGHTS_PRINCIPLES = ["equal-treatment", "equal-opportunity"] as const;
const WORKER_PRINCIPLE = "worker-protection";

function draw(world: World, key: readonly unknown[]): number {
  return new SeededRng("movements-v1")
    .fork(JSON.stringify(["movements-v1", world.seed, ...key]))
    .next();
}

function pick<T>(world: World, items: readonly T[], key: readonly unknown[]) {
  if (items.length === 0) return null;
  const index = new SeededRng("movements-v1")
    .fork(JSON.stringify(["movements-pick-v1", world.seed, ...key]))
    .integer(0, items.length);
  return items[index] ?? null;
}

function chance(value: number): number {
  return Math.min(BLANKET_MOVEMENTS.chanceCap, Math.max(0, value));
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function clamp01(value: number): number {
  return round(Math.min(1, Math.max(0, value)));
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

/** Replaces a movement by key, or appends a new one. */
export function withMovement(world: World, movement: Movement): World {
  const store = movementStore(world);
  const index = store.movements.findIndex((row) => row.key === movement.key);
  const movements =
    index < 0
      ? [...store.movements, movement]
      : store.movements.map((row, at) => (at === index ? movement : row));
  return {
    ...world,
    movements: { contractVersion: MOVEMENTS_CONTRACT_VERSION, movements },
  };
}

/** Records one public movement event, citing the state and the people in it. */
export function recordMovementEvent(
  world: World,
  movement: Pick<Movement, "key" | "stateKey" | "jurisdictionId">,
  input: {
    readonly suffix: string;
    readonly type: `${string}.${string}`;
    readonly summary: string;
    readonly participants: readonly EventParticipant[];
    readonly visibility?: "public" | "limited";
  },
): World {
  const people = [...new Set(input.participants.map((row) => row.personId))];
  return recordWorldEvent(world, {
    stableKey: `${movement.key}:${input.suffix}`,
    type: input.type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: movement.jurisdictionId,
    involvedEntityIds: [movement.jurisdictionId, ...people],
    participants: input.participants,
    personFactConstraints: [],
    visibility: input.visibility ?? "public",
    tags: [
      "movement",
      input.type,
      `state:${movement.stateKey}`,
      `movement:${movement.key}`,
    ],
    summary: input.summary,
    context: EMPTY_CONTEXT,
  });
}

function nameOf(world: World, personId: EntityId | null): string | null {
  const person = personId ? world.people[personId] : null;
  return person ? personName(person) : null;
}

function controlledPersonId(world: World): EntityId | null {
  return world.control.kind === "person" ? world.control.personId : null;
}

/**
 * Who could lead a movement in a state: living adults whose home is there,
 * not the player, not already leading one. People with no prominent office
 * come first; a governor or member of Congress leads only when nobody else
 * lives there.
 */
export function leaderCandidates(
  world: World,
  stateKey: string,
): readonly EntityId[] {
  const player = controlledPersonId(world);
  const leading = new Set(
    activeMovements(world).flatMap((movement) =>
      movementPeople(movement, "leader"),
    ),
  );
  const prominent = new Set(prominentPeopleIn(world, stateKey));
  const eligible = world.personOrder.filter((id) => {
    const person = world.people[id];
    if (!person || id === player || leading.has(id)) return false;
    if (
      ageOnDate(person.birthDate, world.currentDate) <
      BLANKET_MOVEMENTS.leaderMinAge
    )
      return false;
    return homeStateKeyOf(world, id) === stateKey && personAlive(world, id);
  });
  const ordinary = eligible.filter((id) => !prominent.has(id));
  return [...(ordinary.length > 0 ? ordinary : eligible)].sort();
}

/** Steps every movement for the pressure quarter just stepped. */
export function stepMovements(world: World): World {
  const pressure = world.pressure;
  if (!pressure || pressure.quartersStepped === 0) return world;
  const ordinal = pressure.quartersStepped;
  const readings = latestReadings(world);
  let next = world;
  for (const { stateKey, jurisdiction } of worldStates(world)) {
    const reading = readings.get(stateKey) ?? null;
    next = foundWorkerMovement(next, stateKey, jurisdiction, reading, ordinal);
    next = foundRightsMovements(next, stateKey, jurisdiction, reading, ordinal);
  }
  const keys = activeMovements(next)
    .filter((movement) => movement.lastQuarter < ordinal)
    .map((movement) => movement.key)
    .sort();
  for (const key of keys) {
    const movement = movementStore(next).movements.find(
      (row) => row.key === key,
    )!;
    next = stepOne(
      next,
      movement,
      readings.get(movement.stateKey)?.levels.anger ?? 0,
      ordinal,
    );
  }
  return next;
}

function unrestQuarters(world: World, stateKey: string): readonly number[] {
  return world.history.events
    .filter(
      (event) =>
        event.type === UNREST_EVENT && event.tags.includes(`state:${stateKey}`),
    )
    .map((event) => Number(tagValue(event, "quarter:") ?? -1));
}

/** The share of a reading's anger added this quarter by rising unemployment. */
function jobsAngerShare(reading: PressureReading): number {
  let jobs = 0;
  let total = 0;
  for (const row of reading.contributions) {
    if (row.kind !== "anger") continue;
    total += row.amount;
    if (row.causeKey.startsWith("unemployment-rise")) jobs += row.amount;
  }
  return total > 0 ? jobs / total : 0;
}

function sortedPropositions(
  world: World,
): readonly PolicyPropositionDefinition[] {
  return Object.values(world.policyCatalog.propositions).sort((a, b) =>
    a.stableKey.localeCompare(b.stableKey),
  );
}

function stateAnswers(world: World, jurisdiction: Jurisdiction) {
  return standingAnswers(enactedAnswers(world, new Set([jurisdiction.id])));
}

function demandedInState(world: World, stateKey: string): Set<string> {
  return new Set(
    activeMovements(world)
      .filter((movement) => movement.stateKey === stateKey)
      .map((movement) => `${movement.propositionId}:${movement.answer}`),
  );
}

function foundWorkerMovement(
  world: World,
  stateKey: string,
  jurisdiction: Jurisdiction,
  reading: PressureReading | null,
  ordinal: number,
): World {
  if (!reading) return world;
  const excess = reading.levels.anger - BLANKET_POLITICAL_VIOLENCE.angerLine;
  if (excess <= 0) return world;
  const quarters = unrestQuarters(world, stateKey);
  const lasting =
    quarters.includes(ordinal) &&
    quarters.some(
      (quarter) =>
        quarter < ordinal &&
        ordinal - quarter <= BLANKET_POLITICAL_VIOLENCE.lastingWithinQuarters,
    );
  if (!lasting) return world;
  if (jobsAngerShare(reading) < BLANKET_MOVEMENTS.workerAngerShare)
    return world;
  if (
    activeMovements(world).some(
      (movement) =>
        movement.stateKey === stateKey && movement.cause === "worker",
    )
  )
    return world;
  if (
    draw(world, ["found-worker", stateKey, ordinal]) >=
    chance(excess * BLANKET_MOVEMENTS.workerFoundPerExcess)
  )
    return world;
  const standing = stateAnswers(world, jurisdiction);
  const taken = demandedInState(world, stateKey);
  const demands = sortedPropositions(world).flatMap((proposition) => {
    const bearing = principleBearing(world, proposition, WORKER_PRINCIPLE);
    if (!bearing) return [];
    const answer = bearing === "consistent-with" ? "yes" : "no";
    if (standing.get(proposition.id)?.answer === answer) return [];
    if (taken.has(`${proposition.id}:${answer}`)) return [];
    return [{ proposition, answer } as const];
  });
  const demand = pick(world, demands, ["worker-demand", stateKey, ordinal]);
  if (!demand) return world;
  const evidence = world.history.events
    .filter(
      (event) =>
        event.type === UNREST_EVENT &&
        event.tags.includes(`state:${stateKey}`) &&
        ordinal - Number(tagValue(event, "quarter:") ?? -1) <=
          BLANKET_POLITICAL_VIOLENCE.lastingWithinQuarters,
    )
    .map((event) => event.id);
  return foundMovement(world, {
    key: `movement:${stateKey}:${ordinal}:worker`,
    stateKey,
    jurisdiction,
    cause: "worker",
    proposition: demand.proposition,
    answer: demand.answer,
    evidenceIds: evidence,
    ordinal,
    founderId: null,
    reason: "With jobs disappearing and unrest continuing",
  });
}

function foundRightsMovements(
  world: World,
  stateKey: string,
  jurisdiction: Jurisdiction,
  reading: PressureReading | null,
  ordinal: number,
): World {
  const standing = stateAnswers(world, jurisdiction);
  if (standing.size === 0) return world;
  let next = world;
  const anger = reading?.levels.anger ?? 0;
  for (const law of [...standing.values()].sort((a, b) =>
    a.propositionId.localeCompare(b.propositionId),
  )) {
    const proposition = world.policyCatalog.propositions[law.propositionId];
    if (!proposition) continue;
    const against = RIGHTS_PRINCIPLES.some((principle) => {
      const bearing = principleBearing(next, proposition, principle);
      return (
        (law.answer === "yes" && bearing === "against") ||
        (law.answer === "no" && bearing === "consistent-with")
      );
    });
    if (!against) continue;
    const answer = law.answer === "yes" ? "no" : "yes";
    if (demandedInState(next, stateKey).has(`${proposition.id}:${answer}`))
      continue;
    if (
      draw(next, ["found-rights", stateKey, law.measureId, ordinal]) >=
      chance(
        BLANKET_MOVEMENTS.rightsFoundBase +
          anger * BLANKET_MOVEMENTS.rightsFoundPerAnger,
      )
    )
      continue;
    const measure = measureById(next, law.measureId);
    next = foundMovement(next, {
      key: `movement:${stateKey}:${ordinal}:rights:${law.measureId}`,
      stateKey,
      jurisdiction,
      cause: "rights",
      proposition,
      answer,
      evidenceIds: [law.measureId],
      ordinal,
      founderId: null,
      reason: `After ${jurisdiction.name} enacted ${
        measure ? `${measure.designation}, ${measure.shortTitle}` : "a law"
      }`,
    });
  }
  return next;
}

export interface FoundMovementInput {
  readonly key: string;
  readonly stateKey: string;
  readonly jurisdiction: Jurisdiction;
  readonly cause: MovementCause;
  readonly proposition: PolicyPropositionDefinition;
  readonly answer: "yes" | "no";
  readonly evidenceIds: readonly EntityId[];
  readonly ordinal: number;
  /** A person founding it on purpose, who leads it; null to draw a leader. */
  readonly founderId: EntityId | null;
  /** The opening clause of the founding summary, naming the grievance. */
  readonly reason: string | null;
}

/** Founds a movement and records it. Shared with the player's own founding. */
export function foundMovement(world: World, input: FoundMovementInput): World {
  const leaderId =
    input.founderId ??
    pick(world, leaderCandidates(world, input.stateKey), ["leader", input.key]);
  const movement: Movement = {
    key: input.key,
    stateKey: input.stateKey,
    jurisdictionId: input.jurisdiction.id,
    cause: input.cause,
    propositionId: input.proposition.id,
    answer: input.answer,
    evidenceIds: input.evidenceIds,
    foundedAt: world.currentDate,
    foundedQuarter: input.ordinal,
    phase: "organizing",
    strength: BLANKET_MOVEMENTS.startStrength,
    backlash: 0,
    marches: 0,
    roles: leaderId
      ? [
          {
            personId: leaderId,
            role: "leader",
            since: world.currentDate,
            until: null,
          },
        ]
      : [],
    lastQuarter: input.ordinal,
    endedAt: null,
    wonByMeasureId: null,
  };
  const demand = movementDemand(world, movement);
  const leader = nameOf(world, leaderId);
  const where = input.jurisdiction.name;
  const summary = input.founderId
    ? `${leader} founded a movement in ${where} ${demand}.`
    : leader
      ? `${input.reason}, ${leader} began organizing a movement in ${where} ${demand}.`
      : `${input.reason}, a movement began to form in ${where} ${demand}, with no one yet leading it.`;
  const next = withMovement(world, movement);
  return recordMovementEvent(next, movement, {
    suffix: "founded",
    type: MOVEMENT_FOUNDED_EVENT,
    summary,
    participants: leaderId
      ? [
          {
            personId: leaderId,
            role: "coordination:movement-leader",
            detail: null,
          },
        ]
      : [],
  });
}

/** An enacted answer to the demand since founding, in the state or nationally. */
function winningLaw(world: World, movement: Movement) {
  const places = new Set([
    movement.jurisdictionId,
    ...federalJurisdictionIds(world),
  ]);
  return (
    enactedAnswers(world, places).find(
      (row) =>
        row.propositionId === movement.propositionId &&
        row.answer === movement.answer &&
        row.resolvedAt >= movement.foundedAt,
    ) ?? null
  );
}

function closeRole(
  movement: Movement,
  personId: EntityId,
  on: IsoDate,
): Movement["roles"] {
  return movement.roles.map((row) =>
    row.personId === personId && row.until === null
      ? { ...row, until: on }
      : row,
  );
}

function stepOne(
  world: World,
  start: Movement,
  anger: number,
  ordinal: number,
): World {
  const policy = BLANKET_MOVEMENTS;
  let movement: Movement = { ...start, lastQuarter: ordinal };
  let next = world;
  const today = world.currentDate;
  const title = movementTitle(world, movement);

  // A law answering the demand ends it as won.
  const law = winningLaw(next, movement);
  if (law) {
    const measure = measureById(next, law.measureId);
    movement = {
      ...movement,
      phase: "won",
      endedAt: today,
      wonByMeasureId: law.measureId,
    };
    next = withMovement(next, movement);
    const where = next.jurisdictions[law.jurisdictionId]?.name ?? "The state";
    return recordMovementEvent(next, movement, {
      suffix: "won",
      type: MOVEMENT_WON_EVENT,
      summary: `The ${title} won: ${where} enacted ${
        measure ? `${measure.designation}, ${measure.shortTitle}` : "the law"
      }.`,
      participants: participantsOf(next, movement),
    });
  }

  // A leader who has died is succeeded, and the loss rallies the movement.
  const leaderId = movementLeader(movement);
  if (leaderId && !personAlive(next, leaderId)) {
    movement = {
      ...movement,
      roles: closeRole(movement, leaderId, today),
      strength: clamp01(movement.strength + policy.leaderDeathRally),
    };
    const player = controlledPersonId(next);
    const members = movementPeople(movement, "member").filter(
      (id) => id !== player && personAlive(next, id),
    );
    const successor =
      members[0] ??
      pick(next, leaderCandidates(next, movement.stateKey), [
        "succession",
        movement.key,
        ordinal,
      ]);
    if (successor)
      movement = {
        ...movement,
        roles: [
          ...closeRole(movement, successor, today),
          { personId: successor, role: "leader", since: today, until: null },
        ],
      };
    next = withMovement(next, movement);
    const lost = nameOf(next, leaderId) ?? "its leader";
    const heir = nameOf(next, successor);
    next = recordMovementEvent(next, movement, {
      suffix: `leader:${ordinal}`,
      type: MOVEMENT_LEADER_EVENT,
      summary: heir
        ? `${heir} took up the lead of the ${title} after ${lost} died.`
        : `The ${title} lost ${lost}, and no one has taken up the lead.`,
      participants: [
        {
          personId: leaderId,
          role: "impact:movement-leader-lost",
          detail: null,
        },
        ...(successor
          ? [
              {
                personId: successor,
                role: "coordination:movement-leader" as const,
                detail: null,
              },
            ]
          : []),
      ],
    });
  }

  // Growth, held back by backlash.
  const led = movementLeader(movement) !== null;
  const members = movementPeople(movement, "member").length;
  const opponents = movementPeople(movement, "opponent").length;
  const growth =
    (led ? policy.ledGrowth : policy.leaderlessGrowth) +
    anger * policy.growthPerAnger +
    members * policy.growthPerMember -
    movement.backlash * policy.backlashDrag;
  const backlashBefore = movement.backlash;
  movement = {
    ...movement,
    strength: clamp01(movement.strength + growth),
    backlash: clamp01(
      movement.backlash * (1 - policy.backlashFade) +
        opponents * policy.backlashPerOpponent,
    ),
  };

  // A march, when it is strong enough.
  if (
    movement.strength >= policy.marchLine &&
    draw(next, ["march", movement.key, ordinal]) <
      chance(movement.strength * policy.marchPerStrength)
  ) {
    movement = {
      ...movement,
      phase: "marching",
      marches: movement.marches + 1,
      backlash: clamp01(
        movement.backlash + policy.backlashPerMarch * movement.strength,
      ),
    };
    next = withMovement(next, movement);
    const leader = nameOf(next, movementLeader(movement));
    const where = next.jurisdictions[movement.jurisdictionId]?.name ?? "";
    next = recordMovementEvent(next, movement, {
      suffix: `march:${ordinal}`,
      type: MOVEMENT_MARCH_EVENT,
      summary: leader
        ? `${leader} led a march in ${where} ${movementDemand(next, movement)}.`
        : `The ${title} marched in ${where}.`,
      participants: participantsOf(next, movement, "presence:marcher"),
    });
  }

  // Organized opposition, once it runs high.
  if (
    backlashBefore < policy.backlashEventLine &&
    movement.backlash >= policy.backlashEventLine
  ) {
    next = withMovement(next, movement);
    next = recordMovementEvent(next, movement, {
      suffix: `backlash:${ordinal}`,
      type: MOVEMENT_BACKLASH_EVENT,
      summary: `Opponents of the ${title} organized against it.`,
      participants: movementPeople(movement, "opponent")
        .filter((id) => next.people[id])
        .map((personId) => ({
          personId,
          role: "agency:movement-opponent" as const,
          detail: null,
        })),
    });
  }

  // It fades when it dwindles.
  if (
    movement.strength < policy.fadeLine &&
    ordinal - movement.foundedQuarter >= policy.fadeAfterQuarters
  ) {
    movement = { ...movement, phase: "faded", endedAt: today };
    next = withMovement(next, movement);
    return recordMovementEvent(next, movement, {
      suffix: "faded",
      type: MOVEMENT_FADED_EVENT,
      summary: `The ${title} faded.`,
      participants: participantsOf(next, movement),
    });
  }
  return withMovement(next, movement);
}

/** The leader and members now, as event participants. */
function participantsOf(
  world: World,
  movement: Movement,
  memberRole:
    | `presence:${string}`
    | `coordination:${string}` = "coordination:movement-member",
): readonly EventParticipant[] {
  const rows: EventParticipant[] = [];
  const leader = movementLeader(movement);
  if (leader && world.people[leader])
    rows.push({
      personId: leader,
      role: "coordination:movement-leader",
      detail: null,
    });
  for (const id of movementPeople(movement, "member"))
    if (world.people[id])
      rows.push({ personId: id, role: memberRole, detail: null });
  return rows;
}

/** Whether a movement is still one a person can act on. */
export function assertMovementOpen(movement: Movement | null): Movement {
  if (!movement) throw new Error("That movement does not exist.");
  if (!isMovementActive(movement))
    throw new Error("That movement has already ended.");
  return movement;
}

const EMPTY_CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;

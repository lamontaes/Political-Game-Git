/**
 * What a person, the player included, can do about a movement: found one,
 * join, take up the lead when no one holds it, leave, oppose, or speak about
 * it in public. Each is recorded as history. None moves the clock.
 *
 * What a statement moves is in `BLANKET_MOVEMENTS.statement`, a placeholder.
 * A statement changes the movement, never the speaker's standing
 * (`MOVEMENT_SEAMS` "officeholder-standing").
 */

import { personName } from "../people";
import { homeStateKeyOf } from "../pressure/anger";
import { worldStates } from "../pressure/step";
import type { EntityId, IsoDate, World } from "../types";
import {
  BLANKET_MOVEMENTS,
  MOVEMENT_JOINED_EVENT,
  MOVEMENT_LEADER_EVENT,
  MOVEMENT_LEFT_EVENT,
  MOVEMENT_OPPOSED_EVENT,
  MOVEMENT_STATEMENT_EVENT,
  type Movement,
  type MovementRoleKind,
  type MovementStatementStance,
} from "./contract";
import {
  activeMovements,
  movementByKey,
  movementLeader,
  movementRoleOf,
  movementTitle,
  personAlive,
} from "./queries";
import {
  assertMovementOpen,
  foundMovement,
  recordMovementEvent,
  withMovement,
} from "./step";

function requirePerson(world: World, personId: EntityId): string {
  const person = world.people[personId];
  if (!person || !personAlive(world, personId))
    throw new Error("Only a living person can do that.");
  return personName(person);
}

function round(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 10000) / 10000;
}

/** How many times a person has taken up any part in this movement. */
function turns(movement: Movement, personId: EntityId): number {
  return movement.roles.filter((row) => row.personId === personId).length;
}

function addRole(
  movement: Movement,
  personId: EntityId,
  role: MovementRoleKind,
  on: IsoDate,
): Movement {
  return {
    ...movement,
    roles: [
      ...movement.roles.map((row) =>
        row.personId === personId && row.until === null
          ? { ...row, until: on }
          : row,
      ),
      { personId, role, since: on, until: null },
    ],
  };
}

export interface FoundMovementAsInput {
  readonly personId: EntityId;
  readonly propositionId: EntityId;
  readonly answer: "yes" | "no";
}

/** A person founds a movement in their home state and leads it. */
export function foundMovementAs(
  world: World,
  input: FoundMovementAsInput,
): World {
  requirePerson(world, input.personId);
  const proposition = world.policyCatalog.propositions[input.propositionId];
  if (!proposition)
    throw new Error("That question is not one the world holds.");
  const stateKey = homeStateKeyOf(world, input.personId);
  const state = worldStates(world).find((row) => row.stateKey === stateKey);
  if (!stateKey || !state)
    throw new Error("A movement is founded in the state you live in.");
  const same = activeMovements(world).find(
    (movement) =>
      movement.stateKey === stateKey &&
      movement.propositionId === input.propositionId &&
      movement.answer === input.answer,
  );
  if (same)
    throw new Error(
      `${movementTitle(world, same)} already exists. You can join it instead.`,
    );
  if (
    activeMovements(world).some(
      (movement) => movementLeader(movement) === input.personId,
    )
  )
    throw new Error("You already lead a movement.");
  const ordinal = world.pressure?.quartersStepped ?? 0;
  const count = (world.movements?.movements ?? []).filter((movement) =>
    movement.key.startsWith(`movement:${stateKey}:founded:${input.personId}:`),
  ).length;
  return foundMovement(world, {
    key: `movement:${stateKey}:founded:${input.personId}:${count + 1}`,
    stateKey,
    jurisdiction: state.jurisdiction,
    cause: "founded",
    proposition,
    answer: input.answer,
    evidenceIds: [input.personId],
    ordinal,
    founderId: input.personId,
    reason: null,
  });
}

function changeRole(
  world: World,
  key: string,
  personId: EntityId,
  role: MovementRoleKind,
): World {
  const name = requirePerson(world, personId);
  const movement = assertMovementOpen(movementByKey(world, key));
  const current = movementRoleOf(movement, personId);
  if (current === role)
    throw new Error("You already have that part in this movement.");
  if (current === "leader")
    throw new Error("Step down from leading it before you do that.");
  const title = movementTitle(world, movement);
  const updated = addRole(movement, personId, role, world.currentDate);
  const next = withMovement(world, updated);
  const turn = turns(movement, personId) + 1;
  if (role === "member")
    return recordMovementEvent(next, updated, {
      suffix: `joined:${personId}:${turn}`,
      type: MOVEMENT_JOINED_EVENT,
      summary: `${name} joined the ${title}.`,
      participants: [
        { personId, role: "coordination:movement-member", detail: null },
      ],
      visibility: "limited",
    });
  if (role === "opponent")
    return recordMovementEvent(next, updated, {
      suffix: `opposed:${personId}:${turn}`,
      type: MOVEMENT_OPPOSED_EVENT,
      summary: `${name} came out against the ${title}.`,
      participants: [
        { personId, role: "agency:movement-opponent", detail: null },
      ],
    });
  // Leading: only when nobody living holds the lead.
  const leader = movementLeader(movement);
  if (leader && personAlive(world, leader))
    throw new Error("Someone already leads this movement.");
  return recordMovementEvent(next, updated, {
    suffix: `lead:${personId}:${turn}`,
    type: MOVEMENT_LEADER_EVENT,
    summary: `${name} took up the lead of the ${title}.`,
    participants: [
      { personId, role: "coordination:movement-leader", detail: null },
    ],
  });
}

export function joinMovement(
  world: World,
  key: string,
  personId: EntityId,
): World {
  return changeRole(world, key, personId, "member");
}

export function opposeMovement(
  world: World,
  key: string,
  personId: EntityId,
): World {
  return changeRole(world, key, personId, "opponent");
}

/** Takes up the lead of a movement nobody living leads. */
export function leadMovement(
  world: World,
  key: string,
  personId: EntityId,
): World {
  const movement = assertMovementOpen(movementByKey(world, key));
  const leader = movementLeader(movement);
  if (leader && leader !== personId && personAlive(world, leader))
    throw new Error("Someone already leads this movement.");
  if (
    activeMovements(world).some(
      (other) => other.key !== key && movementLeader(other) === personId,
    )
  )
    throw new Error("You already lead a movement.");
  // A dead leader's role closes before the new one opens.
  const cleared =
    leader && leader !== personId
      ? {
          ...movement,
          roles: movement.roles.map((row) =>
            row.personId === leader && row.until === null
              ? { ...row, until: world.currentDate }
              : row,
          ),
        }
      : movement;
  return changeRole(withMovement(world, cleared), key, personId, "leader");
}

/** Leaves a movement: a member, an opponent, or the leader stepping down. */
export function leaveMovement(
  world: World,
  key: string,
  personId: EntityId,
): World {
  const name = requirePerson(world, personId);
  const movement = assertMovementOpen(movementByKey(world, key));
  const current = movementRoleOf(movement, personId);
  if (!current) throw new Error("You have no part in this movement.");
  const updated: Movement = {
    ...movement,
    roles: movement.roles.map((row) =>
      row.personId === personId && row.until === null
        ? { ...row, until: world.currentDate }
        : row,
    ),
  };
  const title = movementTitle(world, movement);
  return recordMovementEvent(withMovement(world, updated), updated, {
    suffix: `left:${personId}:${turns(movement, personId)}`,
    type: MOVEMENT_LEFT_EVENT,
    summary:
      current === "leader"
        ? `${name} stepped down from leading the ${title}.`
        : current === "opponent"
          ? `${name} stopped opposing the ${title}.`
          : `${name} left the ${title}.`,
    participants: [
      { personId, role: "other:movement-former-participant", detail: null },
    ],
    visibility: current === "member" ? "limited" : "public",
  });
}

/**
 * Speaks in public about a movement, at most once a quarter per person.
 * Support adds to its strength, condemning it adds to the backlash, and a
 * call for calm eases the backlash.
 */
export function speakOnMovement(
  world: World,
  key: string,
  personId: EntityId,
  stance: MovementStatementStance,
): World {
  const name = requirePerson(world, personId);
  const movement = assertMovementOpen(movementByKey(world, key));
  const ordinal = world.pressure?.quartersStepped ?? 0;
  const stableKey = `${movement.key}:statement:${personId}:${ordinal}`;
  if (world.history.events.some((event) => event.stableKey === stableKey))
    throw new Error("You have already spoken about it this season.");
  const shift = BLANKET_MOVEMENTS.statement[stance];
  const updated: Movement =
    stance === "support"
      ? { ...movement, strength: round(movement.strength + shift) }
      : stance === "condemn"
        ? { ...movement, backlash: round(movement.backlash + shift) }
        : { ...movement, backlash: round(movement.backlash - shift) };
  const title = movementTitle(world, movement);
  const summary =
    stance === "support"
      ? `${name} spoke in support of the ${title}.`
      : stance === "condemn"
        ? `${name} condemned the ${title}.`
        : `${name} called for calm over the ${title}.`;
  return recordMovementEvent(withMovement(world, updated), updated, {
    suffix: `statement:${personId}:${ordinal}`,
    type: MOVEMENT_STATEMENT_EVENT,
    summary,
    participants: [
      { personId, role: "agency:movement-speaker", detail: stance },
    ],
  });
}

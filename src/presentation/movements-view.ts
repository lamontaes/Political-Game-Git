/**
 * What a player reads about movements: those in the state they live in, with
 * what each one wants, who leads it, how strong it is and what they may do;
 * the ones that ended there; and a count of those elsewhere. Reading commits
 * nothing and moves no clock.
 */

import {
  allMovements,
  homeStateKeyOf,
  isMovementActive,
  movementDemand,
  movementLeader,
  movementPeople,
  movementRoleOf,
  movementTitle,
  personName,
  type EntityId,
  type Movement,
  type MovementRoleKind,
  type World,
} from "../simulation";
import { proseDate } from "./prose-dates";

export type MovementActionKey =
  "join" | "oppose" | "leave" | "lead" | "support" | "condemn" | "calm";

export interface MovementCard {
  readonly key: string;
  readonly title: string;
  readonly lines: readonly string[];
  readonly role: MovementRoleKind | null;
  readonly actions: readonly { key: MovementActionKey; label: string }[];
}

export interface MovementsView {
  readonly stateName: string | null;
  readonly here: readonly MovementCard[];
  readonly ended: readonly string[];
  readonly elsewhere: readonly string[];
  /** Questions a movement could be founded on, by catalog order. */
  readonly questions: readonly { id: EntityId; name: string }[];
}

function strengthWords(value: number): string {
  if (value >= 0.6) return "It is a major force in the state.";
  if (value >= 0.3) return "It is growing and draws crowds.";
  if (value >= 0.1) return "It is small but organized.";
  return "It is barely holding together.";
}

function backlashWords(value: number): string | null {
  if (value >= 0.4) return "Opposition to it is strong and organized.";
  if (value >= 0.15) return "It has drawn open opposition.";
  return null;
}

function nameOf(world: World, id: EntityId | null): string | null {
  const person = id ? world.people[id] : null;
  return person ? personName(person) : null;
}

function card(world: World, movement: Movement, personId: EntityId) {
  const role = movementRoleOf(movement, personId);
  const leaderId = movementLeader(movement);
  const leader = leaderId === personId ? "you" : nameOf(world, leaderId);
  const members = movementPeople(movement, "member").length;
  const lines = [
    `Founded ${proseDate(movement.foundedAt)}. ${
      leader ? `Led by ${leader}.` : "No one leads it now."
    }`,
    strengthWords(movement.strength),
    movement.marches > 0
      ? `It has marched ${movement.marches === 1 ? "once" : `${movement.marches} times`}.`
      : "It has not marched yet.",
    ...(members > 0
      ? [
          members === 1
            ? "Besides its leader, one person has joined."
            : `Besides its leader, ${members} people have joined.`,
        ]
      : []),
    ...[backlashWords(movement.backlash)].filter(
      (line): line is string => line !== null,
    ),
  ];
  const actions: { key: MovementActionKey; label: string }[] = [];
  if (role === null) {
    actions.push({ key: "join", label: "Join it" });
    actions.push({ key: "oppose", label: "Oppose it" });
  } else if (role === "member") {
    actions.push({ key: "leave", label: "Leave it" });
    actions.push({ key: "oppose", label: "Turn against it" });
  } else if (role === "opponent") {
    actions.push({ key: "leave", label: "Stop opposing it" });
    actions.push({ key: "join", label: "Join it" });
  } else {
    actions.push({ key: "leave", label: "Step down as leader" });
  }
  if (role !== "leader" && leaderId === null)
    actions.push({ key: "lead", label: "Take the lead" });
  actions.push({ key: "support", label: "Speak in support" });
  if (role !== "leader") actions.push({ key: "condemn", label: "Condemn it" });
  actions.push({ key: "calm", label: "Call for calm" });
  return {
    key: movement.key,
    title: movementTitle(world, movement),
    lines,
    role,
    actions,
  };
}

export function projectMovements(
  world: World,
  personId: EntityId,
): MovementsView {
  const stateKey = homeStateKeyOf(world, personId);
  const movements = allMovements(world);
  const here = movements.filter((row) => row.stateKey === stateKey);
  const stateName =
    here[0]?.jurisdictionId !== undefined
      ? (world.jurisdictions[here[0].jurisdictionId]?.name ?? null)
      : null;
  return {
    stateName,
    here: here
      .filter(isMovementActive)
      .map((movement) => card(world, movement, personId)),
    ended: here
      .filter((movement) => !isMovementActive(movement))
      .map((movement) =>
        movement.phase === "won"
          ? `The movement ${movementDemand(world, movement)} won on ${proseDate(movement.endedAt!)}.`
          : `The movement ${movementDemand(world, movement)} faded by ${proseDate(movement.endedAt!)}.`,
      ),
    elsewhere: movements
      .filter((row) => row.stateKey !== stateKey && isMovementActive(row))
      .map((movement) => movementTitle(world, movement)),
    questions: world.policyCatalog.propositionOrder.flatMap((id) => {
      const question = world.policyCatalog.propositions[id];
      return question ? [{ id, name: question.name }] : [];
    }),
  };
}

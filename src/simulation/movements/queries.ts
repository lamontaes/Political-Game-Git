/**
 * Reading movements. Nothing here writes or moves the clock.
 */

import { measureEnactment } from "../legislation";
import type {
  EntityId,
  IsoDate,
  PolicyPropositionDefinition,
  PrincipleBearing,
  World,
} from "../types";
import { isPersonAliveAt } from "../vitality";
import {
  MOVEMENTS_CONTRACT_VERSION,
  type Movement,
  type MovementRoleKind,
  type MovementStore,
} from "./contract";

const FEDERAL_SLUGS = new Set(["united-states", "us"]);

export function movementStore(world: World): MovementStore {
  return (
    world.movements ?? {
      contractVersion: MOVEMENTS_CONTRACT_VERSION,
      movements: [],
    }
  );
}

export function allMovements(world: World): readonly Movement[] {
  return movementStore(world).movements;
}

export function isMovementActive(movement: Movement): boolean {
  return movement.phase === "organizing" || movement.phase === "marching";
}

export function activeMovements(world: World): readonly Movement[] {
  return allMovements(world).filter(isMovementActive);
}

export function movementByKey(world: World, key: string): Movement | null {
  return allMovements(world).find((movement) => movement.key === key) ?? null;
}

/** People holding a role now, in the order they took it up. */
export function movementPeople(
  movement: Movement,
  role: MovementRoleKind,
): readonly EntityId[] {
  return movement.roles
    .filter((row) => row.role === role && row.until === null)
    .map((row) => row.personId);
}

export function movementLeader(movement: Movement): EntityId | null {
  return movementPeople(movement, "leader")[0] ?? null;
}

/** The part a person plays in a movement now, if any. */
export function movementRoleOf(
  movement: Movement,
  personId: EntityId,
): MovementRoleKind | null {
  return (
    movement.roles.find(
      (row) => row.personId === personId && row.until === null,
    )?.role ?? null
  );
}

/**
 * Leaders of active movements in a state, living, in id order. For the
 * threat step's target list (`MOVEMENT_SEAMS` "leaders-as-targets").
 */
export function movementLeadersIn(
  world: World,
  stateKey: string,
): readonly EntityId[] {
  const ids = new Set<EntityId>();
  for (const movement of activeMovements(world)) {
    if (movement.stateKey !== stateKey) continue;
    const leader = movementLeader(movement);
    if (leader && world.people[leader] && personAlive(world, leader))
      ids.add(leader);
  }
  return [...ids].sort();
}

export function personAlive(world: World, personId: EntityId): boolean {
  return isPersonAliveAt(world, personId, {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  });
}

export function movementProposition(
  world: World,
  movement: Pick<Movement, "propositionId">,
): PolicyPropositionDefinition | null {
  return world.policyCatalog.propositions[movement.propositionId] ?? null;
}

/** What a movement wants, as a short phrase naming the catalog question. */
export function movementDemand(
  world: World,
  movement: Pick<Movement, "propositionId" | "answer">,
): string {
  const name = movementProposition(world, movement)?.name ?? "a policy change";
  return movement.answer === "yes" ? `for “${name}”` : `against “${name}”`;
}

export function movementTitle(world: World, movement: Movement): string {
  const state = world.jurisdictions[movement.jurisdictionId]?.name ?? "";
  return `${state} movement ${movementDemand(world, movement)}`.trim();
}

/**
 * How the catalog says agreeing with a question bears on a principle, by the
 * principle's key (`equal-treatment`), or null when the pack does not say.
 */
export function principleBearing(
  world: World,
  proposition: PolicyPropositionDefinition,
  principleKey: string,
): PrincipleBearing | null {
  for (const row of proposition.principles ?? []) {
    const principle = world.policyCatalog.principles[row.principleId];
    if (!principle) continue;
    const key = principle.stableKey;
    if (key === principleKey || key.endsWith(`:${principleKey}`))
      return row.bearing;
  }
  return null;
}

/** One enacted answer to a catalog question. */
export interface EnactedAnswer {
  readonly measureId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly propositionId: EntityId;
  readonly answer: "yes" | "no";
  readonly resolvedAt: IsoDate;
}

/**
 * Every answer to a catalog question an enacted measure gave, in the given
 * jurisdictions, resolved on or before today, in the order enacted.
 */
export function enactedAnswers(
  world: World,
  jurisdictionIds: ReadonlySet<EntityId>,
): readonly EnactedAnswer[] {
  const rows: EnactedAnswer[] = [];
  for (const measure of world.history.legislativeMeasures ?? []) {
    if (!jurisdictionIds.has(measure.jurisdictionId)) continue;
    if (!measure.propositionAnswers?.length) continue;
    const enactment = measureEnactment(world, measure.id);
    if (
      !enactment ||
      enactment.outcome !== "enacted" ||
      enactment.resolvedAt > world.currentDate
    )
      continue;
    for (const row of measure.propositionAnswers)
      rows.push({
        measureId: measure.id,
        jurisdictionId: measure.jurisdictionId,
        propositionId: row.propositionId,
        answer: row.answer,
        resolvedAt: enactment.resolvedAt,
      });
  }
  return rows.sort(
    (a, b) =>
      a.resolvedAt.localeCompare(b.resolvedAt) ||
      a.measureId.localeCompare(b.measureId),
  );
}

/** The federal jurisdictions the world holds (normally one). */
export function federalJurisdictionIds(world: World): ReadonlySet<EntityId> {
  return new Set(
    world.jurisdictionOrder.filter((id) =>
      FEDERAL_SLUGS.has(world.jurisdictions[id]?.slug ?? ""),
    ),
  );
}

/** The latest answer standing in force for each question, by proposition. */
export function standingAnswers(
  answers: readonly EnactedAnswer[],
): ReadonlyMap<EntityId, EnactedAnswer> {
  const latest = new Map<EntityId, EnactedAnswer>();
  for (const row of answers) latest.set(row.propositionId, row);
  return latest;
}

/**
 * The move writer: a household (or a person living alone) leaves one place
 * for another on a date, for a recorded reason.
 *
 * What a move writes, all dated the move day and all pointing at one
 * `migration.moved` event:
 * - the person's current residence fact is closed and a new one opened;
 * - `homeJurisdictionId` follows the new residence fact, which world
 *   integrity requires;
 * - the household, if there is one, gets a location superseding its last;
 * - any open state legislative district membership is closed, because the
 *   person no longer lives in that district. Joining the new district is not
 *   built (see `MIGRATION_SEAMS`, `district-membership`).
 *
 * Nothing here asserts world integrity per move. `applyMoves` builds every
 * move in a step on one object; the monthly review runs inside the future
 * transition runner, which asserts integrity once over the handler's result.
 * The single-move public writer `relocateHousehold` asserts once itself.
 */

import { createStableId } from "../ids";
import { buildHouseholdLocationRecord } from "../life";
import {
  currentLifeCutoff,
  householdLocationAt,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import type {
  EntityId,
  HistoricalEvent,
  IsoDate,
  Person,
  PersonFact,
  World,
} from "../types";
import { assertWorldIntegrity, recordWorldEvent } from "../world";
import {
  MIGRATION_CONTRACT_VERSION,
  MIGRATION_MOVED_EVENT,
  MOVE_REASON_NAMESPACES,
  type MoveReasonKey,
} from "./contract";

export interface MoveRequest {
  /** Stable key for the move; the event and every record derive from it. */
  readonly stableKey: string;
  /** Anybody in the household that is moving. */
  readonly personId: EntityId;
  readonly toJurisdictionId: EntityId;
  readonly reason: MoveReasonKey;
  /** Set when a wave's pressure is what moved them. */
  readonly waveKey: string | null;
}

/** A move checked against the world and ready to write. */
export interface PlannedMove {
  readonly stableKey: string;
  readonly householdId: EntityId | null;
  readonly personIds: readonly EntityId[];
  readonly fromJurisdictionId: EntityId;
  readonly toJurisdictionId: EntityId;
  readonly reason: MoveReasonKey;
  readonly waveKey: string | null;
}

export type MovePlan =
  | { readonly kind: "planned"; readonly move: PlannedMove }
  | { readonly kind: "refused"; readonly reason: string };

/**
 * People held to their place by a record the move writer cannot close.
 *
 * BLANKET RULE (`who-may-move`): a job, a school enrollment, a housing
 * tenure, an organization or party membership, a dwelling occupancy or a
 * campaign keeps a person where they are. Closing those on a move is somebody
 * else's writer and is not built, so a move that would strand one is refused
 * rather than half-done. Computed once per step, not once per candidate.
 */
export function moveTies(world: World): ReadonlyMap<EntityId, string> {
  const ties = new Map<EntityId, string>();
  const tie = (personId: EntityId, reason: string) => {
    if (!ties.has(personId)) ties.set(personId, reason);
  };
  const h = world.history;
  for (const record of h.workRelationships) tie(record.personId, "has a job");
  for (const record of h.educationEnrollments)
    tie(record.personId, "is enrolled in school");
  for (const record of h.organizationParticipations)
    tie(record.personId, "belongs to an organization or party");
  for (const record of h.campaigns ?? [])
    tie(record.candidatePersonId, "has run a campaign");
  const householdTenure = new Set<EntityId>();
  for (const record of h.housingTenures) {
    if (record.holder.kind === "person")
      tie(record.holder.personId, "holds a housing tenure");
    else if (record.holder.kind === "household")
      householdTenure.add(record.holder.householdId);
  }
  const occupiedHouseholds = new Set<EntityId>();
  for (const record of h.dwellingOccupancies) {
    if (record.occupant.kind === "person")
      tie(record.occupant.personId, "occupies a recorded dwelling");
    else occupiedHouseholds.add(record.occupant.householdId);
  }
  for (const membership of h.householdMemberships) {
    if (householdTenure.has(membership.householdId))
      tie(membership.personId, "their household holds a housing tenure");
    if (occupiedHouseholds.has(membership.householdId))
      tie(membership.personId, "their household occupies a recorded dwelling");
  }
  return ties;
}

/** Everybody with a recorded death on or before today. */
export function deadPeople(world: World): ReadonlySet<EntityId> {
  return new Set(
    world.history.personDeaths
      .filter((record) => record.diedAt <= world.currentDate)
      .map((record) => record.personId),
  );
}

/** The player and everybody currently living with them. */
export function playerHouseholdPeople(world: World): ReadonlySet<EntityId> {
  if (world.control.kind !== "person") return new Set();
  const playerId = world.control.personId;
  const people = new Set<EntityId>([playerId]);
  if (!world.people[playerId]) return people;
  for (const active of householdMembershipsAt(world, playerId))
    for (const id of peopleInHouseholdAt(world, active.household.id))
      people.add(id);
  return people;
}

/**
 * Checks a move and works out who goes with the person.
 *
 * A person in a household takes the whole household (`leaving-a-shared-
 * household` is not built). Refused, with the reason, when anybody going is
 * the player or lives with them, is tied to the place, or is already there.
 */
export function planMove(
  world: World,
  request: MoveRequest,
  context: {
    readonly ties: ReadonlyMap<EntityId, string>;
    readonly playerHousehold: ReadonlySet<EntityId>;
    readonly dead: ReadonlySet<EntityId>;
  },
): MovePlan {
  const person = world.people[request.personId];
  if (!person) return refused("Nobody by that id is in the world.");
  if (context.dead.has(person.id)) return refused("They have died.");
  if (!world.jurisdictions[request.toJurisdictionId])
    return refused("The destination is not a place this world knows.");
  if (!isMoveReason(request.reason))
    return refused(`'${request.reason}' is not a namespaced move reason.`);
  const from = person.homeJurisdictionId;
  if (from === request.toJurisdictionId)
    return refused("They already live there.");

  const households = householdMembershipsAt(world, person.id).filter(
    (active) => active.state.residenceRole === "primary",
  );
  if (households.length > 1)
    return refused(
      "They have more than one primary household, and which one moves is not decided.",
    );
  const householdId = households[0]?.household.id ?? null;
  // The dead keep the residence they died in.
  const personIds = householdId
    ? peopleInHouseholdAt(world, householdId).filter(
        (id) => !context.dead.has(id),
      )
    : [person.id];

  for (const id of personIds) {
    const member = world.people[id]!;
    if (context.playerHousehold.has(id))
      return refused(
        "The player's household moves only when the player chooses to.",
      );
    const tie = context.ties.get(id);
    if (tie)
      return refused(
        `${member.givenName} ${member.familyName} ${tie}, and closing that on a move is not built.`,
      );
    if (member.homeJurisdictionId !== from)
      return refused(
        "The household's members do not all live in the same place today.",
      );
    if (!currentResidenceFact(member))
      return refused(
        `${member.givenName} ${member.familyName} has no current residence on record.`,
      );
  }
  return {
    kind: "planned",
    move: {
      stableKey: request.stableKey,
      householdId,
      personIds,
      fromJurisdictionId: from,
      toJurisdictionId: request.toJurisdictionId,
      reason: request.reason,
      waveKey: request.waveKey,
    },
  };
}

/**
 * Writes planned moves on the current date. No integrity check: the caller
 * owns that (see the file comment).
 */
export function applyMoves(world: World, moves: readonly PlannedMove[]): World {
  let next = world;
  for (const move of moves) next = applyMove(next, move, next.currentDate);
  return next;
}

/** One move, checked, written and integrity-asserted. For scenarios, tests and future player routes. */
export function relocateHousehold(world: World, request: MoveRequest): World {
  const plan = planMove(world, request, {
    ties: moveTies(world),
    playerHousehold: playerHouseholdPeople(world),
    dead: deadPeople(world),
  });
  if (plan.kind === "refused") throw new Error(plan.reason);
  const next = applyMoves(world, [plan.move]);
  assertWorldIntegrity(next);
  return next;
}

/** Every recorded move, oldest first, read from the events. */
export interface RecordedMove {
  readonly eventId: EntityId;
  readonly occurredAt: IsoDate;
  readonly personIds: readonly EntityId[];
  readonly fromJurisdictionId: EntityId;
  readonly toJurisdictionId: EntityId;
  readonly reason: MoveReasonKey;
  readonly waveKey: string | null;
}

export function recordedMoves(world: World): readonly RecordedMove[] {
  return world.history.events
    .filter((event) => event.type === MIGRATION_MOVED_EVENT)
    .map(readMove);
}

function readMove(event: HistoricalEvent): RecordedMove {
  const tag = (prefix: string) =>
    event.tags
      .find((entry) => entry.startsWith(prefix))
      ?.slice(prefix.length) ?? null;
  return {
    eventId: event.id,
    occurredAt: event.occurredAt,
    personIds: event.participants.map((participant) => participant.personId),
    fromJurisdictionId: event.jurisdictionId!,
    toJurisdictionId: event.context.location!.jurisdictionId!,
    reason: tag("reason:") as MoveReasonKey,
    waveKey: tag("wave:"),
  };
}

function applyMove(world: World, move: PlannedMove, date: IsoDate): World {
  const toName = world.jurisdictions[move.toJurisdictionId]!.name;
  const fromName = world.jurisdictions[move.fromJurisdictionId]!.name;
  const eventStableKey = `migration:moved:${move.stableKey}`;
  let next = recordWorldEvent(world, {
    stableKey: eventStableKey,
    type: MIGRATION_MOVED_EVENT,
    occurredAt: date,
    recordedAt: date,
    jurisdictionId: move.fromJurisdictionId,
    involvedEntityIds: [
      ...move.personIds,
      move.fromJurisdictionId,
      move.toJurisdictionId,
    ],
    participants: move.personIds.map((personId) => ({
      personId,
      role: "agency:mover" as const,
      detail: null,
    })),
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      `reason:${move.reason}`,
      `from:${move.fromJurisdictionId}`,
      `to:${move.toJurisdictionId}`,
      ...(move.waveKey ? [`wave:${move.waveKey}`] : []),
    ],
    summary:
      move.personIds.length === 1
        ? `${personLabel(world, move.personIds[0]!)} moved from ${fromName} to ${toName}.`
        : `${personLabel(world, move.personIds[0]!)} and ${move.personIds.length - 1} others in the household moved from ${fromName} to ${toName}.`,
    context: {
      location: {
        jurisdictionId: move.toJurisdictionId,
        label: toName,
        setting: null,
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: move.reason,
      immediateReaction: null,
    },
  });
  const event = next.history.events.at(-1)!;
  if (event.stableKey !== eventStableKey)
    throw new Error("The move event was not the last event written.");

  const people = { ...next.people };
  for (const personId of move.personIds) {
    people[personId] = movedPerson(
      people[personId]!,
      move,
      date,
      event.id,
      toName,
    );
  }
  next = { ...next, people };

  if (move.householdId) {
    const previous = householdLocationAt(
      next,
      move.householdId,
      currentLifeCutoff(next),
    );
    const record = buildHouseholdLocationRecord(next, {
      stableKey: `${eventStableKey}:household`,
      householdId: move.householdId,
      effectiveAt: date,
      jurisdictionId: move.toJurisdictionId,
      label: toName,
      kind: "residence:moved",
      provenance: { kind: "simulated-event", eventId: event.id },
      supersedesLocationId: previous?.id ?? null,
    });
    next = {
      ...next,
      history: {
        ...next.history,
        nextSequence: next.history.nextSequence + 1,
        householdLocations: [...next.history.householdLocations, record],
      },
    };
  }

  const movers = new Set(move.personIds);
  const intervals = next.history.districtResidenceIntervals;
  if (
    intervals?.some(
      (interval) => movers.has(interval.personId) && interval.endedOn === null,
    )
  ) {
    next = {
      ...next,
      history: {
        ...next.history,
        districtResidenceIntervals: intervals.map((interval) =>
          movers.has(interval.personId) && interval.endedOn === null
            ? { ...interval, endedOn: date }
            : interval,
        ),
      },
    };
  }
  return next;
}

function movedPerson(
  person: Person,
  move: PlannedMove,
  date: IsoDate,
  eventId: EntityId,
  toName: string,
): Person {
  const stableKey = `residence:moved:${move.stableKey}`;
  const opened: PersonFact = {
    id: createStableId("fact", `${person.id}:${stableKey}`),
    stableKey,
    kind: "residence",
    occurredAt: date,
    endedAt: null,
    jurisdictionId: move.toJurisdictionId,
    summary: `${person.givenName} ${person.familyName} moved to ${toName}.`,
    provenance: {
      method: "simulated-event",
      sourceEventId: eventId,
      note: MIGRATION_CONTRACT_VERSION,
    },
  };
  return {
    ...person,
    homeJurisdictionId: move.toJurisdictionId,
    establishedFacts: [
      ...person.establishedFacts.map((fact) =>
        fact.kind === "residence" && fact.endedAt === null
          ? { ...fact, endedAt: date }
          : fact,
      ),
      opened,
    ],
  };
}

function currentResidenceFact(person: Person) {
  return person.establishedFacts.find(
    (fact) => fact.kind === "residence" && fact.endedAt === null,
  );
}

function personLabel(world: World, personId: EntityId): string {
  const person = world.people[personId]!;
  return `${person.givenName} ${person.familyName}`;
}

function isMoveReason(value: string): value is MoveReasonKey {
  const [namespace, ...rest] = value.split(":");
  return (
    MOVE_REASON_NAMESPACES.includes(namespace as never) &&
    rest.join(":").trim().length > 0
  );
}

function refused(reason: string): MovePlan {
  return { kind: "refused", reason };
}

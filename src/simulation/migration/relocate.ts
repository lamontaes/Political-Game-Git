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
 * move in a step on one object; the quarterly review runs inside the future
 * transition runner, which asserts integrity once over the handler's result.
 * The single-move public writer `relocateHousehold` asserts once itself.
 */

import { createStableId } from "../ids";
import { buildHouseholdLocationRecord } from "../life";
import { activeCampaignForCandidate } from "../campaign-queries";
import {
  activeEducationEnrollmentsAt,
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
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
import {
  recordDwellingOccupancyState,
  recordHousingTenureState,
} from "../resources";
import {
  dwellingOccupancyStateHistory,
  housingTenureStateHistory,
} from "../resource-queries";
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
  /**
   * End the household's occupancy and tenure on the move instead of refusing
   * it. Set only when the home is gone or unlivable (`disaster-displacement`);
   * an ordinary move still treats housing as a tie (`who-may-move`).
   */
  readonly endsHousing?: boolean;
  /** The record that caused the move, such as a disaster's damage to the home. */
  readonly causeId?: EntityId;
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
  /** Occupancies and tenures the move ends, each with an ended state. */
  readonly endsOccupancyIds: readonly EntityId[];
  readonly endsTenureIds: readonly EntityId[];
  readonly causeId: EntityId | null;
}

export type MovePlan =
  | { readonly kind: "planned"; readonly move: PlannedMove }
  | { readonly kind: "refused"; readonly reason: string };

/** The housing a person or their household holds today, which a move can end. */
export interface HeldHousing {
  readonly occupancyIds: readonly EntityId[];
  readonly tenureIds: readonly EntityId[];
}

/**
 * Reads what holds people to their place today. Built once per review and
 * read per person, only for somebody whose departure draw succeeded.
 *
 * Only records active today count: a job that ended, a school a person
 * finished, a lease that closed or a campaign that is over holds nobody.
 */
export interface MoveTieReader {
  /**
   * A job, a school enrollment, an organization or party membership or a
   * running campaign. Ending those on a move is somebody else's writer and is
   * not built, so such a move is refused rather than half-done.
   */
  readonly bindingTie: (personId: EntityId) => string | null;
  /** A dwelling occupancy or a housing tenure, the person's or the household's. */
  readonly housingTie: (personId: EntityId) => string | null;
  readonly housingOf: (personId: EntityId) => HeldHousing;
}

export function moveTieReader(world: World): MoveTieReader {
  const date = world.currentDate;
  const latest = <T extends { readonly effectiveAt: IsoDate }>(
    states: readonly T[],
    idOf: (state: T) => EntityId,
  ): ReadonlyMap<EntityId, T> => {
    const map = new Map<EntityId, T>();
    for (const state of states)
      if (state.effectiveAt <= date) map.set(idOf(state), state);
    return map;
  };
  let index: {
    readonly occupancies: ReadonlyMap<EntityId, EntityId[]>;
    readonly tenures: ReadonlyMap<EntityId, EntityId[]>;
  } | null = null;
  const housingIndex = () => {
    if (index) return index;
    const h = world.history;
    const add = (map: Map<EntityId, EntityId[]>, key: EntityId, id: EntityId) =>
      map.set(key, [...(map.get(key) ?? []), id]);
    const occupancyStates = latest(
      h.dwellingOccupancyStates,
      (state) => state.dwellingOccupancyId,
    );
    const occupancies = new Map<EntityId, EntityId[]>();
    for (const record of h.dwellingOccupancies) {
      if (record.startedAt > date) continue;
      if (occupancyStates.get(record.id)?.status !== "active") continue;
      add(
        occupancies,
        record.occupant.kind === "person"
          ? record.occupant.personId
          : record.occupant.householdId,
        record.id,
      );
    }
    const tenureStates = latest(
      h.housingTenureStates,
      (state) => state.housingTenureId,
    );
    const tenures = new Map<EntityId, EntityId[]>();
    for (const record of h.housingTenures) {
      if (record.startedAt > date) continue;
      if (tenureStates.get(record.id)?.status !== "active") continue;
      if (record.holder.kind === "person")
        add(tenures, record.holder.personId, record.id);
      else if (record.holder.kind === "household")
        add(tenures, record.holder.householdId, record.id);
    }
    index = { occupancies, tenures };
    return index;
  };
  const housingOf = (personId: EntityId): HeldHousing => {
    const { occupancies, tenures } = housingIndex();
    const holders = [
      personId,
      ...householdMembershipsAt(world, personId).map(
        (active) => active.household.id,
      ),
    ];
    return {
      occupancyIds: holders.flatMap((id) => occupancies.get(id) ?? []),
      tenureIds: holders.flatMap((id) => tenures.get(id) ?? []),
    };
  };
  return {
    bindingTie: (personId) => {
      if (activeWorkRelationshipsAt(world, personId).length > 0)
        return "has a job";
      if (activeEducationEnrollmentsAt(world, personId).length > 0)
        return "is enrolled in school";
      if (activeOrganizationParticipationsAt(world, personId).length > 0)
        return "belongs to an organization or party";
      if (activeCampaignForCandidate(world, personId))
        return "is running a campaign";
      return null;
    },
    housingTie: (personId) => {
      const held = housingOf(personId);
      if (held.tenureIds.length > 0)
        return "holds a housing tenure, alone or with their household";
      if (held.occupancyIds.length > 0)
        return "occupies a recorded dwelling, alone or with their household";
      return null;
    },
    housingOf,
  };
}

/**
 * Everybody tied to their place today, with the reason. For tests and
 * scenarios; the review reads one person at a time through `moveTieReader`.
 */
export function moveTies(
  world: World,
  personIds: readonly EntityId[] = world.personOrder,
): ReadonlyMap<EntityId, string> {
  const reader = moveTieReader(world);
  const ties = new Map<EntityId, string>();
  for (const id of personIds) {
    const tie = reader.bindingTie(id) ?? reader.housingTie(id);
    if (tie) ties.set(id, tie);
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
    readonly ties: MoveTieReader;
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
    const tie =
      context.ties.bindingTie(id) ??
      (request.endsHousing ? null : context.ties.housingTie(id));
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
      causeId: request.causeId ?? null,
      ...endedHousing(personIds, request.endsHousing ? context.ties : null),
    },
  };
}

function endedHousing(
  personIds: readonly EntityId[],
  ties: MoveTieReader | null,
): Pick<PlannedMove, "endsOccupancyIds" | "endsTenureIds"> {
  if (!ties) return { endsOccupancyIds: [], endsTenureIds: [] };
  const held = personIds.map((id) => ties.housingOf(id));
  return {
    endsOccupancyIds: [...new Set(held.flatMap((h) => h.occupancyIds))],
    endsTenureIds: [...new Set(held.flatMap((h) => h.tenureIds))],
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
    ties: moveTieReader(world),
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
  /** The record that caused the move, when one did. */
  readonly causeId: EntityId | null;
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
    causeId: tag("cause:") as EntityId | null,
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
      ...(move.causeId ? [`cause:${move.causeId}`] : []),
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

  // Housing ends before the people move, so each writer's integrity check
  // sees a world that is whole: the event written, nobody half-moved.
  for (const occupancyId of move.endsOccupancyIds) {
    const previous = dwellingOccupancyStateHistory(next, occupancyId).at(-1)!;
    next = recordDwellingOccupancyState(next, {
      stableKey: `${eventStableKey}:occupancy:${occupancyId}`,
      dwellingOccupancyId: occupancyId,
      effectiveAt: date,
      status: "ended",
      residenceRole: previous.residenceRole,
      kind: previous.kind,
      reason: move.reason,
      provenance: { kind: "simulated-event", eventId: event.id },
      supersedesStateId: previous.id,
    });
  }
  for (const tenureId of move.endsTenureIds) {
    const previous = housingTenureStateHistory(next, tenureId).at(-1)!;
    next = recordHousingTenureState(next, {
      stableKey: `${eventStableKey}:tenure:${tenureId}`,
      housingTenureId: tenureId,
      effectiveAt: date,
      status: "ended",
      context: move.reason,
      provenance: { kind: "simulated-event", eventId: event.id },
      supersedesStateId: previous.id,
    });
  }

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

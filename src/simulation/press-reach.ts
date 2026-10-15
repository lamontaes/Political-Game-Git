import { eventById } from "./event-index";
import { activeWorkRelationshipsAt } from "./life-queries";
import { JOURNALISM_OCCUPATION_CLASSIFICATION } from "./press-interviews";
import { projectEligiblePressAdvisers } from "./press-interview-producers";
import { resolvePublicationSource } from "./public-information-integrity";
import type { EntityId, World } from "./types";
import {
  isPersonAliveAt,
  personActionAvailabilityAt,
} from "./vitality-integrity";
import { assertWorldIntegrity } from "./world";

export interface PressReachGap {
  readonly code:
    | "no-controlled-source"
    | "no-journalist-role"
    | "no-pitchable-basis"
    | "private-or-future-basis"
    | "no-colleague-adviser";
  readonly blocking: boolean;
  readonly detail: string;
}

export interface PressReachSnapshot {
  readonly sourcePersonId: EntityId | null;
  readonly journalistCount: number;
  readonly pitchableBasisCount: number;
  readonly colleagueAdviserCount: number;
  readonly gaps: readonly PressReachGap[];
}

export interface PitchablePressBasis {
  readonly eventId: EntityId;
  readonly summary: string;
  readonly jurisdictionId: EntityId | null;
}

export interface CivicPressContactResult {
  readonly world: World;
  readonly reporterPersonId: EntityId | null;
  readonly reporterWorkRoleId: EntityId | null;
  readonly organizationId: EntityId | null;
  readonly established: boolean;
}

/** Public, non-future civic occurrences a pitch may name; private facts stay closed. */
export function eventIsPitchablePressBasis(
  world: World,
  eventId: EntityId,
): boolean {
  const event = eventById(world, eventId);
  if (!event || event.occurredAt > world.currentDate) return false;
  return resolvePublicationSource(world, event) !== null;
}

export function projectPitchablePressBases(
  world: World,
  sourcePersonId: EntityId,
): readonly PitchablePressBasis[] {
  assertWorldIntegrity(world);
  return world.history.events
    .filter(
      (event) =>
        event.involvedEntityIds.includes(sourcePersonId) &&
        eventIsPitchablePressBasis(world, event.id),
    )
    .map((event) => ({
      eventId: event.id,
      summary: event.summary,
      jurisdictionId: event.jurisdictionId,
    }));
}

/** Read-only trace of the normal-world gaps that block a first interview. */
export function projectPressReachSnapshot(
  world: World,
  questionBasisEventIds: readonly EntityId[] = [],
): PressReachSnapshot {
  assertWorldIntegrity(world);
  const sourcePersonId =
    world.control.kind === "person" ? world.control.personId : null;
  const journalists = currentJournalists(world, sourcePersonId);
  const pitchable = sourcePersonId
    ? projectPitchablePressBases(world, sourcePersonId)
    : [];
  const advisers = sourcePersonId
    ? projectEligiblePressAdvisers(world, sourcePersonId)
    : [];
  const gaps: PressReachGap[] = [];
  if (!sourcePersonId) {
    gaps.push({
      code: "no-controlled-source",
      blocking: true,
      detail: "Press requests require control of an existing person.",
    });
  }
  if (journalists.length === 0) {
    gaps.push({
      code: "no-journalist-role",
      blocking: true,
      detail:
        "No current reachable profession:journalism work role exists among living, available people in this world.",
    });
  }
  if (sourcePersonId && pitchable.length === 0) {
    gaps.push({
      code: "no-pitchable-basis",
      blocking: true,
      detail:
        "No public, non-future civic occurrence involving the source is recorded to pitch.",
    });
  }
  const privateOrFuture = questionBasisEventIds.filter(
    (eventId) => !eventIsPitchablePressBasis(world, eventId),
  );
  if (privateOrFuture.length > 0) {
    gaps.push({
      code: "private-or-future-basis",
      blocking: true,
      detail:
        "At least one named basis is missing, private, future or otherwise not pitchable.",
    });
  }
  if (sourcePersonId && advisers.length === 0) {
    gaps.push({
      code: "no-colleague-adviser",
      blocking: false,
      detail:
        "No current workplace colleague is available to prepare; an unprepared interview remains allowed.",
    });
  }
  return {
    sourcePersonId,
    journalistCount: journalists.length,
    pitchableBasisCount: pitchable.length,
    colleagueAdviserCount: advisers.length,
    gaps,
  };
}

/** Read an existing available journalist; asking cannot create a job or newsroom. */
export function seekCivicPressContact(world: World): CivicPressContactResult {
  assertWorldIntegrity(world);
  const sourcePersonId = controlledPersonId(world);
  const existing = currentJournalists(world, sourcePersonId)[0];
  if (!existing)
    return {
      world,
      reporterPersonId: null,
      reporterWorkRoleId: null,
      organizationId: null,
      established: false,
    };
  const organizationId =
    activeWorkRelationshipsAt(world, existing.personId).find(
      ({ role }) => role.id === existing.workRoleId,
    )?.relationship.organizationId ?? null;
  return {
    world,
    reporterPersonId: existing.personId,
    reporterWorkRoleId: existing.workRoleId,
    organizationId,
    established: false,
  };
}

export function currentJournalists(
  world: World,
  excludedPersonId: EntityId | null,
): readonly {
  readonly personId: EntityId;
  readonly workRoleId: EntityId;
}[] {
  return world.personOrder.flatMap((personId) => {
    if (personId === excludedPersonId) return [];
    if (!journalistIsReachable(world, personId)) return [];
    return activeWorkRelationshipsAt(world, personId)
      .filter(
        ({ role }) =>
          role.occupationClassification ===
          JOURNALISM_OCCUPATION_CLASSIFICATION,
      )
      .map(({ role }) => ({ personId, workRoleId: role.id }));
  });
}

function journalistIsReachable(world: World, personId: EntityId): boolean {
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  if (!isPersonAliveAt(world, personId, cutoff)) return false;
  return (
    personActionAvailabilityAt(world, personId, cutoff).status !== "blocked"
  );
}

function controlledPersonId(world: World): EntityId {
  if (world.control.kind !== "person") {
    throw new Error(
      "Civic press contact requires control of an existing person.",
    );
  }
  return world.control.personId;
}

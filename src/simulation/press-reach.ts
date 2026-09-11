import { ageOnDate } from "./dates";
import { createOrganization, createWorkRelationship } from "./life";
import {
  activeWorkRelationshipsAt,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "./life-queries";
import { personName } from "./people";
import { JOURNALISM_OCCUPATION_CLASSIFICATION } from "./press-interviews";
import { projectEligiblePressAdvisers } from "./press-interview-producers";
import { resolvePublicationSource } from "./public-information-integrity";
import type { EntityId, World } from "./types";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

const AUTHORED = {
  kind: "authored" as const,
  note: "PRESS-REACH13 fictional civic news desk. Employment, title and schedule are game-authored, not an empirical newsroom, real journalist identity or measured staffing rate.",
} as const;

const NEWSROOM_KEY_PREFIX = "press.civic-newsroom:";
export const CIVIC_NEWSROOM_ORGANIZATION_NAME =
  "Civic Desk Cooperative (fictional)";

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
  readonly reporterPersonId: EntityId;
  readonly reporterWorkRoleId: EntityId;
  readonly organizationId: EntityId | null;
  readonly established: boolean;
}

/** Public, non-future civic occurrences a pitch may name; private facts stay closed. */
export function eventIsPitchablePressBasis(
  world: World,
  eventId: EntityId,
): boolean {
  const event = world.history.events.find(
    (candidate) => candidate.id === eventId,
  );
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
        "No current profession:journalism work role exists among people already in this world.",
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

/**
 * Reuses an existing journalist when one exists. Otherwise employs an already
 * generated adult through the ordinary organization and work writers. Does not
 * create a person, grant interview consent or appoint an adviser.
 */
export function seekCivicPressContact(world: World): CivicPressContactResult {
  assertWorldIntegrity(world);
  const sourcePersonId = controlledPersonId(world);
  const existing = currentJournalists(world, sourcePersonId)[0];
  if (existing) {
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

  const reporterPersonId = pickCivicReporterCandidate(world, sourcePersonId);
  if (!reporterPersonId) {
    throw new Error(
      "No existing adult is available to hold a civic reporting role.",
    );
  }
  const jurisdictionId =
    activeWorkRelationshipsAt(world, sourcePersonId).find(
      ({ role }) => role.locationJurisdictionId !== null,
    )?.role.locationJurisdictionId ?? null;
  const orgKey = `${NEWSROOM_KEY_PREFIX}${jurisdictionId ?? "unlocated"}`;
  let next = world;
  let organization = next.history.organizations.find(
    (candidate) => candidate.stableKey === orgKey,
  );
  if (!organization) {
    next = createOrganization(next, {
      stableKey: orgKey,
      formedAt: next.currentDate,
      provenance: AUTHORED,
      initialProfile: {
        name: CIVIC_NEWSROOM_ORGANIZATION_NAME,
        classification: "enterprise:civic-news-desk",
        locationJurisdictionId: jurisdictionId,
      },
    });
    organization = next.history.organizations.at(-1)!;
  }
  next = recordWorldEvent(next, {
    stableKey: `${orgKey}:established:${reporterPersonId}`,
    type: "press.civic-newsroom-staffed",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId,
    involvedEntityIds: canonicalIds([
      reporterPersonId,
      organization.id,
      ...(jurisdictionId ? [jurisdictionId] : []),
    ]),
    participants: [
      {
        personId: reporterPersonId,
        role: "agency:reporter",
        detail: "Took an authored civic reporting assignment",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["press.civic-newsroom", `press.reporter:${reporterPersonId}`],
    summary:
      "An existing person accepted an authored civic reporting assignment.",
    context: {
      location: jurisdictionId
        ? {
            jurisdictionId,
            label: CIVIC_NEWSROOM_ORGANIZATION_NAME,
            setting: "Civic news desk",
          }
        : null,
      socialContext: personName(next.people[reporterPersonId]!),
      pressure: null,
      choice: "employment:news-reporting",
      motivation: AUTHORED.note,
      immediateReaction: null,
    },
  });
  next = createWorkRelationship(next, {
    stableKey: `${orgKey}:work:${reporterPersonId}`,
    personId: reporterPersonId,
    organizationId: organization.id,
    startedAt: next.currentDate,
    kind: "employment:news-reporting",
    compensation: "paid",
    authority: "self-directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: AUTHORED,
    initialRole: {
      title: "Civic affairs reporter",
      occupationClassification: JOURNALISM_OCCUPATION_CLASSIFICATION,
      locationJurisdictionId: jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 30, maximumHours: 45 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: jurisdictionId,
      },
    },
  });
  const reporterWorkRoleId = next.history.workRoles.at(-1)!.id;
  return {
    world: next,
    reporterPersonId,
    reporterWorkRoleId,
    organizationId: organization.id,
    established: true,
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
    return activeWorkRelationshipsAt(world, personId)
      .filter(
        ({ role }) =>
          role.occupationClassification ===
          JOURNALISM_OCCUPATION_CLASSIFICATION,
      )
      .map(({ role }) => ({ personId, workRoleId: role.id }));
  });
}

function pickCivicReporterCandidate(
  world: World,
  sourcePersonId: EntityId,
): EntityId | null {
  const householdIds = new Set(
    householdMembershipsAt(world, sourcePersonId).flatMap((entry) =>
      peopleInHouseholdAt(world, entry.household.id),
    ),
  );
  const adults = world.personOrder.filter((personId) => {
    if (personId === sourcePersonId) return false;
    const person = world.people[personId];
    return !!person && ageOnDate(person.birthDate, world.currentDate) >= 18;
  });
  const outsideHome = adults.filter((personId) => !householdIds.has(personId));
  const pool = outsideHome.length > 0 ? outsideHome : adults;
  return [...pool].sort((left, right) => left.localeCompare(right))[0] ?? null;
}

function controlledPersonId(world: World): EntityId {
  if (world.control.kind !== "person") {
    throw new Error(
      "Civic press contact requires control of an existing person.",
    );
  }
  return world.control.personId;
}

function canonicalIds(ids: readonly EntityId[]): EntityId[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

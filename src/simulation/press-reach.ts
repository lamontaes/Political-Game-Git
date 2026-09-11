import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "./character-history";
import { isoDateFromParts } from "./dates";
import { createOrganization, createWorkRelationship } from "./life";
import { activeWorkRelationshipsAt } from "./life-queries";
import { drawCanonicalNameForGender, personName } from "./people";
import { generatePersonIdentity } from "./person-identity";
import { JOURNALISM_OCCUPATION_CLASSIFICATION } from "./press-interviews";
import { projectEligiblePressAdvisers } from "./press-interview-producers";
import { resolvePublicationSource } from "./public-information-integrity";
import { SeededRng } from "./rng";
import type { EntityId, IsoDate, World } from "./types";
import {
  isPersonAliveAt,
  personActionAvailabilityAt,
} from "./vitality-integrity";
import { assertWorldIntegrity, recordWorldEvent } from "./world";

const AUTHORED = {
  kind: "authored" as const,
  note: "PRESS-REACH13 fictional civic news desk. Employment, title and schedule are game-authored, not an empirical newsroom, real journalist identity or measured staffing rate.",
} as const;

const NEWSROOM_KEY_PREFIX = "press.civic-newsroom:";
const REPORTER_KEY_PREFIX = "press.civic-reporter:";
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

/**
 * Reuses a living, available journalist when one already holds a current
 * journalism role. Otherwise generates a new fictional reporter through the
 * character-history population writer and employs that person only. Does not
 * reassign an existing adult, grant interview consent or appoint an adviser.
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

  const jurisdictionId = civicReporterHomeJurisdiction(world, sourcePersonId);
  const reporterKey = nextCivicReporterStableKey(world, jurisdictionId);
  const rng = new SeededRng(world.seed).fork(
    `press.civic-reporter:${reporterKey}`,
  );
  const identity = generatePersonIdentity(rng);
  const name = drawCanonicalNameForGender(rng, identity.gender);
  let next = createCharacterHistoryContextPerson(world, {
    stableKey: reporterKey,
    givenName: name.givenName,
    familyName: name.familyName,
    birthDate: birthDateForAge(world.currentDate, rng.integer(32, 66)),
    homeJurisdictionId: jurisdictionId,
    identity,
  });
  const reporterPersonId = characterHistoryContextPersonId(next, reporterKey);
  const orgKey = `${NEWSROOM_KEY_PREFIX}${jurisdictionId}`;
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
      jurisdictionId,
    ]),
    participants: [
      {
        personId: reporterPersonId,
        role: "agency:reporter",
        detail: "Began an authored civic reporting assignment",
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: ["press.civic-newsroom", `press.reporter:${reporterPersonId}`],
    summary:
      "A newly generated person began an authored civic reporting assignment.",
    context: {
      location: {
        jurisdictionId,
        label: CIVIC_NEWSROOM_ORGANIZATION_NAME,
        setting: "Civic news desk",
      },
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

function nextCivicReporterStableKey(
  world: World,
  jurisdictionId: EntityId,
): string {
  for (let index = 0; index < 32; index += 1) {
    const stableKey = `${REPORTER_KEY_PREFIX}${jurisdictionId}:${index}`;
    const personId = characterHistoryContextPersonId(world, stableKey);
    if (!world.people[personId]) return stableKey;
  }
  throw new Error(
    "No unused civic-reporter population slot is available in this jurisdiction.",
  );
}

function civicReporterHomeJurisdiction(
  world: World,
  sourcePersonId: EntityId,
): EntityId {
  const source = world.people[sourcePersonId];
  if (source && world.jurisdictions[source.homeJurisdictionId]) {
    return source.homeJurisdictionId;
  }
  const fromWork = activeWorkRelationshipsAt(world, sourcePersonId).find(
    ({ role }) =>
      role.locationJurisdictionId !== null &&
      world.jurisdictions[role.locationJurisdictionId],
  )?.role.locationJurisdictionId;
  if (fromWork) return fromWork;
  const first = world.jurisdictionOrder.find(
    (jurisdictionId) => world.jurisdictions[jurisdictionId],
  );
  if (!first) {
    throw new Error("A civic reporter requires an existing home jurisdiction.");
  }
  return first;
}

/**
 * A birth date that makes somebody exactly this old today. The day of the month
 * is clamped to the 28th so a leap day never lands in a year that has none.
 */
function birthDateForAge(onDate: IsoDate, age: number): IsoDate {
  const year = Number(onDate.slice(0, 4)) - age;
  const month = Number(onDate.slice(5, 7));
  const day = Math.min(Number(onDate.slice(8, 10)), 28);
  return isoDateFromParts(year, month, day);
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

// Test-only recorded staff. Production reporter lookup never imports this writer.
import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "../../src/simulation/character-history";
import { inventedPersonBirthDate } from "../../src/simulation/invented-person-age";
import {
  createOrganization,
  createWorkRelationship,
} from "../../src/simulation/life";
import { activeWorkRelationshipsAt } from "../../src/simulation/life-queries";
import {
  drawCanonicalNameForGender,
  personName,
} from "../../src/simulation/people";
import { generatePersonIdentity } from "../../src/simulation/person-identity";
import { SeededRng } from "../../src/simulation/rng";
import type { EntityId, World } from "../../src/simulation/types";
import {
  assertWorldIntegrity,
  recordWorldEvent,
} from "../../src/simulation/world";
import {
  currentJournalists,
  seekCivicPressContact,
} from "../../src/simulation/press-reach";
import { JOURNALISM_OCCUPATION_CLASSIFICATION } from "../../src/simulation/press-interviews";

// Authored recorded-staff fixture preserves the earlier interview inputs.
const AUTHORED = {
  kind: "authored" as const,
  note: "PRESS-REACH13 fictional civic news desk. Employment, title and schedule are game-authored, not an empirical newsroom, real journalist identity or measured staffing rate.",
} as const;

const NEWSROOM_KEY_PREFIX = "press.civic-newsroom:";
const REPORTER_KEY_PREFIX = "press.civic-reporter:";
export const CIVIC_NEWSROOM_ORGANIZATION_NAME = "Civic Desk Cooperative";

export function recordedCivicReporterFixture(world: World): {
  world: World;
  reporterPersonId: EntityId;
  reporterWorkRoleId: EntityId;
  organizationId: EntityId | null;
  established: boolean;
} {
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
    birthDate: inventedPersonBirthDate(rng, {
      role: "civic-reporter",
      referenceDate: world.currentDate,
      placement: "reference-day",
    }),
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
  const contact = seekCivicPressContact(next);
  if (!contact.reporterPersonId || !contact.reporterWorkRoleId)
    throw new Error("Recorded fixture journalist must be available.");
  return {
    ...contact,
    reporterPersonId: contact.reporterPersonId,
    reporterWorkRoleId: contact.reporterWorkRoleId,
  };
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

function canonicalIds(ids: readonly EntityId[]): EntityId[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

function controlledPersonId(world: World): EntityId {
  if (world.control.kind !== "person") {
    throw new Error(
      "Civic press contact requires control of an existing person.",
    );
  }
  return world.control.personId;
}

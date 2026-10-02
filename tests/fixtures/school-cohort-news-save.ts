import { writeFileSync } from "node:fs";
import { smallWorld } from "./small-world";
import { drawRandomPlace } from "../support/random-place";
import {
  createFutureTransitionHandlerRegistry,
  resolveFutureDueItemsThrough,
} from "../../src/simulation/future-transitions";
import {
  createOrganization,
  createEducationEnrollment,
  createWorkRelationship,
} from "../../src/simulation/life";
import { personName } from "../../src/simulation/people";
import { serializeWorld } from "../../src/simulation/serialization";
import { recordWorldEvent } from "../../src/simulation/world";
import { ensureWorldStartingConditions } from "../../src/simulation/world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../src/simulation/world-setup/types";
import {
  EPIDEMIC_EVENT_TYPES,
  EPIDEMIC_PASS_KEY,
  ensureEpidemicProduction,
  epidemicPassHandler,
} from "../../src/simulation/crisis/epidemic";

// Canonical native fixture from epidemic-school-summary.test.ts at e70d002d5.
// Membership records are a materialized cohort, never total school population.
const PROVENANCE = {
  kind: "authored" as const,
  note: "Supplied school membership and principal for a summary regression.",
};
function schoolFixture(
  seed: string,
  place: ReturnType<typeof drawRandomPlace>,
  closed: boolean,
) {
  const fixture = smallWorld({ place: place.key, seed });
  let world = ensureWorldStartingConditions(fixture.world, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
  });
  const principal = fixture.personId;
  const students = world.personOrder.filter((id) => id !== principal);
  world = createOrganization(world, {
    stableKey: "fixture:school",
    formedAt: world.currentDate,
    provenance: PROVENANCE,
    initialProfile: {
      name: "Fixture learning center",
      classification: "service:school",
      locationJurisdictionId: fixture.jurisdictionId,
    },
  });
  const school = world.history.organizations.at(-1)!;
  world = createWorkRelationship(world, {
    stableKey: "fixture:principal",
    personId: principal,
    organizationId: school.id,
    startedAt: world.currentDate,
    kind: "employment:education",
    compensation: "paid",
    authority: "directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: PROVENANCE,
    initialRole: {
      title: "Principal",
      occupationClassification: "profession:school-principal",
      locationJurisdictionId: fixture.jurisdictionId,
      // Existing supplied staff time profile: office-onboarding-world.ts:195.
      // This is an authored work fixture, not a measured school staffing claim.
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 40 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: fixture.jurisdictionId,
      },
    },
  });
  for (const personId of students) {
    world = createEducationEnrollment(world, {
      stableKey: `fixture:student:${personId}`,
      personId,
      organizationId: school.id,
      startedAt: world.currentDate,
      programKind: "schooling:secondary-program",
      contextKind: "stage:secondary",
      provenance: PROVENANCE,
    });
  }
  if (closed)
    world = recordWorldEvent(world, {
      stableKey: "fixture:prior-school-closure",
      type: EPIDEMIC_EVENT_TYPES.schoolClosed,
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: fixture.jurisdictionId,
      involvedEntityIds: [school.id, principal],
      participants: [
        {
          personId: principal,
          role: "agency:decider",
          detail: "Supplied earlier closure.",
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [`epidemic:school:${school.id}`],
      summary: "Supplied earlier closure of Fixture learning center.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: "closed",
        motivation: "Authored closure control.",
        immediateReaction: null,
      },
    });
  world = ensureEpidemicProduction(world);
  const due = world.history.futureDueItems.find(
    (item) => item.transitionKey === EPIDEMIC_PASS_KEY,
  )!;
  if (!due)
    throw new Error("Canonical epidemic production did not schedule a pass.");
  return {
    world,
    principal,
    students,
    school,
    due,
    jurisdictionId: fixture.jurisdictionId,
  };
}

const seed = "school-cohort-summary:browser";
const place = drawRandomPlace(seed);
const fixture = schoolFixture(seed, place, true);
const registry = createFutureTransitionHandlerRegistry([
  [EPIDEMIC_PASS_KEY, epidemicPassHandler],
]);
const world = resolveFutureDueItemsThrough(
  fixture.world,
  fixture.due.dueAt,
  registry,
);
const event = world.history.events.find(
  (row) =>
    row.type === EPIDEMIC_EVENT_TYPES.schoolReopened &&
    row.tags.includes(`epidemic:school:${fixture.school.id}`),
);
if (!event)
  throw new Error("The real epidemic pass did not reopen the supplied school.");
if (
  !event.involvedEntityIds.includes(fixture.principal) ||
  !event.involvedEntityIds.includes(fixture.school.id)
)
  throw new Error("Reopening lost the saved principal/school join.");
const outFile = process.argv[2];
if (!outFile) throw new Error("Expected serialized-world output path.");
writeFileSync(outFile, serializeWorld(world));
process.stdout.write(
  JSON.stringify({
    seed,
    place: place.displayName,
    eventId: event.id,
    principalId: fixture.principal,
    principalName: personName(world.people[fixture.principal]!),
    schoolId: fixture.school.id,
    schoolName: world.history.organizationProfiles.find(
      (profile) => profile.organizationId === fixture.school.id,
    )!.name,
    studentIds: fixture.students,
    summary: event.summary,
  }),
);

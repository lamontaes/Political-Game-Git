import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import {
  createFutureTransitionHandlerRegistry,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import {
  createOrganization,
  createEducationEnrollment,
  createWorkRelationship,
} from "../life";
import { personName } from "../people";
import { deserializeWorld, serializeWorld } from "../serialization";
import { recordWorldEvent } from "../world";
import { ensureWorldStartingConditions } from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { beginHealthEpisode } from "./health";
import {
  EPIDEMIC_EVENT_TYPES,
  EPIDEMIC_PASS_KEY,
  EPIDEMIC_VERSION,
  ensureEpidemicProduction,
  epidemicPassHandler,
} from "./epidemic";

const PROVENANCE = {
  kind: "authored" as const,
  note: "Supplied school membership and principal for a summary regression.",
};
const seen = new Set<string>();
const samples = Array.from({ length: 5 }, (_, index) => {
  const seed = `school-cohort-summary:${index}`;
  const place = drawRandomPlace(
    seed,
    (candidate) =>
      candidate.stateJurisdictionKey !== null &&
      !seen.has(candidate.stateJurisdictionKey),
  );
  seen.add(place.stateJurisdictionKey!);
  return { seed, place };
});
const registry = createFutureTransitionHandlerRegistry([
  [EPIDEMIC_PASS_KEY, epidemicPassHandler],
]);

function schoolFixture(
  seed: string,
  place: (typeof samples)[number]["place"],
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
  expect(due).toBeDefined();
  expect(
    world.history.educationEnrollments
      .filter((row) => row.organizationId === school.id)
      .map((row) => row.personId),
  ).toEqual(students);
  expect(
    world.history.workRelationships
      .filter((row) => row.organizationId === school.id)
      .map((row) => row.personId),
  ).toEqual([principal]);
  return {
    world,
    principal,
    students,
    school,
    due,
    jurisdictionId: fixture.jurisdictionId,
  };
}

describe.each(samples)(
  "school summary in $place.displayName (seed $seed)",
  ({ seed, place }) => {
    it("reopens for the saved principal without turning zero cohort absences into a whole-school claim, and survives reload/repeat", () => {
      const fixture = schoolFixture(seed, place, true);
      const next = resolveFutureDueItemsThrough(
        fixture.world,
        fixture.due.dueAt,
        registry,
      );
      const reopen = next.history.events.find(
        (event) =>
          event.type === EPIDEMIC_EVENT_TYPES.schoolReopened &&
          event.tags.includes(`epidemic:school:${fixture.school.id}`),
      );
      expect(reopen).toBeDefined();
      expect(reopen!.summary).toBe(
        `${personName(next.people[fixture.principal]!)}, the principal, reopened Fixture learning center.`,
      );
      expect(reopen!.involvedEntityIds).toEqual([
        fixture.school.id,
        fixture.principal,
      ]);
      expect(reopen!.jurisdictionId).toBe(fixture.jurisdictionId);
      expect(reopen!.participants[0]!.personId).toBe(fixture.principal);
      expect(reopen!.tags).toContain("epidemic:out-sick:0");
      expect(reopen!.summary).not.toMatch(
        /\b0 of \d+\b|no(?:body| one| students| staff).*sick|everyone.*healthy/i,
      );
      expect(reopen!.context.motivation ?? "").not.toMatch(
        /\b0 (?:of \d+|students|staff)\b|no(?:body| one| students| staff).*sick|everyone.*healthy/i,
      );
      const loaded = deserializeWorld(serializeWorld(next));
      const repeated = resolveFutureDueItemsThrough(
        loaded,
        fixture.due.dueAt,
        registry,
      );
      expect(repeated.history.events).toEqual(next.history.events);
      expect(repeated.history.futureDueItems).toEqual(
        next.history.futureDueItems,
      );
    });

    it("reports positive absences from actual saved students without printing a school-population denominator", () => {
      const fixture = schoolFixture(seed, place, false);
      let world = fixture.world;
      for (const personId of fixture.students)
        world = beginHealthEpisode(world, {
          stableKey: `fixture:epidemic:${personId}`,
          personId,
          severity: "acute",
          initialLimitation: "limited",
          origin: {
            kind: "authored",
            note: `${EPIDEMIC_VERSION}:school-summary-control`,
          },
          causalParentIds: [],
        });
      const next = resolveFutureDueItemsThrough(
        world,
        fixture.due.dueAt,
        registry,
      );
      const closure = next.history.events.find(
        (event) =>
          event.type === EPIDEMIC_EVENT_TYPES.schoolClosed &&
          event.tags.includes(`epidemic:school:${fixture.school.id}`),
      );
      expect(closure).toBeDefined();
      expect(closure!.summary).toBe(
        `${personName(next.people[fixture.principal]!)}, the principal, closed Fixture learning center because ${fixture.students.length} students and staff were out sick.`,
      );
      expect(closure!.tags).toContain(
        `epidemic:out-sick:${fixture.students.length}`,
      );
      expect(closure!.summary).not.toMatch(/\b\d+ of \d+\b/);
      expect(closure!.involvedEntityIds).toEqual([
        fixture.school.id,
        fixture.principal,
      ]);
    });
  },
);

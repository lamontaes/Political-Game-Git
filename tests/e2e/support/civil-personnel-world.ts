import { createDemoWorld } from "../../../src/simulation/demo";
import {
  createOrganization,
  createWorkRelationship,
} from "../../../src/simulation/life";
export function civilPersonnelFixture(unlocated = false) {
  let world = createDemoWorld("civil-personnel");
  const actor = world.personOrder[0]!;
  world = { ...world, control: { kind: "person", personId: actor } };
  world = createOrganization(world, {
    stableKey: "civil-fixture:employer",
    formedAt: world.currentDate,
    provenance: {
      kind: "authored",
      note: "Fictional test employer; no public authority or legal class is asserted.",
    },
    initialProfile: {
      name: "Test employer",
      classification: "service:employer",
      locationJurisdictionId: unlocated ? null : world.jurisdictionOrder[0]!,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: "civil-fixture:work",
    personId: actor,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:fixture",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: {
      kind: "authored",
      note: "Explicit test employment, not a real-law hiring proof.",
    },
    initialRole: {
      title: "Employee",
      occupationClassification: null,
      locationJurisdictionId: unlocated ? null : world.jurisdictionOrder[0]!,
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 40 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "flexible",
        interruptibility: "interruptible",
        locationJurisdictionId: null,
      },
    },
  });
  return {
    world,
    actor,
    organizationId,
    workRelationshipId: world.history.workRelationships.at(-1)!.id,
  };
}

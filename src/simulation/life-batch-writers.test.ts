import { describe, expect, it } from "vitest";

import { addDays } from "./dates";
import {
  createOrganization,
  createOrganizationParticipation,
  createOrganizationParticipations,
  createWorkRelationship,
  createWorkRelationships,
  type CreateOrganizationParticipationInput,
  type CreateWorkRelationshipInput,
} from "./life";
import { createDemoWorld } from "./demo";
import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "./index";
import type { EntityId, World } from "./types";

function fixture(seed: string): { world: World; organizationId: EntityId } {
  const initial = createDemoWorld(seed);
  const jurisdictionId = initial.jurisdictionOrder[0]!;
  const world = createOrganization(initial, {
    stableKey: "life-batch-test:organization",
    formedAt: initial.currentDate,
    provenance: { kind: "authored", note: "Batch writer comparison fixture." },
    initialProfile: {
      name: "Civic office",
      classification: "community:makerspace-cooperative",
      locationJurisdictionId: jurisdictionId,
    },
  });
  return { world, organizationId: world.history.organizations.at(-1)!.id };
}

function workInput(
  world: World,
  organizationId: EntityId,
  stableKey: string,
  personId: EntityId,
  expected = false,
): CreateWorkRelationshipInput {
  return {
    stableKey,
    personId,
    organizationId,
    startedAt: expected ? addDays(world.currentDate, 1) : world.currentDate,
    ...(expected ? { initialStatus: "expected" as const } : {}),
    kind: "employment:staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: { kind: "generated", generatorKey: "life-batch-test/v1" },
    initialRole: {
      title: "Policy analyst",
      occupationClassification: "profession:policy-analysis",
      locationJurisdictionId: world.jurisdictionOrder[0]!,
      timeDemand: {
        expectedWeekly: { minimumHours: 30, maximumHours: 40 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: world.jurisdictionOrder[0]!,
      },
    },
  };
}

function participationInput(
  world: World,
  organizationId: EntityId,
  stableKey: string,
  personId: EntityId,
  expected = false,
): CreateOrganizationParticipationInput {
  return {
    stableKey,
    personId,
    organizationId,
    startedAt: expected ? addDays(world.currentDate, 1) : world.currentDate,
    ...(expected ? { initialStatus: "expected" as const } : {}),
    kind: "membership:youth-group",
    roleKind: "member:participant",
    context: "Synthetic member participation",
    provenance: { kind: "authored", note: "Batch writer comparison fixture." },
  };
}

describe("life batch writers", () => {
  it("matches repeated single work writes, including IDs, order, dates and provenance", () => {
    const { world, organizationId } = fixture("life-batch-work-equivalence");
    const inputs = [
      workInput(world, organizationId, "batch:work:one", world.personOrder[0]!),
      workInput(
        world,
        organizationId,
        "batch:work:two",
        world.personOrder[1]!,
        true,
      ),
      workInput(
        world,
        organizationId,
        "batch:work:three",
        world.personOrder[0]!,
      ),
    ];
    const batched = createWorkRelationships(world, inputs);
    const singles = inputs.reduce(createWorkRelationship, world);
    expect(serializeWorld(batched)).toBe(serializeWorld(singles));
    expect(batched.history.nextSequence - world.history.nextSequence).toBe(9);
    expect(createWorkRelationships(world, [])).toBe(world);
    assertWorldIntegrity(batched);
    expect(serializeWorld(deserializeWorld(serializeWorld(batched)))).toBe(
      serializeWorld(batched),
    );
  });

  it("matches repeated single participation writes, including IDs, order and status", () => {
    const { world, organizationId } = fixture(
      "life-batch-participation-equivalence",
    );
    const inputs = [
      participationInput(
        world,
        organizationId,
        "batch:participation:one",
        world.personOrder[0]!,
      ),
      participationInput(
        world,
        organizationId,
        "batch:participation:two",
        world.personOrder[1]!,
        true,
      ),
      participationInput(
        world,
        organizationId,
        "batch:participation:three",
        world.personOrder[0]!,
      ),
    ];
    const batched = createOrganizationParticipations(world, inputs);
    const singles = inputs.reduce(createOrganizationParticipation, world);
    expect(serializeWorld(batched)).toBe(serializeWorld(singles));
    expect(batched.history.nextSequence - world.history.nextSequence).toBe(6);
    expect(createOrganizationParticipations(world, [])).toBe(world);
    assertWorldIntegrity(batched);
  });

  it("refuses invalid later records atomically and checks duplicate keys before later fields", () => {
    const { world, organizationId } = fixture("life-batch-rejection");
    const work = workInput(
      world,
      organizationId,
      "batch:work:valid",
      world.personOrder[0]!,
    );
    const membership = participationInput(
      world,
      organizationId,
      "batch:participation:valid",
      world.personOrder[0]!,
    );
    const before = serializeWorld(world);
    expect(() =>
      createWorkRelationships(world, [
        work,
        { ...work, stableKey: "batch:work:invalid", startedAt: "1900-01-01" },
      ]),
    ).toThrow(/cannot predate the person/);
    expect(() =>
      createOrganizationParticipations(world, [
        membership,
        {
          ...membership,
          stableKey: "batch:participation:invalid",
          startedAt: "1900-01-01",
        },
      ]),
    ).toThrow(/cannot predate the person/);
    expect(() =>
      createWorkRelationships(world, [
        work,
        { ...work, startedAt: "1900-01-01" },
      ]),
    ).toThrow(/work relationship stable key already exists/);
    expect(() =>
      createOrganizationParticipations(world, [
        membership,
        { ...membership, startedAt: "1900-01-01" },
      ]),
    ).toThrow(/organization participation stable key already exists/);
    expect(serializeWorld(world)).toBe(before);
  });
});

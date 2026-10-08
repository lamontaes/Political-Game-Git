import { describe, expect, it } from "vitest";
import {
  createDemoWorld,
  createWorld,
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
  serializeWorld,
  type EntityId,
  type IsoDate,
  type World,
} from "../simulation";
import { recognizes } from "./conversation-continuity";
import {
  activeWorkRelationshipsAt,
  workStatusAt,
} from "../simulation/life-queries";

const provenance = {
  kind: "authored" as const,
  note: "Synthetic recognition interval edge fixture, not generated-world scene proof.",
};
function work(
  world: World,
  personId: EntityId,
  organizationId: EntityId,
  startedAt: IsoDate,
) {
  return createWorkRelationship(world, {
    stableKey: `recognition-edge:${personId}:${startedAt}`,
    personId,
    organizationId,
    startedAt,
    kind: "employment:staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Recorded fixture worker",
      occupationClassification: null,
      locationJurisdictionId: null,
      timeDemand: {
        expectedWeekly: { minimumHours: 36, maximumHours: 40 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: null,
      },
    },
  });
}

describe("synthetic recognition interval edges", () => {
  it("retains ended overlapping work and rejects nonoverlapping common employers without writing", () => {
    const demo = createDemoWorld("recognition-interval-edge");
    // Keep only fixture people/place identities; demo work is unrelated evidence.
    let world = createWorld({
      seed: "recognition-interval-edge",
      currentDate: demo.currentDate,
      jurisdictions: demo.jurisdictionOrder.map(
        (id) => demo.jurisdictions[id]!,
      ),
      people: demo.personOrder.map((id) => demo.people[id]!),
    });
    const [first, second, later] = world.personOrder;
    expect(first && second && later).toBeTruthy();
    world = createOrganization(world, {
      stableKey: "recognition-fixture-employer",
      formedAt: "2000-01-01",
      provenance,
      initialProfile: {
        name: "Synthetic recognition employer",
        classification: "community:makerspace-cooperative",
        locationJurisdictionId: null,
      },
    });
    const organization = world.history.organizations.at(-1)!.id;
    world = work(world, first!, organization, "2018-01-01");
    const firstWork = world.history.workRelationships.at(-1)!;
    world = work(world, second!, organization, "2019-01-01");
    const firstStatus = workStatusAt(world, firstWork.id)!;
    world = recordWorkStatus(world, {
      stableKey: "recognition-fixture-first-ended",
      workRelationshipId: firstWork.id,
      effectiveAt: "2020-01-01",
      status: "ended",
      reason: "Synthetic earlier departure",
      provenance,
      supersedesStatusId: firstStatus.id,
    });
    world = work(world, later!, organization, "2022-01-01");
    const before = serializeWorld(world);
    expect(activeWorkRelationshipsAt(world, first!)).toHaveLength(0);
    expect(recognizes(world, first!, second!)).toContainEqual({
      kind: "past-work",
      organizationId: organization,
      startedAt: "2019-01-01",
      endedAt: "2020-01-01",
      sourceRecordIds: expect.arrayContaining([firstWork.id, firstStatus.id]),
    });
    expect(recognizes(world, first!, later!)).toEqual([]);
    expect(recognizes(world, second!, first!)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "past-work",
          startedAt: "2019-01-01",
          endedAt: "2020-01-01",
        }),
      ]),
    );
    expect(recognizes(world, first!, second!, "2017-01-01")).toEqual([]);
    expect(serializeWorld(world)).toBe(before);
  });
});

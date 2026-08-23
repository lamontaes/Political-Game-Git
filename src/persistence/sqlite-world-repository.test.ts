import { afterEach, describe, expect, it } from "vitest";

import {
  SYNTHETIC_POLICY_IDS,
  advanceDemoWorld,
  createFormationContext,
  createDemoWorld,
  createOrganization,
  createWorkRelationship,
  materializePerson,
  recordPrivateBelief,
} from "../simulation";
import type { EntityId } from "../simulation";
import { SqliteWorldRepository } from "./sqlite-world-repository";

describe("SQLite world repository", () => {
  let repository: SqliteWorldRepository | null = null;

  afterEach(() => {
    repository?.close();
    repository = null;
  });

  it("persists, loads, lists, and updates a complete versioned world snapshot", () => {
    repository = new SqliteWorldRepository(":memory:");
    let initial = createDemoWorld("sqlite-persistence");
    const personId = initial.personOrder[0] as EntityId;
    initial = recordPrivateBelief(initial, {
      stableKey: "belief:sqlite:nuclear-investment",
      personId,
      propositionId: SYNTHETIC_POLICY_IDS.propositions.nuclearInvestment,
      formedAt: initial.currentDate,
      position: "conflicted",
      conviction: "strong",
      salience: "high",
      flexibility: "conditional",
      rationale: "Synthetic persistence fixture.",
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
    const detailed = materializePerson(initial, personId);
    const firstSave = repository.save(detailed);

    expect(repository.load(detailed.id)).toStrictEqual(detailed);
    expect(
      repository.load(detailed.id)?.history.privateBeliefs.at(-1),
    ).toMatchObject({
      propositionId: SYNTHETIC_POLICY_IDS.propositions.nuclearInvestment,
      position: "conflicted",
    });
    expect(repository.list()).toStrictEqual([firstSave]);

    const advanced = advanceDemoWorld(detailed, 30);
    const secondSave = repository.save(advanced);
    expect(secondSave.snapshotId).not.toBe(firstSave.snapshotId);
    expect(repository.load(advanced.id)).toStrictEqual(advanced);
    expect(repository.list()).toStrictEqual([secondSave]);
  });

  it("returns null for an unknown world", () => {
    repository = new SqliteWorldRepository(":memory:");
    const missingId = "world_missing" as EntityId;
    expect(repository.load(missingId)).toBeNull();
  });

  it("preserves Stage 5.1 organization and work history through SQLite", () => {
    repository = new SqliteWorldRepository(":memory:");
    let world = createDemoWorld("sqlite-life-foundation");
    const personId = world.personOrder[0] as EntityId;
    const jurisdictionId = world.jurisdictionOrder[0] as EntityId;
    world = createOrganization(world, {
      stableKey: "sqlite:organization:mutual-aid-lab",
      formedAt: "2010-01-01",
      provenance: {
        kind: "authored",
        note: "Synthetic SQLite life-foundation fixture.",
      },
      initialProfile: {
        name: "Synthetic Mutual Aid Lab",
        classification: "custom:mutual-aid-lab",
        locationJurisdictionId: jurisdictionId,
      },
    });
    const organizationId = world.history.organizations.at(-1)?.id;
    if (!organizationId) throw new Error("Missing SQLite organization.");
    world = createWorkRelationship(world, {
      stableKey: "sqlite:work:repair-coordinator",
      personId,
      organizationId,
      startedAt: "2020-01-01",
      kind: "volunteer:repair-coordination",
      compensation: "unpaid",
      authority: "shared",
      dependency: "independent",
      economicRisk: "shared",
      provenance: {
        kind: "authored",
        note: "Synthetic SQLite life-foundation fixture.",
      },
      initialRole: {
        title: "Repair coordinator",
        occupationClassification: "custom:repair-coordination",
        locationJurisdictionId: jurisdictionId,
        timeDemand: {
          expectedWeekly: { minimumHours: 4, maximumHours: 8 },
          attention: "moderate",
          concurrency: "partly-concurrent",
          scheduleRigidity: "flexible",
          interruptibility: "interruptible",
          locationJurisdictionId: jurisdictionId,
        },
      },
    });

    repository.save(world);
    const restored = repository.load(world.id);
    expect(restored).toStrictEqual(world);
    expect(
      restored?.history.workRelationships.find(
        (relationship) =>
          relationship.stableKey === "sqlite:work:repair-coordinator",
      ),
    ).toMatchObject({
      organizationId,
      compensation: "unpaid",
    });
  });
});

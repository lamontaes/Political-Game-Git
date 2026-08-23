import { afterEach, describe, expect, it } from "vitest";

import {
  SYNTHETIC_POLICY_IDS,
  advanceDemoWorld,
  createFormationContext,
  createDemoWorld,
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
});

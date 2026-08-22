import { afterEach, describe, expect, it } from "vitest";

import {
  advanceDemoWorld,
  createDemoWorld,
  materializePerson,
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
    const initial = createDemoWorld("sqlite-persistence");
    const personId = initial.personOrder[0] as EntityId;
    const detailed = materializePerson(initial, personId);
    const firstSave = repository.save(detailed);

    expect(repository.load(detailed.id)).toStrictEqual(detailed);
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

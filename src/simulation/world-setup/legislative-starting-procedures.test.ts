import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { LEGISLATIVE_STARTING_PROCEDURES_VERSION } from "../legislative-starting-procedures";
import { deserializeWorld, serializeWorld } from "../serialization";
import { assertWorldIntegrity } from "../world";
import {
  ensureWorldStartingConditions,
  legislativeStartingProceduresCondition,
} from "./conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "./types";

const newWorld = () =>
  createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "legislative-condition-save-test",
  }).world;

describe("saved legislative starting procedures", () => {
  it("writes one complete condition at Begin and reuses it after reload", () => {
    const world = ensureWorldStartingConditions(newWorld(), {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    });
    const record = legislativeStartingProceduresCondition(world);
    expect(record).not.toBeNull();
    expect(record!.contractVersion).toBe(
      LEGISLATIVE_STARTING_PROCEDURES_VERSION,
    );
    expect(Object.keys(record!.procedures)).toHaveLength(50);
    expect(record!.sequence).toBeGreaterThan(0);
    expect(record!.id).toMatch(/^world-condition_/);
    expect(record!.provenanceClass).toBe("simulated-condition");

    const saved = serializeWorld(world);
    const reloaded = deserializeWorld(saved);
    expect(legislativeStartingProceduresCondition(reloaded)).toEqual(record);
    expect(serializeWorld(reloaded)).toBe(saved);
    expect(
      ensureWorldStartingConditions(reloaded, {
        openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      }),
    ).toBe(reloaded);
  });

  // Legacy-opening and prior-save retrofit checks removed. owner decision 2026-09-26: old saves need not be compatible yet.
  it("rejects incomplete coverage in a new opening", () => {
    const current = ensureWorldStartingConditions(newWorld(), {
      openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
    });
    const conditions = [...current.history.worldConditions!];
    const index = conditions.findIndex(
      (record) => record.kind === "legislative-starting-procedures",
    );
    const record = conditions[index]!;
    if (record.kind !== "legislative-starting-procedures") {
      throw new Error("Test setup lacks the legislative condition.");
    }
    const procedures = Object.fromEntries(
      Object.entries(record.procedures).filter(([key]) => key !== "US-KY"),
    );
    conditions[index] = { ...record, procedures };
    expect(() =>
      assertWorldIntegrity({
        ...current,
        history: { ...current.history, worldConditions: conditions },
      }),
    ).toThrow("cover 50 states");
  });
});

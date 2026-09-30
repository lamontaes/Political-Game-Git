import { describe, expect, it } from "vitest";
import type { EntityId, World } from "../types";
import {
  CANNABIS_TAX_PER_RESIDENT_RANGE,
  cannabisTaxPerResident,
} from "./cannabis-sales-tax";

const state = "jurisdiction_state_a" as EntityId;
const world = { id: "world_sizing" as EntityId, seed: "cannabis-sizing" };
describe("stable cannabis world/state fiscal sizes", () => {
  it("stays inside the researched spread with more values near its middle", () => {
    const [low, high] = CANNABIS_TAX_PER_RESIDENT_RANGE;
    let middle = 0;
    let ends = 0;
    for (let index = 0; index < 1000; index += 1) {
      const value = cannabisTaxPerResident(
        { ...world, seed: `${world.seed}:${index}` },
        state,
      );
      expect(value).toBeGreaterThanOrEqual(low);
      expect(value).toBeLessThanOrEqual(high);
      if (value >= low + (high - low) / 4 && value <= high - (high - low) / 4)
        middle += 1;
      else ends += 1;
    }
    expect(middle).toBeGreaterThan(ends);
  });
  it("retains its amount across replay and persistence but varies by world and state", () => {
    const value = cannabisTaxPerResident(world, state);
    expect(cannabisTaxPerResident(world, state)).toBe(value);
    expect(
      cannabisTaxPerResident(JSON.parse(JSON.stringify(world)), state),
    ).toBe(value);
    expect(
      cannabisTaxPerResident({ ...world, seed: "another-world" }, state),
    ).not.toBe(value);
    expect(
      cannabisTaxPerResident(world, "jurisdiction_state_b" as EntityId),
    ).not.toBe(value);
  });
  it("keeps older partial worlds stable by world ID without a universal fixed size", () => {
    const old = { id: world.id } as Pick<World, "id" | "seed">;
    const value = cannabisTaxPerResident(old, state);
    expect(cannabisTaxPerResident(JSON.parse(JSON.stringify(old)), state)).toBe(
      value,
    );
    expect(
      cannabisTaxPerResident(
        { ...old, id: "older_other_world" as EntityId },
        state,
      ),
    ).not.toBe(value);
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateNormalYearMovement } from "./validate-normal-year-movement";

const packet = JSON.parse(
  readFileSync(
    "data/research/normal-year-movement/movement-evidence.json",
    "utf8",
  ),
);

function copy() {
  return structuredClone(packet);
}

describe("Research 2 normal-year movement packet", () => {
  it("has six internally consistent, cited metrics", () => {
    expect(validateNormalYearMovement(packet)).toEqual([]);
  });

  it("catches a wrong movement even when the displayed range is changed with it", () => {
    const changed = copy();
    changed.metrics[0].movements[0].change = -2;
    changed.metrics[0].observedRange.min = -2;
    expect(validateNormalYearMovement(changed)).toContain(
      "unemployment movement 2016 to 2017 has wrong change",
    );
  });

  it("keeps price growth distinct from a change in the reported growth rate", () => {
    const changed = copy();
    changed.metrics[1].movementMode = "level_difference";
    expect(validateNormalYearMovement(changed)).toContain(
      "prices must use reported_growth_rate",
    );
  });

  it("rejects a numeric replacement for an unknown jurisdiction value", () => {
    const changed = copy();
    changed.unknownContract.value = 0;
    expect(validateNormalYearMovement(changed)).toContain(
      "unknownContract must preserve UNKNOWN with a null value",
    );
  });
});

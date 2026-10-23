import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { createLifeCore } from "./life";
import { representativeWeights } from "./representative-sample";
import { generatedOpening } from "./tooling/generated-world";
import { countedRecords } from "./tooling/counted-records";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "core2-representative-sample");

describe(`the full people sample the town in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("keeps one full household per age-and-pay group, each person weighted for the town's share", () => {
    const input = generatedOpening(place, {
      twoLevel: true,
      settings: { population: 1500 },
    });
    const weights = JSON.parse(
      input.placeMetadata!.representativeWeights!,
    ) as Record<string, number>;
    const strata = JSON.parse(input.placeMetadata!.representativeStrata!) as {
      key: string;
      households: number;
      people: number;
    }[];
    expect(strata.length).toBeGreaterThanOrEqual(4);
    const full = new Set(input.people.map((row) => row.id));
    // Every sampled person is a full person.
    for (const id of Object.keys(weights)) expect(full.has(id)).toBe(true);
    // The weights add up to the people the groups stand for.
    const sum = Object.values(weights).reduce((n, w) => n + w, 0);
    const represented = strata.reduce((n, row) => n + row.people, 0);
    expect(Math.abs(sum - represented)).toBeLessThan(1e-6);
    // Those people are no longer in the counts.
    const core = createLifeCore(input);
    const counted = [...countedRecords(core).values()].flatMap((row) =>
      row.people.map((person) => person.id),
    );
    for (const id of counted) expect(weights[id]).toBeUndefined();
    expect(representativeWeights(core)).toEqual(weights);
  }, 300_000);
});

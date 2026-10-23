import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { generatedOpening } from "./tooling/generated-world";
import { createLifeCore } from "./life";
import { fillInPerson } from "./state";
import { countedRecords } from "./tooling/counted-records";

// St. Francis, South Dakota, pinned: a filled-in household's past is built
// from the world's seed, the same on every fill-in.
const seed = "7359ad8c4d0c8cc9aaa27b59839b6cee";

describe(`fill-in past is the same every time (seed ${seed})`, () => {
  it("builds the same past on a second fill-in", () => {
    const place = drawPlace(seed, "core2-residents");
    const two = generatedOpening(place, { twoLevel: true });
    const core = createLifeCore(two);
    // One model, two tiers: counted people hold no past; fill-in builds it.
    const record = [...countedRecords(core).values()].find(
      (row) => row.people.length > 1,
    )!;
    expect(record.people.every((row) => !row.pastFacts?.length)).toBe(true);
    // The record reads the counts live: once filled in, its people are full people.
    const ids = record.people.map((row) => row.id);
    fillInPerson(core, ids[0]!);
    expect(record.people).toHaveLength(0);
    for (const id of ids)
      expect(core.people.get(id)!.pastFacts?.length).toBeGreaterThan(0);
    // And the same person comes back on a second fill-in in another world
    // built from the same opening.
    const again = createLifeCore(two);
    fillInPerson(again, ids[0]!);
    const person = (c: typeof core, id: string) => {
      const p = c.people.get(id)!;
      return JSON.stringify({
        ...p,
        familyIds: [...p.familyIds],
        knownIds: [...p.knownIds],
        goals: undefined,
        drives: undefined,
        actsByKind: undefined,
      });
    };
    for (const id of ids) expect(person(again, id)).toBe(person(core, id));
  }, 600_000);
});

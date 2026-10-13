import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { generatedOpening } from "./tooling/generated-world";
import { createLifeCore } from "./life";
import { residentsRuntime } from "./modules/residents";
import { fillInPerson } from "./state";

// Regression: St. Francis, South Dakota. A filled-in person's school and work
// peer groups were built from the household alone, so their past gained
// acquaintances the opening never gave them. The seed is pinned on purpose.
const seed = "7359ad8c4d0c8cc9aaa27b59839b6cee";

describe(`fill-in past matches the opening (seed ${seed})`, () => {
  it("rebuilds the same peer groups the opening built", () => {
    const place = drawPlace(seed, "core2-residents");
    const full = generatedOpening(place);
    const two = generatedOpening(place, { twoLevel: true });
    const core = createLifeCore(two);
    const fullById = new Map(full.people.map((row) => [row.id, row]));
    const record = [...residentsRuntime(core)!.households.values()].find(
      (row) =>
        row.people.some((person) => fullById.get(person.id)?.pastFacts?.length),
    )!;
    fillInPerson(core, record.people[0]!.id);
    const past = (facts: readonly { id: string }[] | undefined) =>
      JSON.stringify(
        (facts ?? []).filter(
          (fact) => !fact.id.startsWith("p8-opening-customer-builder"),
        ),
      );
    for (const row of record.people)
      expect(past(core.people.get(row.id)!.pastFacts)).toBe(
        past(fullById.get(row.id)!.pastFacts),
      );
  }, 600_000);
});

/**
 * A same-named town's row in the creator's list names its county as its own
 * part, apart from the count, and the count sits with the town's name.
 */
import { expect, it } from "vitest";
import { creatorStates, creatorTowns } from "./creator";
import controls from "./data/controls.json" with { type: "json" };
import { townRowParts } from "./ui/town-row.mjs";

const format = (n: number) => new Intl.NumberFormat("en-US").format(n);

it("gives each same-named town its county as its own line, never inside the count", () => {
  const states = creatorStates() as { key: string; name: string }[];
  const state = states.find((row) =>
    creatorTowns(row.key, "").some((town) => "county" in town),
  );
  expect(state, "some state repeats a town name").toBeDefined();
  const towns = creatorTowns(state!.key, "");
  const repeated = towns.filter(
    (town) => "county" in town,
  ) as ((typeof towns)[number] & {
    county: string;
  })[];
  console.log(
    `${state!.name}: ${repeated.length} same-named towns, first ${repeated[0]!.name}`,
  );
  for (const town of repeated) {
    const parts = townRowParts(town, controls.creator, format);
    expect(parts.county).toBe(`in ${town.county}`);
    expect(parts.count).not.toContain(town.county);
    expect(parts.count).toContain(format(town.population));
    expect(parts.name).toBe(town.name);
  }
  // A town no other shares a name with has no county line.
  const alone = towns.find((town) => !("county" in town))!;
  expect(townRowParts(alone, controls.creator, format).county).toBeNull();
});

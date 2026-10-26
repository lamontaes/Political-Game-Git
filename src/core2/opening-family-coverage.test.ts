import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { generatedOpening } from "./tooling/generated-world";

// P10 found only 6,481 of 10,001 residents with any recorded family and
// 1.5 links per person. A generated opening now records family for nearly
// everyone, and every link is mutual.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "opening-family-coverage");

it(`nearly every resident has recorded family, each link mutual, in ${place.name}, seed ${seed}`, () => {
  const input = generatedOpening(place, { twoLevel: false });
  const byId = new Map(input.people.map((row) => [row.id, row]));
  let withFamily = 0;
  let links = 0;
  for (const person of input.people) {
    if (person.familyIds.length) withFamily += 1;
    links += person.familyIds.length;
    for (const id of person.familyIds) {
      const other = byId.get(id);
      expect(other, `${person.id} names ${id}`).toBeDefined();
      expect(other!.familyIds, `${id} names ${person.id} back`).toContain(
        person.id,
      );
    }
  }
  const share = withFamily / input.people.length;
  const perPerson = links / input.people.length;
  console.log(
    `FAMILY ${place.name} ${seed} people ${input.people.length} with family ${share.toFixed(3)} links ${perPerson.toFixed(2)}`,
  );
  expect(share).toBeGreaterThan(0.95);
  expect(perPerson).toBeGreaterThan(2.5);
}, 600_000);

/**
 * One government is one place (CTO, Nov 28: Lexington-Fayette had two). An
 * authored place that carries a Census place code (`sourceGeoid`) is the one
 * place for that code: the Gazetteer's own row for the same code builds no
 * second place with a jurisdiction of its own. A caller holding the code is
 * handed the authored place or nothing (a draw passes it over by name), never
 * a second place the map cannot hold.
 */
import { expect, it } from "vitest";
import authoredPlaces from "../../../data/research/authored-life-places.json";
import localities from "../../../src/core2/data/places/localities.json";
import { corePlaceByKey } from "../../../src/core2/place-lookup";
import { realLocalities } from "../../../src/core2/places";
import { placeRow } from "../../../src/core2/place-map";

const held = authoredPlaces.filter(
  (row): row is typeof row & { sourceGeoid: string } =>
    "sourceGeoid" in row && typeof row.sourceGeoid === "string",
);

it("the sweep: every authored place with a Census code, and its Gazetteer twin", () => {
  const twins = held.filter((row) =>
    (localities.rows as string[][]).some((g) => g[0] === row.sourceGeoid),
  );
  process.stdout.write(
    `AUTHORED WITH A CODE ${held.length}; WITH A GAZETTEER TWIN ${twins.length}: ${twins.map((r) => `${r.key}=${r.sourceGeoid}`).join(", ")}\n`,
  );
  expect(held.length, "an authored place with a code").toBeGreaterThan(0);
});

for (const row of held) {
  it(`${row.key} (${row.sourceGeoid}): one place, the authored one`, () => {
    const byCode = corePlaceByKey(row.sourceGeoid);
    const authored = corePlaceByKey(row.key)!;
    expect(authored, `${row.key} is a recorded place`).toBeTruthy();
    // Handed the authored place or nothing, never a second place.
    if (byCode)
      expect(byCode.context.jurisdiction.id).toBe(
        authored.context.jurisdiction.id,
      );
    expect(
      realLocalities().filter((place) => place.sourceGeoid === row.sourceGeoid),
      `${row.sourceGeoid} is held by one place`,
    ).toHaveLength(1);
    expect(
      placeRow(row.key),
      `${row.key} is a row of the place map`,
    ).toBeTruthy();
  });
}

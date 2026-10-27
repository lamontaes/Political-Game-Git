import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { allOfficials } from "./modules/officials";
import { coreAPI } from "./state";

// Officials who serve together know each other: every serving official, a
// state legislator or cabinet secretary as much as a member of Congress, has
// at least one tie in the world's relationships.
const seed = process.env.OFFICIAL_TIES_SEED ?? randomBytes(8).toString("hex");

describe(`officials know their colleagues (seed ${seed})`, () => {
  it("leaves no serving official without a tie, in two drawn places", () => {
    const checked: string[] = [];
    for (let i = 0; i < 2; i += 1) {
      const place = drawPlace(`${seed}:${i}`, "official-ties");
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const officials = allOfficials(coreAPI(core)).filter(
        (row) => row.ended === null,
      );
      expect(officials.length, `${where}: officials`).toBeGreaterThan(400);
      const alone = officials.filter(
        (row) => (core.relationshipsByPerson.get(row.id)?.size ?? 0) === 0,
      );
      expect(
        alone.map((row) => `${row.officeKind} ${row.id}`).slice(0, 5),
        `${where}: ${alone.length} of ${officials.length} serving officials know no one`,
      ).toEqual([]);
      // A legislature's members share a chamber: some state legislator has a tie.
      expect(
        officials.some(
          (row) =>
            row.bodyKind === "legislature" &&
            (core.relationshipsByPerson.get(row.id)?.size ?? 0) > 0,
        ),
        `${where}: a state legislator with a tie`,
      ).toBe(true);
      checked.push(where);
    }
    expect(checked.length).toBe(2);
  }, 900_000);
});

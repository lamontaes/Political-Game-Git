import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { allOfficials } from "./modules/officials";
import { coreAPI, personOrFillIn } from "./state";

// Officials who serve together know each other: every serving official who is
// a person, a state legislator in the player's state or cabinet secretary as
// much as a member of Congress, has at least one tie in the world's
// relationships. Another state's legislator is a recorded husk until something
// opens them; opening one builds the same person every time.
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
      const serving = allOfficials(coreAPI(core)).filter(
        (row) => row.ended === null,
      );
      const officials = serving.filter((row) => !row.husk);
      const husks = serving.filter((row) => row.husk);
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
      // Opening a husk builds the person it was recorded as, once.
      for (const row of husks.slice(0, 3)) {
        expect(core.people.has(row.id), `${where}: ${row.id} is a husk`).toBe(
          false,
        );
        const built = personOrFillIn(core, row.id);
        expect(built?.id, where).toBe(row.id);
        expect(built?.givenName, where).toBe(row.husk!.identity.givenName);
        expect(core.husks.has(row.id), where).toBe(false);
        expect(personOrFillIn(core, row.id), where).toBe(built);
      }
      checked.push(where);
    }
    expect(checked.length).toBe(2);
  }, 900_000);
});

import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "./game-start";
import { allOfficials } from "./modules/officials";
import { noSittingTie } from "./sitting-closeness";
import { coreAPI, personOrFillIn } from "./state";
import type { PersonId } from "./types";

// Officials who serve together know each other: every serving official who is
// a person, a state legislator in the player's state or cabinet secretary as
// much as a member of Congress, knows someone, by a tie in the world's
// relationships or by the sittings they have shared with a colleague
// (sitting-closeness.ts). Another state's legislator is a recorded husk until
// something opens them; opening one builds the same person every time.
//
// The premise before Nov 15 was that every serving official has a tie on day
// one, which a flat tie to each chamber member's party leader guaranteed. That
// tie is gone (members know each other from the sittings they share), so two
// kinds of official may know no one yet, and only these two: a member sworn
// in before their body's first sitting (a House freshman sworn on January 3
// whose first floor week is in February), and one whose colleagues known
// through the body are all husks not yet opened (D.C.'s delegate, whose
// nearest House colleagues are other states' members). Any other official
// with no one fails the test.
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
        (row) =>
          (core.relationshipsByPerson.get(row.id)?.size ?? 0) === 0 &&
          noSittingTie(core, row.id as PersonId) !== null,
      );
      const why = new Map(
        alone.map((row) => [row.id, noSittingTie(core, row.id as PersonId)]),
      );
      process.stdout.write(
        `OFFICIAL TIES ${where}: ${alone.length} of ${officials.length} know no one yet: ${alone
          .map((row) => `${row.id} (${why.get(row.id)})`)
          .join(", ")}\n`,
      );
      // Only the two named kinds: anything else is a new way to know no one.
      const unexplained = alone.filter(
        (row) =>
          why.get(row.id) !== "no-sitting-yet" &&
          why.get(row.id) !== "known-colleagues-not-full",
      );
      expect(
        unexplained
          .map((row) => `${row.officeKind} ${row.id} ${why.get(row.id)}`)
          .slice(0, 5),
        `${where}: ${unexplained.length} of ${officials.length} serving officials know no one, for no named reason`,
      ).toEqual([]);
      // A legislature's members share a chamber: some state legislator knows
      // a colleague from it.
      expect(
        officials.some(
          (row) =>
            row.bodyKind === "legislature" &&
            noSittingTie(core, row.id as PersonId) === null,
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

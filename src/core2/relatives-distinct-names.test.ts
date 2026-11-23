/**
 * Two relatives never share a full name (owner, Nov 16: the player's partner
 * and sister were both "Ashley Lucas"). In opening worlds at drawn places
 * from all 56; place and seed printed (RELATIVE_NAMES_SEED fixes the seed).
 * Each person, their household and their relatives are one group, and no full
 * name appears twice in it. The player's own chosen name is checked too.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { drawPlace } from "../../scripts/core2-year/place";

const seed = process.env.RELATIVE_NAMES_SEED || randomBytes(8).toString("hex");
const DRAWS = 4;
// A town big enough that old names repeat in a family (a few hundred people).
const MINIMUM_PEOPLE = 400;

describe(`relatives never share a full name (seed ${seed})`, () => {
  it("no group of a person, household and relatives repeats a full name", () => {
    const report: string[] = [];
    for (let at = 0; at < DRAWS; at += 1) {
      const place = drawPlace(at ? `${seed}:${at}` : seed, "relative-names");
      const opening = buildPopulation({
        seed: place.seed,
        startedAt: "2021-01-01",
        placeKey: place.key,
        minimumPeople: MINIMUM_PEOPLE,
      });
      const byId = new Map(opening.people.map((row) => [row.id, row]));
      const households = new Map(
        opening.households.map((row) => [row.id, row]),
      );
      let groups = 0;
      for (const person of opening.people) {
        const ids = new Set([
          person.id,
          ...person.familyIds,
          ...(households.get(person.householdId)?.memberIds ?? []),
        ]);
        const names = new Map<string, string>();
        for (const id of ids) {
          const row = byId.get(id);
          if (!row?.alive && row?.alive !== undefined) continue;
          if (!row) continue;
          const name = `${row.givenName} ${row.familyName}`;
          expect(
            names.has(name),
            `${place.name} (${place.key}), seed ${place.seed}: ${name} is both ${names.get(name)} and ${id} among ${person.id}'s relatives`,
          ).toBe(false);
          names.set(name, id);
        }
        groups += 1;
      }
      report.push(
        `${place.name} (${place.key}) seed ${place.seed}: ${groups} groups`,
      );
    }
    console.log(report.join("\n"));
  }, 300_000);
});

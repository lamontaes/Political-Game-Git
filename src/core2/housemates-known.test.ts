/**
 * People who live together know each other's names (pool item
 * people-housemates-named-to-each-other): after the opening's first day every
 * pair of full housemates is kin on record or known by name, so a scene or the
 * journal can name them. Stem, North Carolina (seed hh-a, draw hh) is the
 * item's measured place, with a place drawn from all 56.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`every pair of full housemates (not husks, who live a life elsewhere) is kin or known by name (seed ${seed})`, () => {
  setBookkeeping(false);
  const draws = [drawPlace("hh-a", "hh"), drawPlace(seed, "housemates-known")];
  for (const place of draws) {
    const where = `${place.name} (${place.key}), place seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    let pairs = 0;
    const unnamed: string[] = [];
    for (const household of core.households.values()) {
      const members = household.memberIds
        .map((id) => core.people.get(id))
        .filter((p) => p?.alive && p.tier !== "husk");
      for (let i = 0; i < members.length; i += 1)
        for (let j = i + 1; j < members.length; j += 1) {
          const a = members[i]!;
          const b = members[j]!;
          pairs += 1;
          const kin = a.familyIds.has(b.id) || b.familyIds.has(a.id);
          const known = a.knownIds.has(b.id) || b.knownIds.has(a.id);
          if (!kin && !known)
            unnamed.push(`${a.id} and ${b.id} (${household.id})`);
        }
    }
    expect(pairs, `${where}: no housemate pairs`).toBeGreaterThan(0);
    expect(
      unnamed,
      `${where}: ${unnamed.length} of ${pairs} housemate pairs neither kin nor known`,
    ).toEqual([]);
  }
}, 600_000);

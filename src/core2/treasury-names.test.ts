import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";

// A government's treasury is named as people say the government, never as the
// Census listing writes it: a county commissioner's card read "Commissioner,
// COUNTY OF PASSAIC treasury" (Playtester P2, Nov 13, Hewitt, New Jersey).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

it(`no treasury is named in the listing's capitals, seed ${seed}`, () => {
  setBookkeeping(false);
  for (let draw = 0; draw < 2; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "treasury-names");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const treasuries = [...core.organizations.values()].filter(
      (org) => org.kind === "government-treasury",
    );
    expect(treasuries.length, where).toBeGreaterThan(0);
    for (const org of treasuries)
      expect(org.name, `${where}: ${org.id}`).not.toMatch(
        /\b(COUNTY|CITY|TOWN|TOWNSHIP|VILLAGE|BOROUGH|PARISH) OF\b/,
      );
  }
});

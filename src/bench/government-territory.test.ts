/**
 * A territory town's Government screen shows the President and Vice President
 * marked as not chosen by this place's voters; a state town's are marked as
 * chosen (owner ruling, Oct 19). Places are drawn from all 56; the territory
 * case is the first draw whose voters do not choose the President.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { choosesPresident } from "../core2/electorate-places";
import { gameStartDate } from "../core2/game-start";
import { governmentView } from "./government";
import { buildBenchWorld } from "./world";

const base = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

function drawWhere(chooses: boolean) {
  for (let i = 0; i < 2000; i += 1) {
    const place = drawPlace(
      createHash("sha256").update(`${base}:${chooses}:${i}`).digest("hex"),
      "bench-government-president",
    );
    if (choosesPresident(place.state) === chooses) return place;
  }
  throw new Error("No such place drawn");
}

for (const chooses of [false, true])
  it(`marks the President ${chooses ? "chosen" : "not chosen"} by a ${chooses ? "state" : "territory"} town's voters`, () => {
    const place = drawWhere(chooses);
    const where = `${place.name} (${place.key}), ${place.state}, seed ${place.seed}`;
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const view = governmentView(core, core.playerId!);
    const heads = view.keyPeople.filter(
      (row) =>
        row.reasons.includes("president") ||
        row.reasons.includes("vice-president"),
    );
    expect(heads.length, where).toBeGreaterThan(0);
    for (const row of heads)
      expect(row.chosenByHere, `${where}: ${row.personId}`).toBe(chooses);
  }, 300_000);

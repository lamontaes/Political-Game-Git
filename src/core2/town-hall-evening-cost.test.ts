// @vitest-environment node
/**
 * Coming to a town hall weighs what the evening costs a resident against how
 * strongly they feel (pool item meetings-town-hall-evening-cost): in a played
 * world in a place drawn from all 56, not every adult with a view is driven
 * enough to come, so a town smaller than the room no longer sends everyone.
 * The share that would come is printed beside the researched attendance of
 * local public meetings, as a number to read, never a pass line. Set
 * GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { townAdults, townHallDrives } from "./modules/meetings";
import { coreAPI } from "./state";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

for (const n of [1, 2]) {
  it(`not every adult in the town comes to a town hall (${replay}, draw ${n})`, () => {
    const draw = drawPlace(replay, `town-hall-cost:${n}`);
    const where = `${draw.name} (${draw.key}), place seed ${draw.seed}`;
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const adults = townAdults(api);
    expect(adults.length, `${where}: no adults`).toBeGreaterThan(1);
    const host = adults[0]!.id;
    const comes = townHallDrives(api, host);
    process.stdout.write(
      `town-hall-evening-cost: ${where}: ${comes.length} of ${adults.length - 1} adults driven enough to come (${Math.round((100 * comes.length) / (adults.length - 1))}%); researched: a minority of adults attend local public meetings (Einstein, Glick and Palmer 2019; ANES 6 to 10% a year)\\n`,
    );
    expect(comes.length, `${where}: every adult comes`).toBeLessThan(
      adults.length - 1,
    );
    for (const row of comes) expect(row.drive, where).toBeGreaterThan(0);
  }, 300_000);
}

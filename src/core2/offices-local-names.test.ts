/**
 * A local government is named in ordinary capitals ("Wallace County", "City
 * of Sharon Springs"), never as the Census listing shouts it. Played world in
 * a place drawn from all 56; the place and seed are named in every failure
 * message. Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { governmentView } from "../bench/government";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("names every local government and body in ordinary capitals", () => {
  setBookkeeping(false);
  try {
    for (let attempt = 0; attempt < 6; attempt++) {
      const draw = drawPlace(seed, `office-names-${attempt}`);
      const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const where = `${draw.key} [${draw.state}], seed ${draw.seed}`;
      const local = governmentView(
        core,
        core.playerId ?? [...core.people.keys()][0]!,
      ).seats.filter((s) => ["city", "county", "township"].includes(s.level));
      // A territory may seat no local government: draw again.
      if (!local.length) continue;
      for (const seat of local) {
        expect(seat.government, where).toBeTruthy();
        expect(seat.government, `${where}: ${seat.government}`).not.toBe(
          seat.government.toUpperCase(),
        );
      }
      return;
    }
    throw new Error(
      `no place with a local government in 6 draws (seed ${seed})`,
    );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);

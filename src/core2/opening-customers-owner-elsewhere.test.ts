/**
 * A public paying owner seated in another place (a municipio whose departments
 * sit in a locality) is admitted to the opening's custodial purchases only
 * with a recorded owner-to-place coverage; a group without one stays unbound.
 * Before, the opening built the appropriation anyway and the finance check
 * threw "Actual customer public owner coverage record is missing" on the first
 * settlement. The place is the one the player-money-year draw met it in; the
 * place and seed are in every failure message.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

const SEED = "5e6f7a8b";

it("opens a place whose paying owner sits elsewhere and settles its first month", () => {
  setBookkeeping(false);
  const draw = drawPlace(SEED, "player-money-year:0");
  const where = `${draw.key} (${draw.name}), seed ${draw.seed}`;
  const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  expect(() => {
    for (let day = 0; day < 45; day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
  }, where).not.toThrow();
});

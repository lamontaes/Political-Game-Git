/**
 * A town whose kin moves once fell after the opening day (Valmont, Colorado)
 * opens on the full economy, outside market included, with no fallback route.
 */
import { describe, expect, it } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { OUTSIDE_MARKET_KIND } from "../core2/opening-outside-market";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? "valmont-kin-moves";

describe(`Valmont, Colorado (0880370), seed ${seed}`, () => {
  it("opens on the full economy", () => {
    setBookkeeping(false);
    try {
      const { core } = buildBenchWorld(seed, gameStartDate(), {
        twoLevel: true,
        placeKey: "0880370",
      });
      expect(
        [...core.organizations.values()].some(
          (row) => row.kind === OUTSIDE_MARKET_KIND,
        ),
      ).toBe(true);
    } finally {
      setBookkeeping(true);
    }
  }, 300_000);
});

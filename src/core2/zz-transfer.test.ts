import { it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

it("repro in order", { timeout: 6_000_000 }, () => {
  setBookkeeping(false);
  for (let i = 0; i < 6; i++) {
    const place = drawPlace(`cal-oct21:${i}`, "candidacy-calibration");
    try {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
      advanceCore(core, addDays(makeIsoDate(core.date), 400));
      console.log("TRANSFER ok", i, place.name);
    } catch (e) {
      console.log("TRANSFER fail", i, place.name, (e as Error).stack?.split("\n").slice(0, 16).join(" | "));
    }
  }
});

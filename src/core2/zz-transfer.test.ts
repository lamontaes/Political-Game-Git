import { it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

it("repro", { timeout: 3_000_000 }, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld("1dea15565d7e31d0fc767e3f58ca9b3ad3fb1f79ee62890d8909e5acd71841d2", gameStartDate(), { twoLevel: true, placeKey: "3706760" });
  try {
    advanceCore(core, addDays(makeIsoDate(core.date), 400));
    console.log("TRANSFER no error", core.date);
  } catch (e) {
    console.log("TRANSFER", (e as Error).stack?.split("\n").slice(0, 14).join(" | "));
    throw e;
  }
});

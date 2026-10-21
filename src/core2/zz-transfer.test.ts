import { it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { CANDIDACY_PARAMETERS } from "./modules/candidacy";

it("repro with a lower stay-out pull", { timeout: 3_000_000 }, () => {
  setBookkeeping(false);
  (CANDIDACY_PARAMETERS as Record<string, { value: number }>).candidacyStayOutPull!.value = 2.8;
  try {
    const { core } = buildBenchWorld("1dea15565d7e31d0fc767e3f58ca9b3ad3fb1f79ee62890d8909e5acd71841d2", gameStartDate(), { twoLevel: true, placeKey: "3706760" });
    advanceCore(core, addDays(makeIsoDate(core.date), 400));
    console.log("TRANSFER no error", core.date);
  } catch (e) {
    console.log("TRANSFER fail", (e as Error).stack?.split("\n").slice(0, 18).join(" | "));
  }
});

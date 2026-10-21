import { it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { reachOf } from "./counted-reach";
import { lawChain, openLaws } from "./modules/laws";
import { coreAPI } from "./state";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";

it("older workers by tier", { timeout: 3_000_000 }, () => {
  const { core } = buildBenchWorld("6688ecf3fa1f22a83b3c21db8f19f866d6b21ebfd85a86b0623a3a7221c5c248", gameStartDate(), { twoLevel: true, placeKey: "3513450" });
  openLaws(core);
  const town = lawChain(coreAPI(core)).townPlaceId;
  console.log("OLDER town", town, core.peopleByPlace.get(town as never)?.size);
  const report = (label: string) => {
    for (const [from, below] of [[62, 65], [65, 70], [62, 67]] as const) {
      const all = reachOf(core, town as never, { ageFrom: from, ageBelow: below });
      const wk = reachOf(core, town as never, { ageFrom: from, ageBelow: below, employed: true });
      console.log(`OLDER ${label} ${from}-${below}: full ${wk.full.people}/${all.full.people}, counted ${wk.counted.people}/${all.counted.people}`);
    }
  };
  report("opening");
  advanceCore(core, addDays(makeIsoDate(core.date), 365));
  report("one year");
});

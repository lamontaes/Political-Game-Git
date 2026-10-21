import { it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { ELECTIONS_MODULE_ID, ballot, type ContestRow } from "./modules/elections";
import { CANDIDACY_PARAMETERS } from "./modules/candidacy";

it("sweep", { timeout: 7_200_000 }, () => {
  const value = Number(process.env.STAYOUT);
  (CANDIDACY_PARAMETERS as Record<string, { value: number }>).candidacyStayOutPull!.value = value;
  setBookkeeping(false);
  let contests = 0, uncontested = 0;
  for (let i = 0; i < 6; i++) {
    const place = drawPlace(`sweep1:${i}`, "candidacy-calibration");
    try {
      const { core } = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
      advanceCore(core, addDays(makeIsoDate(core.date), 400));
      const api = coreAPI(core);
      const decided = (api.moduleState(ELECTIONS_MODULE_ID).table("contests").rows() as unknown as ContestRow[]).filter((c) => ["city", "county", "township", "school"].includes(c.level) && c.filingDeadline < core.date);
      let here = 0;
      for (const c of decided) if (ballot(api, c.id).length <= 1) here++;
      contests += decided.length; uncontested += here;
      console.log(`SWEEP ${value} ${place.name} ${place.key}: ${decided.length} contests, ${here} uncontested`);
    } catch (e) { console.log(`SWEEP ${value} ${place.name}: skipped ${String(e).slice(0, 80)}`); }
  }
  console.log(`SWEEP ${value} TOTAL ${uncontested}/${contests}`);
});

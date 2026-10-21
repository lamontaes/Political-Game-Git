import { it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { coreAPI } from "./state";
import { ELECTIONS_MODULE_ID, ballot, type ContestRow } from "./modules/elections";

it("contests", { timeout: 3_000_000 }, () => {
  setBookkeeping(false);
  const { core } = buildBenchWorld("ad4ea1ce91f60308a5ee712c5ffdca24aff032afdbb17ee925edbbf2070838de", gameStartDate(), { twoLevel: true, placeKey: "3924640" });
  advanceCore(core, addDays(makeIsoDate(core.date), 400));
  const api = coreAPI(core);
  const rows = api.moduleState(ELECTIONS_MODULE_ID).table("contests").rows() as unknown as ContestRow[];
  const bySeat = new Map<string, number>();
  for (const c of rows.filter((c) => ["city", "county", "township", "school"].includes(c.level) && c.filingDeadline < core.date)) {
    const b = ballot(api, c.id);
    console.log(`CONTEST ${c.title} | office ${c.officeId} | seat ${c.seatId} | district ${c.district} | ballot ${b.length}: ${b.map((x: any) => x.personId ?? x.id).join(",").slice(0, 120)}`);
  }
});

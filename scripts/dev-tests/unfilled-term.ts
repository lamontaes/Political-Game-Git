/* eslint-disable @typescript-eslint/no-explicit-any */
// Why a term that ended has no successor: tsx unfilled-term.ts <seed> <officeId> [days]
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { ELECTIONS_MODULE_ID } from "../../src/core2/modules/elections";
import { OFFICES_MODULE_ID } from "../../src/core2/modules/offices";
setBookkeeping(false);
const [seed, officeId, days = "365"] = process.argv.slice(2);
const place = drawPlace(seed!, "played-world");
const w = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const api = coreAPI(w.core);
const show = (label: string) => {
  const o = api.moduleState(OFFICES_MODULE_ID);
  console.log(label, w.core.date);
  console.log(" office", JSON.stringify(o.table("offices").get(officeId!)));
  for (const s of (o.table("seats").rows() as any[]).filter((s) => s.officeId === officeId)) console.log(" seat", JSON.stringify(s));
  for (const t of (o.table("terms").rows() as any[]).filter((t) => t.officeId === officeId)) console.log(" term", JSON.stringify(t));
  for (const v of (o.table("vacancies").rows() as any[]).filter((v) => v.officeId === officeId)) console.log(" vacancy", JSON.stringify(v));
  for (const c of (api.moduleState(ELECTIONS_MODULE_ID).table("contests").rows() as any[]).filter((c) => c.officeId === officeId)) console.log(" contest", JSON.stringify(c));
};
show("start " + place.key);
advanceCore(w.core, addDays(makeIsoDate(w.core.date), Number(days)));
show("end");

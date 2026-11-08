// Which homes are left without a value or rent: tsx unpriced.ts <seed> [purpose]
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
setBookkeeping(false);
const [seed = "x", purpose = "played-world", days = "365"] = process.argv.slice(2);
const place = drawPlace(seed, purpose);
const w = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
const api = coreAPI(w.core);
const rows = () => api.moduleState("housing" as never).table("dwellings").rows() as any[];
const bad = (d: any) => (d.tenure === "rent" || d.formerTenure === "rent" ? !Number(d.rentMinor) : !Number(d.valueMinor));
const show = (label: string) => {
  const all = rows(); const u = all.filter(bad);
  const by: Record<string, number> = {};
  for (const d of u) { const k = `${d.tenure}|${d.formerTenure ?? ""}|${d.kind ?? ""}|${d.basis ?? ""}`; by[k] = (by[k] ?? 0) + 1; }
  console.log(label, place.name, "dwellings", all.length, "unpriced", u.length, JSON.stringify(by), "rented ever", all.filter((d) => d.tenure === "rent" || d.formerTenure === "rent").length);
  console.log(JSON.stringify(u.slice(0, 3)));
};
show("opening");
advanceCore(w.core, addDays(makeIsoDate(w.core.date), Number(days)));
show("after");

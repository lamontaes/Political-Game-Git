/** Development probe: the counted renters of the drawn place on day one: rent, income, burden, what feeds income. */
import { advanceCore } from "../life";
import { residentsRuntime, householdIncome } from "../modules/residents";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildPlayedWorld, nextDay } from "./m1-played-year";
const key = process.env.PROBE_PLACE;
const drawn = drawPlace(process.env.GOLDEN_PATH_SEED ?? "probe", "probe");
process.env.GOLDEN_PATH_SEED = drawn.seed;
process.env.GOLDEN_PATH_PLACE_KEY = key ?? drawn.key;
const world = buildPlayedWorld();
const { core } = world;
advanceCore(core, nextDay(world.start));
const rt = residentsRuntime(core)!;
const months = 12;
const rows: { rent: number; income: number; burden: number; n: number; jobless: boolean }[] = [];
for (const h of rt.store.liveHouseholds()) {
  if (h.gone || h.tenure !== "rent") continue;
  const rent = (rt.flows.get(`rent:${h.id}`)?.amountMinor ?? 0) / 100;
  if (rent <= 0) continue;
  const income = householdIncome(rt, h) / 100;
  rows.push({ rent, income, burden: income > 0 ? (rent * months) / income : 99, jobless: !(income > 0) });
}
const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
const over = (t: number) => rows.filter((r) => r.burden > t).length;
const mr = med(rows.map((r) => r.rent));
const near = rows.filter((r) => r.rent > mr * 0.9 && r.rent < mr * 1.1);
console.log("households paying the median rent: n", near.length, "median realized income", Math.round(med(near.map((r) => r.income))), "median burden", Math.round(med(near.map((r) => r.burden)) * 100) / 100);
console.log(JSON.stringify({ place: core.placeMetadata?.placeKey, renters: rows.length, medianRent: med(rows.map((r) => r.rent)), medianIncome: med(rows.map((r) => r.income)), medianBurden: Math.round(med(rows.map((r) => r.burden)) * 100) / 100, over30: over(0.3) / rows.length, over50: over(0.5) / rows.length, zeroIncome: rows.filter((r) => r.income <= 0).length }));

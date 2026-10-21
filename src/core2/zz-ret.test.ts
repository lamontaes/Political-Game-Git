import { randomBytes } from "node:crypto";
import { it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw, lawChain } from "./modules/laws";
import { coreAPI } from "./state";

const seed = process.env.RET_SEED || randomBytes(8).toString("hex");
function share(fra: number | null, place: { key: string; seed: string }) {
  const { core } = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
  const api = coreAPI(core);
  if (fra !== null) {
    const federal = lawChain(api).levels.find((l) => l.level === "federal")!;
    enactLaw(api, { jurisdiction: federal.jurisdiction, level: "federal", series: "social-security-full-retirement-age", value: fra, effectiveDate: addDays(makeIsoDate(core.date), 1), measureId: "RET-1", citation: "test" });
  }
  advanceCore(core, addDays(makeIsoDate(core.date), 400));
  let n = 0, w = 0;
  const ids: string[] = [];
  for (const p of core.people.values()) {
    if (!p.alive || p.tier === "husk") continue;
    const age = ageOnDate(makeIsoDate(p.birthDate), makeIsoDate(core.date));
    if (age < 62 || age > 66) continue;
    n++;
    const job = p.jobId ? core.jobs.get(p.jobId) : undefined;
    if (job && !job.endsAt) { w++; ids.push(job.id); }
  }
  return { n, w, ids };
}
it("retirement age twin", { timeout: 3_000_000 }, () => {
  const place = drawPlace(seed, "ret-age");
  const base = share(null, place);
  const raised = share(69, place);
  console.log(`RET ${place.name} ${place.key} seed ${place.seed}: base ${base.w}/${base.n}, FRA 69 ${raised.w}/${raised.n}`);
});

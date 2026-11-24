/* eslint-disable @typescript-eslint/no-explicit-any */
// Why a contest has one name or none: who was weighed, the strongest pulls and their reasons: tsx why-uncontested.ts <seed> <years> <placeKey>
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { advanceCore } from "../../src/core2/life";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { ELECTIONS_MODULE_ID } from "../../src/core2/modules/elections";
import { CANDIDACY_MODULE_ID } from "../../src/core2/modules/candidacy";
import { VOTING_MODULE_ID } from "../../src/core2/modules/voting";
setBookkeeping(false);
const [seed = "a1", years = "2", key] = process.argv.slice(2);
const place = drawPlace(seed, "elections");
const w = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key ?? place.key,
});
advanceCore(
  w.core,
  addDays(makeIsoDate(w.core.date), Math.round(Number(years) * 365)),
);
const api = coreAPI(w.core);
const contests = api
  .moduleState(ELECTIONS_MODULE_ID)
  .table("contests")
  .rows() as any[];
const results = api.moduleState(VOTING_MODULE_ID).table("results");
const weighed = new Map(
  (api.moduleState(CANDIDACY_MODULE_ID).table("weighed").rows() as any[]).map(
    (r) => [r.contestId, r],
  ),
);
const decisions = api
  .moduleState(CANDIDACY_MODULE_ID)
  .table("decisions")
  .rows() as any[];
const sum = (o: Record<string, number>) =>
  Object.values(o).reduce((a, b) => a + b, 0);
console.log("place", key ?? place.name, "people", w.core.people.size);
for (const c of contests) {
  const r = results.get(`result:${c.id}`) as any;
  if (!r) continue;
  const names = Object.keys(r.totals).length;
  if (names > 1) continue;
  const ws = weighed.get(c.id);
  const ds = decisions.filter((d) => d.contestId === c.id && d.reasons);
  const inc = ds.find((d) => d.reasons.standAgain !== undefined);
  const others = ds
    .filter((d) => d.reasons.standAgain === undefined && !d.run)
    .map((d) => ({ d, pull: sum(d.reasons) }))
    .sort((a, b) => b.pull - a.pull)
    .slice(0, 3);
  console.log(
    `${c.level}/${c.family} ${c.title} names=${names} weighedNamed=${ws?.askedIds.length ?? 0} countedWeighed=${ws?.countedWeighed ?? 0} incumbent=${inc ? (inc.run ? "stands again" : "stood down") : "none"}`,
  );
  for (const { d, pull } of others)
    console.log(
      `   stayed out: pull ${pull.toFixed(2)} ` +
        Object.entries(d.reasons)
          .map(([k, v]) => `${k} ${(v as number).toFixed(2)}`)
          .join(", "),
    );
}

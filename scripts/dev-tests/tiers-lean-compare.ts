/* eslint-disable @typescript-eslint/no-explicit-any */
// Do campaign-views' personLean and the views engine's lean agree, for full and counted people? tsx tiers-lean-compare.ts <seed>
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { personLean } from "../../src/core2/campaign-views";
import { viewOf, countedLean } from "../../src/core2/modules/views";
import { countedResidents } from "../../src/core2/electorate";
import { ageInYears } from "../../src/core2/kernel/dates";
setBookkeeping(false);
const place = drawPlace(process.argv[2] ?? "a1", "lean");
const w = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const api = coreAPI(w.core);
const core: any = w.core;
const pairs: [number, number, string][] = [];
for (const p of core.people.values()) {
  if (!p.alive || ageInYears(p.birthDate, core.date) < 18 || p.tier === "husk")
    continue;
  const v = viewOf(api, p.id);
  if (v) pairs.push([personLean(core.people, p, 0), v.lean / 2, "full"]);
}
for (const c of countedResidents(core)
  .filter((x) => ageInYears(x.birthDate, core.date) >= 18)
  .slice(0, 600))
  pairs.push([
    personLean(core.people, c as any, 0),
    countedLean(api, c as any) / 2,
    "counted",
  ]);
const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
const corr = (xs: number[], ys: number[]) => {
  const mx = mean(xs),
    my = mean(ys);
  let n = 0,
    dx = 0,
    dy = 0;
  for (let i = 0; i < xs.length; i++) {
    n += (xs[i]! - mx) * (ys[i]! - my);
    dx += (xs[i]! - mx) ** 2;
    dy += (ys[i]! - my) ** 2;
  }
  return n / Math.sqrt(dx * dy);
};
for (const kind of ["full", "counted"]) {
  const rows = pairs.filter((r) => r[2] === kind);
  const a = rows.map((r) => r[0]),
    b = rows.map((r) => r[1]);
  console.log(
    place.name,
    kind,
    "n",
    rows.length,
    "corr",
    corr(a, b).toFixed(3),
    "mean personLean",
    mean(a).toFixed(3),
    "mean views lean/2",
    mean(b).toFixed(3),
  );
}

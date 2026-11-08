/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/** Per place, the counted groups' yearly income against their outside living costs, at the opening: npx tsx scripts/money/place-budgets.ts <seed> <placeKey> */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { residentsRuntime } from "../../src/core2/modules/residents";

setBookkeeping(false);
const world = buildBenchWorld(process.argv[2] ?? "money-1", gameStartDate(), {
  twoLevel: true,
  placeKey: process.argv[3] ?? "4763340",
});
const rt: any = residentsRuntime(world.core)!;
const byPlace = new Map<string, Record<string, number>>();
const add = (place: string, key: string, v: number) => {
  const row = byPlace.get(place) ?? {};
  row[key] = (row[key] ?? 0) + v;
  byPlace.set(place, row);
};
for (const flow of rt.flows.values()) {
  const perYear =
    flow.cadence.kind === "days"
      ? (flow.amountMinor * 365) / flow.cadence.every
      : (flow.amountMinor * 12) / flow.cadence.every;
  add(flow.placeId, flow.financeKind, perYear / 100);
}
for (const [place, row] of byPlace) {
  console.log(place);
  for (const [k, v] of Object.entries(row)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8))
    console.log("  ", k.padEnd(40), Math.round(v));
}
const store = rt.store;
const counts = new Map<
  string,
  { homes: number; withCost: number; costDaily: number }
>();
for (const h of store.liveHouseholds()) {
  const c = counts.get(h.placeId) ?? { homes: 0, withCost: 0, costDaily: 0 };
  c.homes += 1;
  let cost = 0;
  for (const m of store.countedMembers(h)) cost += store.living[m] ?? 0;
  if (cost > 0) c.withCost += 1;
  c.costDaily += cost;
  counts.set(h.placeId, c);
}
console.log(
  "counted households by place (homes, with a living cost, yearly cost $):",
);
for (const [place, c] of counts)
  console.log(
    "  ",
    place,
    c.homes,
    c.withCost,
    Math.round((c.costDaily * 365) / 100),
  );

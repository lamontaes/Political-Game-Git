/* eslint-disable @typescript-eslint/no-explicit-any -- development tooling reading untyped record rows */
/** Outside money by owner after N years of a played world: npx tsx scripts/money/outside.ts <seed> [years] [placeKey] */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { drawPlace } from "../core2-year/place";

const seed = process.argv[2] ?? "money-1";
const years = Number(process.argv[3] ?? 2);
const drawn = drawPlace(seed, "speed-year");
const key = process.argv[4] ?? drawn.key;
setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: key,
});
console.log(`${drawn.name} ${key} seed ${seed}`);
for (let y = 1; y <= years; y++) {
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365));
  const t = [...world.core.organizations.values()].filter((o: any) =>
    String(o.id).startsWith("organization:treasury"),
  ) as any[];
  console.log(
    `year ${y}:`,
    t
      .map((o) => `${o.id.slice(22, 40)} ${(o.liquidMinor / 1e8).toFixed(2)}B`)
      .join("; "),
  );
  const om = [...world.core.cashJournal.externalFlowsByOwner.entries()].filter(
    ([k]) => String(k).startsWith("outside-market"),
  ) as any[];
  console.log(
    "  outside-market net",
    om.map(([, v]) => (v.netMinor / 1e8).toFixed(2)).join(" "),
    "B",
  );
}
const rows = [...world.core.cashJournal.externalFlowsByOwner.entries()] as [
  string,
  any,
][];
let total = 0;
for (const [, v] of rows) total += v.netMinor;
console.log(`owners ${rows.length}, sum of nets ${(total / 100).toFixed(0)}`);
for (const [id, v] of rows
  .sort((a, b) => Math.abs(b[1].netMinor) - Math.abs(a[1].netMinor))
  .slice(0, 12))
  console.log(
    id,
    "net",
    (v.netMinor / 100).toExponential(3),
    JSON.stringify(v.incomingMinor).slice(0, 80),
    JSON.stringify(v.outgoingMinor).slice(0, 80),
  );
let cash = 0;
for (const r of world.core.people.values()) cash += r.liquidMinor;
let org = 0;
for (const r of world.core.organizations.values()) org += r.liquidMinor;
console.log(
  "people cash",
  (cash / 100).toExponential(3),
  "org cash",
  (org / 100).toExponential(3),
);
const orgs = [...world.core.organizations.values()]
  .sort((a: any, b: any) => b.liquidMinor - a.liquidMinor)
  .slice(0, 8);
for (const o of orgs as any[])
  console.log(
    o.id,
    o.name ?? "",
    o.sector ?? o.kind ?? "",
    (o.liquidMinor / 100).toExponential(3),
  );
console.log(
  "org count",
  world.core.organizations.size,
  "people",
  world.core.people.size,
);
import { coreAPI } from "../../src/core2/state";
const api = coreAPI(world.core);
const b = api.moduleState("core2-budgets-v1");
for (const r of b.table("budgets").rows() as any[]) {
  if (
    !String(r.governmentId ?? r.id).includes("US-IN") &&
    !String(r.id).includes("US-IN")
  )
    continue;
  const sum = (o: any) =>
    Object.values(o ?? {}).reduce((a: number, v: any) => a + v, 0) as number;
  if (String(r.id).endsWith("2025")) {
    console.log(
      "REV",
      Object.entries(r.revenueMinor)
        .map(([k, v]: any) => `${k}:${(v / 1e11).toFixed(2)}`)
        .join(" "),
    );
    console.log(
      "SPEND",
      Object.entries(r.spendingMinor)
        .map(([k, v]: any) => `${k}:${(v / 1e11).toFixed(2)}`)
        .join(" "),
    );
  }
  console.log(
    r.id,
    "revenue",
    (sum(r.revenueMinor) / 1e11).toFixed(2),
    "B spending",
    (sum(r.spendingMinor) / 1e11).toFixed(2),
    "B",
  );
}

const tm = (b.table("treasuryMonths").rows() as any[])
  .filter(
    (r) =>
      r.governmentId?.includes("US-IN") && String(r.date).startsWith("2026-"),
  )
  .sort((a, c) => String(a.date).localeCompare(String(c.date)));
for (const r of tm) {
  const L = Object.entries(r.lines ?? {}) as [string, any][];
  const sum = (k: string) => L.reduce((a, [, v]) => a + (v[k] ?? 0), 0) / 1e11;
  console.log(
    r.date,
    "outsideRev",
    (r.revenueFromOutsideMinor / 1e11).toFixed(2),
    "aidRecv",
    (r.aidReceivedMinor / 1e11).toFixed(2),
    "aidPaid",
    (r.aidPaidMinor / 1e11).toFixed(2),
    "due",
    sum("dueMinor").toFixed(2),
    "outside",
    sum("outsideMinor").toFixed(2),
    "prov",
    sum("providersMinor").toFixed(2),
    "short",
    sum("shortMinor").toFixed(2),
    "inTown",
    sum("inTownMinor").toFixed(2),
  );
}

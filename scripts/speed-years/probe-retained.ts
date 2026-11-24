/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Memory probe: how much live heap each structure really holds after N years,
 * measured by removing it and collecting (shared objects are counted once,
 * where JSON sizes count them in every table that holds them). Removals are
 * cumulative, in the order printed; the world is not usable afterwards.
 *   node --expose-gc --import tsx scripts/speed-years/probe-retained.ts <seed> <placeKey> <years>
 * The seed is the world seed as given.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { worldRecords } from "../../src/core2/snapshot";

const [seed = "mont1", placeKey = "5046000", years = "2"] =
  process.argv.slice(2);
setBookkeeping(false);
const world = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
const core = world.core as any;
advanceCore(core, addDays(makeIsoDate(core.date), 365 * Number(years)));
const gc = (globalThis as any).gc as () => void;
const heap = () => {
  gc();
  gc();
  return process.memoryUsage().heapUsed / 1048576;
};
let last = heap();
console.log(`year ${years} ${core.date}: live heap ${last.toFixed(0)} MB`);
const out: [string, number][] = [];
const drop = (name: string, f: () => void) => {
  try {
    f();
  } catch (e) {
    console.log(`  (${name} failed: ${(e as Error).message})`);
  }
  const now = heap();
  out.push([name, last - now]);
  console.log(`${(last - now).toFixed(0).padStart(6)} MB  ${name}`);
  last = now;
};
const { parts, modules } = worldRecords(core);
const drives: any = parts["core2-drives-runtime"];
if (drives) {
  let formations = 0;
  for (const d of drives.drives?.values?.() ?? [])
    formations += d.formations.length;
  for (const m of drives.countedByPerson?.values?.() ?? [])
    for (const d of m.values()) formations += d.formations.length;
  console.log(
    `drives: ${drives.drives?.size} held, ${drives.countedByPerson?.size} counted holders, ${formations} formation traces, ${drives.decisions?.length} decisions, ${drives.mayKnow?.size} mayKnow, ${drives.given?.size} given, ${drives.donations?.size} donations`,
  );
  drop("drives: formation traces on each drive", () => {
    for (const d of drives.drives.values()) d.formations.length = 0;
    for (const m of drives.countedByPerson.values())
      for (const d of m.values()) d.formations.length = 0;
  });
  drop("drives: decisions", () => (drives.decisions.length = 0));
  drop("drives: told sets", () => {
    for (const d of drives.drives.values()) d.told.clear();
  });
  drop("drives: countedByPerson", () => drives.countedByPerson.clear());
  drop("drives: mayKnow", () => drives.mayKnow.clear());
  drop("drives: donations", () => drives.donations.clear());
  drop("drives: rest of held drives", () => {
    drives.drives.clear();
    drives.byPerson.clear();
    drives.serving.clear();
  });
}
const knowledgeBy = (test: (key: string) => boolean) => () => {
  for (const known of core.knowledgeByPerson.values())
    for (const key of [...known.keys()]) if (test(key)) known.delete(key);
};
drop(
  "knowledge: event:* experienced",
  knowledgeBy((k) => k.startsWith("event:")),
);
drop(
  "knowledge: promise:*",
  knowledgeBy((k) => k.startsWith("promise:")),
);
drop(
  "knowledge: news:*",
  knowledgeBy((k) => k.startsWith("news:")),
);
drop(
  "knowledge: person:*",
  knowledgeBy((k) => k.startsWith("person:")),
);
drop(
  "knowledge: the rest",
  knowledgeBy(() => true),
);
for (const [id, part] of Object.entries(parts)) {
  if (id === "core2-drives-runtime") continue;
  drop(`part ${id}`, () => {
    if (part instanceof Map) part.clear();
    else if (part && typeof part === "object")
      for (const k of Object.keys(part as object)) {
        const v = (part as any)[k];
        if (v instanceof Map || v instanceof Set) v.clear();
        else if (Array.isArray(v)) v.length = 0;
      }
  });
}
const tables: [string, number][] = [];
for (const [id, store] of modules)
  for (const name of Object.keys(core.modules.get(id)?.state?.tables ?? {}))
    tables.push([`${id}.${name}`, store.table(name).size]);
tables.sort((a, b) => b[1] - a[1]);
for (const [full] of tables.slice(0, 40)) {
  const at = full.lastIndexOf(".");
  const store = modules.get(full.slice(0, at))!;
  const table = store.table(full.slice(at + 1));
  const n = table.size;
  drop(`table ${full} (${n} rows)`, () => {
    for (const row of [...table.rows()]) table.remove((row as any).id);
  });
}
for (const field of Object.keys(core)) {
  const v = core[field];
  if (field === "knowledgeByPerson" || field === "modules") continue;
  if (v instanceof Map || v instanceof Set || Array.isArray(v))
    drop(
      `core.${field} (${v instanceof Map || v instanceof Set ? v.size : v.length})`,
      () => {
        if (Array.isArray(v)) v.length = 0;
        else v.clear();
      },
    );
  else if (v && typeof v === "object")
    drop(`core.${field} (object)`, () => {
      for (const k of Object.keys(v)) {
        const x = v[k];
        if (x instanceof Map || x instanceof Set) x.clear();
        else if (Array.isArray(x)) x.length = 0;
      }
    });
}
console.log(`left: ${last.toFixed(0)} MB`);
console.log("TOP");
for (const [name, mb] of out.sort((a, b) => b[1] - a[1]).slice(0, 30))
  console.log(`${mb.toFixed(0).padStart(6)} MB  ${name}`);

/**
 * Memory probe: estimated JSON bytes per table after N years in the world
 * `speed:year` plays (rows sampled evenly, so a table's size is its row
 * count times its sampled row size).
 *   node --import tsx scripts/speed-years/probe-bytes.ts <seed> <placeKey> <years>
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { worldRecords } from "../../src/core2/snapshot";
import { drawPlace } from "../core2-year/place";
import { isDemoted } from "../../src/core2/counted-groups";
import { coreAPI } from "../../src/core2/state";

const [seed = "mont1", placeKey = "5046000", yearsText = "4"] =
  process.argv.slice(2);
setBookkeeping(false);
const world = buildBenchWorld(
  process.env.RAW_SEED === "1" ? seed : drawPlace(seed, "speed-year").seed,
  gameStartDate(),
  {
    twoLevel: true,
    placeKey,
  },
);
const size = (value: unknown): number => {
  try {
    return JSON.stringify(value, (_k, v) =>
      v instanceof Map
        ? [...v]
        : v instanceof Set
          ? [...v]
          : typeof v === "bigint"
            ? String(v)
            : v,
    ).length;
  } catch {
    return 0;
  }
};
const estimate = (rows: unknown[]): number => {
  if (!rows.length) return 0;
  const step = Math.max(1, Math.floor(rows.length / 300));
  let sum = 0;
  let n = 0;
  for (let i = 0; i < rows.length; i += step) {
    sum += size(rows[i]);
    n += 1;
  }
  return Math.round((sum / n) * rows.length);
};
for (let year = 1; year <= Number(yearsText); year += 1) {
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365));
  if (year !== Number(yearsText)) continue;
  const records = worldRecords(world.core);
  const out: [string, number, number][] = [];
  // Everything else a world keeps: the rest of the core and every engine's runtime part.
  for (const [field, value] of Object.entries(records.core))
    if (!(value instanceof Map) && value !== null && typeof value === "object")
      out.push([`core.${field} (not a map)`, 1, size(value)]);
  for (const [id, part] of Object.entries(records.parts))
    out.push([`part.${id}`, 1, size(part)]);
  for (const [field, value] of Object.entries(records.core))
    if (value instanceof Map)
      out.push([`core.${field}`, value.size, estimate([...value.values()])]);
  for (const [id, store] of records.modules)
    for (const name of Object.keys(
      world.core.modules.get(id)?.state?.tables ?? {},
    )) {
      const rows = store.table(name).rows() as unknown[];
      out.push([`${id}.${name}`, rows.length, estimate(rows)]);
    }
  out.sort((a, b) => b[2] - a[2]);
  const kinds = new Map<string, { n: number; bytes: number }>();
  const shape = (key: string) =>
    key
      .split(":")
      .map((part, i) => (i === 0 || /^[a-z-]+$/.test(part) ? part : "*"))
      .join(":");
  let facts = 0;
  for (const known of world.core.knowledgeByPerson.values())
    for (const [key, fact] of known) {
      facts += 1;
      const k = shape(key);
      const entry = kinds.get(k) ?? { n: 0, bytes: 0 };
      entry.n += 1;
      if (entry.n % 50 === 1) entry.bytes += size(fact) * 50;
      kinds.set(k, entry);
    }
  console.log(`facts: ${facts}`);
  // Facts by key head and by who holds them (full, returned to the counts, dead).
  const tierOf = (id: string) => {
    const p = world.core.people.get(id);
    if (!p) return "gone";
    if (!p.alive) return "dead";
    if (isDemoted(p)) return "demoted";
    return p.tier === "husk" ? "husk" : "full";
  };
  const holder = (id: string) => {
    const t = tierOf(id);
    if (t !== "full") return t;
    const p = world.core.people.get(id)!;
    if (id === world.core.playerId) return "player";
    const job = p.jobId ? world.core.jobs.get(p.jobId) : undefined;
    const org = job
      ? world.core.organizations.get(job.organizationId)
      : undefined;
    if (org && org.kind !== "employer") return `full-${org.kind}`;
    return "full-other";
  };
  const byHolder = new Map<string, [number, number]>();
  for (const [id, known] of world.core.knowledgeByPerson) {
    const k = holder(id);
    const e = byHolder.get(k) ?? [0, 0];
    e[0] += 1;
    e[1] += known.size;
    byHolder.set(k, e);
  }
  for (const [k, [people, n]] of [...byHolder].sort(
    (a, b) => b[1][1] - a[1][1],
  ))
    console.log(
      `  holder ${String(n).padStart(8)} facts ${String(people).padStart(6)} people  ${k}`,
    );
  const byTier = new Map<string, number>();
  for (const [id, known] of world.core.knowledgeByPerson)
    for (const key of known.keys()) {
      const k = `${holder(id)} ${key.split(":")[0]}`;
      byTier.set(k, (byTier.get(k) ?? 0) + 1);
    }
  for (const [k, n] of [...byTier].sort((a, b) => b[1] - a[1]).slice(0, 30))
    console.log(`  held ${String(n).padStart(8)}  ${k}`);
  // Serving officials by office.
  const offices = new Map<string, number>();
  for (const t of coreAPI(world.core)
    .moduleState("core2-offices-v1")
    .table("terms")
    .query("byStatus", ["serving"]) as unknown as {
    officeId: string;
    personId: string | null;
  }[])
    if (t.personId) offices.set(t.officeId, (offices.get(t.officeId) ?? 0) + 1);
  for (const [k, n] of [...offices].sort((a, b) => b[1] - a[1]).slice(0, 25))
    console.log(`  serving ${String(n).padStart(5)}  ${k}`);
  const heads = new Map<string, { n: number; bytes: number }>();
  for (const known of world.core.knowledgeByPerson.values())
    for (const [key, fact] of known) {
      const head = key.split(":")[0]!;
      const entry = heads.get(head) ?? { n: 0, bytes: 0 };
      entry.n += 1;
      if (entry.n % 40 === 1) entry.bytes += (size(fact) + key.length) * 40;
      heads.set(head, entry);
    }
  for (const [k, v] of [...heads]
    .sort((a, b) => b[1].bytes - a[1].bytes)
    .slice(0, 12))
    console.log(
      `  by head ${(v.bytes / 1048576).toFixed(0).padStart(5)} MB ${String(v.n).padStart(8)} facts  ${k}`,
    );
  for (const [k, v] of [...kinds]
    .sort((a, b) => b[1].bytes - a[1].bytes)
    .slice(0, 14))
    console.log(
      `  ${(v.bytes / 1048576).toFixed(0).padStart(5)} MB ${String(v.n).padStart(8)} facts  ${k}`,
    );
  console.log(
    `year ${year} ${world.core.date}; heap ${Math.round(process.memoryUsage().heapUsed / 1048576)} MB`,
  );
  for (const [name, rows, bytes] of out.slice(0, 40))
    console.log(
      `${(bytes / 1048576).toFixed(0).padStart(6)} MB  ${String(rows).padStart(8)} rows  ${name}`,
    );
}

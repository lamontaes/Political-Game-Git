/** Memory probe: the biggest relationship rows and knowledge sets after N years. */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { drawPlace } from "../core2-year/place";

const [seed = "mont1", placeKey = "5046000", yearsText = "6"] =
  process.argv.slice(2);
setBookkeeping(false);
const world = buildBenchWorld(
  drawPlace(seed, "speed-year").seed,
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
for (let year = 1; year <= Number(yearsText); year += 1)
  advanceCore(world.core, addDays(makeIsoDate(world.core.date), 365));
const core = world.core;
const rel = [...core.relationships.values()]
  .map((r) => [size(r), r] as const)
  .sort((a, b) => b[0] - a[0]);
let total = 0;
for (const [s] of rel) total += s;
console.log(
  `relationships ${rel.length} rows, ${(total / 1048576).toFixed(0)} MB; top 10:`,
);
for (const [s, r] of rel.slice(0, 10))
  console.log(
    `  ${(s / 1024).toFixed(0)} KB ${r.id} kind ${r.kind} player=${r.actorId === core.playerId || r.otherId === core.playerId} keys ${Object.keys(r.latestChange ?? {}).join(",")}`,
  );
const sample = rel[0]![1];
console.log(
  "biggest row field sizes:",
  Object.fromEntries(
    Object.entries(sample.latestChange ?? {}).map(([k, v]) => [k, size(v)]),
  ),
);
const know = [...core.knowledgeByPerson]
  .map(([id, m]) => [size(m), id, m.size] as const)
  .sort((a, b) => b[0] - a[0]);
console.log("knowledge top 8:");
for (const [s, id, n] of know.slice(0, 8))
  console.log(
    `  ${(s / 1048576).toFixed(1)} MB ${id} ${n} facts player=${id === core.playerId}`,
  );

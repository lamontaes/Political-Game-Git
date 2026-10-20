/**
 * Where a town year's garbage comes from: the same played year as `run.ts`
 * (`buildBenchWorld`, `advanceCore`, bookkeeping off), under V8's sampling
 * heap profiler with the objects the collector already freed included, so the
 * profile shows what is allocated and thrown away, not only what stays alive.
 * Prints the functions that allocated the most bytes. Development tooling.
 *
 *   node --max-old-space-size=8192 --import tsx scripts/speed-years/alloc-profile.ts
 *     [--seed <s>] [--place <key>] [--days 365] [--top 40] [--out <profile.json>]
 *
 * One process at a time, on a quiet machine; sampling slows the year.
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import inspector from "node:inspector";
import { performance } from "node:perf_hooks";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { drawPlace } from "../core2-year/place";

const args = process.argv.slice(2);
const option = (name: string, fallback: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && args[at + 1] !== undefined ? args[at + 1]! : fallback;
};
const seed = option("seed", randomBytes(8).toString("hex"));
const days = Number(option("days", "365"));
const top = Number(option("top", "40"));
const out = option("out", "");
const drawn = drawPlace(seed, "speed-year");
const placeKey = option("place", drawn.key);

setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey,
});
console.log(`${drawn.name} (key ${placeKey}, seed ${seed}): built`);

const session = new inspector.Session();
session.connect();
const post = <T>(method: string, params?: object) =>
  new Promise<T>((resolve, reject) =>
    session.post(method, params ?? {}, (error, result) =>
      error ? reject(error) : resolve(result as T),
    ),
  );

interface Node {
  callFrame: { functionName: string; url: string; lineNumber: number };
  selfSize: number;
  children: Node[];
}
await post("HeapProfiler.startSampling", {
  samplingInterval: 262144,
  includeObjectsCollectedByMajorGC: true,
  includeObjectsCollectedByMinorGC: true,
});
const started = performance.now();
advanceCore(world.core, addDays(makeIsoDate(world.core.date), days));
const seconds = ((performance.now() - started) / 1000).toFixed(1);
const { profile } = await post<{ profile: { head: Node } }>(
  "HeapProfiler.stopSampling",
);
if (out) writeFileSync(out, JSON.stringify(profile));

const bytes = new Map<string, number>();
let total = 0;
// A native function (sort, Map, push, next) has no file; its bytes belong to
// the nearest caller that has one, so the list names code we can change.
const walk = (node: Node, caller: string) => {
  const frame = node.callFrame;
  const own = frame.url
    ? `${frame.functionName || "(anonymous)"} ${frame.url.replace(/^.*\/src\//, "src/")}:${frame.lineNumber + 1}`
    : "";
  const where = own || `${caller} [via ${frame.functionName || "native"}]`;
  bytes.set(where, (bytes.get(where) ?? 0) + node.selfSize);
  total += node.selfSize;
  for (const child of node.children) walk(child, own || caller);
};
walk(profile.head, "(root)");
console.log(
  `${days} days in ${seconds} s with the sampler on; ${(total / 1e9).toFixed(2)} GB sampled`,
);
for (const [where, size] of [...bytes.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, top))
  console.log(
    `${((size / total) * 100).toFixed(1).padStart(5)}%  ${(size / 1e6).toFixed(0).padStart(6)} MB  ${where}`,
  );

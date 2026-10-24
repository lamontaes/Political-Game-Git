/**
 * Where a town year allocates: the played world of `run.ts` advanced with V8's
 * sampling heap profiler on, counting objects the collector already freed
 * (the churn, not what is left at the end). Prints the top allocation sites by
 * bytes. Development tooling.
 *
 *   node --max-old-space-size=8192 --import tsx scripts/speed-years/alloc-profile.ts [--seed <s>] [--days 365] [--top 30]
 */
import { Session } from "node:inspector/promises";
import { writeFileSync } from "node:fs";
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
const seed = option("seed", "m7b");
const days = Number(option("days", "365"));
const top = Number(option("top", "30"));
const drawn = drawPlace(seed, "speed-year");

setBookkeeping(false);
const world = buildBenchWorld(drawn.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: drawn.key,
});
console.log(`${drawn.name} (key ${drawn.key}, seed ${seed}): built`);

interface HeapNode {
  callFrame: { functionName: string; url: string; lineNumber: number };
  selfSize: number;
  children: HeapNode[];
}
const session = new Session();
session.connect();
await session.post("HeapProfiler.startSampling", {
  samplingInterval: 16384,
  includeObjectsCollectedByMajorGC: true,
  includeObjectsCollectedByMinorGC: true,
});
advanceCore(world.core, addDays(makeIsoDate(world.core.date), days));
const { profile } = (await session.post("HeapProfiler.stopSampling")) as {
  profile: { head: HeapNode };
};
const sites = new Map<string, number>();
let total = 0;
const walk = (node: HeapNode) => {
  const frame = node.callFrame;
  const key = `${frame.functionName || "(anonymous)"} ${frame.url.split("/").slice(-2).join("/")}:${frame.lineNumber + 1}`;
  sites.set(key, (sites.get(key) ?? 0) + node.selfSize);
  total += node.selfSize;
  for (const child of node.children) walk(child);
};
walk(profile.head);
const ranked = [...sites.entries()].sort((a, b) => b[1] - a[1]);
console.log(
  `sampled allocation over ${days} days: ${(total / 1e9).toFixed(2)} GB`,
);
for (const [site, bytes] of ranked.slice(0, top))
  console.log(
    `${(bytes / 1e6).toFixed(0).padStart(7)} MB ${((100 * bytes) / total).toFixed(1).padStart(5)}%  ${site}`,
  );
const out = option("out", "");
if (out) writeFileSync(out, JSON.stringify(ranked.slice(0, 200)));

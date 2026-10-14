/**
 * Years of the bench world through DevMode.advance, one line per year (seconds,
 * heap, log sizes), with a CPU profile of ten mid-year days in the first and
 * last year: the check that every year stays under two minutes, not just the first.
 * Run: node --max-old-space-size=12000 --import tsx scripts/core2-year/years-profile.ts [seed] [years] [profile dir]
 */
import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import inspector from "node:inspector";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";

setBookkeeping(false);
const seed = process.argv[2] ?? "31a4370993ef";
const years = Number(process.argv[3] ?? 3);
const out = process.argv[4] ?? "/tmp";
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
console.log(world.place.displayName, core.people.size);
const session = new inspector.Session();
session.connect();
const post = (m: string, p?: object) =>
  new Promise<{ profile?: unknown }>((r) =>
    session.post(m, p ?? {}, (_e, v) => r((v ?? {}) as { profile?: unknown })),
  );
for (let y = 1; y <= years; y++) {
  const t = performance.now();
  const yearEnd = addDays(makeIsoDate(core.date), 365);
  // Profile ten days in the middle of years one and the last.
  const profileFrom = addDays(makeIsoDate(core.date), 180);
  if (y === 1 || y === years) {
    dev.advance(profileFrom);
    await post("Profiler.enable");
    await post("Profiler.start");
    dev.advance(addDays(profileFrom, 10));
    const { profile } = await post("Profiler.stop");
    writeFileSync(`${out}/year${y}.cpuprofile`, JSON.stringify(profile));
  }
  dev.advance(yearEnd);
  const sizes = {
    log: core.durableLog.size,
    acted: core.logByKind.get("person.acted")?.size ?? 0,
    rel: core.relationships.size,
    events: core.eventIds.size,
    knowledge: [...core.knowledgeByPerson.values()].reduce(
      (n, m) => n + m.size,
      0,
    ),
  };
  console.log(
    `year ${y}: ${((performance.now() - t) / 1000).toFixed(0)} s, heap ${(process.memoryUsage().heapUsed / 1e9).toFixed(2)} GB, people ${core.people.size}`,
    JSON.stringify(sizes),
  );
}

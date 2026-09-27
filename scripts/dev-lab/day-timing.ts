/**
 * Headless Day timing: open one new life with a fixed seed, place and age,
 * then press the Day button N times through the same command the player's
 * Day button sends. Nothing is drawn.
 *
 *   node --import tsx scripts/dev-lab/day-timing.ts \
 *     --place <placeKey> --age 30 --days 180 --seed day-timing
 *   node --import tsx scripts/dev-lab/day-timing.ts --pick 2 --pick-seed x
 *
 * Prints opening time, people count, and total / median / p95 / worst Day.
 * When the clock stops for a scene the player must answer, the first offered
 * option is chosen (not timed) and the Day is pressed again.
 *
 *   --full-check      run the full World check after every Day, as a
 *                     developer can with globalThis.__civicFullWorldCheck
 *   --save            after the last Day, write the life as the browser save
 *                     store does and open it again; print size and times
 *   --profile-days    write a CPU profile of every Day press
 *   --profile-date D  write a CPU profile of the one Day leaving date D
 *   --profile-open F  with --save, write a CPU profile of opening the save
 *   --write-opening F write the opened life to F before the first Day
 *   --from-save F     start from a life written by --write-opening instead
 *                     of opening a new one
 *   --write-save F    with --save, also write the browser record to F
 *   --open-only F     in a fresh process, open the record in F, open the
 *                     week and show the scene; print the times and stop
 */
import { readFileSync, writeFileSync } from "node:fs";
import { Session } from "node:inspector";
import { createOpeningLifeController } from "../../src/presentation/opening-life";
import { explicitNewGameSetup } from "../../src/presentation/new-game-geography";
import { openOrdinaryLife } from "../../src/presentation/ordinary-life";
import { submitTimeCommand } from "../../src/presentation/time-command";
import { DEFAULT_INTERRUPTIONS } from "../../src/presentation/shell-navigation";
import {
  chooseStoryOption,
  projectStoryMoment,
} from "../../src/presentation/life-story";
import {
  createBrowserWorldRecord,
  readStoredRecord,
} from "../../src/presentation/browser-world-repository";
import { createCampaignElectionTransitionRegistry } from "../../src/simulation";
import type { EntityId, World } from "../../src/simulation";
import {
  deserializeWorld,
  serializeWorld,
} from "../../src/simulation/serialization";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
} from "../../src/simulation/life-places";

function arg(name: string, fallback?: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : fallback;
}

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const pick = arg("pick");
if (pick) {
  const random = rng(arg("pick-seed", "day-timing-towns")!);
  const states = lifePlaceStateIdentities();
  for (let i = 0; i < Number(pick); i++) {
    const state = states[Math.floor(random() * states.length)]!;
    const places = searchLifePlaces("", 400, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    });
    const place = places[Math.floor(random() * places.length)];
    if (place) console.log(`${place.key}\t${place.displayName}`);
  }
  process.exit(0);
}

// Present on branches that check only what a Day changed; absent on older heads.
const checkCounts = await import("../../src/simulation/world-integrity-changed")
  .then((module) => module.changedHistoryCheckCounts)
  .catch(() => null);

const placeKey = arg("place")!;
const startAge = Number(arg("age", "30"));
const days = Number(arg("days", "60"));
const seed = arg("seed", "day-timing")!;
const verbose = process.argv.includes("--verbose");
const measureSave = process.argv.includes("--save");
if (process.argv.includes("--full-check"))
  (globalThis as { __civicFullWorldCheck?: boolean }).__civicFullWorldCheck =
    true;
/** Profile only the Day presses (all of them) or only the Day leaving one date. */
const profileDays = process.argv.includes("--profile-days");
const profileDate = arg("profile-date");
const profileOut = arg("profile-out", "day-timing.cpuprofile")!;
const profileOpen = arg("profile-open");
const session =
  profileDays || profileDate || profileOpen ? new Session() : null;
if (session) session.connect();
const post = (method: string, params?: object) =>
  new Promise<unknown>((resolve, reject) =>
    session!.post(method, params ?? {}, (error, result) =>
      error ? reject(error) : resolve(result),
    ),
  );
if (session) {
  await post("Profiler.enable");
  await post("Profiler.setSamplingInterval", { interval: 200 });
}
let profiling = false;

const openStarted = performance.now();
const openingCpu = process.cpuUsage();
/*
 * --from-save reads a life written by --write-opening, so two builds can press
 * Day from the very same World however slowly either one opens a new life.
 */
const fromSave = arg("from-save");
const writeSave = arg("write-save");
const openOnly = arg("open-only");
if (openOnly) {
  // A fresh process, as a player's Continue is: read the record the browser
  // store wrote, open the week, and show the scene.
  const raw = readFileSync(openOnly, "utf8");
  const started = performance.now();
  const read = readStoredRecord(JSON.parse(raw) as unknown);
  const openMs = performance.now() - started;
  if (read.kind !== "healthy")
    throw new Error(`The save read as ${read.kind}.`);
  const player = read.world.control;
  if (player.kind !== "person") throw new Error("The save has no player.");
  const resumeStarted = performance.now();
  const resumed = openOrdinaryLife(read.world, player.personId);
  const resumeMs = performance.now() - resumeStarted;
  const sceneStarted = performance.now();
  projectStoryMoment(resumed, player.personId);
  const sceneMs = performance.now() - sceneStarted;
  console.log(
    JSON.stringify({
      openOnly,
      payloadMB: Number((raw.length / 1024 / 1024).toFixed(1)),
      openMs: Math.round(openMs),
      resumeMs: Math.round(resumeMs),
      firstSceneMs: Math.round(sceneMs),
    }),
  );
  process.exit(0);
}
const writeOpening = arg("write-opening");
let personId: EntityId;
let world: World;
if (fromSave) {
  world = deserializeWorld(readFileSync(fromSave, "utf8"));
  if (world.control.kind !== "person")
    throw new Error("--from-save needs a life with a played person.");
  personId = world.control.personId;
} else {
  const setup = explicitNewGameSetup({
    placeKey,
    seed,
    startAge: startAge as never,
    depth: "summarize-earlier-life",
    gender: "female",
  });
  const game = createOpeningLifeController(setup).finishTransition().game!;
  personId = game.playerPersonId;
  world = openOrdinaryLife(game.world, personId);
}
if (writeOpening) writeFileSync(writeOpening, serializeWorld(world));
const openingMs = performance.now() - openStarted;
const openingCpuMs = (() => {
  const used = process.cpuUsage(openingCpu);
  return Math.round((used.user + used.system) / 1000);
})();
const peopleAtOpening = Object.keys(world.people).length;
const startDate = world.currentDate;
const handlers = createCampaignElectionTransitionRegistry();

const times: { ms: number; cpuMs: number; date: string }[] = [];
let scenes = 0;
let presses = 0;
while (times.length < days && presses < days * 4) {
  presses += 1;
  const before = world.currentDate;
  if (session && !profiling && (profileDays || before === profileDate)) {
    await post("Profiler.start");
    profiling = true;
  }
  const t = performance.now();
  const cpu = process.cpuUsage();
  const result = submitTimeCommand(world, {
    requestId: `day-timing-${presses}`,
    personId,
    sourceMoment: world.currentMoment,
    command: { kind: "days", days: 1 },
    interruptions: DEFAULT_INTERRUPTIONS,
  });
  const ms = performance.now() - t;
  const used = process.cpuUsage(cpu);
  const cpuMs = (used.user + used.system) / 1000;
  world = result.world;
  if (profiling && profileDate) {
    const { profile } = (await post("Profiler.stop")) as { profile: unknown };
    writeFileSync(profileOut, JSON.stringify(profile));
    profiling = false;
  }
  times.push({ ms, cpuMs, date: before });
  if (verbose)
    console.log(
      `${before} -> ${world.currentDate} ${ms.toFixed(0)} ms ${result.receipt.status}`,
    );
  // Answer whatever the clock stopped for, so the next press moves time.
  for (let i = 0; i < 6; i++) {
    let story;
    try {
      story = projectStoryMoment(world, personId);
    } catch {
      break;
    }
    if (story.scene.kind === "ordinary-stretch") break;
    const option = story.scene.options[0];
    if (!option) break;
    try {
      world = chooseStoryOption(world, {
        personId,
        scene: story.scene,
        optionKey: option.key,
        transitionHandlers: handlers,
      });
      scenes += 1;
    } catch {
      break;
    }
  }
  if (!world.people[personId]) break;
}

if (profiling) {
  const { profile } = (await post("Profiler.stop")) as { profile: unknown };
  writeFileSync(profileOut, JSON.stringify(profile));
}
const quantile = (values: number[], p: number) => {
  const ordered = [...values].sort((a, b) => a - b);
  return (
    ordered[Math.min(ordered.length - 1, Math.ceil(p * ordered.length) - 1)] ??
    0
  );
};
const sorted = times.map((t) => t.ms).sort((a, b) => a - b);
const q = (p: number) => quantile(sorted, p);
const cpuTimes = times.map((t) => t.cpuMs);
const worst = times.reduce((a, b) => (b.ms > a.ms ? b : a), times[0]!);
const total = sorted.reduce((a, b) => a + b, 0);
/*
 * The browser store's own record writer and reader, without IndexedDB: the
 * size of what a save writes, and how long writing it and opening it again
 * take on this thread.
 */
let save: Record<string, number | string> | null = null;
if (measureSave) {
  const cpuSince = (from: NodeJS.CpuUsage) => {
    const used = process.cpuUsage(from);
    return Math.round((used.user + used.system) / 1000);
  };
  const savedAt = new Date().toISOString();
  const writeStarted = performance.now();
  const writeCpu = process.cpuUsage();
  const record = createBrowserWorldRecord(world, savedAt);
  const writeMs = performance.now() - writeStarted;
  const writeCpuMs = cpuSince(writeCpu);
  const written = JSON.stringify(record);
  if (writeSave) writeFileSync(writeSave, written);
  // A clone, so the reader cannot lean on anything the writer cached.
  const stored = JSON.parse(written) as unknown;
  if (profileOpen) await post("Profiler.start");
  const openStartedAt = performance.now();
  const openCpu = process.cpuUsage();
  const read = readStoredRecord(stored);
  const openMs = performance.now() - openStartedAt;
  const openCpuMs = cpuSince(openCpu);
  if (profileOpen) {
    const { profile } = (await post("Profiler.stop")) as { profile: unknown };
    writeFileSync(profileOpen, JSON.stringify(profile));
  }
  // What the player's Continue does next: open the week, then the scene.
  let resumeMs = -1;
  let resumeCpuMs = -1;
  let firstSceneMs = -1;
  if (read.kind === "healthy") {
    const resumeStarted = performance.now();
    const resumeCpu = process.cpuUsage();
    const resumed = openOrdinaryLife(read.world, personId);
    resumeMs = performance.now() - resumeStarted;
    resumeCpuMs = cpuSince(resumeCpu);
    const sceneStarted = performance.now();
    projectStoryMoment(resumed, personId);
    firstSceneMs = performance.now() - sceneStarted;
  }
  save = {
    status: read.kind,
    payloadMB: Number((record.payload.length / 1024 / 1024).toFixed(1)),
    writeMs: Math.round(writeMs),
    writeCpuMs,
    openMs: Math.round(openMs),
    openCpuMs,
    resumeMs: Math.round(resumeMs),
    resumeCpuMs,
    firstSceneMs: Math.round(firstSceneMs),
  };
}
const summary = {
  fullCheck: process.argv.includes("--full-check"),
  placeKey,
  startAge,
  seed,
  fromSave: fromSave ?? null,
  days: times.length,
  startDate,
  endDate: world.currentDate,
  openingMs: Math.round(openingMs),
  openingCpuMs,
  peopleAtOpening,
  peopleAtEnd: Object.keys(world.people).length,
  scenesAnswered: scenes,
  totalMs: Math.round(total),
  medianMs: Math.round(q(0.5)),
  p95Ms: Math.round(q(0.95)),
  worstMs: Math.round(worst.ms),
  worstDate: worst.date,
  cpu: {
    medianMs: Math.round(quantile(cpuTimes, 0.5)),
    p95Ms: Math.round(quantile(cpuTimes, 0.95)),
    worstMs: Math.round(Math.max(...cpuTimes)),
  },
  changedCheck: checkCounts,
  save,
  worstDays: [...times]
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 12)
    .map((t) => `${t.date}:${Math.round(t.ms)}/${Math.round(t.cpuMs)}`),
};
console.log(JSON.stringify(summary));

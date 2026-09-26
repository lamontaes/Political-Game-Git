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
 */
import { writeFileSync } from "node:fs";
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
import { createCampaignElectionTransitionRegistry } from "../../src/simulation";
import type { World } from "../../src/simulation";
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
/** Profile only the Day presses (all of them) or only the Day leaving one date. */
const profileDays = process.argv.includes("--profile-days");
const profileDate = arg("profile-date");
const profileOut = arg("profile-out", "day-timing.cpuprofile")!;
const session = profileDays || profileDate ? new Session() : null;
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
const setup = explicitNewGameSetup({
  placeKey,
  seed,
  startAge: startAge as never,
  depth: "summarize-earlier-life",
  gender: "female",
});
const game = createOpeningLifeController(setup).finishTransition().game!;
const personId = game.playerPersonId;
let world: World = openOrdinaryLife(game.world, personId);
const openingMs = performance.now() - openStarted;
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
const summary = {
  placeKey,
  startAge,
  seed,
  days: times.length,
  startDate,
  endDate: world.currentDate,
  openingMs: Math.round(openingMs),
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
  slowDays: times
    .filter((t) => t.ms > 1000)
    .map((t) => `${t.date}:${Math.round(t.ms)}`),
};
console.log(JSON.stringify(summary));

import process from "node:process";
import console from "node:console";
import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { getHeapStatistics } from "node:v8";
const repo = process.env.SESSION5_PROFILE_REPO ?? process.cwd();
const output = resolve(
  process.env.SESSION5_PROFILE_OUTPUT ?? "/tmp/session5-reproduced-month",
);
assert.ok(
  !existsSync(output) || readdirSync(output).length === 0,
  "Profile output must be new or empty; prior receipts are never overwritten",
);
mkdirSync(output, { recursive: true });
const { lifePlaceStateIdentities, searchLifePlaces } = await import(
  pathToFileURL(resolve(repo, "src/simulation/life-places.ts")).href
);
const { explicitNewGameSetup } = await import(
  pathToFileURL(resolve(repo, "src/presentation/new-game-geography.ts")).href
);
const { prepareOpeningLife, generateOpeningLife } = await import(
  pathToFileURL(resolve(repo, "src/presentation/opening-life.ts")).href
);
const { openOrdinaryLife } = await import(
  pathToFileURL(resolve(repo, "src/presentation/ordinary-life.ts")).href
);
const { submitTimeCommand } = await import(
  pathToFileURL(resolve(repo, "src/presentation/time-command.ts")).href
);
import { measureAction } from "./instrument.mjs";
import { createPacketBudget } from "./row-evidence.mjs";
const source = process.env.SESSION5_PROFILE_SOURCE;
assert.ok(
  source,
  "SESSION5_PROFILE_SOURCE must equal the externally verified git HEAD",
);
assert.ok(getHeapStatistics().heap_size_limit < 4.2 * 1024 ** 3);
let place, seed, setup;
if (process.env.SESSION5_PROFILE_INPUT) {
  ({ place, seed, setup } = JSON.parse(
    readFileSync(process.env.SESSION5_PROFILE_INPUT, "utf8"),
  ));
} else {
  const states = lifePlaceStateIdentities();
  let state, places;
  do {
    state = states[randomInt(states.length)];
    places = searchLifePlaces("", 10000, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    });
  } while (!places.length);
  place = places[randomInt(places.length)];
  seed = `session5-one-month-${randomUUID()}`;
  setup = explicitNewGameSetup({
    seed,
    placeKey: place.key,
    startKind: "normal",
    startAge: 40,
    gender: "female",
    birthMonth: 1,
    birthDay: 1,
  });
}
const input = {
  source,
  seed,
  place,
  setup,
  pid: process.pid,
  heapLimit: getHeapStatistics().heap_size_limit,
  window: ["2026-01-05", "2026-01-12"],
  route:
    "ordinary generated normal life, canonical daily Day action, no campaign or fixture injection",
  samplingIntervalUs: 1000,
  preciseCoverage: false,
  cacheCensusDiagnostic: true,
  timingAcceptance: false,
  limitations: [
    "New random route, not Session48 retained seed",
    "Headless Day computation excludes browser navigation/render",
    "Sampled inclusive producer costs overlap; no annual/save/Continue acceptance",
    "Appended row body bytes exclude save containers; no full World payload written",
  ],
};
const save = (name, value) =>
  writeFileSync(
    `${output}/${name}.json`,
    JSON.stringify(value, null, 2) + "\n",
  );
save("input", input);
console.log(JSON.stringify({ phase: "start", ...input }));
const openingCpuStart = process.cpuUsage();
const openingHeapBefore = process.memoryUsage();
const openingStart = performance.now();
const game = generateOpeningLife(prepareOpeningLife(setup));
const personId = game.game.playerPersonId;
let world = openOrdinaryLife(game.game.world, personId);
console.log(
  JSON.stringify({
    phase: "opening",
    ms: performance.now() - openingStart,
    cpu: process.cpuUsage(openingCpuStart),
    heapBefore: openingHeapBefore,
    worldId: world.id,
    personId,
    date: world.currentDate,
    people: world.personOrder.length,
    heap: process.memoryUsage(),
  }),
);
function captureCensus(stage) {
  const read = globalThis[Symbol.for("session5.cacheCensus")];
  assert.equal(typeof read, "function", "Read-only loader hook required");
  save(`cache-${stage}`, {
    source,
    seed,
    pid: process.pid,
    date: world.currentDate,
    observedAtUTC: new Date().toISOString(),
    memory: process.memoryUsage(),
    ...read(world.history),
    timingAcceptance: false,
  });
}
captureCensus("opening");
const days = [];
const packetBudget = createPacketBudget();
for (let day = 0; world.currentDate < "2026-01-12" && day < 64; day++) {
  const heapBefore = process.memoryUsage();
  const cpuStart = process.cpuUsage();
  const started = performance.now();
  const from = world.currentDate;
  let result;
  const measured = await measureAction({
    source,
    route: input.route,
    world,
    capturePackets: day === 4 || day === 5,
    packetBudget,
    output: `${output}/day-${String(day).padStart(2, "0")}.json`,
    action: (w, phase) =>
      phase("submitTimeCommand", () => {
        result = submitTimeCommand(w, {
          requestId: `session5-month:${day}`,
          personId,
          sourceMoment: w.currentMoment,
          command: { kind: "days", days: 1 },
        });
        return result.world;
      }),
  });
  world = measured.world;
  const cpu = process.cpuUsage(cpuStart),
    heapAfter = process.memoryUsage();
  const row = {
    day,
    from,
    to: world.currentDate,
    wallMs: performance.now() - started,
    cpuUserMs: cpu.user / 1000,
    cpuSystemMs: cpu.system / 1000,
    heapBefore,
    heapAfter,
    heapUsedDelta: heapAfter.heapUsed - heapBefore.heapUsed,
    people: world.personOrder.length,
    sequence: world.history.nextSequence,
    receiptStatus: result.receipt.status,
    appendFamilies: measured.report.growth.map((g) => ({
      family: g.family,
      rows: g.after - g.before,
      bodyBytes: g.groups.reduce((s, r) => s + r.bodyBytes, 0),
    })),
  };
  days.push(row);
  if ([0, 6, 7].includes(day)) captureCensus(`action${day}`);
  save("days", { input, worldId: world.id, personId, days });
  console.log(JSON.stringify({ phase: "day", ...row }));
  assert.equal(result.receipt.status, "accepted");
}
assert.equal(world.currentDate, "2026-01-12");
save("terminal", {
  source,
  worldId: world.id,
  personId,
  date: world.currentDate,
  people: world.personOrder.length,
  heap: process.memoryUsage(),
  days: days.length,
});
console.log(
  JSON.stringify({
    phase: "terminal",
    source,
    date: world.currentDate,
    days: days.length,
    heap: process.memoryUsage(),
  }),
);

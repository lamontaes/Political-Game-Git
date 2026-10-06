import process from "node:process";
import { Buffer } from "node:buffer";
import console from "node:console";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { closeSync, openSync, writeFileSync, statfsSync } from "node:fs";
import { drawRandomPlace } from "../../tests/support/random-place.ts";
import {
  createPreStartNewGameWorld,
  finishPreStartNewGameWorld,
} from "../../src/presentation/new-game.ts";
import { explicitNewGameSetup } from "../../src/presentation/new-game-geography.ts";
import { preparePreStartInstitutions } from "../../src/presentation/opening-life.ts";
import { advanceObservedWorld } from "../../src/presentation/observer-world.ts";
import { projectLifeSoFarEnglish } from "../../src/presentation/life-so-far-english.ts";
import {
  beginHistoricalPastMode,
  endHistoricalPastMode,
} from "../../src/simulation/historical-past-mode.ts";
import {
  createWorldSnapshot,
  writeWorldPayload,
} from "../../src/simulation/serialization.ts";
import { SeededRng } from "../../src/simulation/rng.ts";
import { ageOnDate } from "../../src/simulation/dates.ts";
import { personName } from "../../src/simulation/people.ts";
import { assertWorldIntegrity } from "../../src/simulation/world.ts";
const sourceHead = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const seed = "session6-birth-resident-handoff";
const place = drawRandomPlace(seed);
const age = new SeededRng(seed).integer(18, 71);
const setup = {
  ...explicitNewGameSetup({
    seed,
    placeKey: place.key,
    startKind: "custom",
    startAge: age,
    depth: "summarize-earlier-life",
    household: "lives-alone",
  }),
  creatorLifeForks: [],
};
const started = performance.now();
let game = createPreStartNewGameWorld(setup, "2021-01-01");
const originalId = game.world.id;
const personId = game.playerPersonId;
assert.equal(
  ageOnDate(
    game.world.people[personId].birthDate,
    place.context.initialMoment.date,
  ),
  age,
);
game = preparePreStartInstitutions(game, setup);
let world = beginHistoricalPastMode(
  game.world,
  personId,
  place.context.initialMoment.date,
);
const constructionSeconds = (performance.now() - started) / 1000;
console.log(
  JSON.stringify({
    sourceHead,
    seed,
    place: place.key,
    placeName: place.context.jurisdiction.name,
    age,
    personId,
    name: personName(world.people[personId]),
    constructionSeconds,
    people: world.personOrder.length,
    worldId: originalId,
  }),
);
const counts = (world) =>
  Object.fromEntries(
    Object.entries(world.history)
      .filter(([, rows]) => Array.isArray(rows))
      .map(([kind, rows]) => [kind, rows.length]),
  );
let previous = counts(world);
let clockSeconds = constructionSeconds;
let measurementSeconds = 0;
const years = [];
for (const target of [
  "2022-01-01",
  "2023-01-01",
  "2024-01-01",
  "2025-01-01",
  "2026-01-01",
  "2026-01-05",
]) {
  const from = world.currentDate;
  const begin = performance.now();
  while (world.currentDate < target) {
    const month = new Date(`${world.currentDate}T00:00:00Z`);
    month.setUTCMonth(month.getUTCMonth() + 1, 1);
    const nextMonth = month.toISOString().slice(0, 10);
    const through = nextMonth < target ? nextMonth : target;
    const days = Math.round(
      (Date.parse(through) - Date.parse(world.currentDate)) / 86400000,
    );
    const before = world.currentDate;
    world = advanceObservedWorld(world, days);
    assert.ok(
      world.currentDate > before && world.currentDate <= through,
      "canonical clock must advance within its requested boundary",
    );
    console.log(
      JSON.stringify({
        progress: world.currentDate,
        yearClockSeconds: (performance.now() - begin) / 1000,
        people: world.personOrder.length,
      }),
    );
  }
  const seconds = (performance.now() - begin) / 1000;
  clockSeconds += seconds;
  const measured = performance.now();
  let saveBytes = 0;
  writeWorldPayload(world, (part) => (saveBytes += Buffer.byteLength(part)));
  const saveMeasureSeconds = (performance.now() - measured) / 1000;
  measurementSeconds += saveMeasureSeconds;
  const current = counts(world);
  const growth = Object.fromEntries(
    Object.entries(current).map(([kind, value]) => [
      kind,
      value - (previous[kind] ?? 0),
    ]),
  );
  previous = current;
  const row = {
    from,
    to: target,
    seconds,
    saveBytes,
    saveMeasureSeconds,
    recordCounts: current,
    recordGrowth: growth,
    heap: process.memoryUsage(),
    people: world.personOrder.length,
  };
  years.push(row);
  console.log(JSON.stringify(row));
  writeFileSync(
    "test-results/session5/final-years.json",
    JSON.stringify(
      { seed, place: place.key, age, constructionSeconds, years },
      null,
      2,
    ),
  );
}
const handoffStart = performance.now();
world = endHistoricalPastMode(world);
const history = world.history;
const people = world.people;
const moment = world.currentMoment;
game = finishPreStartNewGameWorld({ ...game, world });
clockSeconds += (performance.now() - handoffStart) / 1000;
assert.equal(game.world.id, originalId);
assert.equal(game.playerPersonId, personId);
assert.equal(game.world.history, history);
assert.equal(game.world.people, people);
assert.equal(game.world.currentMoment, moment);
assert.equal(game.world.pastMode, undefined);
assert.equal(game.world.preStartLife, undefined);
assertWorldIntegrity(game.world);
const loading = {
  clockSeconds,
  measurementSeconds,
  actualWallSeconds: (performance.now() - started) / 1000,
  under120ClockSeconds: clockSeconds <= 120,
  workerTransportTimed: false,
};
console.log(JSON.stringify({ loading }));
const journalLines = [];
const journal = projectLifeSoFarEnglish(game.world, personId, (line) =>
  journalLines.push(line),
);
console.log(JSON.stringify({ journal, journalLines }));
writeFileSync(
  "test-results/session5/final-journal.json",
  JSON.stringify(
    { seed, place: place.key, age, personId, journal, journalLines },
    null,
    2,
  ),
);
const snapshotId = createWorldSnapshot(game.world).snapshotId;
let finalBytes = 0;
writeWorldPayload(
  game.world,
  (part) => (finalBytes += Buffer.byteLength(part)),
);
const disk = statfsSync(".", { bigint: true });
const headroom = disk.bavail * disk.bsize - 25n * 1024n ** 3n;
if (BigInt(finalBytes) > headroom) {
  writeFileSync(
    "test-results/session5/final-save-pending.json",
    JSON.stringify(
      {
        snapshotId,
        finalBytes,
        availableAboveReserve: Number(headroom),
        reason:
          "canonical save exceeds reserved disk headroom; no file or records deleted",
      },
      null,
      2,
    ),
  );
  throw new Error("Final canonical save needs bounded storage reservation");
}
const fd = openSync("test-results/session5/final.world.json", "w");
let pending = "";
try {
  writeWorldPayload(game.world, (part) => {
    pending += part;
    if (pending.length >= 1048576) {
      writeFileSync(fd, pending);
      pending = "";
    }
  });
  if (pending) writeFileSync(fd, pending);
} finally {
  closeSync(fd);
}
const receipt = {
  sourceHead,
  seed,
  place: place.key,
  age,
  worldId: originalId,
  personId,
  date: game.world.currentDate,
  moment: game.world.currentMoment,
  snapshotId,
  loading,
  counts: counts(game.world),
  heap: process.memoryUsage(),
  saveContinue:
    "pending separate readWorldSnapshot process; no giant duplicate World retained",
};
writeFileSync(
  "test-results/session5/final-receipt.json",
  JSON.stringify(receipt, null, 2),
);
console.log(JSON.stringify({ final: receipt }));

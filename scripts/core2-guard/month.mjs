import { createHash } from "node:crypto";
/* global process, console */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";
import { execFileSync } from "node:child_process";
import { cpus, hostname } from "node:os";
import policies from "./policies.json" with { type: "json" };
const moduleAt = (path) =>
  import(pathToFileURL(resolve(process.cwd(), path)).href);
/**
 * The game's one start date (src/core2/game-start.ts). The paired guard passes
 * the head's date with --start-date, so base and head open on the same day
 * even when the base predates the parameter.
 */
async function openingDate(startDate) {
  if (startDate) return startDate;
  const start = await moduleAt("src/core2/game-start.ts").catch(() => {
    throw new Error(
      "This revision has no gameStartDate parameter; pass --start-date.",
    );
  });
  return start.gameStartDate();
}
/**
 * The world the player gets: the bench's two-level town with the economy and
 * every module it installs (src/bench/world.ts), the same path as
 * tests/golden-path/played-world.node-test.ts. Revisions whose bench can't
 * hand over its opening input measure the generated opening below instead.
 */
async function preparePlayedWorld({ seed, placeKey, startDate }) {
  const bench = await moduleAt("src/bench/world.ts").catch(() => undefined);
  if (!bench?.buildBenchWorld) return undefined;
  const started = performance.now();
  let input, opened;
  const world = bench.buildBenchWorld(seed, startDate, {
    twoLevel: true,
    placeKey,
    onOpening: (opening) => {
      input = opening;
      opened = performance.now();
    },
  });
  if (!input) return undefined;
  return {
    input,
    core: world.core,
    playedWorld: true,
    phases: {
      opening: opened - started,
      modulesAndGovernment: performance.now() - opened,
    },
    place: {
      key: input.placeMetadata?.placeKey ?? placeKey,
      name: input.placeMetadata?.placeName ?? world.place.displayName,
      countyNames: input.placeMetadata?.countyNames,
      referencePopulation: input.placeMetadata?.referencePopulation,
    },
    peers: undefined,
  };
}
export async function prepareWorld({ seed, placeKey, startDate }) {
  startDate = await openingDate(startDate);
  const played = await preparePlayedWorld({ seed, placeKey, startDate });
  if (played) return played;
  // The game's path: the two-level opening with the economy (OPUS-CORE's
  // generated world). Older revisions without it time the full-population
  // opening below.
  const generated = await moduleAt(
    "src/core2/tooling/generated-world.ts",
  ).catch(() => undefined);
  if (generated?.generatedOpening) {
    const started = performance.now();
    const input = generated.generatedOpening(
      { seed, key: placeKey },
      { twoLevel: true, startedAt: startDate },
    );
    return {
      input,
      phases: { opening: performance.now() - started },
      place: {
        key: input.placeMetadata?.placeKey ?? placeKey,
        name: input.placeMetadata?.placeName,
        countyNames: input.placeMetadata?.countyNames,
        referencePopulation: input.placeMetadata?.referencePopulation,
      },
      peers: undefined,
    };
  }
  const [
    { buildPopulation },
    { buildDeepPast },
    { enrichCivicInputs },
    { buildOpeningPeerContacts },
    { initialFocusPeople },
    { parameter },
    { ageOnDate, makeIsoDate },
  ] = await Promise.all([
    moduleAt("src/core2/population.ts"),
    moduleAt("src/core2/deep-past.ts"),
    moduleAt("src/core2/civic-inputs.ts"),
    moduleAt("src/core2/opening-peer-network.ts"),
    moduleAt("src/core2/focus.ts"),
    moduleAt("src/core2/parameters.ts"),
    moduleAt("src/core2/kernel/dates.ts"),
  ]);
  const phases = {},
    timed = (name, fn) => {
      const t = performance.now();
      const result = fn();
      phases[name] = performance.now() - t;
      return result;
    };
  const population = timed("population", () =>
    buildPopulation({
      seed,
      placeKey,
      startedAt: startDate,
      minimumPeople: parameter("targetPopulation"),
      openingEmployment: true,
      scheduledWork: true,
    }),
  );
  let input = timed("deepPast", () => buildDeepPast(population));
  input = timed("civicInputs", () => enrichCivicInputs(input));
  const candidates = input.people.filter(
    (person) =>
      person.countyId &&
      person.jobId &&
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(input.startedAt)) >=
        parameter("benchmarkAdultMinimumAge"),
  );
  if (!candidates.length)
    throw new Error("No eligible recorded adult worker in drawn place");
  const player = candidates.sort((a, b) => a.id.localeCompare(b.id))[0];
  const peers = timed("openingPeers", () =>
    buildOpeningPeerContacts(input, { personIds: [player.id] }),
  );
  input = { ...peers.input, playerId: player.id };
  input = {
    ...input,
    focusPersonIds: [...initialFocusPeople(input)].sort(),
    focusPlaceIds: [],
    visiblePlaceIds: [player.placeId, player.countyId].sort(),
  };
  return {
    input,
    phases,
    place: {
      key: population.placeMetadata.placeKey,
      name: population.placeMetadata.placeName,
      countyNames: population.placeMetadata.countyNames,
      referencePopulation: population.placeMetadata.referencePopulation,
    },
    peers,
  };
}
export async function runMonth({
  seed,
  placeKey,
  output,
  startDate,
  days = policies.measuredDays,
}) {
  if (typeof output !== "string" || !output.trim() || output.startsWith("--"))
    throw new Error("Missing value for --output: supply a receipt path");
  // The paired guard plays a shorter span for its warmups and for a town whose
  // year does not fit the budget (policies.timeBudgetReason).
  if (!Number.isInteger(days) || days < 1 || days > policies.measuredDays)
    throw new Error(`Measured span must be 1 to ${policies.measuredDays} days`);
  const {
    input,
    phases,
    place,
    core: played,
    playedWorld,
  } = await prepareWorld({ seed, placeKey, startDate });
  const [
    { censusOpeningInput, openingInputBudget },
    { hashMeasuredJson },
    { createLifeCore, advanceCore },
    { addDays, makeIsoDate },
  ] = await Promise.all([
    moduleAt("src/core2/tooling/opening-input-budget.ts"),
    moduleAt("src/core2/tooling/measured-json.ts"),
    moduleAt("src/core2/life.ts"),
    moduleAt("src/core2/kernel/dates.ts"),
  ]);
  const registry = JSON.parse(
    readFileSync("src/core2/tooling/opening-input-budgets.json", "utf8"),
  );
  const census = censusOpeningInput(input),
    budget = openingInputBudget(census, registry),
    inputHash = hashMeasuredJson(input);
  // The played world's core is built with its modules in prepareWorld.
  const initStarted = performance.now(),
    core = played ?? createLifeCore(input),
    initializeMilliseconds = played
      ? phases.modulesAndGovernment
      : performance.now() - initStarted;
  const advanceStarted = performance.now(),
    receipt = advanceCore(core, addDays(makeIsoDate(core.date), days)),
    advanceMilliseconds = performance.now() - advanceStarted;
  if (receipt.simulatedDays !== days)
    throw new Error("Clock did not advance the complete measured span");
  const result = {
    schema: "core2-month-v1",
    revision: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    sourcePatchSha256: createHash("sha256")
      .update(
        execFileSync("git", ["diff", "HEAD", "--", "src/core2"], {
          encoding: "utf8",
        }),
      )
      .digest("hex"),
    seed,
    placeKey,
    place,
    inputHash,
    startedAt: input.startedAt,
    days: receipt.simulatedDays,
    settings: {
      openingEmployment: true,
      scheduledWork: true,
      measuredDays: days,
      twoLevel: true,
      playedWorld: Boolean(playedWorld),
    },
    host: {
      hostname: hostname(),
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      cpu: cpus()[0]?.model,
    },
    phases,
    initializeMilliseconds,
    advanceMilliseconds,
    millisecondsPerDay: advanceMilliseconds / receipt.simulatedDays,
    peakRssMiB: process.resourceUsage().maxRSS / 1024,
    opening: {
      bytes: census.bytes,
      residents: census.residents,
      bytesPerResident: census.bytesPerResident,
      sourceShare: census.declaredConservativeSourceByteShare,
      budget,
    },
    acts: receipt.acts,
  };
  writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
  return result;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2),
    value = (flag) => {
      const index = args.indexOf(flag),
        next = args[index + 1];
      if (index < 0 || !next?.trim() || next.startsWith("--"))
        throw new Error(`Missing value for ${flag}`);
      return next;
    };
  Promise.resolve()
    .then(() =>
      runMonth({
        seed: value("--seed"),
        placeKey: value("--place-key"),
        output: value("--output"),
        ...(args.includes("--start-date")
          ? { startDate: value("--start-date") }
          : {}),
        ...(args.includes("--days") ? { days: Number(value("--days")) } : {}),
      }),
    )
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

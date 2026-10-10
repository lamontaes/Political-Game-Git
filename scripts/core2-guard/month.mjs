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
export async function prepareWorld({ seed, placeKey }) {
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
    moduleAt("src/simulation/dates.ts"),
  ]);
  const measurement = JSON.parse(
    readFileSync("src/core2/data/measurement.json", "utf8"),
  );
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
      startedAt: measurement.startedAt,
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
  return { input, phases, place: population.placeMetadata, peers };
}
export async function runMonth({ seed, placeKey, output }) {
  const { input, phases, place } = await prepareWorld({ seed, placeKey });
  const [
    { censusOpeningInput, openingInputBudget },
    { hashMeasuredJson },
    { createLifeCore, advanceCore },
    { addDays, makeIsoDate },
  ] = await Promise.all([
    moduleAt("src/core2/tooling/opening-input-budget.ts"),
    moduleAt("src/core2/tooling/measured-json.ts"),
    moduleAt("src/core2/life.ts"),
    moduleAt("src/simulation/dates.ts"),
  ]);
  const registry = JSON.parse(
    readFileSync("src/core2/tooling/opening-input-budgets.json", "utf8"),
  );
  const census = censusOpeningInput(input),
    budget = openingInputBudget(census, registry),
    inputHash = hashMeasuredJson(input);
  if (!budget.passed)
    throw new Error(`Opening-input guard: ${budget.violations.join("; ")}`);
  const initStarted = performance.now(),
    core = createLifeCore(input),
    initializeMilliseconds = performance.now() - initStarted;
  const advanceStarted = performance.now(),
    receipt = advanceCore(
      core,
      addDays(makeIsoDate(input.startedAt), policies.monthDays),
    ),
    advanceMilliseconds = performance.now() - advanceStarted;
  if (receipt.simulatedDays !== policies.monthDays)
    throw new Error("Clock did not advance the complete month");
  const result = {
    schema: "core2-month-v1",
    revision: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    seed,
    placeKey,
    place,
    inputHash,
    startedAt: input.startedAt,
    days: receipt.simulatedDays,
    settings: {
      openingEmployment: true,
      scheduledWork: true,
      monthDays: policies.monthDays,
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
  if (output) writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
  return result;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2),
    value = (flag) => args[args.indexOf(flag) + 1];
  runMonth({
    seed: value("--seed"),
    placeKey: value("--place-key"),
    output: value("--output"),
  })
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

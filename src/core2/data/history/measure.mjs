/* global process, console, Buffer */
/** Developer proof only: sequential same-checkout comparisons; no daily history replay. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { hostname, cpus } from "node:os";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const args = process.argv.slice(2);
const option = (name) => args[args.indexOf(name) + 1];
const load = (path) => import(pathToFileURL(resolve(path)).href);
const output = option("--output");
if (!output || output.startsWith("--"))
  throw new Error("Supply --output outside the checkout.");
const hash = (data) => createHash("sha256").update(data).digest("hex");
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const identity = {
  head,
  host: hostname(),
  cpu: cpus()[0]?.model,
  node: process.version,
};
const mode = option("--mode");
if (mode === "select") {
  const { lifePlaceStateIdentities } = await load(
    "src/simulation/life-places.ts",
  );
  const { realLocalities } = await load("src/core2/places.ts");
  const { SeededRng } = await load("src/simulation/rng.ts");
  const identities = lifePlaceStateIdentities();
  if (identities.length !== 56)
    throw new Error("Incomplete jurisdiction pool.");
  const localities = realLocalities();
  const draws = ["a", "b", "c"].map((suffix) => {
    const seed = `m1-history-part1-${suffix}`;
    const rng = new SeededRng(seed);
    const state = rng.pick(identities);
    const pool = localities.filter(
      (row) =>
        row.scope === "locality" &&
        row.stateJurisdictionKey === state.jurisdictionKey,
    );
    if (!pool.length)
      throw new Error("Drawn jurisdiction has no locality; do not redraw.");
    const place = rng.pick(pool);
    return {
      seed,
      state: state.jurisdictionKey,
      placeKey: place.key,
      placeName: place.displayName,
    };
  });
  writeFileSync(
    output,
    JSON.stringify(
      {
        ...identity,
        selection:
          "Seeded draw from all 56 identities, then one recorded locality; no actor outcomes drawn",
        draws,
      },
      null,
      2,
    ) + "\n",
  );
} else if (mode === "opening" || mode === "prepare") {
  const variant = option("--variant");
  const { buildPopulation } = await load("src/core2/population.ts");
  const { buildDeepPast } = await load("src/core2/deep-past.ts");
  const { enrichCivicInputs } = await load("src/core2/civic-inputs.ts");
  const { buildOpeningEconomy } = await load("src/core2/opening-economy.ts");
  const { createLifeCore } = await load("src/core2/life.ts");
  const { coreAPI } = await load("src/core2/state.ts");
  const { censusOpeningInput, openingInputBudget } = await load(
    "src/core2/tooling/opening-input-budget.ts",
  );
  const budgets = JSON.parse(
    readFileSync("src/core2/tooling/opening-input-budgets.json", "utf8"),
  );
  const history =
    variant === "head" ? await load("src/core2/opening-history.ts") : undefined;
  const draws = JSON.parse(readFileSync(option("--draws"), "utf8")).draws;
  const measurements = [];
  // Population count and repetitions are measurement controls, not simulation parameters.
  for (const draw of mode === "prepare" ? draws.slice(0, 1) : draws) {
    const runs = [];
    for (let repeat = 0; repeat < (mode === "prepare" ? 1 : 4); repeat += 1) {
      globalThis.gc?.();
      const started = performance.now();
      const options = {
        seed: draw.seed,
        placeKey: draw.placeKey,
        minimumPeople: 800,
        startedAt: "2026-01-01",
      };
      let world;
      if (history) world = history.openHistoryWorld(options);
      else {
        const generated = buildPopulation(options);
        const past = buildDeepPast(generated);
        const civic = enrichCivicInputs(past);
        const economy = buildOpeningEconomy(civic);
        world = { input: economy.input, core: createLifeCore(economy.input) };
      }
      const elapsedMilliseconds = performance.now() - started;
      const census = censusOpeningInput(world.input);
      const budget = openingInputBudget(census, budgets);
      const table = history
        ? coreAPI(world.core).moduleState("history-people").table("events")
        : undefined;
      const rows = table?.rows() ?? [];
      const result = {
        elapsedMilliseconds,
        startedAt: world.input.startedAt,
        people: world.input.people.length,
        bytes: census.bytes,
        bytesPerResident: census.bytesPerResident,
        sourceShare: census.declaredConservativeSourceByteShare,
        budget,
        recentEvents: rows.length,
        examples: rows.slice(0, 3),
        passes: world.history?.passes ?? [],
        simulatedDays: 0,
        dailyActs: world.core.actCounters.size,
        rssBytes: process.memoryUsage().rss,
        heapUsedBytes: process.memoryUsage().heapUsed,
        processLifetimeMaxRssBytes: process.resourceUsage().maxRSS * 1024,
      };
      if (repeat > 0 || mode === "prepare") runs.push(result);
      if (mode === "prepare") {
        const { initialFocusPeople } = await load("src/core2/focus.ts");
        const input = { ...world.input, moduleState: undefined };
        const person = input.people.find((row) => row.jobId) ?? input.people[0];
        input.playerId = person.id;
        input.focusPersonIds = [...initialFocusPeople(input)].sort();
        const bytes = JSON.stringify(input);
        writeFileSync(option("--input"), bytes, { flag: "wx" });
        result.inputSha256 = hash(bytes);
        result.inputBytes = Buffer.byteLength(bytes);
        result.playerId = person.id;
      }
      console.log(
        JSON.stringify({
          mode,
          variant,
          ...draw,
          repeat,
          elapsedMilliseconds,
          bytes: census.bytes,
          recentEvents: rows.length,
          budgetPassed: budget.passed,
        }),
      );
    }
    measurements.push({
      ...draw,
      runs,
      medianMilliseconds: median(runs.map((run) => run.elapsedMilliseconds)),
    });
  }
  writeFileSync(
    output,
    JSON.stringify(
      {
        ...identity,
        mode,
        variant,
        warmups: mode === "opening" ? 1 : 0,
        measurements,
      },
      null,
      2,
    ) + "\n",
  );
} else if (mode === "month") {
  const variant = option("--variant");
  const bytes = readFileSync(option("--input"), "utf8");
  const input = JSON.parse(bytes);
  const { createLifeCore, advanceCore } = await load("src/core2/life.ts");
  const { addDays, makeIsoDate } = await load("src/simulation/dates.ts");
  const history =
    variant === "head" ? await load("src/core2/history-people.ts") : undefined;
  const runner =
    variant === "head" ? await load("src/core2/history-run.ts") : undefined;
  const started = performance.now();
  const core = createLifeCore(input, {
    modules: history ? [history.recentLifeHistoryModule(input)] : [],
  });
  if (runner) runner.runPreStartHistory(core);
  const initialized = performance.now();
  const through = addDays(makeIsoDate(input.startedAt), 31);
  const result = advanceCore(core, through);
  const completed = performance.now();
  const receipt = {
    ...identity,
    mode,
    variant,
    inputSha256: hash(bytes),
    seed: input.seed,
    place: input.placeMetadata.placeName,
    people: input.people.length,
    startedAt: input.startedAt,
    through,
    simulatedDays: 31,
    initializationMilliseconds: initialized - started,
    advanceMilliseconds: completed - initialized,
    result,
    processLifetimeMaxRssBytes: process.resourceUsage().maxRSS * 1024,
  };
  writeFileSync(output, JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify(receipt));
} else throw new Error("Unknown measurement mode.");

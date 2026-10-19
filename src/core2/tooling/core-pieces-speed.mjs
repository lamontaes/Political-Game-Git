/* global process, console, Buffer */
import { createHash, randomInt } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// One process/run, fixed prepared generated input, sequential exclusive host windows.
// These are measurement controls, not simulation parameters.
const args = process.argv.slice(2);
const arg = (name) => args[args.indexOf(name) + 1];
const root = resolve(arg("--root"));
const inputPath = arg("--input");
const load = (path) => import(pathToFileURL(resolve(root, path)).href);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (args.includes("--prepare")) {
  const { lifePlaceStateIdentities, lifePlaceSearch } = await load(
    "src/simulation/life-places.ts",
  );
  const { placeReferencePopulation } = await load(
    "src/simulation/nationwide-world/place-population.ts",
  );
  const { buildPopulation } = await load("src/core2/population.ts");
  const states = lifePlaceStateIdentities();
  if (states.length !== 56)
    throw new Error("Expected the complete 56-place identity pool.");
  const state = states[randomInt(states.length)];
  const localities = lifePlaceSearch("", 100000, {
    stateJurisdictionKey: state.jurisdictionKey,
    scope: "locality",
  });
  const candidates = localities.filter(
    (place) =>
      place.sourceGeoid &&
      placeReferencePopulation(place.sourceGeoid)?.value >= 800,
  );
  const pool = candidates.length ? candidates : localities;
  if (!pool.length)
    throw new Error(
      "Selected place has no recorded locality; do not redraw around a gap.",
    );
  const place = pool[randomInt(pool.length)];
  const seed = "m0-core-pieces-speed-2026-10-10";
  const input = buildPopulation({
    seed,
    placeKey: place.key,
    startedAt: "2026-01-01",
    minimumPeople: 800,
  });
  // A normal daily controlled circle plus coarse residents, matching the core tier contract.
  input.playerId = input.people[0].id;
  input.focusPersonIds = [...input.people[0].familyIds];
  const bytes = JSON.stringify(input);
  writeFileSync(inputPath, bytes, { flag: "wx" });
  const selected = {
    selection:
      "crypto random identity from all 56, then real locality; no behavioral draw",
    state,
    place: { key: place.key, name: place.displayName },
    seed,
    worldId: `core2:${seed}`,
    startedAt: input.startedAt,
    people: input.people.length,
    jobs: input.jobs.length,
    preparedInputSha256: hash(bytes),
    preparedInputBytes: Buffer.byteLength(bytes),
  };
  writeFileSync(arg("--output"), JSON.stringify(selected, null, 2) + "\n");
  console.log(JSON.stringify(selected));
} else {
  const variant = arg("--variant"),
    bytes = readFileSync(inputPath, "utf8"),
    input = JSON.parse(bytes);
  const { createLifeCore, advanceCore } = await load("src/core2/life.ts");
  const { coreAPI, registerModule } = await load("src/core2/state.ts");
  const started = performance.now();
  const core = createLifeCore(input),
    api = coreAPI(core);
  const initialized = performance.now();
  if (variant === "candidate") {
    // A bounded contract consumer in an ordinary generated world. This proves the seams,
    // not that a political engine or national conditions already generate these records.
    registerModule(core, {
      id: "speed-contract",
      state: {
        schemaVersion: 1,
        tables: { work: { indexes: { date: { fields: ["date"] } } } },
      },
      onCalendarWork(api, work) {
        const table = api.moduleState("speed-contract").table("work");
        const row = table.get(work.key);
        if (!row || row.date !== api.state.date)
          throw new Error("Missing dated owner row.");
        table.put({ ...row, status: "processed" });
        api.emit({
          id: `institution:${row.id}`,
          date: api.state.date,
          kind: "core-pieces-contract-work",
          personIds: [input.playerId],
          placeId: input.people[0].placeId,
          source: work.source,
          publicRecord: true,
        });
      },
    });
    const source = {
      tag: "ESTIMATED",
      asOf: input.startedAt,
      citation:
        "Authored monthly contract-consumer dates in a generated life world.",
      estimatedFrom:
        "API integration exercise only; no election or economic behavior is claimed.",
    };
    const table = api.moduleState("speed-contract").table("work"),
      calendar = api.moduleCalendar("speed-contract");
    for (let month = 1; month <= 12; month++) {
      const key = `monthly:${month}`,
        date = `2026-${String(month).padStart(2, "0")}-15`;
      table.put({
        id: key,
        date,
        status: "scheduled",
        organizationId: input.organizations[0].id,
      });
      calendar.schedule({
        key,
        date,
        kind: "contract-work",
        source,
        sourceRecordIds: [key, input.organizations[0].id],
      });
    }
  }
  const ready = performance.now();
  const result = advanceCore(core, "2027-01-01");
  const finished = performance.now();
  if (result.simulatedDays !== 365)
    throw new Error("Expected one complete generated game year.");
  let integration;
  if (variant === "candidate") {
    const table = api.moduleState("speed-contract").table("work");
    if (
      table.size !== 12 ||
      table.rows().some((row) => row.status !== "processed")
    )
      throw new Error("Institutional work was missed.");
    const saved = [...core.durableLog.values()].filter(
      (row) => row.kind === "core-pieces-contract-work",
    );
    if (saved.length !== 12)
      throw new Error("Missing retained institutional events.");
    integration = {
      processedWork: table.size,
      emittedRecords: saved.map((row) => row.id),
      sourceRecordIds: [input.organizations[0].id],
    };
  }
  const receipt = {
    variant,
    apiVersion: api.version,
    preparedInputSha256: hash(bytes),
    people: input.people.length,
    initializeMilliseconds: initialized - started,
    additionsMilliseconds: ready - initialized,
    advanceMilliseconds: finished - ready,
    totalMilliseconds: finished - started,
    ...result,
    integration,
  };
  writeFileSync(arg("--output"), JSON.stringify(receipt, null, 2) + "\n");
  console.log(
    JSON.stringify({
      variant,
      advanceMilliseconds: receipt.advanceMilliseconds,
      totalMilliseconds: receipt.totalMilliseconds,
      days: result.simulatedDays,
    }),
  );
}

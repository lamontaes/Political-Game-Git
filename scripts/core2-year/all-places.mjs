/* global process, console, URL */
// Every place, every year: the played world in all 56 states and territories,
// one drawn locality and seed each, for N years through the dev clock, run in
// parallel workers (one per core by default, fewer when memory is short). Per place it reports each
// year's seconds and heap, any crash with its full stack, and four checks:
// every dollar balances; no job is re-rated after it ended; every seat empty
// past the grace is being filled by its rule; every even year's state and
// federal contest is on the ballot. Prints a table, writes a JSON file, and
// exits nonzero on any crash.
//
// Usage: node --import tsx scripts/core2-year/all-places.mjs [--years 1]
//   [--seed S] [--workers N] [--heap-mb M] [--out FILE] [--summary FILE]
//   [--only US-NE,US-MP] [--world-seeds 78f9ea4a3073,...]
// --world-seeds runs those `buildBenchWorld` seeds as given (each seed draws
// its own place), instead of one drawn locality per state.
import { createHash, randomBytes } from "node:crypto";
import { availableParallelism, freemem } from "node:os";
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";

const args = process.argv.slice(2);
const value = (name, fallback) =>
  args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const years = Number(value("--years", "1"));
const runSeed = value("--seed", randomBytes(8).toString("hex"));
const heapMb = Number(value("--heap-mb", "4096"));
// A worker can grow to its heap limit, and a game year also holds native memory
// (typed arrays, buffers) outside the heap. A run of four workers on a 15 GB
// machine reached 13.6 GB resident and was killed, so the default is the
// number of cores or the number of workers the free memory holds, whichever is
// smaller. --workers sets it exactly.
const nativeMb = 1024;
const memoryShare = 0.85;
const memoryWorkers = Math.max(
  1,
  Math.floor(((freemem() / 2 ** 20) * memoryShare) / (heapMb + nativeMb)),
);
const workers = Number(
  value("--workers", String(Math.min(availableParallelism(), memoryWorkers))),
);
const out = resolve(value("--out", "test-results/all-places.json"));
const summary = value("--summary", process.env.GITHUB_STEP_SUMMARY ?? "");
const only = value("--only", "").split(",").filter(Boolean);
const worldSeeds = value("--world-seeds", "").split(",").filter(Boolean);

const { placeLocalities, placeStateKeys } = await import(
  pathToFileURL(resolve("src/core2/places.ts")).href
);

/** One locality and world seed per state, from the run seed. */
function drawn() {
  return [...placeStateKeys()]
    .sort((a, b) => a.localeCompare(b))
    .filter((state) => !only.length || only.includes(state))
    .map((state) => {
      const hash = createHash("sha256")
        .update(`${runSeed}:${state}:all-places`)
        .digest("hex");
      const localities = [...placeLocalities(state)].sort((a, b) =>
        a.key.localeCompare(b.key),
      );
      const locality =
        localities[parseInt(hash.slice(0, 8), 16) % localities.length];
      return { state, seed: hash.slice(8, 20), placeKey: locality.key, years };
    });
}

const jobs = worldSeeds.length
  ? worldSeeds.map((seed) => ({ state: "", seed, placeKey: null, years }))
  : drawn();
console.log(
  `all-places: run seed ${runSeed}, ${jobs.length} places, ${years} year(s), ${workers} workers`,
);

const workerUrl = new URL("./all-places-worker.mjs", import.meta.url);
const results = [];
let next = 0;
async function lane() {
  while (next < jobs.length) {
    const job = jobs[next++];
    const result = await new Promise((done) => {
      const worker = new Worker(workerUrl, {
        workerData: job,
        resourceLimits: { maxOldGenerationSizeMb: heapMb },
      });
      let answer;
      worker.on("message", (message) => {
        if (message.progress) console.log(`  ${message.progress}`);
        if (message.result) answer = message.result;
      });
      worker.on("error", (error) => {
        answer ??= {
          place: job.placeKey ?? job.seed,
          seed: job.seed,
          crash: { message: error.message, stack: error.stack },
        };
      });
      worker.on("exit", (code) => {
        done(
          answer ?? {
            place: job.placeKey ?? job.seed,
            seed: job.seed,
            crash: { message: `worker exited with code ${code}` },
          },
        );
      });
    });
    result.state ||= job.state;
    results.push(result);
    console.log(
      `${result.crash ? "CRASH" : "done "} ${result.place} (${result.state}, seed ${job.seed})`,
    );
    if (result.crash)
      console.log(
        `  ${result.crash.date ?? "build"}: ${result.crash.stack ?? result.crash.message}`
          .split("\n")
          .slice(0, 8)
          .join("\n  "),
      );
  }
}
await Promise.all(Array.from({ length: Math.max(1, workers) }, lane));
results.sort((a, b) => `${a.state}`.localeCompare(`${b.state}`));

const mark = (check) => (check === true ? "pass" : "FAIL");
const lines = [
  `### Every place, ${years} year(s), run seed ${runSeed}`,
  "",
  "| Place | State | Seed | Seconds per year | Heap GB | Money | Ended jobs | Seats | Ballot | Crash |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
];
for (const row of results) {
  const yearsRun = row.years ?? [];
  const last = yearsRun.at(-1);
  const all = (key) =>
    yearsRun.length
      ? mark(yearsRun.every((y) => y.checks[key] === true) || "fail")
      : "-";
  lines.push(
    `| ${row.place} | ${row.state} | ${row.seed} | ${yearsRun.map((y) => y.seconds).join(", ") || "-"} | ${last?.heapGB ?? "-"} | ${all("moneyBalances")} | ${all("noEndedJobRerated")} | ${all("seatsFilled")} | ${all("contestsOnBallot")} (${yearsRun.reduce((n, y) => n + (y.ballotSeatsChecked ?? 0), 0)} seats) | ${row.crash ? `${row.crash.date ?? ""} ${row.crash.message}`.replaceAll("|", "/") : ""} |`,
  );
}
const crashes = results.filter((row) => row.crash);
lines.push(
  "",
  `${results.length} places, ${crashes.length} crashed. Failing checks list their first failures in the JSON file.`,
);
for (const row of crashes)
  lines.push(
    "",
    `**${row.place} (${row.state}, seed ${row.seed})**`,
    "",
    "```",
    row.crash.stack ?? row.crash.message,
    "```",
  );
const table = lines.join("\n");
console.log(`\n${table}`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ runSeed, years, results }, null, 2));
console.log(`\nwrote ${out}`);
if (summary) appendFileSync(summary, `${table}\n`);
process.exitCode = crashes.length ? 1 : 0;

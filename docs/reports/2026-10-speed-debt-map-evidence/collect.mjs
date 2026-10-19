/* global process, global */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { Session } from "node:inspector";
import { cpus, totalmem } from "node:os";
import { pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const [root, label, head, outputRoot] = process.argv.slice(2);
const mod = async (p) => import(pathToFileURL(`${root}/src/${p}.ts`).href);
// Sequential imports also avoid the earlier parallel-import initialization cycle.
const { makeIsoDate, addDays } = await mod("simulation/dates");
const { buildPopulation } = await mod("core2/population");
const { buildDeepPast } = await mod("core2/deep-past");
const { enrichCivicInputs } = await mod("core2/civic-inputs");
const { createLifeCore, advanceCore } = await mod("core2/life");
const seed = "p10-drives-proof-2026-10-09";
const startedAt = makeIsoDate("2021-01-01");
const through = addDays(startedAt, 31);
const buildStart = performance.now();
const input = enrichCivicInputs(
  buildDeepPast(buildPopulation({ seed, startedAt, minimumPeople: 10000 })),
);
const buildSeconds = (performance.now() - buildStart) / 1000;
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const receipt = {
  schema: "speed-map-month-v1",
  label,
  head,
  seed,
  startedAt,
  through,
  startedAtUtc: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpu: cpus()[0].model,
    logicalCpus: cpus().length,
    totalMemoryBytes: totalmem(),
  },
  input: {
    buildSeconds,
    inputSha256: hash(input),
    people: input.people.length,
    jobs: input.jobs?.length,
    contracts: input.finance?.contracts?.length ?? 0,
    place: input.placeMetadata,
    worldId: input.worldId ?? input.id ?? null,
  },
  runs: [],
};
const session = new Session();
session.connect();
const post = (method, params = {}) =>
  new Promise((resolve, reject) =>
    session.post(method, params, (err, result) =>
      err ? reject(err) : resolve(result),
    ),
  );
await post("Profiler.enable");
await post("Profiler.setSamplingInterval", { interval: 1000 });
for (const kind of ["warmup", "timed-1", "timed-2", "timed-3", "profile"]) {
  global.gc();
  if (kind === "profile") await post("Profiler.start");
  const start = performance.now();
  const core = createLifeCore(input, { observer: false });
  const initialized = performance.now();
  advanceCore(core, through);
  const end = performance.now();
  if (kind === "profile") {
    const { profile } = await post("Profiler.stop");
    writeFileSync(`${outputRoot}/${label}.cpuprofile`, JSON.stringify(profile));
  }
  const row = {
    kind,
    seconds: (end - start) / 1000,
    initializeSeconds: (initialized - start) / 1000,
    advanceSeconds: (end - initialized) / 1000,
    rssBytes: process.memoryUsage().rss,
    people: core.people.size,
    workResultCount: [...core.work.totalsByJob.values()].reduce(
      (sum, x) => sum + x.workedDays + x.missedDays,
      0,
    ),
    allTimeActs: core.allTimeActs,
    payrollCashSources: core.work.payrollCashSources?.size ?? null,
    payrollLedgers: core.work.payrollLedgerByCommitment?.size ?? null,
    journalNextSequence: core.journal?.nextSequence ?? null,
    worldId: core.worldId ?? null,
    date: core.date ?? core.now ?? null,
  };
  receipt.runs.push(row);
  process.stdout.write(JSON.stringify({ label, ...row }) + "\n");
  writeFileSync(
    `${outputRoot}/${label}.json`,
    JSON.stringify(receipt, null, 2) + "\n",
  );
}
session.disconnect();
receipt.endedAtUtc = new Date().toISOString();
const times = receipt.runs
  .filter((x) => x.kind.startsWith("timed"))
  .map((x) => x.seconds)
  .sort((a, b) => a - b);
receipt.medianSeconds = times[1];
receipt.daysPerMinute = (31 * 60) / times[1];
writeFileSync(
  `${outputRoot}/${label}.json`,
  JSON.stringify(receipt, null, 2) + "\n",
);

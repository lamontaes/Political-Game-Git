import { execFileSync, spawn } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  createWriteStream,
  readFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { drawRandomPlace } from "./repo/tests/support/random-place.ts";
import { lifePlaceStateIdentities } from "./repo/src/simulation/life-places.ts";
import { unincorporatedCountyJurisdictionIds } from "./repo/src/simulation/nationwide-world/local-governments.ts";
const out = "test-results/law-audit/all56-current-main";
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
if (execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim())
  throw Error("Dirty source; no audit start");
const expected = process.env.OCD_AUDIT_EXPECTED_MAIN;
if (!expected || head !== expected)
  throw Error("Actual-main pin mismatch; no run");
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/.pin`, "Preserve raw source/evidence/checkpoints.\n");
const worker = "/workspace/scratch/656ae98f7a9b/all56-worker.mts";
const driverDigest = createHash("sha256")
  .update(readFileSync(worker))
  .digest("hex");
const worlds = lifePlaceStateIdentities().map((state, index) => {
  let place, seed;
  for (let attempt = 0; attempt < 32; attempt++) {
    seed = `team2-full56-20260930-${state.jurisdictionKey}-${attempt}`;
    try {
      place = drawRandomPlace(
        seed,
        (p) => p.stateJurisdictionKey === state.jurisdictionKey,
      );
      break;
    } catch {}
  }
  if (!place)
    throw Error(`No actual place selected for ${state.jurisdictionKey}`);
  return {
    index: index + 1,
    seed,
    place: place.key,
    state: state.jurisdictionKey,
    placeName: place.displayName,
    unincorporated:
      unincorporatedCountyJurisdictionIds(place.context.jurisdiction.id)
        .length > 0,
    output: `${out}/${state.jurisdictionKey}`,
    status: "NOT RUN",
    pid: null,
    startedAt: null,
    finishedAt: null,
    exitCode: null,
  };
});
if (worlds.length !== 56 || new Set(worlds.map((w) => w.state)).size !== 56)
  throw Error("56-jurisdiction selection incomplete");
const manifest = {
  head,
  workerSourceSha256: driverDigest,
  production: "actual main, clean tree; external audit output driver only",
  months: 24,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  workers: 3,
  worlds,
  limits: [
    "Each of 56 actual state/DC/territory starting jurisdictions has its own normal 24-calendar-month world.",
    "Raw empty or rejected observations never establish absent physical effects.",
    "Only COMPLETED worlds supply final evidence.",
    "External worker adapts published audit runner output only; simulation and collector load exact clean actual-main files.",
    "No reserve bypass, helper agent, merge, full suite, speed or save/reopen claim.",
  ],
};
function persist() {
  writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2));
}
persist();
console.log(
  JSON.stringify({
    startedAt: manifest.startedAt,
    head,
    months: 24,
    workers: 3,
    selected: worlds.map((w) => ({
      state: w.state,
      place: w.place,
      seed: w.seed,
    })),
  }),
);
let cursor = 0;
async function run() {
  for (;;) {
    const world = worlds[cursor++];
    if (!world) return;
    if (
      execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim() !== head ||
      execFileSync("git", ["status", "--porcelain"], {
        encoding: "utf8",
      }).trim()
    )
      throw Error("Source changed; pending worlds not run");
    world.status = "RUNNING";
    world.startedAt = new Date().toISOString();
    const args = [
      "--max-old-space-size=4096",
      "--import",
      "tsx",
      worker,
      "--seed",
      world.seed,
      "--place",
      world.place,
      "--months",
      "24",
      "--out",
      world.output,
    ];
    world.command = [process.execPath, ...args];
    const log = createWriteStream(`${world.output}.log`);
    const child = spawn(process.execPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    world.pid = child.pid;
    persist();
    console.log(
      JSON.stringify({
        state: world.state,
        status: world.status,
        pid: world.pid,
        startedAt: world.startedAt,
        command: world.command,
      }),
    );
    child.stdout.pipe(log);
    child.stderr.pipe(log, { end: false });
    world.exitCode = await new Promise((resolve) => {
      child.once("error", (e) => {
        log.write(String(e));
        resolve(1);
      });
      child.once("close", (code) => resolve(code ?? 1));
    });
    log.end();
    world.finishedAt = new Date().toISOString();
    world.status = world.exitCode === 0 ? "COMPLETED" : "NORESULT";
    if (world.exitCode === 0) {
      try {
        const receipt = JSON.parse(
          readFileSync(`${world.output}.json`, "utf8"),
        );
        world.completedMonths = receipt.completedMonths;
        world.counts = receipt.counts;
        world.stampCoverage = receipt.stampCoverage;
        if (receipt.completedMonths !== 24 || receipt.problem)
          world.status = "PARTIAL";
      } catch (e) {
        world.status = "NORESULT";
        world.problem = String(e);
      }
    }
    persist();
    console.log(JSON.stringify(world));
  }
}
await Promise.all([run(), run(), run()]);
manifest.finishedAt = new Date().toISOString();
persist();
if (worlds.some((w) => w.status !== "COMPLETED")) process.exitCode = 1;

import { execFileSync, spawn } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  createWriteStream,
  readFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { drawRandomPlace } from "../../tests/support/random-place.ts";
import { lifePlaceStateIdentities } from "../../src/simulation/life-places.ts";
import { unincorporatedCountyJurisdictionIds } from "../../src/simulation/nationwide-world/local-governments.ts";
const out = process.env.OCD_AUDIT_OUTPUT ?? "docs/codex/law-audit/audit-systems-20260930-run";
if (!out.startsWith("docs/codex/law-audit/") || out.includes("..")) throw Error("Unowned output directory");
const workers = Number(process.env.OCD_AUDIT_WORKERS);
if (!Number.isSafeInteger(workers) || workers < 1) throw Error("Measured worker count required");
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
function validateSource() {
  const observed = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (observed !== expected) throw Error("Source head changed; no run");
  execFileSync("git", ["diff", "--exit-code", expected, "--", "src", "data", "package.json", "package-lock.json", "scripts/dev-lab", "tests/support", "scripts/law-audit/audit.ts", "scripts/law-audit/national.ts", "scripts/law-audit/run.ts", "scripts/law-audit/trace-inventory.json"], { stdio: "pipe" });
  const dirty = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim();
  for (const row of dirty.split("\n").filter(Boolean)) {
    const path = row.slice(3);
    if (!path.startsWith("docs/") && !["scripts/law-audit/all56-worker.mts", "scripts/law-audit/all56-orchestration.mjs"].includes(path))
      throw Error(`Unowned dirty path ${path}; no run`);
  }
  return dirty;
}
const expected = process.env.OCD_AUDIT_EXPECTED_MAIN;
if (!expected || head !== expected)
  throw Error("Actual-main pin mismatch; no run");
validateSource();
mkdirSync(out, { recursive: true });
const inheritedSelection = JSON.parse(readFileSync("docs/codex/law-audit/all56-1250-selected-places.json", "utf8"));
writeFileSync(`${out}/.pin`, "Preserve raw source/evidence/checkpoints.\n");
const worker = "/workspace/Political-Game-Git/scripts/law-audit/all56-worker.mts";
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
if (JSON.stringify(worlds.map(({ state, place, placeName, seed, unincorporated }) => ({state, place, placeName, seed, unincorporated}))) !== JSON.stringify(inheritedSelection))
  throw Error("Inherited selection does not match generated canonical geography");
if (worlds.length !== 56 || new Set(worlds.map((w) => w.state)).size !== 56)
  throw Error("56-jurisdiction selection incomplete");
const manifest = {
  head,
  workerSourceSha256: driverDigest,
  production: "exact actual-main production and merged collector bytes; disclosed documentation/audit-driver additions only",
  documentationAndDriverDirty: validateSource(),
  driverProvenance: "1285e53aef86b300a78d3abb1248696b57a279cabd4f; path/output/pin guard adaptations only",
  hostPid: process.pid,
  months: 24,
  sourceCommittedAt: execFileSync("git", ["show", "-s", "--format=%cI", head], {encoding:"utf8"}).trim(),
  startedAt: new Date().toISOString(),
  finishedAt: null,
  workers,
  workerSelection: process.env.OCD_AUDIT_CAPACITY_RECEIPT ?? "missing; inspect preflight",
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
    validateSource();
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
        world.performance = JSON.parse(readFileSync(`${world.output}.performance.json`, "utf8"));
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
writeFileSync(`${out}/campaign-lease.json`, JSON.stringify({ owner: "audit-systems", pid: process.pid, head, startedAt: manifest.startedAt, previousOwnerRelease: "Coordinator relay: previous audit owner confirms no nationwide world started and stops execution", reservation: process.env.OCD_STORAGE_RESERVATION ?? null }, null, 2), { flag: "wx" });
await Promise.all(Array.from({length:workers},()=>run()));
manifest.finishedAt = new Date().toISOString();
persist();
if (worlds.some((w) => w.status !== "COMPLETED")) process.exitCode = 1;

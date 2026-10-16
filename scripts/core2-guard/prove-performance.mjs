/* global process, console */
import assert from "node:assert/strict";
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { runCommand } from "./process.mjs";
import { compare } from "./compare.mjs";
import { drawPlace } from "../../tests/golden-path/place.ts";
import { gameStartDate } from "../../src/core2/game-start.ts";
import policies from "./policies.json" with { type: "json" };
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
if (git("status", "--porcelain")) throw Error("Proof requires clean checkout");
const args = process.argv.slice(2),
  revision = git("rev-parse", `${args[0]}^{commit}`),
  output = resolve(args[1]),
  original = git("symbolic-ref", "--short", "HEAD");
const directory = mkdtempSync(resolve(tmpdir(), "core2-speed-proof-")),
  started = performance.now(),
  place = drawPlace(revision, "M0-11");
for (const name of ["month.mjs", "policies.json", "profile-summary.mjs"])
  copyFileSync(resolve("scripts/core2-guard", name), resolve(directory, name));
copyFileSync(
  "docs/reports/2026-10-10-core2-slowdown-profile-tools/summarize.mjs",
  resolve(directory, "summarize.mjs"),
);
const execute = async (command) => {
  const result = await runCommand(command, {
    cwd: process.cwd(),
    milliseconds:
      policies.performanceMilliseconds - (performance.now() - started),
  });
  if (result.code !== 0 || result.timedOut)
    throw Error(result.output || "Proof deadline");
  return result;
};
const monthCommand = (receiptPath, extra = []) => [
  process.execPath,
  `--max-old-space-size=${policies.nodeHeapMiB}`,
  `--max-semi-space-size=${policies.nodeSemiSpaceMiB}`,
  ...extra,
  "--import",
  "tsx",
  resolve(directory, "month.mjs"),
  "--seed",
  place.seed,
  "--place-key",
  place.key,
  "--start-date",
  gameStartDate(),
  "--output",
  receiptPath,
];
const group = async (label) => {
  const rows = [];
  for (
    let index = 0;
    index < policies.warmupRuns + policies.measuredRuns;
    index++
  ) {
    console.log(`${label} run ${index + 1}`);
    const path = resolve(directory, `${label}-${index}.json`);
    await execute(monthCommand(path));
    if (index >= policies.warmupRuns)
      rows.push(JSON.parse(readFileSync(path, "utf8")));
  }
  return rows;
};
let source, result;
try {
  git("checkout", "--detach", revision);
  source = readFileSync("src/core2/life.ts", "utf8");
  const base = await group("base");
  const delay = Math.ceil(
    [...base.map((row) => row.advanceMilliseconds)].sort((a, b) => a - b)[1],
  );
  const needle = "export function advanceCore(";
  const start = source.indexOf(needle);
  const signature =
    "): { simulatedDays: number; decisions: number; acts: number } {";
  const relativeBody = source.slice(start).indexOf(signature);
  if (start < 0 || relativeBody < 0)
    throw Error("Clock signature changed: inspect proof injection");
  const opening = start + relativeBody + signature.length - 1;
  const injection = `\n  function m0DeliberateSlowdown() { const until = Date.now() + ${delay}; let value = 0; while (Date.now() < until) value = Math.imul(value + 1, 1664525); return value; }\n  m0DeliberateSlowdown();\n`;
  writeFileSync(
    "src/core2/life.ts",
    source.slice(0, opening + 1) + injection + source.slice(opening + 1),
  );
  const head = await group("deliberately-slow");
  const baseline = compare(base, base);
  assert.equal(baseline.speedPassed, true);
  const comparison = compare(base, head);
  assert.equal(
    comparison.speedPassed,
    false,
    "Computational slowdown was not detected",
  );
  console.log("Profiling the slowed clock outside the timing comparison");
  const profileDirectory = resolve(directory, "profile");
  mkdirSync(profileDirectory);
  await execute(
    monthCommand(resolve(directory, "profile.json"), [
      "--cpu-prof",
      `--cpu-prof-dir=${profileDirectory}`,
      "--cpu-prof-name=month.cpuprofile",
    ]),
  );
  const profile = JSON.parse(
    (
      await execute([
        process.execPath,
        resolve(directory, "profile-summary.mjs"),
        resolve(directory, "summarize.mjs"),
        resolve(profileDirectory, "month.cpuprofile"),
        String(policies.profileTop),
      ])
    ).output,
  );
  writeFileSync("src/core2/life.ts", source);
  console.log("Measuring the restored ordinary clock");
  const restoredPath = resolve(directory, "restored.json");
  await execute(monthCommand(restoredPath));
  const restored = JSON.parse(readFileSync(restoredPath, "utf8"));
  assert.equal(restored.sourcePatchSha256, base[0].sourcePatchSha256);
  assert.equal(restored.inputHash, base[0].inputHash);
  const budgetProof = await execute([
    process.execPath,
    "--import",
    "tsx",
    "--input-type=module",
    "-e",
    `import {censusOpeningInput,openingInputBudget} from './src/core2/tooling/opening-input-budget.ts';import registry from './src/core2/tooling/opening-input-budgets.json' with {type:'json'};const actual=openingInputBudget(censusOpeningInput({people:[{}],padding:'x'.repeat(Math.ceil(registry.openingInputMaxBytesPerResident.value)*2)}),registry);if(actual.passed)throw Error('Oversized input accepted');console.log(JSON.stringify(actual));`,
  ]);
  result = {
    schema: "m0-performance-proof-v1",
    revision,
    place,
    mutation:
      "Temporary CPU loop at the real advanceCore boundary, removed after measurement",
    injectedMilliseconds: delay,
    baseline,
    comparison,
    base,
    deliberatelySlow: head,
    slowestFunctions: profile.self,
    restored,
    openingOversizeFixture: JSON.parse(budgetProof.output),
    elapsedMilliseconds: performance.now() - started,
  };
} catch (error) {
  result = {
    revision,
    place,
    error: String(error),
    elapsedMilliseconds: performance.now() - started,
  };
  process.exitCode = 1;
} finally {
  if (source) writeFileSync("src/core2/life.ts", source);
  git("checkout", original);
}
writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
console.log(
  `Proof receipt: ${output}; ${result.error ?? "measured slowdown detected and clock restored"}`,
);

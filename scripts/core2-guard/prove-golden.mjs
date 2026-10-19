/* global process, console */
import assert from "node:assert/strict";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { runSuite } from "../../tests/golden-path/runner.mjs";
import { drawPlace } from "../../tests/golden-path/place.ts";
import policies from "./policies.json" with { type: "json" };
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
if (git("status", "--porcelain")) throw Error("Proof requires clean checkout");
const args = process.argv.slice(2),
  revision = git("rev-parse", `${args[0]}^{commit}`),
  output = resolve(args[1]),
  original = git("symbolic-ref", "--short", "HEAD");
const directory = mkdtempSync(resolve(tmpdir(), "core2-contact-proof-"));
for (const name of [
  "process.mjs",
  "policies.json",
  "month.mjs",
  "provisional-step2.mjs",
])
  copyFileSync(resolve("scripts/core2-guard", name), resolve(directory, name));
const command = [
  process.execPath,
  `--max-old-space-size=${policies.nodeHeapMiB}`,
  `--max-semi-space-size=${policies.nodeSemiSpaceMiB}`,
  "--import",
  "tsx",
  resolve(directory, "provisional-step2.mjs"),
];
const document = {
  features: [{ id: "M0-07-provisional-detector", passes: true, command }],
};
const run = () =>
  runSuite({
    document,
    commit: revision,
    cwd: process.cwd(),
    budget: policies.prMilliseconds,
    drawPlace,
  });
let source, results;
try {
  git("checkout", "--detach", revision);
  source = readFileSync("src/core2/opening-peer-network.ts", "utf8");
  const needle = "knownIds: known ? [...known] : person.knownIds,";
  if (!source.includes(needle))
    throw Error(
      "Contact producer changed; adapt proof without changing its tests",
    );
  const before = await run();
  assert.equal(before.regression, false, "Clean provisional command failed");
  writeFileSync(
    "src/core2/opening-peer-network.ts",
    source.replace(needle, "knownIds: [],"),
  );
  const broken = await run();
  assert.equal(broken.regression, true, "Real contact break was not detected");
  writeFileSync("src/core2/opening-peer-network.ts", source);
  const restored = await run();
  assert.equal(
    restored.regression,
    false,
    "Restored provisional command failed",
  );
  results = {
    schema: "m0-golden-proof-v1",
    revision,
    provisional: true,
    scope:
      "Detector overlay only: does not register or accept M0-07; existing contact/relationship tests plus generated opening",
    mutation: "Opening school-peer producer discards knownIds",
    before,
    broken,
    restored,
  };
} catch (error) {
  results = { revision, provisional: true, error: String(error) };
  process.exitCode = 1;
} finally {
  if (source) writeFileSync("src/core2/opening-peer-network.ts", source);
  git("checkout", original);
}
writeFileSync(output, JSON.stringify(results, null, 2) + "\n");
console.log(
  `Proof receipt: ${output}; ${results.error ?? "before passed, deliberate break red, restoration passed"}`,
);

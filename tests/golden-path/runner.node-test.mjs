/* global process, setTimeout */
import { Buffer } from "node:buffer";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runSuite, validateFeatures } from "./runner.mjs";
import { drawPlace } from "./place.ts";
import { runCommand } from "../../scripts/core2-guard/process.mjs";
const fixturePlace = () => ({
  seed: "fixture",
  key: "fixture",
  name: "Fixture",
  state: "fixture",
});
const suite = (features, extra = {}) =>
  runSuite({
    document: { features },
    commit: "fixture",
    cwd: process.cwd(),
    budget: 1000,
    drawPlace: fixturePlace,
    ...extra,
  });
const spec = (id, passes, command) => ({ id, passes, command });
test("accepted regressions block but goals cannot grant or revoke acceptance", async () => {
  const document = [
    spec("goal", false, [process.execPath, "-e", "process.exit(2)"]),
    spec("accepted", true, [process.execPath, "-e", "process.exit(0)"]),
  ];
  const snapshot = JSON.stringify(document),
    receipt = await suite(document);
  assert.equal(receipt.regression, false);
  assert.equal(receipt.results[0].id, "accepted");
  assert.equal(receipt.results[1].status, "failed");
  assert.equal(JSON.stringify(document), snapshot);
  const broken = await suite([
    spec("accepted", true, [
      process.execPath,
      "-e",
      "throw Error('actual test failure')",
    ]),
  ]);
  assert.equal(broken.regression, true);
  assert.equal(broken.results[0].status, "failed");
});
test("a long-running accepted spec runs after the quick ones, goals after both", async () => {
  const ok = [process.execPath, "-e", "process.exit(0)"];
  const receipt = await suite([
    { ...spec("year", true, ok), longRunning: true },
    spec("goal", false, ok),
    spec("quick", true, ok),
  ]);
  assert.deepEqual(
    receipt.results.map((row) => row.id),
    ["quick", "year", "goal"],
  );
});
test("missing accepted command is red, missing goal remains visible", async () => {
  const receipt = await suite([
    spec("goal", false, null),
    spec("accepted", true, null),
  ]);
  assert.equal(receipt.regression, true);
  assert.equal(receipt.configuredCommands, 0);
  assert.equal(receipt.results.length, 2);
});
test("deadline kills command descendants and reports goals not reached", async () => {
  const directory = mkdtempSync(join(tmpdir(), "golden-deadline-")),
    marker = join(directory, "descendant");
  const descendant = `setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(marker)},'escaped'),300)`;
  const parent = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'ignore'});setInterval(()=>{},1000)`;
  const receipt = await suite(
    [
      spec("accepted", true, [process.execPath, "-e", parent]),
      spec("goal", false, [process.execPath, "-e", "process.exit(0)"]),
    ],
    { budget: 100 },
  );
  assert.equal(receipt.regression, true);
  assert.equal(receipt.results[0].status, "timeout");
  assert.equal(receipt.results[1].status, "not-reached");
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal(existsSync(marker), false);
});
test("commands receive reproducible place bindings", async () => {
  const directory = mkdtempSync(join(tmpdir(), "golden-bindings-")),
    output = join(directory, "bindings.json");
  const script = `require('node:fs').writeFileSync(${JSON.stringify(output)},JSON.stringify([process.env.GOLDEN_PATH_SEED,process.env.GOLDEN_PATH_PLACE_KEY,process.env.GOLDEN_PATH_SPEC_ID,process.env.GOLDEN_PATH_COMMIT]))`;
  await suite([spec("binding", true, [process.execPath, "-e", script])]);
  assert.deepEqual(JSON.parse(readFileSync(output, "utf8")), [
    "fixture",
    "fixture",
    "binding",
    "fixture",
  ]);
});
test("real place draw is reproducible and covers all 56 identities", () => {
  const first = drawPlace("fixture", "M0-07");
  assert.deepEqual(drawPlace("fixture", "M0-07"), first);
  assert.ok(first.key);
  assert.notEqual(drawPlace("other", "M0-07").seed, first.seed);
  const states = new Set();
  for (let index = 0; index < 1024; index++)
    states.add(drawPlace(String(index), "M0-07").state);
  assert.equal(states.size, 56);
});
test("bad registry and command startup fail explicitly", async () => {
  assert.throws(() =>
    validateFeatures({
      features: [spec("same", false, null), spec("same", true, null)],
    }),
  );
  assert.throws(() => validateFeatures({ features: [spec("bad", true, [])] }));
  const result = await runCommand(["/nonexistent/golden-command"], {
    cwd: process.cwd(),
    milliseconds: 1000,
  });
  assert.equal(result.code, null);
  assert.ok(result.error);
});

test("failure logs retain bounded bytes and successful output stays out of receipts", async () => {
  const result = await runCommand(
    [
      process.execPath,
      "-e",
      "process.stdout.write('x'.repeat(200000));process.exit(1)",
    ],
    { cwd: process.cwd(), milliseconds: 1000 },
  );
  assert.ok(Buffer.byteLength(result.output) <= 65536);
  assert.equal(result.code, 1);
  const receipt = await suite([
    spec("quiet-success", true, [
      process.execPath,
      "-e",
      "console.log('world-output')",
    ]),
  ]);
  assert.equal(receipt.results[0].output, "");
});
test("plain vitest specs run together in one process and are told apart by file", async () => {
  const calls = [];
  const execute = async (command, options) => {
    calls.push({ command, options });
    if (typeof command === "string")
      return { code: 1, timedOut: false, milliseconds: 1, output: "alone" };
    const out = command.find((x) => x.startsWith("--outputFile=")).slice(13);
    writeFileSync(
      out,
      JSON.stringify({
        testResults: [
          { name: resolve("tests/a.test.ts"), status: "passed" },
          { name: resolve("tests/b.test.ts"), status: "failed" },
        ],
      }),
    );
    return { code: 1, timedOut: false, milliseconds: 5, output: "b failed" };
  };
  const receipt = await suite(
    [
      spec("A", true, "npx vitest run tests/a.test.ts"),
      spec("B", true, ["npx", "vitest", "run", "tests/b.test.ts"]),
      spec("C", true, "npx vitest run -t slow tests/c.test.ts"),
    ],
    { execute },
  );
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].command.slice(0, 5), [
    "npx",
    "vitest",
    "run",
    "tests/a.test.ts",
    "tests/b.test.ts",
  ]);
  const status = Object.fromEntries(
    receipt.results.map((r) => [r.id, r.status]),
  );
  assert.deepEqual(status, { A: "passed", B: "failed", C: "failed" });
  assert.equal(receipt.regression, true);
});

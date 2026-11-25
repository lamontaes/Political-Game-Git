/* global process, setTimeout */
import { Buffer } from "node:buffer";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runSuite, specBudget, validateFeatures } from "./runner.mjs";
import policies from "../../scripts/core2-guard/policies.json" with { type: "json" };
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
    // A fixture's own budget is exactly its measured time.
    policy: { specBudgetRatio: 1, specBudgetFloorMilliseconds: 0 },
    ...extra,
  });
const spec = (id, passes, command, measuredMilliseconds = 1000) => ({
  id,
  passes,
  command,
  ...(passes && command ? { measuredMilliseconds } : {}),
});
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
test("the quick run leaves the long-running specs out and the long run holds only them", async () => {
  const ok = [process.execPath, "-e", "process.exit(0)"];
  const features = [
    { ...spec("year", true, ok), longRunning: true },
    spec("quick", true, ok),
  ];
  const quick = await suite(features, { only: "quick" });
  assert.deepEqual(
    quick.results.map((row) => row.id),
    ["quick"],
  );
  const long = await suite(features, { only: "long" });
  assert.deepEqual(
    long.results.map((row) => row.id),
    ["year"],
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
      spec("accepted", true, [process.execPath, "-e", parent], 100),
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
test("the specs that play a year or more run in the long job, so the quick job's budget is not spent on them", () => {
  const document = JSON.parse(
      readFileSync(resolve("docs/roadmap/features.json"), "utf8"),
    ),
    long = validateFeatures(document)
      .filter((row) => row.longRunning === true)
      .map((row) => row.id);
  // M0-13 plays the world's year; M1-11 plays one too and took 52 to 193
  // seconds by the place drawn (Mount Hebron, California; Newington, Virginia),
  // which starved M2-05 to M3-09 of the shared budget on two pull requests.
  for (const id of ["M0-13", "M1-11"])
    assert.ok(long.includes(id), `${id} runs in the long job`);
});
test("the last accepted spec keeps its own budget after the earlier ones used the job's whole clock", async () => {
  // The red this fixes: on one shared clock of 450 s the nineteen accepted
  // specs before M3-09 took 444 s, so M3-09 was killed after 5.7 s
  // (Mashantucket, Connecticut, main c5808caa). Here the first spec outlasts
  // the job's clock and the last one still runs to its end.
  const wait = (ms) => [
    process.execPath,
    "-e",
    `setTimeout(()=>process.exit(0),${ms})`,
  ];
  const receipt = await suite(
    [
      spec("first", true, wait(300), 2000),
      spec("last", true, wait(300), 2000),
      spec("goal", false, wait(0)),
    ],
    { budget: 200 },
  );
  assert.deepEqual(
    receipt.results.map((row) => [row.id, row.status]),
    [
      ["first", "passed"],
      ["last", "passed"],
      ["goal", "not-reached"],
    ],
  );
  assert.equal(receipt.regression, false);
  assert.equal(receipt.results[1].budgetMilliseconds, 2000);
});
test("an accepted spec is still cut off at its own budget, and an accepted row without a measured time is refused", async () => {
  const receipt = await suite([
    spec(
      "slow",
      true,
      [process.execPath, "-e", "setInterval(()=>{},1000)"],
      100,
    ),
    spec("next", true, [process.execPath, "-e", "process.exit(0)"]),
  ]);
  assert.equal(receipt.results[0].status, "timeout");
  assert.ok(receipt.results[0].milliseconds < 1000);
  assert.equal(receipt.results[1].status, "passed");
  assert.equal(receipt.regression, true);
  assert.throws(
    () =>
      validateFeatures({
        features: [{ id: "bare", passes: true, command: "true" }],
      }),
    /measured time/,
  );
  assert.equal(
    specBudget(
      { measuredMilliseconds: 10 },
      { specBudgetRatio: 2, specBudgetFloorMilliseconds: 50 },
    ),
    50,
  );
});
test("every accepted spec's own budget, added up, fits its job's time limit less setup", () => {
  const rows = validateFeatures(
    JSON.parse(readFileSync(resolve("docs/roadmap/features.json"), "utf8")),
  ).filter((row) => row.passes && row.command);
  // goldenJobMinutes includes five minutes of dependency setup.
  const limit = (policies.goldenJobMinutes - 5) * 60000;
  for (const long of [false, true]) {
    const total = rows
      .filter((row) => (row.longRunning === true) === long)
      .reduce((sum, row) => sum + specBudget(row), 0);
    assert.ok(
      total <= limit,
      `${long ? "long" : "quick"} job: ${total} ms of budgets against ${limit} ms`,
    );
  }
});

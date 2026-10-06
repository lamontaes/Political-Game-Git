import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";

const source = readFileSync(
  new URL("../scripts/smoke-test.mjs", import.meta.url),
  "utf8",
);
const step = source.slice(
  source.indexOf("// ---- Native title:"),
  source.indexOf("// ---- Session 1:"),
);

async function proof(nativeSessionChecks, closes = true) {
  const calls = [];
  const checks = [];
  let emitClose;
  const app = {
    waitForEvent: (name, options) => {
      calls.push({ event: name, timeout: options.timeout });
      return new Promise((resolve, reject) => {
        emitClose = () =>
          closes ? resolve() : reject(new Error("Application did not exit"));
      });
    },
  };
  const page = {
    getByTestId: (id) => ({
      waitFor: async () => calls.push({ waitFor: id }),
      click: async () => {
        calls.push({ click: id });
        emitClose();
      },
    }),
  };
  const run = runInNewContext(`(async () => { ${step} })()`, {
    nativeSessionChecks,
    launch: async () => {
      calls.push("launch");
      return { app, page };
    },
    check: (name, passed) => checks.push({ name, passed }),
  });
  return { run, calls, checks };
}

test("native title proof uses the actual Quit control and waits for application close before PASS", async () => {
  const actual = await proof(true);
  await actual.run;
  assert.deepEqual(actual.calls, [
    "launch",
    { waitFor: "quit" },
    { event: "close", timeout: 30000 },
    { click: "quit" },
  ]);
  assert.equal(actual.checks.length, 1);
  assert.equal(actual.checks[0].passed, true);
});

test("a window click without application exit cannot pass the native proof", async () => {
  const actual = await proof(true, false);
  await assert.rejects(actual.run, /Application did not exit/);
  assert.equal(actual.checks.length, 0);
});

test("ordinary browser/standalone smoke does not invent a native Quit bridge", async () => {
  const actual = await proof(false);
  await actual.run;
  assert.deepEqual(actual.calls, []);
  assert.deepEqual(actual.checks, []);
});

test("the existing unsaved Cancel, failed-save and held-save guard proofs remain", () => {
  for (const check of [
    "native: Cancel retains the life",
    "native: failed save keeps the app and life open",
    "native: pending save keeps life alive and blocks edits",
  ])
    assert.ok(source.includes(check), `missing guard proof: ${check}`);
  assert.match(source, /await nativeRefusals\(app, page\)/);
  assert.match(source, /await nativeSaveAndQuit\(app, page\)/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";
import { runInNewContext } from "node:vm";

const source = readFileSync(
  new URL("../scripts/smoke-test.mjs", import.meta.url),
  "utf8",
);
const launchSource = source.slice(
  source.indexOf("async function launch()"),
  source.indexOf("// Fault injection"),
);

async function launched({ hubPath = null, nativeSessionChecks = false } = {}) {
  const listeners = new Map();
  const messages = [];
  const page = {
    on: (name, callback) => listeners.set(name, callback),
    url: () => "app://game/index.html",
    waitForLoadState: async () => {},
  };
  const app = { firstWindow: async () => page, windows: () => [page] };
  const result = await runInNewContext(`${launchSource}\nlaunch();`, {
    _electron: { launch: async () => app },
    hubPath,
    nativeSessionChecks,
    appPath: "isolated-client",
    profile: "isolated-profile",
    process: { env: {} },
    gameLaunchEnvironment: () => ({}),
    isPackagedRenderRequest: (url) => url.startsWith("app://game/"),
    console: { log: (message) => messages.push(message) },
  });
  return { listeners, messages, result };
}

for (const [name, options] of [
  ["standalone packaged client", {}],
  ["hub ordinary session", { hubPath: "isolated-hub" }],
  [
    "hub native-session proof",
    { hubPath: "isolated-hub", nativeSessionChecks: true },
  ],
]) {
  test(`${name} leaves beforeunload with the native owner rather than Playwright auto-dismiss`, async () => {
    const { listeners, messages } = await launched(options);
    const handler = listeners.get("dialog");
    assert.equal(typeof handler, "function");
    let accepts = 0;
    let dismissals = 0;
    handler({
      type: () => "beforeunload",
      accept: () => accepts++,
      dismiss: () => dismissals++,
    });
    assert.equal(
      accepts,
      0,
      "the proof cannot force an unload past the native guard",
    );
    assert.equal(
      dismissals,
      0,
      "a native dialog must not receive a second browser dismissal",
    );
    assert.equal(messages.length, 1);
  });
}

test("unexpected dialogs still fail instead of being silently accepted", async () => {
  const { listeners } = await launched();
  assert.throws(
    () => listeners.get("dialog")({ type: () => "alert" }),
    /Unexpected browser dialog: alert/,
  );
});

test("the native dialog listener preserves offline request evidence", async () => {
  const { listeners, result } = await launched();
  listeners.get("request")({ url: () => "app://game/assets/client.js" });
  listeners.get("request")({ url: () => "https://outside.invalid/request" });
  assert.equal(result.foreign.length, 1);
  assert.equal(result.foreign[0], "https://outside.invalid/request");
});

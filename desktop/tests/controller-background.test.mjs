import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { URL } from "node:url";
import {
  AUTOMATIC_CHECK_INTERVAL_MS,
  automaticCheckDue,
  cleanControllerState,
  cleanUpdatePolicy,
  setUpdateMode,
  withPendingBuild,
  activatePendingBuild,
} from "../private-controller/private-update.mjs";
import { controllerControls } from "../private-controller/controller-view.mjs";
import { inspectInstalledBuild } from "../private-controller/controller-status.mjs";
import {
  COMPATIBILITY_PATHS,
  compatibilityRefusal,
  sourceCompatibility,
} from "../private-controller/update-compatibility.mjs";

const A = "a".repeat(40);
const B = "b".repeat(40);
const current = {
  revision: A,
  version: "0.2.0",
  profile: "internal-art-review",
  appPath: "/fixture/A.app",
  architecture: "arm64",
};
const legacy = {
  schema: 1,
  current,
  pending: null,
  previous: null,
  repositoryPath: "/fixture/repo",
};

test("ready Play remains enabled during busy, failed, cancelled and staged checks", () => {
  for (const outcome of [
    "checking",
    "offline",
    "failed",
    "cancelled",
    "pending-safe-close",
  ]) {
    const controls = controllerControls({
      ready: true,
      busy: true,
      pending: { revision: B },
      outcome,
    });
    assert.equal(controls.playDisabled, false);
    assert.equal(controls.updateDisabled, true);
    assert.equal(controls.finishDisabled, true);
  }
  assert.equal(controllerControls({ ready: false }).playDisabled, true);
});

test("legacy state adopts automatic policy but future or malformed explicit preference is manual", () => {
  assert.equal(cleanControllerState(legacy).updatePolicy.mode, "automatic");
  assert.equal(
    cleanUpdatePolicy({ version: 2, mode: "automatic" }).mode,
    "manual",
  );
  assert.equal(cleanUpdatePolicy(null).mode, "manual");
  assert.equal(
    cleanUpdatePolicy({ version: 1, mode: "unexpected" }).mode,
    "manual",
  );
  assert.equal(cleanControllerState({ ...legacy, schema: 2 }), null);
});

test("manual opt-out survives cleaning, staging and activation; same-semver pointer changes only at activation", () => {
  const restored = cleanControllerState(
    JSON.parse(
      JSON.stringify(setUpdateMode(cleanControllerState(legacy), "manual")),
    ),
  );
  assert.equal(restored.updatePolicy.mode, "manual");
  const staged = withPendingBuild(
    restored,
    { ...current, revision: B, appPath: "/fixture/B.app" },
    "/fixture/repo",
  );
  assert.equal(staged.updatePolicy.mode, "manual");
  assert.equal(staged.current.revision, A);
  const activated = activatePendingBuild(staged);
  assert.equal(activated.updatePolicy.mode, "manual");
  assert.equal(activated.current.revision, B);
  assert.equal(activated.previous.revision, A);
  assert.equal(activated.current.version, activated.previous.version);
  assert.throws(() => setUpdateMode(restored, "future"));
});

test("automatic discovery is independent of Play and bounded to six hours", () => {
  const state = cleanControllerState(legacy);
  const now = Date.parse("2026-09-13T20:00:00.000Z");
  assert.equal(automaticCheckDue(state, now), true);
  state.updatePolicy.lastAttemptAt = new Date(now).toISOString();
  assert.equal(
    automaticCheckDue(state, now + AUTOMATIC_CHECK_INTERVAL_MS - 1),
    false,
  );
  assert.equal(
    automaticCheckDue(state, now + AUTOMATIC_CHECK_INTERVAL_MS),
    true,
  );
  assert.equal(
    automaticCheckDue(
      setUpdateMode(state, "manual"),
      now + 2 * AUTOMATIC_CHECK_INTERVAL_MS,
    ),
    false,
  );
  assert.equal(
    automaticCheckDue(
      { ...state, pending: current },
      now + 2 * AUTOMATIC_CHECK_INTERVAL_MS,
    ),
    false,
  );
  assert.equal(
    automaticCheckDue(
      { ...state, repositoryPath: null },
      now + 2 * AUTOMATIC_CHECK_INTERVAL_MS,
    ),
    false,
  );
  assert.equal(automaticCheckDue(state, now - 1), false);
});

test("new source is compatible only with identical verified save/interface surfaces", () => {
  const sources = Object.fromEntries(
    COMPATIBILITY_PATHS.map((filename) => [
      filename,
      `${filename}\nfixture source\n`,
    ]),
  );
  const a = sourceCompatibility(A, (filename) => sources[filename]);
  const b = sourceCompatibility(B, (filename) => sources[filename]);
  assert.equal(compatibilityRefusal(a, b), null);
  assert.equal(
    compatibilityRefusal(a, { ...b, version: 2 }),
    "unsupported-compatibility-contract",
  );
  assert.equal(
    compatibilityRefusal(a, { ...b, surfaces: {} }),
    "unsupported-compatibility-contract",
  );
  for (const filename of COMPATIBILITY_PATHS) {
    const changed = sourceCompatibility(B, (name) =>
      name === filename ? `${sources[name]}changed` : sources[name],
    );
    assert.equal(
      compatibilityRefusal(a, changed),
      `unverified-migration:${filename}`,
    );
  }
  assert.throws(() => sourceCompatibility(B, () => ""));
});

test("installed identity comes from bundle, not pointer version or newest source", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "ocd-installed-metadata-"));
  const appPath = path.join(root, "Game.app");
  const resources = path.join(appPath, "Contents", "Resources");
  mkdirSync(resources, { recursive: true });
  const identity = {
    version: "0.2.0",
    revision: A,
    dirty: false,
    profile: "internal-art-review",
    distribution: "direct",
    channel: "internal",
    clientTreeSha256: "c".repeat(64),
  };
  const stamp = path.join(resources, "build-identity.json");
  writeFileSync(stamp, JSON.stringify(identity));
  const pointer = { ...current, appPath };
  const missing = inspectInstalledBuild(pointer);
  assert.equal(missing.ready, false);
  assert.equal(missing.identity.revision, A);
  assert.match(missing.problem, /framework is missing/);
  for (const target of [
    path.join(appPath, "Contents", "MacOS", "Our Civic Duty"),
    path.join(
      appPath,
      "Contents",
      "Frameworks",
      "Electron Framework.framework",
      "Versions",
      "Current",
      "Electron Framework",
    ),
  ]) {
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, "fixture executable");
  }
  assert.equal(inspectInstalledBuild(pointer).ready, true);
  for (const changed of [
    { revision: B },
    { version: "0.3.0" },
    { profile: "production" },
    { channel: "stable" },
    { distribution: "steam" },
    { dirty: true },
    { clientTreeSha256: "unknown" },
  ]) {
    writeFileSync(stamp, JSON.stringify({ ...identity, ...changed }));
    assert.equal(inspectInstalledBuild(pointer).ready, false);
  }
});

test("worker cannot activate or replace installed version; renderer uses tested Play contract", () => {
  const worker = readFileSync(
    new URL("../private-controller/private-update-worker.mjs", import.meta.url),
    "utf8",
  );
  const renderer = readFileSync(
    new URL("../private-controller/renderer.mjs", import.meta.url),
    "utf8",
  );
  assert.equal(worker.includes("activatePendingBuild"), false);
  assert.equal(worker.includes("rmSync(paths.appPath"), false);
  assert.match(
    worker,
    /compatibilityRefusal\(currentContract, targetContract\)/,
  );
  assert.match(renderer, /play.disabled = controls.playDisabled/);
});

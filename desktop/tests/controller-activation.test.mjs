/* global structuredClone */
import assert from "node:assert/strict";
import test from "node:test";
import { switchVerifiedBuild } from "../private-controller/controller-activation.mjs";
import { sourceCompatibility } from "../private-controller/update-compatibility.mjs";
import { activatePendingBuild } from "../private-controller/private-update.mjs";

const A = "a".repeat(40);
const B = "b".repeat(40);
const contract = (revision) =>
  sourceCompatibility(revision, () => "exact fixture source\n");
const a = contract(A);
const b = contract(B);
const record = (revision) => ({
  revision,
  version: "0.2.0",
  profile: "internal-art-review",
  appPath: `/disposable/${revision}/Game.app`,
  architecture: "arm64",
});
const identity = (revision) => ({
  revision,
  version: "0.2.0",
  dirty: false,
  profile: "internal-art-review",
  distribution: "direct",
  channel: "internal",
  clientTreeSha256: "c".repeat(64),
  compatibility: revision === A ? a : b,
});

function fixture() {
  const state = {
    schema: 1,
    current: record(A),
    pending: record(B),
    previous: null,
    compatibilityProof: { version: 1, current: a, pending: b },
    updatePolicy: { version: 1, mode: "manual" },
  };
  const writes = [];
  const opens = [];
  const io = {
    busy: false,
    inspect: (build) => ({
      ready: true,
      identity: identity(build.revision),
      problem: null,
    }),
    isRunning: async () => false,
    writeState: (next) => writes.push(structuredClone(next)),
    openPath: async (appPath) => {
      opens.push(appPath);
      return "";
    },
  };
  return { state, io, writes, opens };
}

test("explicit same-semver finish activates B and retains source-bound last-good A and manual preference", async () => {
  const f = fixture();
  const result = await switchVerifiedBuild(f.state, "finish", f.io);
  assert.equal(result.ok, true);
  assert.equal(f.writes.length, 1);
  const next = f.writes[0];
  assert.equal(next.current.revision, B);
  assert.equal(next.previous.revision, A);
  assert.equal(next.current.version, next.previous.version);
  assert.equal(next.pending, null);
  assert.deepEqual(next.rollbackProof, { version: 1, previous: a, current: b });
  assert.equal(next.updatePolicy.mode, "manual");
  assert.deepEqual(f.opens, [f.state.pending.appPath]);
});

test("running game and busy staging refuse finish without writes, opens or forced close", async () => {
  for (const scenario of ["running", "busy"]) {
    const f = fixture();
    if (scenario === "running") f.io.isRunning = async () => true;
    else f.io.busy = true;
    const result = await switchVerifiedBuild(f.state, "finish", f.io);
    assert.equal(result.ok, false);
    assert.equal(f.writes.length, 0);
    assert.equal(f.opens.length, 0);
    assert.match(
      result.message,
      scenario === "running" ? /durable-save guard/ : /Play remains available/,
    );
  }
});

test("unknown running state fails closed, never treating an observation failure as persistence", async () => {
  const f = fixture();
  f.io.isRunning = async () => {
    throw new Error("process observation unavailable");
  };
  await assert.rejects(
    switchVerifiedBuild(f.state, "finish", f.io),
    /observation unavailable/,
  );
  assert.equal(f.writes.length, 0);
  assert.equal(f.opens.length, 0);
});

test("missing, future, mismatched and changed save/interface compatibility proofs refuse activation", async () => {
  const changed = {
    ...b,
    surfaces: {
      ...b.surfaces,
      "src/presentation/browser-shell-state.ts": "d".repeat(64),
    },
  };
  for (const proof of [
    null,
    { version: 2, current: a, pending: b },
    { version: 1, current: b, pending: b },
    { version: 1, current: a, pending: changed },
  ]) {
    const f = fixture();
    f.state.compatibilityProof = proof;
    assert.equal(
      (await switchVerifiedBuild(f.state, "finish", f.io)).ok,
      false,
    );
    assert.equal(f.writes.length, 0);
    assert.equal(f.opens.length, 0);
  }
});

test("actual compiled candidate identity, channel, profile and future contract are rechecked at finish", async () => {
  for (const delta of [
    { revision: A },
    { version: "0.3.0" },
    { dirty: true },
    { profile: "production" },
    { distribution: "steam" },
    { channel: "stable" },
    { clientTreeSha256: "unknown" },
    { compatibility: null },
    { compatibility: { ...b, version: 2 } },
    { compatibility: { ...b, sourceRevision: A } },
  ]) {
    const f = fixture();
    f.io.inspect = (build) => ({
      ready: true,
      identity: {
        ...identity(build.revision),
        ...(build.revision === B ? delta : {}),
      },
    });
    assert.equal(
      (await switchVerifiedBuild(f.state, "finish", f.io)).ok,
      false,
    );
    assert.equal(f.writes.length, 0);
    assert.equal(f.opens.length, 0);
  }
});

test("actual current identity cannot be replaced by matching headings, pointer semver or different source", async () => {
  for (const delta of [
    { revision: B },
    { version: "0.3.0" },
    { dirty: true },
    { profile: "production" },
    { compatibility: { ...a, version: 2 } },
  ]) {
    const f = fixture();
    f.io.inspect = (build) => ({
      ready: true,
      identity: {
        ...identity(build.revision),
        ...(build.revision === A ? delta : {}),
      },
    });
    assert.equal(
      (await switchVerifiedBuild(f.state, "finish", f.io)).ok,
      false,
    );
    assert.equal(f.writes.length, 0);
  }
});

test("broken framework replacement is possible only with a valid old identity and exact staging proof", async () => {
  const f = fixture();
  f.io.inspect = (build) => ({
    ready: build.revision === B,
    identity: identity(build.revision),
    problem: build.revision === A ? "old framework missing" : null,
  });
  assert.equal((await switchVerifiedBuild(f.state, "finish", f.io)).ok, true);
  assert.equal(f.writes[0].current.revision, B);
});

test("missing candidate executable or framework refuses before touching the Play pointer", async () => {
  const f = fixture();
  f.io.inspect = (build) => ({
    ready: build.revision !== B,
    identity: identity(build.revision),
    problem: "framework missing",
  });
  const result = await switchVerifiedBuild(f.state, "finish", f.io);
  assert.equal(result.ok, false);
  assert.match(result.message, /framework missing/);
  assert.equal(f.writes.length, 0);
});

test("open failure or thrown launch restores the complete prior pointer and staged candidate", async () => {
  for (const throws of [false, true]) {
    const f = fixture();
    f.io.openPath = async () => {
      if (throws) throw new Error("launch failed");
      return "launch failed";
    };
    const result = await switchVerifiedBuild(f.state, "finish", f.io);
    assert.equal(result.ok, false);
    assert.match(result.message, /prior Play pointer was restored/);
    assert.equal(f.writes.length, 2);
    assert.equal(f.writes[0].current.revision, B);
    assert.deepEqual(f.writes[1], f.state);
  }
});

test("state-write failure does not open a candidate or claim successful activation", async () => {
  const f = fixture();
  f.io.writeState = () => {
    throw new Error("durable controller state write failed");
  };
  await assert.rejects(
    switchVerifiedBuild(f.state, "finish", f.io),
    /state write failed/,
  );
  assert.equal(f.opens.length, 0);
});

test("explicit offline last-good rollback preserves manual policy and holds the rejected source without deleting bundles", async () => {
  const f = fixture();
  const activated = activatePendingBuild(f.state);
  const result = await switchVerifiedBuild(activated, "rollback", f.io);
  assert.equal(result.ok, true);
  const restored = f.writes[0];
  assert.equal(restored.current.revision, A);
  assert.equal(restored.current.version, activated.current.version);
  assert.equal(restored.blockedRevision, B);
  assert.equal(restored.previous, null);
  assert.equal(restored.pending, null);
  assert.equal(restored.updatePolicy.mode, "manual");
  assert.deepEqual(f.opens, [activated.previous.appPath]);
  assert.equal(
    (await switchVerifiedBuild(restored, "rollback", f.io)).ok,
    false,
  );
});

test("rollback is refused for a running game, future contract or ambiguous staged update", async () => {
  for (const scenario of ["running", "future", "pending"]) {
    const f = fixture();
    const state = activatePendingBuild(f.state);
    if (scenario === "running") f.io.isRunning = async () => true;
    if (scenario === "future") state.rollbackProof.version = 2;
    if (scenario === "pending") state.pending = record("d".repeat(40));
    assert.equal(
      (await switchVerifiedBuild(state, "rollback", f.io)).ok,
      false,
    );
    assert.equal(f.writes.length, 0);
    assert.equal(f.opens.length, 0);
  }
});

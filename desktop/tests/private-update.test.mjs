import assert from "node:assert/strict";
import test from "node:test";

import {
  activatePendingBuild,
  assessUpdateTarget,
  buildRecord,
  canonicalRepository,
  cleanControllerState,
  controllerPaths,
  repositoryIsExpected,
  withPendingBuild,
} from "../private-controller/private-update.mjs";

const A = "a".repeat(40);
const B = "b".repeat(40);

function build(revision, appPath = `/tmp/${revision}/Game.app`) {
  return {
    revision,
    appPath,
    version: "0.2.0",
    profile: "internal-art-review",
    architecture: "arm64",
    installedAt: "2026-09-12T00:00:00.000Z",
  };
}

test("repository identity accepts only the configured project", () => {
  assert.equal(
    canonicalRepository("git@github.com:lamontaes/Political-Game-Git.git"),
    "github.com/lamontaes/Political-Game-Git",
  );
  assert.equal(
    repositoryIsExpected("https://github.com/lamontaes/Political-Game-Git.git"),
    true,
  );
  assert.equal(repositoryIsExpected("https://github.com/example/fork.git"), false);
  assert.equal(repositoryIsExpected("file:///tmp/repository"), false);
});

test("target assessment refuses forks and downgrades", () => {
  assert.deepEqual(
    assessUpdateTarget({ currentRevision: A, targetRevision: A, currentIsAncestor: true }),
    { action: "none", reason: "up-to-date" },
  );
  assert.deepEqual(
    assessUpdateTarget({ currentRevision: A, targetRevision: B, currentIsAncestor: true }),
    { action: "build", reason: "newer-main" },
  );
  assert.deepEqual(
    assessUpdateTarget({ currentRevision: A, targetRevision: B, currentIsAncestor: false }),
    { action: "refuse", reason: "unsupported-downgrade-or-fork" },
  );
});

test("paths stay versioned beneath the controller root", () => {
  const paths = controllerPaths("/tmp/controller", A);
  assert.equal(paths.sourcePath, `/tmp/controller/staging/${A}/source`);
  assert.equal(
    paths.appPath,
    `/tmp/controller/versions/${A}/Our Civic Duty Internal Art Review.app`,
  );
  assert.throws(() => controllerPaths("/tmp/controller", "../outside"));
});

test("pending build never changes current until explicit activation", () => {
  const state = {
    schema: 1,
    repositoryPath: "/repo",
    current: build(A),
    pending: null,
    previous: null,
  };
  const pending = withPendingBuild(state, build(B), "/new-repo");
  assert.equal(pending.current.revision, A);
  assert.equal(pending.pending.revision, B);
  const activated = activatePendingBuild(pending);
  assert.equal(activated.current.revision, B);
  assert.equal(activated.previous.revision, A);
  assert.equal(activated.pending, null);
});

test("state and built identity validation fail closed", () => {
  assert.equal(cleanControllerState({ schema: 2 }), null);
  assert.equal(
    cleanControllerState({ schema: 1, current: { ...build(A), profile: "production" } }),
    null,
  );
  assert.throws(() =>
    buildRecord({ revision: A, version: "0.2.0", profile: "production" }, "/tmp/a.app", "arm64", "now"),
  );
  assert.equal(
    buildRecord(
      { revision: A, version: "0.2.0", profile: "internal-art-review" },
      "/tmp/a.app",
      "arm64",
      "now",
    ).revision,
    A,
  );
});

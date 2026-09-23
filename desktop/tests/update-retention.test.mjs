import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  realpathSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  recordVersionOwnership,
  retireOwnedVersions,
} from "../private-controller/update-retention.mjs";
import { leaseUpdateWorkspace } from "../private-controller/update-workspace.mjs";

function fixture(t) {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "ocd-retention-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, "versions"));
  const state = (tracks) =>
    writeFileSync(
      path.join(root, "state.json"),
      JSON.stringify({ schema: 2, tracks }),
    );
  state({});
  const build = (number, owned = true) => {
    const revision = String(number).padStart(40, "0"),
      sha = String(number).padStart(64, "0");
    const folder = path.join(
      root,
      "versions",
      `${revision}-${sha.slice(0, 16)}`,
    );
    const appPath = path.join(folder, "Our Civic Duty Internal Art Review.app");
    const resources = path.join(appPath, "Contents/Resources");
    mkdirSync(path.join(resources, "client"), { recursive: true });
    writeFileSync(path.join(resources, "client/index.html"), "payload");
    writeFileSync(
      path.join(resources, "build-identity.json"),
      JSON.stringify({ revision, clientTreeSha256: sha }),
    );
    if (owned) recordVersionOwnership(root, folder);
    return { revision, appPath, folder };
  };
  return { root, state, build };
}

test("keeps every track slot, received build/base and active revision; retires only superseded owned payloads", (t) => {
  const f = fixture(t),
    builds = Array.from({ length: 10 }, (_, i) => f.build(i + 1));
  f.state({
    main: { current: builds[0], previous: builds[1], pending: builds[2] },
    preview: { current: builds[3], previous: builds[4], pending: builds[5] },
  });
  mkdirSync(path.join(f.root, "received"));
  writeFileSync(
    path.join(f.root, "received/preview.json"),
    JSON.stringify({
      build: builds[6],
      base: { revision: builds[7].revision },
    }),
  );
  const result = retireOwnedVersions({
    dataRoot: f.root,
    activeRevisions: [builds[8].revision],
  });
  assert.deepEqual(result.removed, [builds[9].folder]);
  for (const build of builds.slice(0, 9)) assert.ok(existsSync(build.folder));
});

test("historical, changed, added-evidence and pinned payloads stay", (t) => {
  const f = fixture(t),
    historical = f.build(1, false),
    changed = f.build(2),
    evidence = f.build(3),
    pinned = f.build(4);
  writeFileSync(
    path.join(changed.appPath, "Contents/Resources/client/index.html"),
    "changed",
  );
  writeFileSync(
    path.join(evidence.folder, "unique-notes.txt"),
    "keep this evidence",
  );
  writeFileSync(path.join(pinned.appPath, "Contents/.pin"), "needed");
  const result = retireOwnedVersions({ dataRoot: f.root });
  assert.equal(result.removed.length, 0);
  for (const build of [historical, changed, evidence, pinned])
    assert.ok(existsSync(build.folder));
});

test("symlinks cannot make retirement delete a foreign payload or reference root", (t) => {
  const f = fixture(t),
    a = f.build(1),
    b = f.build(2);
  symlinkSync(
    a.folder,
    path.join(f.root, "versions", `${"f".repeat(40)}-${"f".repeat(16)}`),
  );
  symlinkSync(
    path.join(a.appPath, "Contents/Resources/client/index.html"),
    path.join(b.folder, "borrowed"),
  );
  f.state({ main: { current: a } });
  assert.equal(retireOwnedVersions({ dataRoot: f.root }).removed.length, 0);
  assert.ok(existsSync(a.folder));
  assert.ok(existsSync(b.folder));
  const alias = path.join(f.root, "alias");
  symlinkSync(f.root, alias);
  assert.throws(() => retireOwnedVersions({ dataRoot: alias }), /aliased/);
});

test("a live updater lease prevents retirement", (t) => {
  const f = fixture(t),
    a = f.build(1),
    release = leaseUpdateWorkspace(f.root);
  try {
    assert.throws(
      () => retireOwnedVersions({ dataRoot: f.root }),
      /Another update/,
    );
    assert.ok(existsSync(a.folder));
  } finally {
    release();
  }
});

test("unknown state or received records preserve every version", (t) => {
  const f = fixture(t),
    a = f.build(1);
  writeFileSync(path.join(f.root, "state.json"), "invalid");
  assert.throws(() => retireOwnedVersions({ dataRoot: f.root }));
  assert.ok(existsSync(a.folder));
  f.state({});
  mkdirSync(path.join(f.root, "received"));
  writeFileSync(path.join(f.root, "received/unknown.json"), "{}");
  assert.throws(
    () => retireOwnedVersions({ dataRoot: f.root }),
    /Unknown received/,
  );
  assert.ok(existsSync(a.folder));
});

test("ownership receipts cannot be reissued over old or modified files", (t) => {
  const f = fixture(t),
    a = f.build(1);
  const before = readFileSync(path.join(a.folder, ".ocd-client-payload.json"));
  writeFileSync(path.join(a.folder, "evidence.txt"), "private evidence");
  assert.throws(
    () => recordVersionOwnership(f.root, a.folder),
    /Unknown version contents/,
  );
  assert.ok(
    readFileSync(path.join(a.folder, ".ocd-client-payload.json")).equals(
      before,
    ),
  );
});

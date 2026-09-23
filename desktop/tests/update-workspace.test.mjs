import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  readdirSync,
  symlinkSync,
  realpathSync,
} from "node:fs";
import os from "node:os";
import process from "node:process";
import path from "node:path";
import {
  leaseUpdateWorkspace,
  prepareUpdateWorkspace,
  ensureUpdateDependencies,
} from "../private-controller/update-workspace.mjs";

const git = (cwd, ...args) =>
  execFileSync("/usr/bin/git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
function fixture(t) {
  const root = realpathSync(
    mkdtempSync(path.join(os.tmpdir(), "ocd-update-workspace-test-")),
  );
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repositoryPath = path.join(root, "repository");
  const dataRoot = path.join(root, "controller");
  mkdirSync(repositoryPath);
  mkdirSync(dataRoot);
  git(repositoryPath, "init", "-q");
  git(repositoryPath, "config", "user.name", "Fixture");
  git(repositoryPath, "config", "user.email", "fixture@example.invalid");
  writeFileSync(
    path.join(repositoryPath, ".gitignore"),
    "node_modules\ndist/\ntest-results/\n",
  );
  writeFileSync(
    path.join(repositoryPath, "package.json"),
    '{"name":"fixture"}\n',
  );
  writeFileSync(
    path.join(repositoryPath, "package-lock.json"),
    '{"lockfileVersion":3}\n',
  );
  writeFileSync(path.join(repositoryPath, "game.txt"), "first\n");
  git(repositoryPath, "add", ".");
  git(repositoryPath, "commit", "-qm", "First");
  const first = git(repositoryPath, "rev-parse", "HEAD");
  writeFileSync(path.join(repositoryPath, "game.txt"), "second\n");
  git(repositoryPath, "commit", "-qam", "Second");
  const second = git(repositoryPath, "rev-parse", "HEAD");
  const commands = [];
  const run = async (command, args, options) => {
    commands.push(args);
    execFileSync(command, args, { cwd: options.cwd, stdio: "pipe" });
  };
  const capture = async (command, args, options) =>
    execFileSync(command, args, {
      cwd: options.cwd,
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
  return {
    root,
    repositoryPath,
    dataRoot,
    first,
    second,
    commands,
    run,
    capture,
  };
}

test("successive updates use one checkout and retain dependency/compiler files", async (t) => {
  const f = fixture(t);
  const release = leaseUpdateWorkspace(f.dataRoot);
  const a = await prepareUpdateWorkspace({ ...f, revision: f.first });
  mkdirSync(path.join(a.sourcePath, "node_modules"));
  mkdirSync(path.join(a.sourcePath, "test-results"));
  writeFileSync(
    path.join(a.sourcePath, "node_modules", "sentinel"),
    "dependency",
  );
  writeFileSync(
    path.join(a.sourcePath, "test-results", "sentinel"),
    "compiler cache",
  );
  const b = await prepareUpdateWorkspace({ ...f, revision: f.second });
  assert.equal(a.sourcePath, b.sourcePath);
  assert.equal(
    readFileSync(path.join(b.sourcePath, "game.txt"), "utf8"),
    "second\n",
  );
  assert.equal(
    readFileSync(path.join(b.sourcePath, "node_modules/sentinel"), "utf8"),
    "dependency",
  );
  assert.equal(
    readFileSync(path.join(b.sourcePath, "test-results/sentinel"), "utf8"),
    "compiler cache",
  );
  assert.equal(f.commands.filter((args) => args[0] === "worktree").length, 1);
  assert.equal(readdirSync(path.join(f.dataRoot, "staging")).length, 1);
  release();
});

test("adopts the current compatible old workspace without creating another copy", async (t) => {
  const f = fixture(t);
  const stage = path.join(f.dataRoot, "staging", "old-current");
  const preferredSource = path.join(stage, "source");
  mkdirSync(stage, { recursive: true });
  writeFileSync(path.join(stage, ".ocd-private-controller-staging"), "1\n");
  git(
    f.repositoryPath,
    "worktree",
    "add",
    "--detach",
    preferredSource,
    f.first,
  );
  mkdirSync(path.join(preferredSource, "dist/client"), { recursive: true });
  writeFileSync(
    path.join(preferredSource, "dist/client/.build-provenance.json"),
    JSON.stringify({ runtimeArtCapability: "runtime-art-v1" }),
  );
  const result = await prepareUpdateWorkspace({
    ...f,
    preferredSource,
    revision: f.second,
  });
  assert.equal(result.sourcePath, preferredSource);
  assert.equal(f.commands.filter((args) => args[0] === "worktree").length, 0);
});

for (const file of ["game.txt", "private-input.txt"]) {
  test(`local ${file} prevents checkout and is preserved`, async (t) => {
    const f = fixture(t);
    const a = await prepareUpdateWorkspace({ ...f, revision: f.first });
    writeFileSync(path.join(a.sourcePath, file), "unique local work\n");
    await assert.rejects(
      prepareUpdateWorkspace({ ...f, revision: f.second }),
      /local changes/,
    );
    assert.equal(
      readFileSync(path.join(a.sourcePath, file), "utf8"),
      "unique local work\n",
    );
    assert.equal(git(a.sourcePath, "rev-parse", "HEAD"), f.first);
    assert.equal(readdirSync(path.join(f.dataRoot, "staging")).length, 1);
  });
}

test("foreign, branch-owned and symlinked workspaces refuse without fallback", async (t) => {
  const f = fixture(t);
  const a = await prepareUpdateWorkspace({ ...f, revision: f.first });
  git(a.sourcePath, "checkout", "-b", "writer");
  await assert.rejects(
    prepareUpdateWorkspace({ ...f, revision: f.second }),
    /working branch/,
  );
  git(a.sourcePath, "checkout", "--detach", f.first);
  const pointer = path.join(f.dataRoot, "update-workspace.json");
  const record = JSON.parse(readFileSync(pointer));
  writeFileSync(pointer, JSON.stringify({ ...record, repositoryPath: f.root }));
  await assert.rejects(
    prepareUpdateWorkspace({ ...f, revision: f.second }),
    /another repository/,
  );
  const linked = path.join(f.dataRoot, "staging/linked");
  symlinkSync(a.stagingRoot, linked);
  writeFileSync(
    pointer,
    JSON.stringify({ ...record, sourcePath: path.join(linked, "source") }),
  );
  await assert.rejects(
    prepareUpdateWorkspace({ ...f, revision: f.second }),
    /controller-owned/,
  );
});

test("the lease excludes another updater and safely recovers a dead owner", (t) => {
  const f = fixture(t);
  const release = leaseUpdateWorkspace(f.dataRoot);
  assert.throws(() => leaseUpdateWorkspace(f.dataRoot), /Another update/);
  release();
  const lock = path.join(f.dataRoot, "update-workspace.lock");
  mkdirSync(lock);
  // A real child exits before its PID is used as the stale fixture owner.
  const pid = Number(
    execFileSync(process.execPath, ["-p", "process.pid"], { encoding: "utf8" }),
  );
  writeFileSync(
    path.join(lock, "owner.json"),
    JSON.stringify({ pid, token: "old" }),
  );
  const recovered = leaseUpdateWorkspace(f.dataRoot);
  recovered();
});

test("dependencies are reused only after a successful matching install", async (t) => {
  const f = fixture(t);
  const paths = await prepareUpdateWorkspace({ ...f, revision: f.first });
  let installs = 0;
  let fail = false;
  const run = async () => {
    installs++;
    if (fail) throw new Error("install interrupted");
    mkdirSync(path.join(paths.sourcePath, "node_modules"), { recursive: true });
    writeFileSync(
      path.join(paths.sourcePath, "node_modules/.package-lock.json"),
      `installed-${installs}`,
    );
  };
  const args = { ...paths, toolchain: "node22-npm10-arm64", run };
  assert.equal((await ensureUpdateDependencies(args)).reused, false);
  assert.equal((await ensureUpdateDependencies(args)).reused, true);
  assert.equal(installs, 1);
  writeFileSync(
    path.join(paths.sourcePath, "package-lock.json"),
    '{"lockfileVersion":3,"changed":true}',
  );
  assert.equal((await ensureUpdateDependencies(args)).reused, false);
  assert.equal(
    (await ensureUpdateDependencies({ ...args, toolchain: "node23" })).reused,
    false,
  );
  fail = true;
  await assert.rejects(ensureUpdateDependencies(args), /interrupted/);
  fail = false;
  assert.equal((await ensureUpdateDependencies(args)).reused, false);
  assert.equal(installs, 5);
});

test("shared dependencies are refused rather than erased by npm", async (t) => {
  const f = fixture(t);
  const paths = await prepareUpdateWorkspace({ ...f, revision: f.first });
  const shared = path.join(f.root, "shared");
  mkdirSync(shared);
  symlinkSync(shared, path.join(paths.sourcePath, "node_modules"));
  await assert.rejects(
    ensureUpdateDependencies({
      ...paths,
      toolchain: "node",
      run: async () => assert.fail("npm must not run"),
    }),
    /shared dependencies/,
  );
});

test("a dead worker cannot relinquish a lease while its child still runs", (t) => {
  const f = fixture(t);
  const lock = path.join(f.dataRoot, "update-workspace.lock");
  mkdirSync(lock);
  const pid = Number(
    execFileSync(process.execPath, ["-p", "process.pid"], { encoding: "utf8" }),
  );
  writeFileSync(
    path.join(lock, "owner.json"),
    JSON.stringify({ pid, token: "old", childPid: process.pid }),
  );
  assert.throws(() => leaseUpdateWorkspace(f.dataRoot), /Another update/);
});

test("checkout cannot overwrite an ignored private input", async (t) => {
  const f = fixture(t);
  const first = await prepareUpdateWorkspace({ ...f, revision: f.first });
  // The later source tracks a path that was previously only local/ignored.
  const input = "dist/private.txt";
  mkdirSync(path.join(f.repositoryPath, "dist"));
  writeFileSync(path.join(f.repositoryPath, input), "new tracked input");
  git(f.repositoryPath, "add", "-f", input);
  git(f.repositoryPath, "commit", "-qm", "Track input");
  const revision = git(f.repositoryPath, "rev-parse", "HEAD");
  mkdirSync(path.join(first.sourcePath, "dist"));
  writeFileSync(path.join(first.sourcePath, input), "unique private input");
  await assert.rejects(prepareUpdateWorkspace({ ...f, revision }));
  assert.equal(
    readFileSync(path.join(first.sourcePath, input), "utf8"),
    "unique private input",
  );
  assert.equal(git(first.sourcePath, "rev-parse", "HEAD"), f.first);
});

test("a checkout lending dependencies to another writer is not reused", async (t) => {
  const f = fixture(t);
  const first = await prepareUpdateWorkspace({ ...f, revision: f.first });
  mkdirSync(path.join(first.sourcePath, "node_modules"));
  symlinkSync(
    path.join(first.sourcePath, "node_modules"),
    path.join(f.repositoryPath, "node_modules"),
  );
  await assert.rejects(
    prepareUpdateWorkspace({ ...f, revision: f.second }),
    /Another checkout depends/,
  );
  assert.equal(git(first.sourcePath, "rev-parse", "HEAD"), f.first);
});

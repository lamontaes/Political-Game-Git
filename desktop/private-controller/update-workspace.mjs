/* global process */
/** One leased runtime-content checkout; installed games never point here. */
import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const marker = ".ocd-private-controller-staging";
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const digest = (file) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
function writeJson(file, value) {
  const next = `${file}.next-${process.pid}`;
  writeFileSync(next, JSON.stringify(value) + "\n", { mode: 0o600 });
  renameSync(next, file);
}
function alive(pid) {
  if (!Number.isInteger(pid) || pid < 1)
    throw new Error("Invalid update lease owner");
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}
function childAlive(owner) {
  if (!owner.childPid) return false;
  if (!owner.childGroup) return alive(owner.childPid);
  try {
    process.kill(-owner.childPid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}

export function leaseUpdateWorkspace(dataRoot) {
  const lock = path.join(dataRoot, "update-workspace.lock");
  const recovery = `${lock}.recovery`;
  const owner = path.join(lock, "owner.json");
  const token = randomUUID();
  mkdirSync(dataRoot, { recursive: true });
  if (existsSync(recovery))
    throw new Error("Update workspace lease recovery is in progress");
  try {
    mkdirSync(lock);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    // Serialize stale recovery. Unknown/incomplete leases are refused rather
    // than guessing that another process finished creating them.
    writeFileSync(recovery, String(process.pid), { flag: "wx", mode: 0o600 });
    try {
      if (lstatSync(lock).isSymbolicLink())
        throw new Error("Unsafe update lease");
      const previous = readJson(owner);
      if (alive(previous.pid) || childAlive(previous))
        throw new Error("Another update is using this workspace");
      if (readdirSync(lock).some((name) => name !== "owner.json"))
        throw new Error("Update lease contains unknown files");
      unlinkSync(owner);
      rmdirSync(lock);
      mkdirSync(lock);
    } finally {
      unlinkSync(recovery);
    }
  }
  writeJson(owner, { pid: process.pid, token });
  const release = () => {
    if (readJson(owner).token !== token)
      throw new Error("Update lease ownership changed");
    unlinkSync(owner);
    rmdirSync(lock);
  };
  release.setChild = (childPid, childGroup = false) => {
    if (readJson(owner).token !== token)
      throw new Error("Update lease ownership changed");
    writeJson(owner, { pid: process.pid, token, childPid, childGroup });
  };
  return release;
}

/** Verify ownership before even asking Git to advance a checkout. */
async function verifyWorkspace(
  sourcePath,
  stagingRoot,
  repositoryPath,
  capture,
) {
  const source = path.resolve(sourcePath);
  const stage = path.dirname(source);
  if (
    path.dirname(stage) !== stagingRoot ||
    path.basename(source) !== "source" ||
    realpathSync(stage) !== stage ||
    realpathSync(source) !== source ||
    !lstatSync(path.join(stage, marker)).isFile() ||
    readFileSync(path.join(stage, marker), "utf8").trim() !== "1"
  )
    throw new Error(
      "The update workspace is not a controller-owned staging checkout",
    );
  const git = (args, cwd = source) => capture("/usr/bin/git", args, { cwd });
  if (realpathSync(await git(["rev-parse", "--show-toplevel"])) !== source)
    throw new Error("The update workspace root changed");
  const common = realpathSync(
    await git(["rev-parse", "--path-format=absolute", "--git-common-dir"]),
  );
  const expected = realpathSync(
    await git(
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      repositoryPath,
    ),
  );
  if (
    common !== expected ||
    existsSync(path.join(common, "objects/info/alternates"))
  )
    throw new Error("The update workspace uses an unexpected Git object store");
  const worktrees = await git(["worktree", "list", "--porcelain"]);
  for (const line of worktrees.split("\n")) {
    if (!line.startsWith("worktree ")) continue;
    const other = line.slice(9);
    if (other === source) continue;
    for (const relative of ["node_modules", "desktop/node_modules"]) {
      const linked = path.join(other, relative);
      if (
        existsSync(linked) &&
        realpathSync(linked).startsWith(source + path.sep)
      )
        throw new Error("Another checkout depends on this update workspace");
    }
  }
  if (await git(["branch", "--show-current"]))
    throw new Error("The update workspace belongs to a working branch");
  if (await git(["status", "--porcelain", "--untracked-files=all"]))
    throw new Error(
      "The update workspace contains local changes; they were preserved",
    );
  // This reusable lane never stages a private pack into source. A previous
  // runtime-content build proves that the legacy workspace belongs to it.
  return source;
}

export async function prepareUpdateWorkspace({
  dataRoot,
  repositoryPath,
  revision,
  preferredSource,
  run,
  capture,
}) {
  const stagingRoot = path.join(realpathSync(dataRoot), "staging");
  mkdirSync(stagingRoot, { recursive: true });
  if (realpathSync(stagingRoot) !== stagingRoot)
    throw new Error("Unsafe staging root");
  const pointer = path.join(dataRoot, "update-workspace.json");
  let sourcePath;
  if (existsSync(pointer)) {
    const saved = readJson(pointer);
    if (
      saved.schema !== 1 ||
      saved.repositoryPath !== realpathSync(repositoryPath)
    )
      throw new Error(
        "The reusable update workspace belongs to another repository",
      );
    sourcePath = await verifyWorkspace(
      saved.sourcePath,
      stagingRoot,
      repositoryPath,
      capture,
    );
  } else {
    const candidates = [
      ...new Set(
        [
          preferredSource,
          ...readdirSync(stagingRoot)
            .sort()
            .reverse()
            .map((name) => path.join(stagingRoot, name, "source")),
        ].filter(Boolean),
      ),
    ];
    for (const candidate of candidates) {
      const stamp = path.join(candidate, "dist/client/.build-provenance.json");
      if (
        !existsSync(stamp) ||
        readJson(stamp).runtimeArtCapability !== "runtime-art-v1"
      )
        continue;
      // A compatible but dirty workspace is an explicit refusal, never a
      // reason to quietly provision another copy of the project.
      sourcePath = await verifyWorkspace(
        candidate,
        stagingRoot,
        repositoryPath,
        capture,
      );
      break;
    }
    if (!sourcePath) {
      const stage = path.join(stagingRoot, "runtime-content");
      if (existsSync(stage))
        throw new Error("The reusable update workspace needs recovery");
      mkdirSync(stage);
      writeFileSync(path.join(stage, marker), "1\n", { flag: "wx" });
      sourcePath = path.join(stage, "source");
      await run(
        "/usr/bin/git",
        ["worktree", "add", "--detach", sourcePath, revision],
        {
          cwd: repositoryPath,
          label: "Preparing the reusable update workspace",
          phase: "preparing",
        },
      );
      await verifyWorkspace(sourcePath, stagingRoot, repositoryPath, capture);
    }
    writeJson(pointer, {
      schema: 1,
      repositoryPath: realpathSync(repositoryPath),
      sourcePath,
    });
  }
  await run(
    "/usr/bin/git",
    ["checkout", "--no-overwrite-ignore", "--detach", revision],
    {
      cwd: sourcePath,
      label: "Reusing the update workspace",
      phase: "preparing",
    },
  );
  await verifyWorkspace(sourcePath, stagingRoot, repositoryPath, capture);
  const head = await capture("/usr/bin/git", ["rev-parse", "HEAD"], {
    cwd: sourcePath,
  });
  if (head !== revision)
    throw new Error("The reusable workspace has the wrong revision");
  return { sourcePath, stagingRoot: path.dirname(sourcePath) };
}

function dependencyIdentity(sourcePath, toolchain) {
  return {
    schema: 1,
    toolchain,
    package: digest(path.join(sourcePath, "package.json")),
    lock: digest(path.join(sourcePath, "package-lock.json")),
    npmrc: existsSync(path.join(sourcePath, ".npmrc"))
      ? digest(path.join(sourcePath, ".npmrc"))
      : null,
  };
}
export async function ensureUpdateDependencies({
  sourcePath,
  stagingRoot,
  toolchain,
  run,
}) {
  const receipt = path.join(stagingRoot, "update-dependencies.json");
  const modules = path.join(sourcePath, "node_modules");
  const installedLock = path.join(modules, ".package-lock.json");
  if (existsSync(modules) && realpathSync(modules) !== modules)
    throw new Error("The updater will not replace shared dependencies");
  const identity = dependencyIdentity(sourcePath, toolchain);
  let previous = null;
  try {
    previous = readJson(receipt);
  } catch {
    /* no successful install receipt */
  }
  if (
    previous &&
    existsSync(installedLock) &&
    JSON.stringify(previous.identity) === JSON.stringify(identity) &&
    previous.installedLock === digest(installedLock)
  )
    return { reused: true };
  // Invalidate before npm can fail or be cancelled partway through an install.
  writeJson(receipt, { identity: null });
  await run("/usr/bin/env", ["npm", "ci", "--no-audit", "--no-fund"], {
    cwd: sourcePath,
    label: "Installing changed game dependencies",
    phase: "preparing",
  });
  if (
    JSON.stringify(dependencyIdentity(sourcePath, toolchain)) !==
    JSON.stringify(identity)
  )
    throw new Error("Dependency inputs changed during installation");
  writeJson(receipt, { identity, installedLock: digest(installedLock) });
  return { reused: false };
}

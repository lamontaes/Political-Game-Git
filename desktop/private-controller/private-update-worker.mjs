/* global process */

import { spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  activatePendingBuild,
  assessUpdateTarget,
  buildRecord,
  cleanControllerState,
  controllerPaths,
  repositoryIsExpected,
  withPendingBuild,
} from "./private-update.mjs";

const EXPECTED_PACKAGE_NAME = "political-life-rpg";
const TARGET_REF = "refs/remotes/origin/main";
const APP_NAME = "Our Civic Duty.app";

const args = process.argv.slice(2);
const valueAfter = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? null : (args[index + 1] ?? null);
};
const dataRoot = valueAfter("--data-root");
const requestedRepository = valueAfter("--repo");

let activeChild = null;
let cancelled = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    cancelled = true;
    activeChild?.kill("SIGTERM");
  });
}

function emit(kind, message, extra = {}) {
  process.stdout.write(`${JSON.stringify({ kind, message, ...extra })}\n`);
}

function fail(message, reason = "failed") {
  emit("error", message, { reason });
  process.exitCode = 1;
}

if (!dataRoot || !path.isAbsolute(dataRoot)) {
  fail("The controller data folder is invalid.", "invalid-data-root");
} else if (!requestedRepository || !path.isAbsolute(requestedRepository)) {
  fail("Choose the Political Game repository folder first.", "missing-repository");
} else {
  await main();
}

async function run(command, commandArgs, options = {}) {
  if (cancelled) throw new Error("Update cancelled.");
  emit("progress", options.label ?? `${command} ${commandArgs.join(" ")}`);
  await new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    activeChild = child;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => emit("log", chunk.trimEnd()));
    child.stderr.on("data", (chunk) => emit("log", chunk.trimEnd()));
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      activeChild = null;
      if (cancelled) return reject(new Error("Update cancelled."));
      if (code === 0) return resolve();
      reject(
        new Error(
          `${options.label ?? command} stopped (${signal ?? `exit ${code}`}).`,
        ),
      );
    });
  });
}

async function capture(command, commandArgs, options = {}) {
  let output = "";
  await new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    activeChild = child;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      if (options.echoErrors) emit("log", chunk.trimEnd());
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      activeChild = null;
      if (cancelled) return reject(new Error("Update cancelled."));
      if (code === 0) resolve();
      else reject(new Error(`${options.label ?? command} failed.`));
    });
  });
  return output.trim();
}

function readState(statePath) {
  try {
    return cleanControllerState(JSON.parse(readFileSync(statePath, "utf8")));
  } catch {
    return null;
  }
}

function writeState(statePath, state) {
  mkdirSync(path.dirname(statePath), { recursive: true });
  const temporary = `${statePath}.next-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  });
  renameSync(temporary, statePath);
}

async function runningApplication(appPath) {
  if (!appPath) return false;
  const executable = path.join(appPath, "Contents", "MacOS", "Our Civic Duty");
  const output = await capture("/bin/ps", ["-axo", "command="], {
    label: "Checking whether the game is running",
  });
  return output.split("\n").some((line) => line.startsWith(executable));
}

async function verifyRepository(candidate) {
  let resolved;
  try {
    resolved = realpathSync(candidate);
  } catch {
    throw new Error(`No repository folder exists at ${candidate}.`);
  }
  const root = await capture("/usr/bin/git", ["rev-parse", "--show-toplevel"], {
    cwd: resolved,
    label: "Checking the repository folder",
  });
  const canonicalRoot = realpathSync(root);
  const packageJson = JSON.parse(
    readFileSync(path.join(canonicalRoot, "package.json"), "utf8"),
  );
  if (packageJson.name !== EXPECTED_PACKAGE_NAME)
    throw new Error("That folder is not the Our Civic Duty project.");
  const origin = await capture(
    "/usr/bin/git",
    ["remote", "get-url", "origin"],
    { cwd: canonicalRoot, label: "Checking repository identity" },
  );
  if (!repositoryIsExpected(origin))
    throw new Error("The repository origin is not lamontaes/Political-Game-Git.");
  return canonicalRoot;
}

async function removeOwnedStaging(paths, repositoryPath) {
  if (!existsSync(paths.stagingRoot)) return;
  const marker = path.join(paths.stagingRoot, ".ocd-private-controller-staging");
  if (!existsSync(marker))
    throw new Error(
      "The update workspace already exists and is not owned by this controller.",
    );
  if (existsSync(paths.sourcePath)) {
    await run("/usr/bin/git", ["worktree", "remove", "--force", paths.sourcePath], {
      cwd: repositoryPath,
      label: "Removing the controller's interrupted update workspace",
    });
  }
  rmSync(paths.stagingRoot, { recursive: true, force: true });
}

async function main() {
  const statePath = path.join(path.resolve(dataRoot), "state.json");
  const state = readState(statePath);
  if (!state) return fail("The installed controller has no verified current build.");

  try {
    const repositoryPath = await verifyRepository(requestedRepository);
    emit("progress", "Fetching accepted main from GitHub…");
    try {
      await run("/usr/bin/git", ["fetch", "--quiet", "origin", "main"], {
        cwd: repositoryPath,
        label: "Fetching accepted main",
      });
    } catch (error) {
      return fail(
        `Offline: ${error.message} The current verified build is still ready to play.`,
        "offline",
      );
    }

    const targetRevision = await capture(
      "/usr/bin/git",
      ["rev-parse", "--verify", `${TARGET_REF}^{commit}`],
      { cwd: repositoryPath, label: "Resolving accepted main" },
    );
    let currentIsAncestor = false;
    try {
      await capture(
        "/usr/bin/git",
        ["merge-base", "--is-ancestor", state.current.revision, targetRevision],
        { cwd: repositoryPath, label: "Checking update ancestry" },
      );
      currentIsAncestor = true;
    } catch {
      currentIsAncestor = false;
    }
    const assessment = assessUpdateTarget({
      currentRevision: state.current.revision,
      targetRevision,
      currentIsAncestor,
    });
    if (assessment.action === "none") {
      writeState(statePath, { ...state, repositoryPath });
      return emit("complete", "This is already the current accepted build.", {
        outcome: "up-to-date",
      });
    }
    if (assessment.action === "refuse") {
      return fail(
        assessment.reason === "unsupported-downgrade-or-fork"
          ? "Accepted main is not a descendant of the installed build. Refusing an unsupported downgrade or fork; the current build is unchanged."
          : "The update target could not be verified.",
        assessment.reason,
      );
    }

    const paths = controllerPaths(dataRoot, targetRevision);
    await removeOwnedStaging(paths, repositoryPath);
    mkdirSync(paths.stagingRoot, { recursive: true });
    writeFileSync(path.join(paths.stagingRoot, ".ocd-private-controller-staging"), "1\n");

    await run(
      "/usr/bin/git",
      ["worktree", "add", "--detach", paths.sourcePath, targetRevision],
      { cwd: repositoryPath, label: "Creating a clean versioned build workspace" },
    );
    const exactHead = await capture("/usr/bin/git", ["rev-parse", "HEAD"], {
      cwd: paths.sourcePath,
      label: "Verifying the build revision",
    });
    const dirty = await capture(
      "/usr/bin/git",
      ["status", "--porcelain", "--untracked-files=all"],
      { cwd: paths.sourcePath, label: "Verifying the clean build workspace" },
    );
    if (exactHead !== targetRevision || dirty)
      throw new Error("The versioned build workspace is not exact and clean.");

    await run("/usr/bin/env", ["npm", "ci", "--no-audit", "--no-fund"], {
      cwd: paths.sourcePath,
      label: "Installing pinned game dependencies",
    });
    await run("/usr/bin/env", ["npm", "run", "build"], {
      cwd: paths.sourcePath,
      env: { VITE_OCD_BUILD_PROFILE: "internal-art-review" },
      label: "Compiling the internal art-review game",
    });
    const desktopPath = path.join(paths.sourcePath, "desktop");
    await run("/usr/bin/env", ["npm", "ci", "--no-audit", "--no-fund"], {
      cwd: desktopPath,
      label: "Installing pinned desktop dependencies",
    });
    await run(
      process.execPath,
      ["scripts/stage.mjs", "--composition", "accepted-main"],
      { cwd: desktopPath, label: "Verifying and staging the compiled game" },
    );
    await run(
      process.execPath,
      [
        "scripts/package.mjs",
        "--mac",
        "--arm64",
        "--dir",
        "-c.mac.target=dir",
      ],
      {
        cwd: desktopPath,
        env: { CSC_IDENTITY_AUTO_DISCOVERY: "false" },
        label: "Packaging the versioned Mac application",
      },
    );
    const builtApp = path.join(
      desktopPath,
      "release-artifacts",
      "mac-arm64",
      APP_NAME,
    );
    if (!existsSync(builtApp) || !statSync(builtApp).isDirectory())
      throw new Error("The Mac application was not produced.");
    const identity = JSON.parse(
      readFileSync(
        path.join(builtApp, "Contents", "Resources", "build-identity.json"),
        "utf8",
      ),
    );
    if (identity.revision !== targetRevision)
      throw new Error("The application identity does not match accepted main.");
    const executable = path.join(builtApp, "Contents", "MacOS", APP_NAME.slice(0, -4));
    const architecture = await capture("/usr/bin/file", ["-b", executable], {
      label: "Checking the application architecture",
    });
    if (!architecture.includes("arm64"))
      throw new Error("The application is not an Apple Silicon build.");

    await run(
      process.execPath,
      ["scripts/smoke-test.mjs", "--app", executable],
      {
        cwd: desktopPath,
        env: { OCD_EXPECT_ART_PREVIEW: "1" },
        label: "Launching and health-checking the candidate-profile application",
      },
    );

    mkdirSync(paths.versionPath, { recursive: true });
    const temporaryApp = `${paths.appPath}.installing-${process.pid}`;
    rmSync(temporaryApp, { recursive: true, force: true });
    cpSync(builtApp, temporaryApp, { recursive: true });
    rmSync(paths.appPath, { recursive: true, force: true });
    renameSync(temporaryApp, paths.appPath);
    const record = buildRecord(
      identity,
      paths.appPath,
      architecture,
      new Date().toISOString(),
    );
    let next = withPendingBuild(state, record, repositoryPath);
    if (!(await runningApplication(state.current.appPath))) {
      next = activatePendingBuild(next);
      writeState(statePath, next);
      emit("complete", "Update installed. Play now opens the new verified build.", {
        outcome: "activated",
        revision: record.revision,
      });
    } else {
      writeState(statePath, next);
      emit(
        "complete",
        "Update verified and ready. Close the running game, then choose Finish Update & Play.",
        { outcome: "pending-safe-close", revision: record.revision },
      );
    }
  } catch (error) {
    if (cancelled)
      return fail(
        "Update cancelled. The current verified build is unchanged.",
        "cancelled",
      );
    fail(
      `${error instanceof Error ? error.message : String(error)} The current verified build is unchanged.`,
    );
  }
}

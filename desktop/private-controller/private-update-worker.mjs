import {
  publishReceivedChannel,
  reconcileReceivedChannel,
  stageReceivedCode,
} from "./received-channel.mjs";
/* global process */

import { spawn } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { setPriority } from "node:os";

import {
  MAIN_TRACK,
  cleanHubState,
  trackId,
  validBranchName,
  withPending,
} from "./hub-model.mjs";
import { loadContent } from "../runtime-content.mjs";
import {
  leaseUpdateWorkspace,
  prepareUpdateWorkspace,
  ensureUpdateDependencies,
} from "./update-workspace.mjs";
import {
  assessUpdateTarget,
  buildPresentOnDisk,
  controllerPaths,
  repositoryIsExpected,
  runtimeContentFor,
} from "./private-update.mjs";

const EXPECTED_PACKAGE_NAME = "political-life-rpg";
/** Files a revision must contain for the hub to package it. */
const DESKTOP_SHELL_FILES = [
  "desktop/package.json",
  "desktop/scripts/stage.mjs",
  "desktop/scripts/package.mjs",
  "scripts/client-provenance.mjs",
];

// Builds run beside a game the owner may be playing. Low priority (inherited
// by every npm, tsc and vite child) keeps the game responsive; the build only
// takes longer.
try {
  setPriority(10);
} catch {
  // An unprivileged lower priority can fail on some hosts; the build still runs.
}

const args = process.argv.slice(2);
const valueAfter = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? null : (args[index + 1] ?? null);
};
const dataRoot = valueAfter("--data-root");
const requestedRepository = valueAfter("--repo");
const requestedTrack = valueAfter("--track") ?? MAIN_TRACK;
const receivedFirst = args.includes("--received-first");

let activeChild = null;
let updateLease = null;
let cancelled = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    cancelled = true;
    if (activeChild?.pid) {
      try {
        if (process.platform === "win32") activeChild.kill("SIGTERM");
        else process.kill(-activeChild.pid, "SIGTERM");
      } catch (error) {
        if (error.code !== "ESRCH") throw error;
      }
    }
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
  fail(
    "Choose the Political Game repository folder first.",
    "missing-repository",
  );
} else if (
  requestedTrack !== MAIN_TRACK &&
  !(
    requestedTrack.startsWith("branch:") &&
    validBranchName(requestedTrack.slice("branch:".length))
  )
) {
  fail("The selected branch name is not valid.", "invalid-branch");
} else {
  try {
    const received = receivedFirst
      ? reconcileReceivedChannel(dataRoot, requestedTrack)
      : null;
    // A waiting or explicitly pinned local delivery owns this check.  An
    // up-to-date received pair still proceeds to Git discovery so a newer
    // cloud commit can be prepared automatically with the same verified
    // runtime-content snapshot.
    if (received && received.outcome !== "up-to-date")
      emit(
        "complete",
        received.outcome === "pending"
          ? "An update is ready. It will open when your current work is safely closed."
          : received.outcome === "superseded"
            ? "A newer local version took over while this update was prepared. It has been kept."
            : "Your local version has been kept.",
        { ...received, track: requestedTrack },
      );
    else await main(received);
  } catch (error) {
    fail(error.message, "invalid-received-content");
  }
}

async function run(command, commandArgs, options = {}) {
  if (cancelled) throw new Error("Update cancelled.");
  const started = Date.now();
  let buildStage = null;
  let stageStarted = started;
  let outputLine = "";
  const observeBuildOutput = (chunk) => {
    if (!options.env?.VITE_RUNTIME_CONTENT || !commandArgs.includes("build"))
      return;
    outputLine += chunk;
    const lines = outputLine.split("\n");
    outputLine = lines.pop();
    for (const line of lines) {
      const next = /^> .* typecheck\s*$/.test(line)
        ? "validation"
        : /^> .* export:state-voting-context\s*$/.test(line)
          ? "data preparation"
          : /vite v.*building .*production/.test(line)
            ? "compilation"
            : /built in [\d.]+s/.test(line)
              ? "provenance"
              : /Stamped client provenance/.test(line)
                ? "complete"
                : null;
      if (!next || next === buildStage) continue;
      if (buildStage)
        emit(
          "log",
          `Build phase ${buildStage}: ${Date.now() - stageStarted} ms between output markers.`,
        );
      buildStage = next;
      stageStarted = Date.now();
      if (next !== "complete")
        emit("progress", `Preparing update: ${next}.`, { phase: "preparing" });
    }
  };
  emit("progress", options.label ?? `${command} ${commandArgs.join(" ")}`, {
    ...(options.phase ? { phase: options.phase } : {}),
  });
  await new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
    });
    activeChild = child;
    if (child.pid)
      updateLease?.setChild(child.pid, process.platform !== "win32");
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      emit("log", chunk.trimEnd());
      observeBuildOutput(chunk);
    });
    child.stderr.on("data", (chunk) => emit("log", chunk.trimEnd()));
    child.on("error", reject);
    child.on("close", (code, signal) => {
      activeChild = null;
      updateLease?.setChild(null);
      emit(
        "log",
        `${options.label ?? command}: ${Date.now() - started} ms (${signal ?? `exit ${code}`}).`,
      );
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
      detached: process.platform !== "win32",
    });
    activeChild = child;
    if (child.pid)
      updateLease?.setChild(child.pid, process.platform !== "win32");
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      if (options.echoErrors) emit("log", chunk.trimEnd());
    });
    child.on("error", reject);
    child.on("close", (code) => {
      activeChild = null;
      updateLease?.setChild(null);
      if (cancelled) return reject(new Error("Update cancelled."));
      if (code === 0) resolve();
      else reject(new Error(`${options.label ?? command} failed.`));
    });
  });
  return output.trim();
}

function readState(statePath) {
  try {
    return cleanHubState(JSON.parse(readFileSync(statePath, "utf8")));
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
    throw new Error(
      "The repository origin is not lamontaes/Political-Game-Git.",
    );
  return canonicalRoot;
}

/** Whether a revision compiles in runtime-content mode (art loaded at run
 * time from a snapshot, not staged into the source tree). */
async function supportsRuntimeContent(repositoryPath, revision) {
  try {
    await capture(
      "/usr/bin/git",
      [
        "grep",
        "--quiet",
        "--fixed-strings",
        "runtime-art-v1",
        revision,
        "--",
        "scripts/stamp-client-provenance.mjs",
      ],
      { cwd: repositoryPath, label: "Checking runtime artwork support" },
    );
    return true;
  } catch {
    return false;
  }
}

/** Build a cloud successor without re-embedding a private art bank. */
async function prepareRuntimeContentSuccessor({
  branch,
  existing,
  id,
  isMain = false,
  label,
  repositoryPath,
  statePath,
  targetRevision,
  content = existing?.current?.content,
}) {
  // Refuses a snapshot whose blobs are missing or altered before any build.
  loadContent(content);
  if (
    existing?.pending?.revision === targetRevision &&
    existing.pending.content?.id === content.id &&
    buildPresentOnDisk(existing.pending).ok
  )
    return emit(
      "complete",
      `The ${label} build ${targetRevision.slice(0, 12)} is already verified and waiting to be activated.`,
      { outcome: "pending", track: id, revision: targetRevision },
    );
  const runPreparation = (command, commandArgs, options) => {
    const operation =
      commandArgs[0] === "worktree"
        ? "workspace-create"
        : commandArgs[0] === "npm" && commandArgs[1] === "ci"
          ? "install"
          : null;
    return operation
      ? run(
          process.execPath,
          [
            path.join(repositoryPath, "scripts/storage/cli.mjs"),
            "run",
            operation,
            "--",
            command,
            ...commandArgs,
          ],
          options,
        )
      : run(command, commandArgs, options);
  };
  const paths = await prepareUpdateWorkspace({
    dataRoot,
    repositoryPath,
    revision: targetRevision,
    preferredSource: existing?.current
      ? controllerPaths(
          dataRoot,
          existing.current.revision,
          content.id.slice(0, 12),
        ).sourcePath
      : null,
    run: runPreparation,
    capture,
  });
  const exactHead = await capture("/usr/bin/git", ["rev-parse", "HEAD"], {
    cwd: paths.sourcePath,
    label: "Verifying the build revision",
  });
  const dirty = await capture(
    "/usr/bin/git",
    ["status", "--porcelain", "--untracked-files=all"],
    {
      cwd: paths.sourcePath,
      label: "Verifying the clean build workspace",
    },
  );
  if (exactHead !== targetRevision || dirty)
    throw new Error(
      "The runtime-content build workspace is not exact and clean.",
    );

  const buildEnvironment = {
    VITE_OCD_BUILD_PROFILE: "internal-art-review",
    VITE_RUNTIME_CONTENT: "1",
    // TypeScript validates changed source/config/compiler signatures itself.
    // Keeping its path stable lets that check reuse valid incremental state.
    PG_RUN_ID: "controller-update",
    PG_ARTIFACTS_DIR: path.join(paths.sourcePath, "test-results", "runs"),
  };
  const nodeIdentity = await capture(
    "/usr/bin/env",
    [
      "node",
      "-p",
      "JSON.stringify({node:process.version,abi:process.versions.modules,platform:process.platform,arch:process.arch})",
    ],
    { cwd: paths.sourcePath },
  );
  const npmVersion = await capture("/usr/bin/env", ["npm", "--version"], {
    cwd: paths.sourcePath,
  });
  const dependencies = await ensureUpdateDependencies({
    ...paths,
    toolchain: `${nodeIdentity}\n${npmVersion}`,
    run: runPreparation,
  });
  if (dependencies.reused) emit("log", "Reusing unchanged game dependencies.");
  await run("/usr/bin/env", ["npm", "run", "build"], {
    cwd: paths.sourcePath,
    env: buildEnvironment,
    label: "Compiling the verified cloud update",
    phase: "preparing",
  });
  const desktopPath = path.join(paths.sourcePath, "desktop");
  await run(
    process.execPath,
    [
      "scripts/stage.mjs",
      "--composition",
      isMain
        ? "accepted-main"
        : `branch-preview:${branch}@${targetRevision.slice(0, 12)}`,
    ],
    {
      cwd: desktopPath,
      env: buildEnvironment,
      label: "Verifying and staging the cloud update",
      phase: "verifying",
    },
  );
  const stagedRoot = path.join(desktopPath, "staged");
  const identity = JSON.parse(
    readFileSync(path.join(stagedRoot, "build-identity.json"), "utf8"),
  );
  if (
    identity.revision !== targetRevision ||
    identity.profile !== "internal-art-review" ||
    identity.dirty !== false
  )
    throw new Error("The cloud update does not match its source revision.");

  const build = stageReceivedCode({
    clientDir: path.join(stagedRoot, "client"),
    dataRoot,
    revision: targetRevision,
    version: identity.version,
    content,
    ownedUpdate: true,
  });
  if (isMain || !existing?.current) {
    // Main and a new preview have no received channel: record the verified build as pending,
    // exactly as the pack path does, unless the track moved meanwhile.
    const latest = readState(statePath);
    const prior = latest?.tracks[id];
    if (
      prior?.current?.revision !== existing?.current?.revision ||
      prior?.current?.clientTreeSha256 !== existing?.current?.clientTreeSha256
    )
      throw new Error("The selected build changed while its update was built.");
    writeState(statePath, {
      ...withPending(latest, id, branch, build),
      repositoryPath,
    });
    return emit(
      "complete",
      prior
        ? `The ${label} build ${targetRevision.slice(0, 12)} is verified and waiting to be activated.`
        : `The ${label} build is verified and ready to play.`,
      {
        outcome: prior ? "pending" : "activated",
        track: id,
        revision: targetRevision,
      },
    );
  }
  publishReceivedChannel({
    dataRoot,
    track: id,
    build,
    base: {
      revision: existing.current.revision,
      clientTreeSha256: existing.current.clientTreeSha256,
      contentId: existing.current.content?.id ?? null,
    },
  });
  const received = reconcileReceivedChannel(dataRoot, id);
  if (received?.outcome !== "pending")
    throw new Error(
      "The cloud update did not enter the verified waiting state.",
    );
  // The receiver changed only this track.  Confirm its current record did not
  // move while compilation ran; reconcileReceivedChannel already refuses a
  // concurrent file write, and this read gives the worker a precise message.
  const finalState = readState(statePath);
  if (
    finalState?.tracks[id]?.current?.revision !== existing.current.revision ||
    finalState.tracks[id].pending?.revision !== targetRevision
  )
    throw new Error("The selected preview changed while its update was built.");
  return emit(
    "complete",
    `The ${label} build ${targetRevision.slice(0, 12)} is verified and waiting to be activated.`,
    { outcome: "pending", track: id, revision: targetRevision },
  );
}

async function main(received = null) {
  const release = leaseUpdateWorkspace(dataRoot);
  updateLease = release;
  try {
    return await prepareUpdate(received);
  } finally {
    updateLease = null;
    release();
  }
}

async function prepareUpdate() {
  const statePath = path.join(path.resolve(dataRoot), "state.json");
  const initialState = readState(statePath);
  if (!initialState)
    return fail("The installed controller has no verified current build.");
  const isMain = requestedTrack === MAIN_TRACK;
  const branch = isMain ? "main" : requestedTrack.slice("branch:".length);
  const id = trackId(isMain ? MAIN_TRACK : branch);
  const label = isMain ? "accepted main" : `branch ${branch}`;
  const remoteRef = `refs/remotes/origin/${branch}`;

  try {
    const repositoryPath = await verifyRepository(requestedRepository);
    emit("progress", `Fetching ${label} from GitHub…`, { phase: "fetching" });
    try {
      // Argument array, explicit refspec: a branch label never reaches a shell.
      await run(
        "/usr/bin/git",
        [
          "fetch",
          "--quiet",
          "--no-tags",
          "origin",
          `+refs/heads/${branch}:${remoteRef}`,
        ],
        { cwd: repositoryPath, label: `Fetching ${label}` },
      );
    } catch (error) {
      return fail(
        `Offline or unavailable: ${error.message} The last verified build is still ready to play.`,
        "offline",
      );
    }

    const targetRevision = await capture(
      "/usr/bin/git",
      ["rev-parse", "--verify", "--end-of-options", `${remoteRef}^{commit}`],
      { cwd: repositoryPath, label: `Resolving ${label}` },
    );
    emit("resolved", `${label} is ${targetRevision.slice(0, 12)}.`, {
      track: id,
      revision: targetRevision,
    });
    // A preview can only be packaged if its own revision carries the desktop
    // shell and client provenance the packager needs. Branches that predate
    // them fail here, in seconds, instead of after a full dependency install.
    // One listing: a git error is a failure, only a successful listing that
    // lacks a file means the revision predates the shell.
    const present = new Set(
      (
        await capture(
          "/usr/bin/git",
          [
            "ls-tree",
            "--name-only",
            targetRevision,
            "--",
            ...DESKTOP_SHELL_FILES,
          ],
          { cwd: repositoryPath, label: "Checking the desktop shell" },
        )
      )
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    );
    const missingShell = DESKTOP_SHELL_FILES.filter(
      (file) => !present.has(file),
    );
    if (missingShell.length > 0)
      return fail(
        `This build predates the desktop app (${missingShell.join(", ")} missing at ${targetRevision.slice(0, 12)}), so it can't be previewed here. The current verified build is unchanged.`,
        "unsupported",
      );

    const state = readState(statePath) ?? initialState;
    const existing = state.tracks[id] ?? null;
    const currentRevision = existing?.current?.revision ?? null;
    let currentIsAncestor = false;
    if (currentRevision) {
      try {
        await capture(
          "/usr/bin/git",
          ["merge-base", "--is-ancestor", currentRevision, targetRevision],
          { cwd: repositoryPath, label: "Checking update ancestry" },
        );
        currentIsAncestor = true;
      } catch {
        currentIsAncestor = false;
      }
    }
    const assessment = assessUpdateTarget({
      currentRevision,
      targetRevision,
      // A branch preview may be rewritten; only main refuses non-descendants.
      currentIsAncestor:
        isMain || existing?.current?.preparedLocally === true
          ? currentIsAncestor
          : true,
    });
    if (
      assessment.action === "none" &&
      buildPresentOnDisk(existing?.current).ok
    ) {
      writeState(statePath, { ...state, repositoryPath });
      return emit("complete", `This is already the current ${label} build.`, {
        outcome: "up-to-date",
        track: id,
        revision: targetRevision,
      });
    }

    // A receiver-prepared build carries a verified runtime-content snapshot
    // rather than a staged private pack.  When its cloud branch advances
    // linearly, compile the new code in runtime-content mode and pair it with
    // that exact snapshot.  Divergence is retained; no merge, rebase or
    // downgrade occurs in the updater.
    if (
      existing?.current?.preparedLocally === true &&
      currentRevision !== targetRevision
    ) {
      if (!currentIsAncestor)
        return emit(
          "complete",
          "Your private preview contains work outside the selected GitHub version. It has been kept.",
          { outcome: "kept-local", track: id, revision: targetRevision },
        );
      if (existing.current.content)
        return await prepareRuntimeContentSuccessor({
          branch,
          existing,
          id,
          isMain,
          label,
          repositoryPath,
          statePath,
          targetRevision,
        });
      return emit(
        "complete",
        "A newer version is on GitHub. It is awaiting preparation for this console; your current game is ready to play.",
        { outcome: "source-available", track: id, revision: targetRevision },
      );
    }

    // Every compatible track reuses the one preparation workspace and an
    // installed artwork snapshot, including a preview with no current build.
    const runtimeContent = runtimeContentFor(state, id);
    if (
      runtimeContent &&
      assessment.action !== "refuse" &&
      (await supportsRuntimeContent(repositoryPath, targetRevision))
    ) {
      emit(
        "progress",
        `Pairing ${label} with runtime artwork ${runtimeContent.id.slice(0, 12)}.`,
        { phase: "verifying" },
      );
      return await prepareRuntimeContentSuccessor({
        branch,
        existing,
        id,
        isMain,
        label,
        repositoryPath,
        statePath,
        targetRevision,
        content: runtimeContent,
      });
    }

    return fail(
      assessment.action === "refuse"
        ? "The selected source cannot replace your installed game. Your current game has been kept."
        : "This source needs the older private-pack installer. Automatic preparation is unavailable because it would create another project copy. Your installed games remain ready to play.",
      "unsupported",
    );
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

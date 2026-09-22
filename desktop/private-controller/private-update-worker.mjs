import {
  publishReceivedChannel,
  reconcileReceivedChannel,
  stageReceivedCode,
} from "./received-channel.mjs";
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
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createHash } from "node:crypto";
import { assertProvenanceMatches } from "../../scripts/client-provenance.mjs";

import {
  MAIN_TRACK,
  cleanHubState,
  trackId,
  validBranchName,
  withPending,
} from "./hub-model.mjs";
import { loadContent } from "../runtime-content.mjs";
import {
  assessUpdateTarget,
  buildPresentOnDisk,
  buildRecord,
  controllerPaths,
  repositoryIsExpected,
  privateInputIgnoreRules,
  runtimeContentFor,
} from "./private-update.mjs";

const EXPECTED_PACKAGE_NAME = "political-life-rpg";
const PACK_SCHEMA = "ocd-private-pack/v1";
// The health check is the hub's own trusted harness, not the target
// source's copy: a selected branch cannot weaken the check that admits it.
/** Files a revision must contain for the hub to package it. */
const DESKTOP_SHELL_FILES = [
  "desktop/package.json",
  "desktop/scripts/stage.mjs",
  "desktop/scripts/package.mjs",
  "scripts/client-provenance.mjs",
];

const HARNESS_ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "scripts",
);
const HARNESS_FILES = [
  "smoke-test.mjs",
  "game-launch-environment.mjs",
  "drawn-appearance-proof.mjs",
  "saved-identity-proof.mjs",
  "creator-drive.mjs",
];

const args = process.argv.slice(2);
const valueAfter = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? null : (args[index + 1] ?? null);
};
const dataRoot = valueAfter("--data-root");
const requestedRepository = valueAfter("--repo");
const requestedTrack = valueAfter("--track") ?? MAIN_TRACK;
const requestedPack = valueAfter("--pack");
const receivedFirst = args.includes("--received-first");
const hubExecutable = valueAfter("--hub-executable") ?? process.execPath;

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
  emit("progress", options.label ?? `${command} ${commandArgs.join(" ")}`, {
    ...(options.phase ? { phase: options.phase } : {}),
  });
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
    return cleanHubState(JSON.parse(readFileSync(statePath, "utf8")));
  } catch {
    return null;
  }
}

function sha256File(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

/** Verify the private pack's own recorded manifest identity before use. */
function verifyPrivatePack(packRoot) {
  const pack = JSON.parse(
    readFileSync(path.join(packRoot, "pack.json"), "utf8"),
  );
  if (pack.schemaVersion !== PACK_SCHEMA)
    throw new Error("The private art pack has an unknown schema.");
  if (pack.visibility !== "private-local-only")
    throw new Error("The private art pack is not marked private-local-only.");
  const manifest = path.join(packRoot, pack.manifest ?? "sha256.txt");
  const actual = sha256File(manifest);
  if (actual !== pack.manifestSha256)
    throw new Error("The private art pack manifest does not match its record.");
  if (!existsSync(path.join(packRoot, "stage-into-worktree.sh")))
    throw new Error("The private art pack has no installer.");
  /*
   * `generation` is optional and additive. A pack that states which kit
   * generation it was composed from says so here, so the activated record can
   * name it instead of a reader taking the number out of DELIVERY.md prose. A
   * pack without it — every pack built before the field existed — verifies and
   * records exactly what it always did.
   */
  const generation =
    Number.isInteger(pack.generation) && pack.generation >= 0
      ? pack.generation
      : null;
  return {
    packId: String(pack.packId),
    manifestSha256: actual,
    fileCount: pack.fileCount ?? null,
    generation,
  };
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

async function removeOwnedStaging(paths, repositoryPath) {
  if (!existsSync(paths.stagingRoot)) return;
  const marker = path.join(
    paths.stagingRoot,
    ".ocd-private-controller-staging",
  );
  if (!existsSync(marker))
    throw new Error(
      "The update workspace already exists and is not owned by this controller.",
    );
  if (existsSync(paths.sourcePath)) {
    await run(
      "/usr/bin/git",
      ["worktree", "remove", "--force", paths.sourcePath],
      {
        cwd: repositoryPath,
        label: "Removing the controller's interrupted update workspace",
      },
    );
  }
  rmSync(paths.stagingRoot, { recursive: true, force: true });
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
  content = existing.current.content,
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
  const paths = controllerPaths(
    dataRoot,
    targetRevision,
    content.id.slice(0, 12),
  );
  await removeOwnedStaging(paths, repositoryPath);
  mkdirSync(paths.stagingRoot, { recursive: true });
  writeFileSync(
    path.join(paths.stagingRoot, ".ocd-private-controller-staging"),
    "1\n",
  );
  await run(
    "/usr/bin/git",
    ["worktree", "add", "--detach", paths.sourcePath, targetRevision],
    {
      cwd: repositoryPath,
      label: "Creating a clean runtime-content build workspace",
    },
  );
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
  };
  await run("/usr/bin/env", ["npm", "ci", "--no-audit", "--no-fund"], {
    cwd: paths.sourcePath,
    label: "Installing pinned game dependencies",
    phase: "preparing",
  });
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
  });
  if (isMain) {
    // Main has no received channel: record the verified build as pending,
    // exactly as the pack path does, unless the track moved meanwhile.
    const latest = readState(statePath);
    const prior = latest?.tracks[id];
    if (
      prior &&
      (prior.current.revision !== existing.current.revision ||
        prior.current.clientTreeSha256 !== existing.current.clientTreeSha256)
    )
      throw new Error("Accepted main changed while its update was built.");
    writeState(statePath, {
      ...withPending(latest, id, branch, build),
      repositoryPath,
    });
    return emit(
      "complete",
      `The ${label} build ${targetRevision.slice(0, 12)} is verified and waiting to be activated.`,
      { outcome: "pending", track: id, revision: targetRevision },
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
      (received?.outcome === "up-to-date" ||
        (existing?.current?.preparedLocally === true &&
          existing.current.content)) &&
      currentRevision === targetRevision &&
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
        return prepareRuntimeContentSuccessor({
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

    // Main moves to runtime content as soon as its code supports it: the
    // build pairs with a snapshot another track already plays, so accepted
    // main no longer depends on a pack pinned to one source revision.
    const runtimeContent = isMain ? runtimeContentFor(state, id) : null;
    if (
      existing?.current &&
      runtimeContent &&
      assessment.action !== "refuse" &&
      (await supportsRuntimeContent(repositoryPath, targetRevision))
    ) {
      emit(
        "progress",
        `Pairing ${label} with runtime artwork ${runtimeContent.id.slice(0, 12)}.`,
        { phase: "verifying" },
      );
      return prepareRuntimeContentSuccessor({
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

    if (!requestedPack || !path.isAbsolute(requestedPack))
      return fail(
        "No private art pack is configured. A public-only build is not a private Play build.",
        "missing-private-pack",
      );
    const pack = verifyPrivatePack(requestedPack);
    emit("progress", `Private art pack ${pack.packId} verified.`, {
      phase: "verifying",
    });
    const samePack =
      existing?.current?.privatePack?.manifestSha256 === pack.manifestSha256;
    // A recorded build only counts as already done when its payload is
    // actually on disk and names this revision and profile; otherwise this
    // falls through and rebuilds instead of reporting a build that is gone.
    const pendingMatches =
      existing?.pending?.revision === targetRevision &&
      existing.pending.privatePack?.manifestSha256 === pack.manifestSha256 &&
      buildPresentOnDisk(existing.pending).ok;
    if (pendingMatches) {
      writeState(statePath, { ...state, repositoryPath });
      return emit(
        "complete",
        `The ${label} build ${targetRevision.slice(0, 12)} is already verified and waiting to be activated.`,
        { outcome: "pending", track: id, revision: targetRevision },
      );
    }
    if (
      assessment.action === "none" &&
      samePack &&
      buildPresentOnDisk(existing?.current).ok
    ) {
      writeState(statePath, { ...state, repositoryPath });
      return emit("complete", `This is already the current ${label} build.`, {
        outcome: "up-to-date",
        track: id,
        revision: targetRevision,
      });
    }
    if (assessment.action === "refuse") {
      return fail(
        assessment.reason === "unsupported-downgrade-or-fork"
          ? "The installed game contains work that is not on the selected GitHub branch. Your current version has been kept."
          : "The update target could not be verified.",
        assessment.reason,
      );
    }

    if (existing?.current?.preparedLocally === true)
      return fail(
        "The prepared game needs repair. Your saves have been kept; a verified replacement must be installed in this console.",
        "failed",
      );

    const paths = controllerPaths(
      dataRoot,
      targetRevision,
      pack.manifestSha256.slice(0, 12),
    );
    await removeOwnedStaging(paths, repositoryPath);
    mkdirSync(paths.stagingRoot, { recursive: true });
    writeFileSync(
      path.join(paths.stagingRoot, ".ocd-private-controller-staging"),
      "1\n",
    );

    await run(
      "/usr/bin/git",
      ["worktree", "add", "--detach", paths.sourcePath, targetRevision],
      {
        cwd: repositoryPath,
        label: "Creating a clean versioned build workspace",
      },
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

    emit("progress", "Staging private art inputs…", { phase: "preparing" });
    await run(
      "/bin/sh",
      [path.join(requestedPack, "stage-into-worktree.sh"), paths.sourcePath],
      { label: "Staging and verifying the private art pack" },
    );
    const trackedAfterPack = await capture(
      "/usr/bin/git",
      ["status", "--porcelain", "--untracked-files=no"],
      { cwd: paths.sourcePath, label: "Verifying tracked source is unchanged" },
    );
    if (trackedAfterPack)
      throw new Error("Staging the private pack changed tracked source.");

    // Older revisions predate the private-art ignore rules. Exclude only
    // checksummed, verified inputs for this build; unknown files still fail.
    const packMetadata = JSON.parse(
      readFileSync(path.join(requestedPack, "pack.json"), "utf8"),
    );
    const inputs = privateInputIgnoreRules(
      readFileSync(
        path.join(requestedPack, packMetadata.manifest ?? "sha256.txt"),
        "utf8",
      ),
    );
    for (const input of inputs)
      if (sha256File(path.join(paths.sourcePath, input.path)) !== input.sha256)
        throw new Error(`The staged private input changed: ${input.path}`);
    const excludesPath = path.join(
      paths.stagingRoot,
      "verified-private-inputs.ignore",
    );
    writeFileSync(
      excludesPath,
      `${inputs.map((input) => input.rule).join("\n")}\n`,
    );
    const configIndex = Number(process.env.GIT_CONFIG_COUNT ?? 0);
    const buildEnvironment = {
      GIT_CONFIG_COUNT: String(configIndex + 1),
      [`GIT_CONFIG_KEY_${configIndex}`]: "core.excludesFile",
      [`GIT_CONFIG_VALUE_${configIndex}`]: excludesPath,
      VITE_OCD_BUILD_PROFILE: "internal-art-review",
    };
    const unexpectedFiles = await capture(
      "/usr/bin/git",
      ["status", "--porcelain", "--untracked-files=all"],
      {
        cwd: paths.sourcePath,
        env: buildEnvironment,
      },
    );
    if (unexpectedFiles)
      throw new Error(
        "The build workspace contains changes beyond its verified private inputs.",
      );

    await run("/usr/bin/env", ["npm", "ci", "--no-audit", "--no-fund"], {
      cwd: paths.sourcePath,
      label: "Installing pinned game dependencies",
      phase: "preparing",
    });
    await run("/usr/bin/env", ["npm", "run", "build"], {
      cwd: paths.sourcePath,
      env: buildEnvironment,
      label: "Compiling the internal art-review game",
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
        label: "Verifying and staging the compiled game",
      },
    );
    const builtApp = path.join(
      paths.stagingRoot,
      "prepared",
      "Our Civic Duty.app",
    );
    const resources = path.join(builtApp, "Contents", "Resources");
    mkdirSync(resources, { recursive: true });
    cpSync(
      path.join(desktopPath, "staged", "client"),
      path.join(resources, "client"),
      { recursive: true },
    );
    cpSync(
      path.join(desktopPath, "staged", "build-identity.json"),
      path.join(resources, "build-identity.json"),
    );
    const identity = JSON.parse(
      readFileSync(path.join(resources, "build-identity.json"), "utf8"),
    );
    const verified = assertProvenanceMatches({
      clientDir: path.join(resources, "client"),
      expectedRevision: targetRevision,
      expectedDirty: false,
    });
    if (
      identity.revision !== targetRevision ||
      identity.profile !== "internal-art-review" ||
      identity.clientTreeSha256 !== verified.treeSha256
    )
      throw new Error("The prepared game does not match the requested update.");
    const architecture = process.arch;
    if (architecture !== "arm64")
      throw new Error("This update requires Apple Silicon.");

    const harness = path.join(
      paths.sourcePath,
      ".hub-harness",
      "desktop",
      "scripts",
    );
    mkdirSync(harness, { recursive: true });
    for (const file of HARNESS_FILES)
      cpSync(path.join(HARNESS_ROOT, file), path.join(harness, file));
    await run(
      process.execPath,
      [
        path.join(harness, "smoke-test.mjs"),
        "--hub",
        hubExecutable,
        "--payload",
        builtApp,
      ],
      {
        cwd: desktopPath,
        env: { OCD_EXPECT_ART_PREVIEW: "1" },
        label:
          "Launching and health-checking the candidate-profile application",
      },
    );
    emit("progress", "Health check passed.", { phase: "verifying" });

    mkdirSync(paths.versionPath, { recursive: true });
    const temporaryApp = `${paths.appPath}.installing-${process.pid}`;
    rmSync(temporaryApp, { recursive: true, force: true });
    cpSync(builtApp, temporaryApp, {
      recursive: true,
      verbatimSymlinks: true,
    });
    rmSync(paths.appPath, { recursive: true, force: true });
    renameSync(temporaryApp, paths.appPath);
    const record = {
      delivery: "console-client-payload",
      ...buildRecord(
        identity,
        paths.appPath,
        architecture,
        new Date().toISOString(),
      ),
      clientTreeSha256: identity.clientTreeSha256 ?? "unknown",
      privatePack: {
        packId: pack.packId,
        manifestSha256: pack.manifestSha256,
      },
    };
    // Re-read: the hub may have changed selection while this build ran.
    const latest = readState(statePath) ?? state;
    const prior = latest.tracks[id];
    const next = {
      ...latest,
      repositoryPath,
      tracks: {
        ...latest.tracks,
        [id]: prior
          ? { ...prior, pending: record }
          : { branch, current: record, pending: null, previous: null },
      },
    };
    // Never swap code beneath a running game: the hub activates the pending
    // build only after the Play view for this track is closed.
    const firstBuild = !prior;
    writeState(statePath, next);
    emit(
      "complete",
      firstBuild
        ? `The ${label} build is verified and ready to play.`
        : `The ${label} build ${record.revision.slice(0, 12)} is verified and waiting to be activated.`,
      {
        outcome: firstBuild ? "activated" : "pending",
        track: id,
        revision: record.revision,
      },
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

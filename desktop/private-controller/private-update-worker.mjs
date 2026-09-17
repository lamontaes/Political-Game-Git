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
import { fileURLToPath } from "node:url";

import { createHash } from "node:crypto";

import {
  MAIN_TRACK,
  cleanHubState,
  trackId,
  validBranchName,
} from "./hub-model.mjs";
import {
  assessUpdateTarget,
  buildRecord,
  controllerPaths,
  repositoryIsExpected,
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
];
const APP_NAME = "Our Civic Duty.app";

const args = process.argv.slice(2);
const valueAfter = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? null : (args[index + 1] ?? null);
};
const dataRoot = valueAfter("--data-root");
const requestedRepository = valueAfter("--repo");
const requestedTrack = valueAfter("--track") ?? MAIN_TRACK;
const requestedPack = valueAfter("--pack");

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
} else if (!requestedPack || !path.isAbsolute(requestedPack)) {
  fail(
    "No private art pack is configured. A public-only build is not a private Play build.",
    "missing-private-pack",
  );
} else {
  await main();
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
  return {
    packId: String(pack.packId),
    manifestSha256: actual,
    fileCount: pack.fileCount ?? null,
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

async function main() {
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
    const pack = verifyPrivatePack(requestedPack);
    emit("progress", `Private art pack ${pack.packId} verified.`, {
      phase: "verifying",
    });
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
      currentIsAncestor: isMain ? currentIsAncestor : true,
    });
    const samePack =
      existing?.current?.privatePack?.manifestSha256 === pack.manifestSha256;
    const pendingMatches =
      existing?.pending?.revision === targetRevision &&
      existing.pending.privatePack?.manifestSha256 === pack.manifestSha256 &&
      existsSync(existing.pending.appPath);
    if (pendingMatches) {
      writeState(statePath, { ...state, repositoryPath });
      return emit(
        "complete",
        `The ${label} build ${targetRevision.slice(0, 12)} is already verified and waiting to be activated.`,
        { outcome: "pending", track: id, revision: targetRevision },
      );
    }
    if (assessment.action === "none" && samePack) {
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
          ? "Accepted main is not a descendant of the installed build. Refusing an unsupported downgrade or fork; the current build is unchanged."
          : "The update target could not be verified.",
        assessment.reason,
      );
    }

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

    await run("/usr/bin/env", ["npm", "ci", "--no-audit", "--no-fund"], {
      cwd: paths.sourcePath,
      label: "Installing pinned game dependencies",
      phase: "preparing",
    });
    await run("/usr/bin/env", ["npm", "run", "build"], {
      cwd: paths.sourcePath,
      env: { VITE_OCD_BUILD_PROFILE: "internal-art-review" },
      label: "Compiling the internal art-review game",
      phase: "preparing",
    });
    const desktopPath = path.join(paths.sourcePath, "desktop");
    await run("/usr/bin/env", ["npm", "ci", "--no-audit", "--no-fund"], {
      cwd: desktopPath,
      label: "Installing pinned desktop dependencies",
    });
    await run(
      process.execPath,
      [
        "scripts/stage.mjs",
        "--composition",
        isMain
          ? "accepted-main"
          : `branch-preview:${branch}@${targetRevision.slice(0, 12)}`,
      ],
      { cwd: desktopPath, label: "Verifying and staging the compiled game" },
    );
    await run(
      process.execPath,
      ["scripts/package.mjs", "--mac", "--arm64", "--dir", "-c.mac.target=dir"],
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
      throw new Error(`The application identity does not match ${label}.`);
    const executable = path.join(
      builtApp,
      "Contents",
      "MacOS",
      APP_NAME.slice(0, -4),
    );
    const architecture = await capture("/usr/bin/file", ["-b", executable], {
      label: "Checking the application architecture",
    });
    if (!architecture.includes("arm64"))
      throw new Error("The application is not an Apple Silicon build.");

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
      [path.join(harness, "smoke-test.mjs"), "--app", executable],
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

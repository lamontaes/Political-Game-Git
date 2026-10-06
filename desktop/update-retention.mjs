/** Keep one direct-Mac fallback and restore it after two failed starts. */
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const stateFile = "state.json";
const previousName = "previous";
const stagingName = "previous-staging";
const failedName = "failed-current";

function safeDirectory(dir) {
  const stat = lstatSync(dir);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw Error("Update retention path is not a real directory");
  return realpathSync(dir);
}

function appVersion(appPath) {
  const identity = JSON.parse(
    readFileSync(
      path.join(appPath, "Contents/Resources/build-identity.json"),
      "utf8",
    ),
  );
  if (typeof identity.version !== "string" || !identity.version)
    throw Error("App build identity has no version");
  return identity.version;
}

function readState(root) {
  const file = path.join(root, stateFile);
  if (!existsSync(file)) return null;
  if (lstatSync(file).isSymbolicLink())
    throw Error("Retention state is aliased");
  const value = JSON.parse(readFileSync(file, "utf8"));
  if (
    value.schema !== 1 ||
    typeof value.previousVersion !== "string" ||
    (typeof value.pendingVersion !== "string" &&
      value.pendingVersion !== null) ||
    (value.outcome !== undefined &&
      !["pending", "ready", "failed"].includes(value.outcome)) ||
    !Number.isInteger(value.failedStarts) ||
    value.failedStarts < 0
  )
    throw Error("Unknown update retention state");
  return value;
}

function writeState(root, state) {
  const target = path.join(root, stateFile);
  const temporary = `${target}.tmp`;
  rmSync(temporary, { force: true });
  writeFileSync(temporary, `${JSON.stringify(state)}\n`, {
    mode: 0o600,
    flag: "wx",
  });
  renameSync(temporary, target);
}

function validAppBundle(appPath) {
  if (lstatSync(appPath).isSymbolicLink()) throw Error("App bundle is aliased");
  const resolved = realpathSync(appPath);
  if (resolved !== appPath || !resolved.endsWith(".app"))
    throw Error("Unexpected app bundle path");
  return resolved;
}

function copyApp(source, destination) {
  cpSync(source, destination, { recursive: true, errorOnExist: true });
  if (appVersion(destination) !== appVersion(source)) {
    rmSync(destination, { recursive: true, force: true });
    throw Error("Copied app identity does not match source");
  }
}

function retentionRoot(appDataPath) {
  const base = safeDirectory(appDataPath);
  const root = path.join(base, "Our Civic Duty Updates");
  mkdirSync(root, { recursive: true, mode: 0o700 });
  if (lstatSync(root).isSymbolicLink())
    throw Error("Retention root is aliased");
  return safeDirectory(root);
}

/** Snapshot the current signed app immediately before an explicit install. */
export function prepareMacUpdateRetention({
  appBundlePath,
  appDataPath,
  nextVersion,
}) {
  const app = validAppBundle(appBundlePath);
  const root = retentionRoot(appDataPath);
  const currentVersion = appVersion(app);
  if (
    typeof nextVersion !== "string" ||
    !nextVersion ||
    nextVersion === currentVersion
  )
    throw Error("Update target version is invalid");
  const staging = path.join(root, stagingName);
  const previous = path.join(root, previousName);
  rmSync(staging, { recursive: true, force: true });
  copyApp(app, staging);
  rmSync(previous, { recursive: true, force: true });
  renameSync(staging, previous);
  writeState(root, {
    schema: 1,
    previousVersion: currentVersion,
    pendingVersion: nextVersion,
    failedStarts: 0,
    outcome: "pending",
  });
  return { previousVersion: currentVersion, previousPath: previous };
}

/** Count starts before renderer-ready; return rollback after the second miss. */
export function noteMacUpdateStart({ appBundlePath, appDataPath }) {
  const app = validAppBundle(appBundlePath);
  const root = retentionRoot(appDataPath);
  const state = readState(root);
  if (!state) return { action: "none" };
  if (state.pendingVersion === null) return { action: "stable" };
  const currentVersion = appVersion(app);
  if (currentVersion === state.previousVersion) {
    if (state.outcome === "failed")
      return {
        action: "rollback-complete",
        previousVersion: state.previousVersion,
      };
    rmSync(path.join(root, previousName), { recursive: true, force: true });
    rmSync(path.join(root, stateFile), { force: true });
    return { action: "install-not-applied" };
  }
  if (currentVersion !== state.pendingVersion)
    throw Error("Running app does not match the pending update");
  const failedStarts = state.failedStarts + 1;
  writeState(root, { ...state, failedStarts });
  if (failedStarts < 2) return { action: "pending", failedStarts };

  const previous = path.join(root, previousName);
  if (
    lstatSync(previous).isSymbolicLink() ||
    realpathSync(previous) !== previous ||
    appVersion(previous) !== state.previousVersion
  )
    throw Error("Fallback app identity does not match retention state");
  const failed = path.join(root, failedName);
  rmSync(failed, { recursive: true, force: true });
  renameSync(app, failed);
  try {
    copyApp(previous, app);
  } catch (error) {
    renameSync(failed, app);
    throw error;
  }
  rmSync(failed, { recursive: true, force: true });
  writeState(root, { ...state, outcome: "failed" });
  return {
    action: "rollback-restored",
    previousVersion: state.previousVersion,
  };
}

/** A renderer-ready event ends the trial, keeping this one fallback. */
export function markMacUpdateReady({ appBundlePath, appDataPath }) {
  const app = validAppBundle(appBundlePath);
  const root = retentionRoot(appDataPath);
  const state = readState(root);
  if (!state) return { action: "none" };
  if (state.outcome === "failed") {
    if (appVersion(app) !== state.previousVersion)
      throw Error("Restored app does not match recorded fallback");
    rmSync(path.join(root, previousName), { recursive: true, force: true });
    rmSync(path.join(root, stateFile), { force: true });
    return {
      action: "rollback-notice",
      previousVersion: state.previousVersion,
    };
  }
  if (state.pendingVersion === null) return { action: "stable" };
  if (state.outcome === "failed") {
    if (appVersion(app) !== state.previousVersion)
      throw Error("Restored app does not match recorded fallback");
    rmSync(path.join(root, previousName), { recursive: true, force: true });
    rmSync(path.join(root, stateFile), { force: true });
    return {
      action: "rollback-notice",
      previousVersion: state.previousVersion,
    };
  }
  if (appVersion(app) !== state.pendingVersion)
    throw Error("Ready app does not match the pending update");
  writeState(root, {
    ...state,
    pendingVersion: null,
    failedStarts: 0,
    outcome: "ready",
  });
  return { action: "ready", previousVersion: state.previousVersion };
}

export function macAppBundleFromExecutable(executablePath) {
  const marker = ".app/";
  const index = executablePath.indexOf(marker);
  if (index < 0) throw Error("Executable is not inside a Mac app bundle");
  return executablePath.slice(0, index + marker.length - 1);
}

/* global process, setTimeout, clearTimeout */

import { execFile, spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import electron from "electron";
import {
  buildRecord,
  cleanControllerState,
  automaticCheckDue,
  AUTOMATIC_STARTUP_DELAY_MS,
  setUpdateMode,
} from "./private-update.mjs";
import { inspectInstalledBuild } from "./controller-status.mjs";
import { switchVerifiedBuild } from "./controller-activation.mjs";

const { app, BrowserWindow, dialog, ipcMain, session, shell } = electron;
const execFileAsync = promisify(execFile);
const appRoot = path.dirname(fileURLToPath(import.meta.url));
const resourcesRoot = process.resourcesPath;
const bootstrapApp = path.join(
  resourcesRoot,
  "bootstrap",
  "Our Civic Duty.app",
);
const workerPath = path.join(appRoot, "private-update-worker.mjs");

app.setName("Our Civic Duty Private");
const dataRoot = process.env.OCD_CONTROLLER_DATA_ROOT
  ? path.resolve(process.env.OCD_CONTROLLER_DATA_ROOT)
  : path.join(app.getPath("appData"), "Our Civic Duty Private");
const statePath = path.join(dataRoot, "state.json");
app.setPath("userData", path.join(dataRoot, "controller-profile"));
const ownsController = app.requestSingleInstanceLock();
if (!ownsController) app.quit();
app.on("second-instance", () => {
  mainWindow?.show();
  mainWindow?.focus();
});
let mainWindow = null;
let updateChild = null;
let updateOrigin = null;
let automaticTimer = null;
let launchBusy = false;

function atomicWriteState(state) {
  mkdirSync(dataRoot, { recursive: true });
  const temporary = `${statePath}.next-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  });
  renameSync(temporary, statePath);
}

function readState() {
  try {
    return cleanControllerState(JSON.parse(readFileSync(statePath, "utf8")));
  } catch {
    return null;
  }
}

function readIdentity(appPath) {
  return JSON.parse(
    readFileSync(
      path.join(appPath, "Contents", "Resources", "build-identity.json"),
      "utf8",
    ),
  );
}

function installBootstrapIfNeeded() {
  const existing = readState();
  if (existing) return existing;
  if (existsSync(statePath))
    throw new Error(
      "The existing controller state is unsupported or unreadable. It has been preserved; no installation pointer was replaced.",
    );
  if (!existsSync(bootstrapApp))
    throw new Error(
      "The controller does not contain its verified initial game.",
    );
  const identity = readIdentity(bootstrapApp);
  const versionRoot = path.join(dataRoot, "versions", identity.revision);
  const installedApp = path.join(
    versionRoot,
    "Our Civic Duty Internal Art Review.app",
  );
  mkdirSync(versionRoot, { recursive: true });
  if (!existsSync(installedApp))
    cpSync(bootstrapApp, installedApp, {
      recursive: true,
      verbatimSymlinks: true,
    });
  const defaultRepository = path.join(
    app.getPath("home"),
    "Documents",
    "Political Game",
  );
  const state = {
    schema: 1,
    repositoryPath: existsSync(defaultRepository) ? defaultRepository : null,
    current: buildRecord(
      identity,
      installedApp,
      "Apple Silicon (arm64)",
      new Date().toISOString(),
    ),
    pending: null,
    previous: null,
  };
  const cleaned = cleanControllerState(state);
  atomicWriteState(cleaned);
  return cleaned;
}

function publicState() {
  const state = readState();
  if (!state) return { ready: false, busy: updateChild !== null };
  const installed = inspectInstalledBuild(state.current);
  return {
    ready: installed.ready,
    busy: updateChild !== null,
    repositoryPath: state.repositoryPath,
    current: state.current,
    pending: state.pending,
    previous: state.previous,
    launchBusy,
    updatePolicy: state.updatePolicy,
    installed,
    controllerIdentity: readControllerIdentity(),
  };
}

function readControllerIdentity() {
  try {
    return JSON.parse(
      readFileSync(path.join(resourcesRoot, "controller-build.json"), "utf8"),
    );
  } catch {
    return null;
  }
}

function sendEvent(value) {
  if (mainWindow && !mainWindow.isDestroyed())
    mainWindow.webContents.send("controller:event", value);
}

async function applicationIsRunning(appPath) {
  const executable = path.join(appPath, "Contents", "MacOS", "Our Civic Duty");
  try {
    const { stdout } = await execFileAsync("/bin/ps", ["-axo", "command="]);
    return stdout.split("\n").some((line) => line.startsWith(executable));
  } catch {
    return true;
  }
}

function controllerEnvironment() {
  const toolPaths = [
    "/opt/homebrew/opt/node@22/bin",
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];
  return {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    PATH: [...toolPaths, process.env.PATH ?? ""].join(":"),
  };
}

ipcMain.handle("controller:state", () => publicState());

ipcMain.handle("controller:choose-repository", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose the Political Game repository",
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length !== 1) return publicState();
  const state = readState();
  if (!state) return publicState();
  atomicWriteState({ ...state, repositoryPath: result.filePaths[0] });
  return publicState();
});

async function withLaunchLock(action) {
  if (launchBusy)
    return {
      ok: false,
      message:
        "A Play/activation action is already settling; no second build was opened.",
    };
  launchBusy = true;
  sendEvent({ kind: "state", state: publicState() });
  try {
    return await action();
  } finally {
    launchBusy = false;
    sendEvent({ kind: "state", state: publicState() });
  }
}

ipcMain.handle("controller:play", () =>
  withLaunchLock(async () => {
    const state = readState();
    const installed = inspectInstalledBuild(state?.current);
    if (!installed.ready)
      return {
        ok: false,
        message: installed.problem,
      };
    const problem = await shell.openPath(state.current.appPath);
    return problem
      ? { ok: false, message: problem }
      : { ok: true, message: "Opening the current verified build." };
  }),
);

function switchAction(operation) {
  return withLaunchLock(
    async () =>
      await switchVerifiedBuild(readState(), operation, {
        busy: updateChild !== null,
        inspect: inspectInstalledBuild,
        isRunning: applicationIsRunning,
        writeState: atomicWriteState,
        openPath: (appPath) => shell.openPath(appPath),
      }),
  ).then((result) => ({ ...result, state: publicState() }));
}
ipcMain.handle("controller:finish-update", () => switchAction("finish"));
ipcMain.handle("controller:rollback", () => switchAction("rollback"));

function startUpdate(origin = "manual") {
  if (updateChild)
    return { ok: false, message: "An update is already running." };
  const state = readState();
  if (!state?.repositoryPath)
    return {
      ok: false,
      message: "Choose the Political Game repository first.",
    };
  if (state.pending)
    return {
      ok: false,
      message:
        "A verified update is already waiting. Finish it after the game closes before checking again.",
    };
  atomicWriteState({
    ...state,
    updatePolicy: {
      ...state.updatePolicy,
      lastAttemptAt: new Date().toISOString(),
      lastOutcome: "checking",
    },
  });
  const child = spawn(
    process.execPath,
    [
      workerPath,
      "--data-root",
      dataRoot,
      "--repo",
      state.repositoryPath,
      ...(origin === "automatic" ? ["--automatic"] : []),
    ],
    {
      env: controllerEnvironment(),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  updateChild = child;
  updateOrigin = origin;
  sendEvent({
    kind: "started",
    message:
      origin === "automatic"
        ? "Automatically checking accepted main in the background. Play remains available."
        : "Update started. Play remains available.",
    state: publicState(),
  });
  let pending = "";
  let outcome = "failed";
  let targetRevision = state.updatePolicy.lastTargetRevision;
  const consume = (chunk) => {
    pending += String(chunk);
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (!line) continue;
      try {
        const event = JSON.parse(line);
        if (event.targetRevision) targetRevision = event.targetRevision;
        if (event.outcome || event.reason)
          outcome = event.outcome ?? event.reason;
        sendEvent(event);
      } catch {
        sendEvent({ kind: "log", message: line });
      }
    }
  };
  child.stdout.on("data", consume);
  child.stderr.on("data", consume);
  child.on("error", (error) => {
    sendEvent({ kind: "error", message: error.message });
  });
  child.on("close", (code, signal) => {
    if (pending) consume("\n");
    updateChild = null;
    updateOrigin = null;
    const latest = readState();
    if (latest)
      atomicWriteState({
        ...latest,
        updatePolicy: {
          ...latest.updatePolicy,
          lastOutcome: outcome,
          lastTargetRevision: targetRevision,
        },
      });
    sendEvent({
      kind: code === 0 ? "settled" : "error",
      message:
        code === 0
          ? "Update check finished."
          : `Update stopped (${signal ?? `exit ${code}`}). The current build is unchanged.`,
      state: publicState(),
    });
  });
  return { ok: true, message: "Update started." };
}

ipcMain.handle("controller:update", () => startUpdate("manual"));

ipcMain.handle("controller:update-mode", (_event, mode) => {
  const state = readState();
  if (!state) return { ok: false, message: "No supported controller state." };
  if (mode !== "automatic" && mode !== "manual")
    return { ok: false, message: "Unsupported update preference." };
  atomicWriteState(setUpdateMode(state, mode));
  if (mode === "manual" && updateOrigin === "automatic")
    updateChild?.kill("SIGTERM");
  return {
    ok: true,
    message:
      mode === "automatic"
        ? "Automatic checks enabled: after startup, then at most once every six hours. Play never starts a check."
        : "Manual updates selected and saved. Automatic discovery/staging is off.",
    state: publicState(),
  };
});

ipcMain.handle("controller:cancel", () => {
  if (!updateChild) return { ok: false, message: "No update is running." };
  updateChild.kill("SIGTERM");
  return {
    ok: true,
    message: "Cancelling. The current verified build remains active.",
  };
});

function createWindow() {
  const window = new BrowserWindow({
    width: 820,
    height: 650,
    minWidth: 680,
    minHeight: 520,
    backgroundColor: "#f1eadc",
    title: "Our Civic Duty",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: path.join(appRoot, "preload.cjs"),
    },
  });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  void window.loadFile(path.join(appRoot, "index.html"));
  mainWindow = window;
}

app.whenReady().then(() => {
  if (!ownsController) return;
  try {
    installBootstrapIfNeeded();
  } catch (error) {
    void dialog.showMessageBox({
      type: "error",
      message: "Our Civic Duty could not start.",
      detail: error instanceof Error ? error.message : String(error),
    });
    app.quit();
    return;
  }
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => callback(false),
  );
  createWindow();
  automaticTimer = setTimeout(function check() {
    const state = readState();
    if (!updateChild && automaticCheckDue(state)) startUpdate("automatic");
    automaticTimer = setTimeout(check, 60 * 1000);
  }, AUTOMATIC_STARTUP_DELAY_MS);
});

app.on("window-all-closed", () => {
  clearTimeout(automaticTimer);
  if (updateChild) updateChild.kill("SIGTERM");
  app.quit();
});

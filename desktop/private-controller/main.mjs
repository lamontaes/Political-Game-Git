/* global process */

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
  activatePendingBuild,
  buildRecord,
  cleanControllerState,
} from "./private-update.mjs";

const { app, BrowserWindow, dialog, ipcMain, session, shell } = electron;
const execFileAsync = promisify(execFile);
const appRoot = path.dirname(fileURLToPath(import.meta.url));
const resourcesRoot = process.resourcesPath;
const bootstrapApp = path.join(resourcesRoot, "bootstrap", "Our Civic Duty.app");
const workerPath = path.join(appRoot, "private-update-worker.mjs");

app.setName("Our Civic Duty Private");
const dataRoot = process.env.OCD_CONTROLLER_DATA_ROOT
  ? path.resolve(process.env.OCD_CONTROLLER_DATA_ROOT)
  : path.join(app.getPath("appData"), "Our Civic Duty Private");
const statePath = path.join(dataRoot, "state.json");
let mainWindow = null;
let updateChild = null;

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
  if (!existsSync(bootstrapApp))
    throw new Error("The controller does not contain its verified initial game.");
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
  atomicWriteState(state);
  return state;
}

function publicState() {
  const state = readState();
  if (!state) return { ready: false, busy: updateChild !== null };
  return {
    ready: existsSync(state.current.appPath),
    busy: updateChild !== null,
    repositoryPath: state.repositoryPath,
    current: state.current,
    pending: state.pending,
  };
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

ipcMain.handle("controller:play", async () => {
  const state = readState();
  if (!state || !existsSync(state.current.appPath))
    return {
      ok: false,
      message: "The current verified application is missing.",
    };
  const problem = await shell.openPath(state.current.appPath);
  return problem
    ? { ok: false, message: problem }
    : { ok: true, message: "Opening the current verified build." };
});

ipcMain.handle("controller:finish-update", async () => {
  const state = readState();
  if (!state?.pending) return { ok: false, message: "No update is waiting." };
  if (await applicationIsRunning(state.current.appPath)) {
    return {
      ok: false,
      message:
        "Close the running game first. Its normal save and close guard remains in control.",
    };
  }
  const next = activatePendingBuild(state);
  atomicWriteState(next);
  const problem = await shell.openPath(next.current.appPath);
  return problem
    ? { ok: false, message: problem, state: publicState() }
    : {
        ok: true,
        message: "The verified update is active and opening now.",
        state: publicState(),
      };
});

ipcMain.handle("controller:update", () => {
  if (updateChild)
    return { ok: false, message: "An update is already running." };
  const state = readState();
  if (!state?.repositoryPath)
    return {
      ok: false,
      message: "Choose the Political Game repository first.",
    };
  const child = spawn(
    process.execPath,
    [workerPath, "--data-root", dataRoot, "--repo", state.repositoryPath],
    {
      env: controllerEnvironment(),
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  updateChild = child;
  let pending = "";
  const consume = (chunk) => {
    pending += String(chunk);
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (!line) continue;
      try {
        sendEvent(JSON.parse(line));
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
  child.on("exit", (code, signal) => {
    if (pending) consume("\n");
    updateChild = null;
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
});

app.on("window-all-closed", () => {
  if (updateChild) updateChild.kill("SIGTERM");
  app.quit();
});

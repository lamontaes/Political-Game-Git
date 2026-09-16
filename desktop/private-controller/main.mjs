/* global process, setTimeout, URL, Response */
/**
 * Our Civic Duty Private — the owner's private development hub.
 *
 * One window, three enclosed tabs (Play, Art Desk, Agents) plus Settings,
 * with a visible main/branch selector. Play serves the verified cached game
 * build over the same restricted app://game protocol as the game shell, in a
 * per-track session: Follow main uses the existing internal art-review game
 * profile; each branch preview gets its own isolated profile. Switching tabs
 * only hides views, so an unsaved life is never unloaded or rerolled.
 *
 * Builds come from the existing hidden update worker (one at a time); the
 * selected source is resolved to an exact SHA, built in its own managed
 * worktree with the private art pack, health-checked, and only then offered
 * to Play. Nothing here is part of the public game.
 */

import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  appendFileSync,
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
  APP_ORIGIN,
  APP_SCHEME,
  APP_SCHEME_PRIVILEGES,
  serveAppRequest,
} from "../app-protocol.mjs";
import { portableDownloadSavePath } from "../download-policy.mjs";
import { AgentsHost } from "./agents/agents-host.mjs";
import { ART_DESK_TOKEN_HEADER, ArtDeskHost } from "./artdesk-host.mjs";
import {
  MAIN_TRACK,
  activatePending,
  cleanHubState,
  emptyHubState,
  playLabel,
  rollback,
  trackId,
  trackProfilePath,
  validBranchName,
  validRevision,
} from "./hub-model.mjs";
import { buildRecord, repositoryIsExpected } from "./private-update.mjs";

const {
  app,
  BaseWindow,
  WebContentsView,
  clipboard,
  dialog,
  ipcMain,
  protocol,
  session,
  shell,
} = electron;
const execFileAsync = promisify(execFile);
const appRoot = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(appRoot, "private-update-worker.mjs");
const bootstrapApp = path.join(
  process.resourcesPath ?? "",
  "bootstrap",
  "Our Civic Duty.app",
);

app.setName("Our Civic Duty Private");
const dataRoot = process.env.OCD_CONTROLLER_DATA_ROOT
  ? path.resolve(process.env.OCD_CONTROLLER_DATA_ROOT)
  : path.join(app.getPath("appData"), "Our Civic Duty Private");
// The hub's own Chromium profile lives inside its data root, so isolated test
// roots never touch a real profile and the single-instance lock is per root.
app.setPath("userData", path.join(dataRoot, "chromium"));
// Isolated test roots keep game profiles inside the root as well.
const appDataRoot = process.env.OCD_CONTROLLER_DATA_ROOT
  ? path.join(dataRoot, "game-profiles")
  : app.getPath("appData");
const statePath = path.join(dataRoot, "state.json");
const settingsPath = path.join(dataRoot, "settings.json");
const home = app.getPath("home");
const DEFAULT_REPOSITORY = path.join(home, "Documents", "Political Game");
const DEFAULT_PACK = path.join(
  DEFAULT_REPOSITORY,
  "output",
  "private-packs",
  "modular41-current",
);
const CHROME_HEIGHT = 58;

protocol.registerSchemesAsPrivileged([APP_SCHEME_PRIVILEGES]);

/* ------------------------------------------------------------------ state */

function atomicWrite(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.next-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
  renameSync(temporary, file);
}

function readState() {
  try {
    return cleanHubState(JSON.parse(readFileSync(statePath, "utf8")));
  } catch {
    return null;
  }
}

function readSettings() {
  let value = {};
  try {
    value = JSON.parse(readFileSync(settingsPath, "utf8"));
  } catch {
    value = {};
  }
  return {
    installId:
      typeof value.installId === "string" ? value.installId : randomUUID(),
    artDeskBranch:
      typeof value.artDeskBranch === "string" &&
      validBranchName(value.artDeskBranch)
        ? value.artDeskBranch
        : "main",
  };
}

let settings = readSettings();
atomicWrite(settingsPath, settings);

function initialState(existing) {
  const base = existing ?? emptyHubState();
  return {
    ...base,
    repositoryPath:
      base.repositoryPath ??
      (existsSync(DEFAULT_REPOSITORY) ? DEFAULT_REPOSITORY : null),
    privatePackPath:
      base.privatePackPath ??
      (existsSync(path.join(DEFAULT_PACK, "pack.json")) ? DEFAULT_PACK : null),
  };
}

/**
 * A delivered hub carries no private art. Without a bundled bootstrap build
 * the first start prepares main locally from the private pack on this Mac;
 * CI packages may still bundle a public bootstrap game for launch smoke.
 */
function installBootstrapIfNeeded() {
  const existing = readState();
  if (existing?.tracks[MAIN_TRACK]) {
    const filled = initialState(existing);
    atomicWrite(statePath, filled);
    return filled;
  }
  if (!existsSync(bootstrapApp)) {
    const state = initialState(existing);
    atomicWrite(statePath, state);
    return state;
  }
  const identity = JSON.parse(
    readFileSync(
      path.join(bootstrapApp, "Contents", "Resources", "build-identity.json"),
      "utf8",
    ),
  );
  let bundledPack = null;
  try {
    bundledPack =
      JSON.parse(
        readFileSync(
          path.join(process.resourcesPath, "hub-build.json"),
          "utf8",
        ),
      ).bootstrap?.privatePack ?? null;
  } catch {
    bundledPack = null;
  }
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
  const base = initialState(existing);
  const state = {
    ...base,
    tracks: {
      ...base.tracks,
      [MAIN_TRACK]: {
        branch: MAIN_TRACK,
        current: {
          ...buildRecord(
            identity,
            installedApp,
            `${process.arch} (bundled)`,
            new Date().toISOString(),
          ),
          clientTreeSha256: identity.clientTreeSha256 ?? "unknown",
          privatePack: bundledPack,
        },
        pending: null,
        previous: null,
      },
    },
  };
  atomicWrite(statePath, state);
  return state;
}

/**
 * Before the hub first opens an existing game profile, keep a copy of its
 * save stores. Nothing is ever restored or deleted automatically.
 */
function backupProfileOnce(id, profile) {
  const marker = path.join(
    dataRoot,
    "backups",
    `${id.replace(/[^a-z0-9-]/gi, "_")}.done`,
  );
  if (existsSync(marker)) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(
    dataRoot,
    "backups",
    `${id.replace(/[^a-z0-9-]/gi, "_")}-${stamp}`,
  );
  let copied = 0;
  for (const store of ["IndexedDB", "Local Storage"]) {
    const source = path.join(profile, store);
    if (!existsSync(source)) continue;
    cpSync(source, path.join(target, store), { recursive: true });
    copied += 1;
  }
  mkdirSync(path.dirname(marker), { recursive: true });
  writeFileSync(marker, `${copied ? target : "empty profile"}\n`);
  if (copied) logLine(`Backed up the existing ${id} save stores to ${target}.`);
}

/* ----------------------------------------------------------- environment */

function toolEnvironment() {
  // Finder/Dock launches do not inherit a Terminal shell: name the verified
  // tool locations explicitly.
  const toolPaths = [
    "/opt/homebrew/opt/node@22/bin",
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  return { ...env, PATH: [...toolPaths, process.env.PATH ?? ""].join(":") };
}

async function git(args, cwd) {
  const { stdout } = await execFileAsync("/usr/bin/git", args, {
    cwd,
    env: toolEnvironment(),
    timeout: 60000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout.trim();
}

async function verifiedRepository() {
  const state = readState();
  if (!state?.repositoryPath)
    throw new Error("Choose the project folder in Settings.");
  const origin = await git(
    ["remote", "get-url", "origin"],
    state.repositoryPath,
  );
  if (!repositoryIsExpected(origin))
    throw new Error("The project folder's origin is not the owner repository.");
  return state.repositoryPath;
}

/* ------------------------------------------------------------ hub status */

const hub = {
  window: null,
  chrome: null,
  views: new Map(), // local pages and the Art Desk view
  play: new Map(), // track id -> { view, revision }
  activeTab: "play",
  worker: null,
  workerTrack: null,
  queue: [],
  remote: {}, // track id -> { revision, fetchState }
  phase: {}, // track id -> { phase, message }
  log: [],
  artdesk: null,
  agents: null,
  quitting: false,
};

function publicState() {
  const state = readState();
  const selected = state?.selectedTrack ?? MAIN_TRACK;
  const tracks = Object.fromEntries(
    Object.entries(state?.tracks ?? {}).map(([id, track]) => [
      id,
      {
        ...track,
        open: hub.play.has(id),
        openRevision: hub.play.get(id)?.revision ?? null,
        remote: hub.remote[id] ?? null,
        phase: hub.phase[id] ?? null,
        label: playLabel({
          track: id,
          build: track.current,
          remoteRevision: hub.remote[id]?.revision ?? null,
          fetchState: hub.remote[id]?.fetchState ?? null,
        }),
      },
    ]),
  );
  return {
    activeTab: hub.activeTab,
    selectedTrack: selected,
    tracks,
    phase: hub.phase[selected] ?? null,
    building: hub.workerTrack,
    queued: hub.queue.map((q) => q.track),
    repositoryPath: state?.repositoryPath ?? null,
    privatePackPath: state?.privatePackPath ?? null,
    artDeskBranch: settings.artDeskBranch,
    artdesk: hub.artdesk?.status ?? null,
    log: hub.log.slice(-60),
    architecture: process.arch,
    hubVersion: app.getVersion(),
    managedJobs: hub.agents?.runningJobs() ?? 0,
  };
}

function broadcast() {
  const snapshot = publicState();
  for (const view of [hub.chrome, ...hub.views.values()]) {
    if (!view || view === hub.views.get("artdesk")) continue;
    if (!view.webContents.isDestroyed())
      view.webContents.send("hub:state", snapshot);
  }
}

function logLine(message) {
  if (!message) return;
  try {
    mkdirSync(path.join(dataRoot, "logs"), { recursive: true });
    appendFileSync(
      path.join(dataRoot, "logs", "hub.log"),
      `${new Date().toISOString()}  ${message}\n`,
    );
  } catch {
    /* logging never blocks the hub */
  }
  hub.log.push(`${new Date().toLocaleTimeString()}  ${message}`);
  if (hub.log.length > 400) hub.log.splice(0, hub.log.length - 400);
}

/* ----------------------------------------------------------- game views */

const contentRoots = new Map(); // track id -> client directory
const configuredSessions = new Set();

function sessionForTrack(id) {
  const profile = trackProfilePath({
    track: id,
    appDataRoot,
    hubDataRoot: dataRoot,
  });
  mkdirSync(profile, { recursive: true });
  backupProfileOnce(id, profile);
  const ses = session.fromPath(profile);
  if (configuredSessions.has(id)) return ses;
  configuredSessions.add(id);
  ses.protocol.handle(APP_SCHEME, (request) => {
    const root = contentRoots.get(id);
    if (!root) return new Response("Not found", { status: 404 });
    return serveAppRequest(root, request);
  });
  ses.setPermissionRequestHandler((_wc, _permission, callback) =>
    callback(false),
  );
  ses.setPermissionCheckHandler(() => false);
  ses.on("will-download", (event, item) => {
    const dest = portableDownloadSavePath(
      item.getFilename(),
      item.getURL(),
      process.env.OCD_DOWNLOAD_DIR || app.getPath("downloads"),
      APP_ORIGIN,
    );
    if (dest === null) {
      event.preventDefault();
      return;
    }
    item.setSavePath(dest);
  });
  return ses;
}

async function standaloneGameRunning() {
  // Any standalone internal art-review game shares the main save profile.
  try {
    const { stdout } = await execFileAsync("/bin/ps", ["-axo", "command="]);
    return stdout
      .split("\n")
      .some((line) =>
        /Our Civic Duty Internal Art Review\.app\/Contents\/MacOS\/Our Civic Duty(\s|$)/.test(
          line,
        ),
      );
  } catch {
    return true;
  }
}

async function openPlay(id) {
  const state = readState();
  const track = state?.tracks[id];
  if (!track)
    return { ok: false, message: "That track has no verified build yet." };
  if (hub.play.has(id)) return { ok: true };
  if (id === MAIN_TRACK && (await standaloneGameRunning()))
    return {
      ok: false,
      message:
        "The standalone game is running with the same save profile. Close it first; its own save guard stays in control.",
    };
  // Only one branch preview is kept alive next to main.
  for (const other of [...hub.play.keys()])
    if (other !== MAIN_TRACK && other !== id) {
      const closed = await closePlay(other);
      if (!closed)
        return {
          ok: false,
          message: "The open branch preview kept its unsaved life.",
        };
    }
  const clientRoot = path.join(
    track.current.appPath,
    "Contents",
    "Resources",
    "client",
  );
  if (!existsSync(path.join(clientRoot, "index.html")))
    return {
      ok: false,
      message: "The cached build is incomplete; rebuild this track.",
    };
  contentRoots.set(id, clientRoot);
  const view = new WebContentsView({
    webPreferences: {
      session: sessionForTrack(id),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });
  view.setBackgroundColor("#1a1a1a");
  const contents = view.webContents;
  contents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`)) event.preventDefault();
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  contents.on("will-prevent-unload", (event) => {
    const choice = dialog.showMessageBoxSync(hub.window, {
      type: "warning",
      buttons: ["Keep Playing", "Leave Without Saving"],
      defaultId: 0,
      cancelId: 0,
      message: "This life has unsaved changes.",
      detail: "Leaving now discards what the game has not saved yet.",
    });
    if (choice === 1) event.preventDefault();
  });
  hub.play.set(id, { view, revision: track.current.revision });
  contents.once("destroyed", () => {
    if (hub.play.get(id)?.view === view) hub.play.delete(id);
    broadcast();
  });
  hub.window.contentView.addChildView(view);
  // Keep the chrome bar on top of every content view.
  hub.window.contentView.addChildView(hub.chrome);
  void contents.loadURL(`${APP_ORIGIN}/index.html`);
  layout();
  return { ok: true };
}

/** Close a Play view through the page's own unload guard. */
function closePlay(id) {
  const entry = hub.play.get(id);
  if (!entry) return Promise.resolve(true);
  return new Promise((resolve) => {
    const { view } = entry;
    const contents = view.webContents;
    let settled = false;
    const finish = (closed) => {
      if (settled) return;
      settled = true;
      if (closed) {
        hub.window?.contentView.removeChildView(view);
        hub.play.delete(id);
      }
      resolve(closed);
    };
    contents.once("destroyed", () => finish(true));
    contents.close({ waitForBeforeUnload: true });
    // A prevented unload leaves the page alive.
    setTimeout(() => finish(contents.isDestroyed()), 2500);
  });
}

/* ---------------------------------------------------------------- layout */

function localView(file, query = null) {
  const view = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: path.join(appRoot, "preload.cjs"),
    },
  });
  const contents = view.webContents;
  contents.on("will-navigate", (event) => event.preventDefault());
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
  void contents.loadFile(path.join(appRoot, file), query ? { query } : {});
  return view;
}

function artDeskView(url) {
  const origin = new URL(url).origin;
  const view = new WebContentsView({
    webPreferences: {
      partition: "persist:art-desk",
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  const contents = view.webContents;
  contents.session.setPermissionRequestHandler((_wc, _p, callback) =>
    callback(false),
  );
  // Authenticated transport to the bench: only this view's requests to the
  // bench origin carry the per-launch capability.
  contents.session.webRequest.onBeforeSendHeaders(
    { urls: [`${origin}/*`] },
    (details, callback) => {
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          [ART_DESK_TOKEN_HEADER]: hub.artdesk.token ?? "",
        },
      });
    },
  );
  contents.on("will-navigate", (event, target) => {
    if (!target.startsWith(`${origin}/`)) event.preventDefault();
  });
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
  void contents.loadURL(url);
  return view;
}

function contentForTab() {
  if (hub.activeTab === "play") {
    const id = readState()?.selectedTrack ?? MAIN_TRACK;
    return hub.play.get(id)?.view ?? hub.views.get("play-notice");
  }
  if (hub.activeTab === "artdesk")
    return hub.views.get("artdesk") ?? hub.views.get("artdesk-notice");
  return hub.views.get(hub.activeTab);
}

function layout() {
  if (!hub.window || hub.window.isDestroyed()) return;
  const { width, height } = hub.window.getContentBounds();
  hub.chrome.setBounds({ x: 0, y: 0, width, height: CHROME_HEIGHT });
  const visible = contentForTab();
  const bounds = {
    x: 0,
    y: CHROME_HEIGHT,
    width,
    height: Math.max(0, height - CHROME_HEIGHT),
  };
  const all = [
    ...hub.views.values(),
    ...[...hub.play.values()].map((entry) => entry.view),
  ];
  for (const view of all) {
    view.setBounds(bounds);
    view.setVisible(view === visible);
  }
}

/* --------------------------------------------------------------- builds */

function startWorker(track) {
  if (process.env.OCD_HUB_NO_BUILDS === "1")
    return { ok: false, message: "Builds are disabled for this test run." };
  const state = readState();
  if (!state?.repositoryPath)
    return { ok: false, message: "Choose the project folder in Settings." };
  if (!state.privatePackPath)
    return { ok: false, message: "Choose the private art pack in Settings." };
  if (hub.worker) {
    if (hub.workerTrack !== track && !hub.queue.some((q) => q.track === track))
      hub.queue.push({ track });
    return { ok: true, message: "Queued after the current build." };
  }
  hub.phase[track] = { phase: "fetching", message: "Fetching…" };
  const child = spawn(
    process.execPath,
    [
      workerPath,
      "--data-root",
      dataRoot,
      "--repo",
      state.repositoryPath,
      "--track",
      track,
      "--pack",
      state.privatePackPath,
    ],
    {
      env: { ...toolEnvironment(), ELECTRON_RUN_AS_NODE: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  hub.worker = child;
  hub.workerTrack = track;
  let pending = "";
  const consume = (chunk) => {
    pending += String(chunk);
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (!line) continue;
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        event = { kind: "log", message: line };
      }
      onWorkerEvent(track, event);
    }
  };
  child.stdout.on("data", consume);
  child.stderr.on("data", consume);
  child.on("error", (error) =>
    onWorkerEvent(track, { kind: "error", message: error.message }),
  );
  child.on("exit", (code, signal) => {
    if (pending) consume("\n");
    hub.worker = null;
    hub.workerTrack = null;
    if (code !== 0 && hub.phase[track]?.phase !== "failed")
      hub.phase[track] = {
        phase: "failed",
        message: `Build stopped (${signal ?? `exit ${code}`}). The last verified build is unchanged.`,
      };
    broadcast();
    const next = hub.queue.shift();
    if (next) startWorker(next.track);
  });
  broadcast();
  return { ok: true, message: "Preparing." };
}

function onWorkerEvent(track, event) {
  if (event.kind === "log") {
    logLine(event.message);
  } else if (event.kind === "progress") {
    logLine(event.message);
    hub.phase[track] = {
      phase: event.phase ?? hub.phase[track]?.phase ?? "preparing",
      message: event.message,
    };
  } else if (event.kind === "resolved") {
    logLine(event.message);
    hub.remote[track] = { revision: event.revision, fetchState: "online" };
  } else if (event.kind === "error") {
    logLine(event.message);
    if (event.reason === "offline")
      hub.remote[track] = {
        ...(hub.remote[track] ?? {}),
        fetchState: "offline",
      };
    hub.phase[track] = { phase: "failed", message: event.message };
  } else if (event.kind === "complete") {
    logLine(event.message);
    hub.phase[track] = { phase: "ready", message: event.message };
    if (event.outcome === "pending" && !hub.play.has(track)) {
      atomicWrite(statePath, activatePending(readState(), track));
      hub.phase[track] = {
        phase: "ready",
        message: `Ready: ${event.revision.slice(0, 12)} is now the ${track === MAIN_TRACK ? "main" : "preview"} build.`,
      };
    }
    if (readState()?.selectedTrack === track && hub.activeTab === "play")
      void openPlay(track).then(() => {
        layout();
        broadcast();
      });
  }
  broadcast();
}

async function applyPending(id) {
  const state = readState();
  if (!state?.tracks[id]?.pending)
    return { ok: false, message: "Nothing is waiting." };
  if (!(await closePlay(id)))
    return {
      ok: false,
      message: "The game kept its unsaved life; nothing changed.",
    };
  atomicWrite(statePath, activatePending(readState(), id));
  const opened = await openPlay(id);
  layout();
  broadcast();
  return opened.ok
    ? { ok: true, message: "The verified update is now playing." }
    : opened;
}

async function rollbackTrack(id) {
  const state = readState();
  if (!state?.tracks[id]?.previous)
    return { ok: false, message: "There is no retained previous build." };
  if (!(await closePlay(id)))
    return {
      ok: false,
      message: "The game kept its unsaved life; nothing changed.",
    };
  atomicWrite(statePath, rollback(readState(), id));
  hub.phase[id] = {
    phase: "ready",
    message: "Rolled back to the last known-good build.",
  };
  await openPlay(id);
  layout();
  broadcast();
  return { ok: true, message: "Rolled back." };
}

async function selectTrack(branch) {
  if (branch !== MAIN_TRACK && !validBranchName(branch))
    return { ok: false, message: "That branch name is not valid." };
  const id = trackId(branch);
  const state = readState();
  atomicWrite(statePath, { ...state, selectedTrack: id });
  hub.activeTab = "play";
  if (state.tracks[id]) {
    const opened = await openPlay(id);
    if (!opened.ok) logLine(opened.message);
  }
  // Explicitly selecting an owner-repository branch authorizes preparing it.
  const result = startWorker(id);
  layout();
  broadcast();
  return result;
}

async function listBranches() {
  const repositoryPath = await verifiedRepository();
  const out = await git(["ls-remote", "--heads", "origin"], repositoryPath);
  return out
    .split("\n")
    .map((line) => line.split("\t"))
    .filter(
      ([sha, ref]) => validRevision(sha) && ref?.startsWith("refs/heads/"),
    )
    .map(([sha, ref]) => ({
      name: ref.slice("refs/heads/".length),
      revision: sha,
    }))
    .filter((b) => validBranchName(b.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* -------------------------------------------------------------- art desk */

async function startArtDesk() {
  const state = readState();
  if (!state?.privatePackPath)
    return { ok: false, message: "Choose the private art pack in Settings." };
  try {
    const repositoryPath = await verifiedRepository();
    const branch = settings.artDeskBranch;
    await git(
      [
        "fetch",
        "--quiet",
        "--no-tags",
        "origin",
        `+refs/heads/${branch}:refs/remotes/origin/${branch}`,
      ],
      repositoryPath,
    );
    const revision = await git(
      [
        "rev-parse",
        "--verify",
        "--end-of-options",
        `refs/remotes/origin/${branch}^{commit}`,
      ],
      repositoryPath,
    );
    const status = await hub.artdesk.start({
      repositoryPath,
      branch,
      revision,
      packPath: state.privatePackPath,
    });
    if (status.state === "ready") {
      const old = hub.views.get("artdesk");
      if (old) {
        hub.window.contentView.removeChildView(old);
        old.webContents.close();
      }
      const view = artDeskView(status.url);
      hub.views.set("artdesk", view);
      hub.window.contentView.addChildView(view);
      hub.window.contentView.addChildView(hub.chrome);
      layout();
    }
    return { ok: status.state === "ready", message: status.message };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/* ------------------------------------------------------------------- IPC */

function trusted(event) {
  const local = [hub.chrome, ...hub.views.values()].filter(
    (v) => v && v !== hub.views.get("artdesk") && !v.webContents.isDestroyed(),
  );
  if (!local.some((v) => v.webContents.id === event.sender.id)) return false;
  const url = event.senderFrame?.url ?? "";
  if (!url.startsWith("file://")) return false;
  return fileURLToPath(url.split(/[?#]/)[0]).startsWith(appRoot + path.sep);
}

function handle(channel, fn) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!trusted(event)) throw new Error("Refused: untrusted sender.");
    try {
      return await fn(...args);
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

const TABS = new Set(["play", "artdesk", "agents", "settings"]);
const trackArg = (id) =>
  id === MAIN_TRACK ||
  (typeof id === "string" &&
    id.startsWith("branch:") &&
    validBranchName(id.slice("branch:".length)))
    ? id
    : null;

handle("hub:state", () => publicState());
handle("hub:tab", async (tab) => {
  if (!TABS.has(tab)) return { ok: false };
  hub.activeTab = tab;
  if (tab === "play") {
    const opened = await openPlay(readState()?.selectedTrack ?? MAIN_TRACK);
    if (!opened.ok) logLine(opened.message);
  }
  if (
    tab === "artdesk" &&
    !hub.views.has("artdesk") &&
    ["idle", "stopped", "failed"].includes(hub.artdesk.status.state)
  )
    void startArtDesk().then(broadcast);
  layout();
  broadcast();
  return { ok: true };
});
handle("hub:branches", async () => ({
  ok: true,
  branches: await listBranches(),
}));
handle("hub:select-track", (branch) => selectTrack(String(branch ?? "")));
handle("hub:check", (id) => {
  const track = trackArg(id);
  return track ? startWorker(track) : { ok: false, message: "Unknown track." };
});
handle("hub:apply", (id) => {
  const track = trackArg(id);
  return track ? applyPending(track) : { ok: false };
});
handle("hub:rollback", (id) => {
  const track = trackArg(id);
  return track ? rollbackTrack(track) : { ok: false };
});
handle("hub:return-main", () => selectTrack(MAIN_TRACK));
handle("hub:cancel-build", () => {
  hub.queue.length = 0;
  hub.worker?.kill("SIGTERM");
  return {
    ok: true,
    message: "Cancelling. The last verified build stays active.",
  };
});
handle("hub:choose-repository", async () => {
  const result = await dialog.showOpenDialog(hub.window, {
    title: "Choose the Political Game project folder",
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length !== 1) return { ok: false };
  atomicWrite(statePath, {
    ...readState(),
    repositoryPath: result.filePaths[0],
  });
  broadcast();
  return { ok: true };
});
handle("hub:choose-pack", async () => {
  const result = await dialog.showOpenDialog(hub.window, {
    title: "Choose the private art pack folder (contains pack.json)",
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length !== 1) return { ok: false };
  const folder = result.filePaths[0];
  if (!existsSync(path.join(folder, "pack.json")))
    return { ok: false, message: "That folder has no pack.json." };
  atomicWrite(statePath, { ...readState(), privatePackPath: folder });
  broadcast();
  return { ok: true };
});
handle("hub:artdesk-branch", async (branch) => {
  const value = String(branch ?? "");
  if (!validBranchName(value)) return { ok: false, message: "Invalid branch." };
  settings = { ...settings, artDeskBranch: value };
  atomicWrite(settingsPath, settings);
  broadcast();
  return { ok: true, message: "Restart the Art Desk to use this source." };
});
handle("hub:artdesk-start", () => startArtDesk().finally(broadcast));
handle("hub:artdesk-restart", async () => {
  hub.artdesk.stop();
  const old = hub.views.get("artdesk");
  if (old) {
    hub.window.contentView.removeChildView(old);
    old.webContents.close();
    hub.views.delete("artdesk");
  }
  await new Promise((resolve) => setTimeout(resolve, 800));
  return startArtDesk().finally(broadcast);
});
handle("hub:artdesk-inputs", () => hub.artdesk.inputs());
handle("agents:snapshot", () => hub.agents.snapshot());
handle("agents:detect", () => hub.agents.detect());
handle("agents:start-codex", (opts) =>
  hub.agents.startCodexWorker({
    handle: String(opts?.handle ?? ""),
    model: String(opts?.model ?? ""),
    effort: String(opts?.effort ?? ""),
  }),
);
handle("agents:start-claude", (opts) =>
  hub.agents.startClaudeWorker({
    handle: String(opts?.handle ?? ""),
    model: String(opts?.model ?? ""),
    effort: String(opts?.effort ?? ""),
  }),
);
handle("agents:enroll", (opts) =>
  hub.agents.enrollExternal({
    handle: String(opts?.handle ?? ""),
    provider: String(opts?.provider ?? ""),
    sessionId: String(opts?.sessionId ?? ""),
  }),
);
handle("agents:connect", (value) => {
  const provider = String(value ?? "");
  const result = hub.agents.connectClient({ provider });
  if (provider === "cursor" || provider === "antigravity") {
    clipboard.writeText(hub.agents.clientEntryFor(provider));
    result.clipboard = true;
  }
  return result;
});
handle("agents:send", (opts) =>
  hub.agents.sendAsOwner({
    to: String(opts?.to ?? ""),
    text: String(opts?.text ?? ""),
  }),
);
handle("agents:cancel", (id) => hub.agents.cancel(String(id)));
handle("agents:stop-all", async () => {
  await hub.agents.stopAll();
  return {
    ok: true,
    message: "Hub-managed work stopped. External sessions were not touched.",
  };
});
handle("hub:reveal-token", (file) => {
  const target = String(file ?? "");
  if (!target.startsWith(path.join(dataRoot, "agents", "tokens") + path.sep))
    return { ok: false };
  shell.showItemInFolder(target);
  return { ok: true };
});

/* -------------------------------------------------------------- lifecycle */

function createWindow() {
  const win = new BaseWindow({
    width: 1440,
    height: 940,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#17150f",
    title: "Our Civic Duty Private",
  });
  hub.window = win;
  hub.chrome = localView("index.html");
  hub.views.set("play-notice", localView("notice.html", { tab: "play" }));
  hub.views.set("artdesk-notice", localView("notice.html", { tab: "artdesk" }));
  hub.views.set("agents", localView("agents.html"));
  hub.views.set("settings", localView("settings.html"));
  for (const view of hub.views.values()) win.contentView.addChildView(view);
  win.contentView.addChildView(hub.chrome);
  win.on("resize", layout);
  win.on("close", (event) => {
    if (hub.quitting) return;
    event.preventDefault();
    void requestQuit();
  });
  layout();
}

let quitInProgress = false;
async function requestQuit() {
  if (quitInProgress || hub.quitting) return;
  quitInProgress = true;
  try {
    const jobs = hub.agents?.runningJobs() ?? 0;
    if (jobs > 0 || hub.worker) {
      const choice = dialog.showMessageBoxSync(hub.window, {
        type: "question",
        buttons: ["Keep Hub Open", "Stop Hub Work and Quit"],
        defaultId: 0,
        cancelId: 0,
        message: "The hub still has work running.",
        detail: `${jobs} hub-managed agent job(s)${hub.worker ? " and a game build" : ""}. Quitting stops only hub-owned work; external Claude, Codex, Cursor and Antigravity sessions are not touched.`,
      });
      if (choice === 0) return;
    }
    for (const id of [...hub.play.keys()]) {
      if (!(await closePlay(id))) return; // the game kept its unsaved life
    }
    hub.quitting = true;
    hub.worker?.kill("SIGTERM");
    hub.artdesk?.stop();
    await hub.agents?.close().catch(() => {});
    if (hub.window && !hub.window.isDestroyed()) hub.window.destroy();
    app.quit();
  } finally {
    quitInProgress = false;
  }
}

if (!app.requestSingleInstanceLock()) {
  // One hub per profile: no duplicate supervisors, brokers or updaters.
  app.quit();
} else {
  app.on("second-instance", () => {
    if (hub.window) {
      if (hub.window.isMinimized()) hub.window.restore();
      hub.window.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      installBootstrapIfNeeded();
    } catch (error) {
      await dialog.showMessageBox({
        type: "error",
        message: "Our Civic Duty Private could not start.",
        detail: error instanceof Error ? error.message : String(error),
      });
      hub.quitting = true;
      app.quit();
      return;
    }
    session.defaultSession.setPermissionRequestHandler((_wc, _p, callback) =>
      callback(false),
    );
    hub.artdesk = new ArtDeskHost({
      dataRoot,
      env: toolEnvironment(),
      onStatus: () => broadcast(),
    });
    hub.agents = new AgentsHost({
      dataRoot,
      installId: settings.installId,
      env: toolEnvironment(),
      onChange: () => broadcast(),
    });
    await hub.agents.start().catch((error) => {
      logLine(`Agent broker unavailable: ${error.message}`);
    });
    // No game view is open yet, so a verified build that waited for the
    // previous Play session to close can take over now.
    for (const [id, track] of Object.entries(readState().tracks))
      if (track.pending) {
        atomicWrite(statePath, activatePending(readState(), id));
        logLine(
          `Activated the waiting ${id} build ${track.pending.revision.slice(0, 12)}.`,
        );
      }
    createWindow();
    const opened = await openPlay(readState().selectedTrack);
    if (!opened.ok) logLine(opened.message);
    if (!readState().tracks[MAIN_TRACK])
      hub.phase[MAIN_TRACK] = {
        phase: "preparing",
        message:
          "First start: preparing the private main build on this Mac. This takes several minutes once.",
      };
    layout();
    // Fresh-main check at every start; unchanged inputs finish quickly
    // without rebuilding.
    if (process.env.OCD_HUB_SKIP_STARTUP_CHECK !== "1") {
      const selected = readState().selectedTrack;
      startWorker(MAIN_TRACK);
      if (selected !== MAIN_TRACK) startWorker(selected);
    }
    broadcast();
  });

  app.on("window-all-closed", () => {
    if (!hub.quitting) void requestQuit();
  });
  app.on("before-quit", (event) => {
    if (!hub.quitting) {
      event.preventDefault();
      void requestQuit();
    }
  });
}

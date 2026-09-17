/* global AbortSignal, Response, URL, fetch, process, setTimeout */
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
import {
  ART_DESK_TOKEN_HEADER,
  ArtDeskHost,
  artDeskDownloadPath,
} from "./artdesk-host.mjs";
import {
  chooserLabel,
  cleanCatalog,
  cleanPullRequests,
  projectBuildChooser,
} from "./build-catalog.mjs";
import {
  MAIN_TRACK,
  activatePending,
  barPill,
  cleanChecks,
  cleanHubState,
  createGeneration,
  emptyHubState,
  playLabel,
  prunedQueue,
  recordCheck,
  rollback,
  trackId,
  trackProfilePath,
  updateStatus,
  validBranchName,
  validRevision,
} from "./hub-model.mjs";
import {
  buildPresentOnDisk,
  buildRecord,
  repositoryIsExpected,
} from "./private-update.mjs";
import {
  SILENCE_NOTICE_MS,
  createSilenceWatch,
  silenceNotice,
} from "./worker-watch.mjs";

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
// Update-check results are written only by this process (the build worker
// writes state.json), so the two never race on one file.
const checksPath = path.join(dataRoot, "update-checks.json");
const home = app.getPath("home");
const DEFAULT_REPOSITORY = path.join(home, "Documents", "Political Game");
const DEFAULT_PACK = path.join(
  DEFAULT_REPOSITORY,
  "output",
  "private-packs",
  "modular41-current",
);
const CHROME_HEIGHT = 92;

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

function readChecks() {
  try {
    return cleanChecks(JSON.parse(readFileSync(checksPath, "utf8")));
  } catch {
    return {};
  }
}

function noteCheck(track, outcome, message, revision) {
  atomicWrite(
    checksPath,
    recordCheck(readChecks(), track, {
      outcome,
      message,
      revision: revision ?? hub.remote[track]?.revision ?? null,
      at: new Date().toISOString(),
    }),
  );
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
    // Optional exact bench source on that branch; unset follows its head.
    artDeskPin: validRevision(value.artDeskPin) ? value.artDeskPin : null,
    // Drive-for-desktop exchange folder for the bench; unset leaves the
    // bench's own default discovery in charge.
    artbenchDriveRoot:
      typeof value.artbenchDriveRoot === "string" &&
      path.isAbsolute(value.artbenchDriveRoot)
        ? value.artbenchDriveRoot
        : null,
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

function readHubBuild() {
  try {
    return JSON.parse(
      readFileSync(path.join(process.resourcesPath, "hub-build.json"), "utf8"),
    ).hub;
  } catch {
    return { revision: "unpackaged", version: app.getVersion() };
  }
}
const hubBuild = readHubBuild();

const hub = {
  window: null,
  chrome: null,
  views: new Map(), // local pages and the Art Desk view
  play: new Map(), // track id -> { view, revision }
  lastPlay: null, // the track whose game was last on screen
  lastDownload: null, // { state, name, path, at } of the latest Art Desk download
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
    Object.entries(state?.tracks ?? {}).map(([id, track]) => {
      // A state record is not a payload: ask the disk before calling a
      // cached build verified.
      const present = buildPresentOnDisk(track.current);
      return [
        id,
        {
          ...track,
          open: hub.play.has(id),
          openRevision: hub.play.get(id)?.revision ?? null,
          currentPresent: present.ok,
          currentAbsentReason: present.reason,
          remote: hub.remote[id] ?? null,
          phase: hub.phase[id] ?? null,
          label: playLabel({
            track: id,
            build: track.current,
            remoteRevision: hub.remote[id]?.revision ?? null,
            fetchState: hub.remote[id]?.fetchState ?? null,
            present: present.ok,
          }),
        },
      ];
    }),
  );
  const checks = readChecks();
  const shown = shownPlayTrack(state);
  const selectedBuild = state?.tracks[selected]?.current ?? null;
  return {
    activeTab: hub.activeTab,
    selectedTrack: selected,
    selectedBuilt: Boolean(selectedBuild),
    selectedPresent: tracks[selected]?.currentPresent ?? false,
    // What is on screen, which is not always what was requested.
    loaded: shown
      ? {
          track: shown,
          revision: hub.play.get(shown)?.revision ?? null,
          title: shown === MAIN_TRACK ? "Main game" : shown.slice(7),
        }
      : null,
    update: {
      ...(() => {
        const status = updateStatus({
          phase: hub.phase[selected] ?? null,
          check: checks[selected] ?? null,
          build: selectedBuild,
          building: hub.workerTrack === selected,
        });
        // A remote check says nothing about the disk: the pill is resolved
        // here against the payload evidence above, so no renderer can paint
        // "Up to date" for a build that is not there.
        return {
          ...status,
          ...barPill({
            update: status,
            selectedBuilt: Boolean(selectedBuild),
            track: tracks[selected],
          }),
        };
      })(),
      checkedAt: checks[selected]?.at ?? null,
      lastSuccessAt: checks[selected]?.lastSuccessAt ?? null,
      message: checks[selected]?.message ?? null,
      latestRevision: hub.remote[selected]?.revision ?? null,
    },
    lastDownload: hub.lastDownload
      ? {
          state: hub.lastDownload.state,
          name: hub.lastDownload.name,
          at: hub.lastDownload.at,
          revealable: Boolean(hub.lastDownload.path),
        }
      : null,
    tracks,
    phase: hub.phase[selected] ?? null,
    building: hub.workerTrack,
    queued: hub.queue.map((q) => q.track),
    repositoryPath: state?.repositoryPath ?? null,
    privatePackPath: state?.privatePackPath ?? null,
    artDeskBranch: settings.artDeskBranch,
    identities: {
      hub: {
        revision: hubBuild.revision,
        desktopDirty: hubBuild.desktopDirty ?? null,
        signing: hubBuild.signing ?? "unknown",
      },
      game: (() => {
        const build = state?.tracks[selected]?.current;
        return build
          ? {
              track: selected,
              revision: build.revision,
              clientTreeSha256: build.clientTreeSha256,
              architecture: build.architecture,
            }
          : null;
      })(),
      // What is on screen, kept apart from the staged build for this track:
      // the two differ while a verified update waits for a restart.
      loaded: shown
        ? {
            track: shown,
            title: shown === MAIN_TRACK ? "Main game" : shown.slice(7),
            revision: hub.play.get(shown)?.revision ?? null,
            selectedBuildRevision:
              state?.tracks[shown]?.current?.revision ?? null,
          }
        : null,
      bench:
        hub.artdesk?.status?.state === "ready"
          ? {
              branch: hub.artdesk.status.branch,
              revision: hub.artdesk.status.revision,
              requestedRevision: hub.artdesk.status.requestedRevision,
              recordRoot: hub.artdesk.status.recordRoot,
            }
          : null,
      privatePack: state?.tracks[selected]?.current?.privatePack ?? null,
    },
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

/**
 * The owner's latest Play choice. Selecting takes a token; every step that
 * resumes after an await checks it, so a slow job for an abandoned choice
 * cannot open a view, start a build or re-lay out over the newer one.
 */
const selection = createGeneration();
const SUPERSEDED = "A newer choice replaced this one; nothing was changed.";
/** A refusal the owner never needs to see: it is marked, logged, not painted. */
const superseded = () => ({ ok: false, superseded: true, message: SUPERSEDED });

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

async function openPlay(id, stillWanted = () => true) {
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
  if (!stillWanted()) return superseded();
  // The incoming payload is validated and its view built BEFORE anything on
  // screen is disturbed: a build that cannot open leaves the previous preview
  // exactly where it was.
  const clientRoot = path.join(
    track.current.appPath,
    "Contents",
    "Resources",
    "client",
  );
  const present = buildPresentOnDisk(track.current);
  if (!present.ok)
    return {
      ok: false,
      message: `The cached build is not usable (${present.reason}); rebuild this track.`,
    };
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
  // Only one branch preview is kept alive next to main. The incoming view
  // already exists, so a refusal here costs the owner nothing on screen.
  for (const other of [...hub.play.keys()])
    if (other !== MAIN_TRACK && other !== id) {
      const closed = await closePlay(other);
      if (!closed) {
        contents.close();
        return {
          ok: false,
          message: "The open branch preview kept its unsaved life.",
        };
      }
    }
  if (!stillWanted()) {
    contents.close();
    return superseded();
  }
  contentRoots.set(id, clientRoot);
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

let artDeskDownloadsConfigured = false;

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
  // Only one permission: writing text to the clipboard (Copy brief), and only
  // from the bench origin. Everything else stays refused.
  const benchPage = (candidate) =>
    typeof candidate === "string" &&
    (candidate === origin || candidate.startsWith(`${origin}/`));
  contents.session.setPermissionRequestHandler(
    (_wc, permission, callback, details) =>
      callback(
        permission === "clipboard-sanitized-write" &&
          benchPage(details?.requestingUrl),
      ),
  );
  contents.session.setPermissionCheckHandler(
    (_wc, permission, requestingOrigin) =>
      permission === "clipboard-sanitized-write" && benchPage(requestingOrigin),
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
  if (!artDeskDownloadsConfigured) {
    artDeskDownloadsConfigured = true;
    contents.session.on("will-download", (event, item) => {
      const dest = artDeskDownloadPath({
        filename: item.getFilename(),
        url: item.getURL(),
        benchOrigin: hub.artdesk?.url ? new URL(hub.artdesk.url).origin : null,
        downloadsDir:
          process.env.OCD_DOWNLOAD_DIR ||
          path.join(app.getPath("downloads"), "Our Civic Duty Art Desk"),
      });
      if (!dest) {
        event.preventDefault();
        return;
      }
      mkdirSync(path.dirname(dest), { recursive: true });
      item.setSavePath(dest);
      item.once("done", (_event, state) => {
        logLine(`Art Desk download ${state}: ${dest}`);
        // completed | cancelled | interrupted — cancel is not a failure.
        hub.lastDownload = {
          state,
          name: path.basename(dest),
          path: state === "completed" ? dest : null,
          at: new Date().toISOString(),
        };
        const page = hub.views.get("artdesk")?.webContents;
        if (page && !page.isDestroyed())
          void page
            .executeJavaScript(
              `window.dispatchEvent(new CustomEvent("ocd:download-result", { detail: ${JSON.stringify(
                { state, name: path.basename(dest) },
              )} }))`,
            )
            .catch(() => undefined);
        broadcast();
      });
    });
  }
  void contents.loadURL(url);
  return view;
}

/**
 * The game on screen: the selected track once it has a view; until then the
 * game that was already showing stays up (and is named) instead of a blank.
 */
function shownPlayTrack(state) {
  const selected = state?.selectedTrack ?? MAIN_TRACK;
  if (hub.play.has(selected)) return selected;
  if (hub.lastPlay && hub.play.has(hub.lastPlay)) return hub.lastPlay;
  return hub.play.has(MAIN_TRACK) ? MAIN_TRACK : null;
}

function contentForTab() {
  if (hub.activeTab === "play") {
    const id = shownPlayTrack(readState());
    return (id && hub.play.get(id)?.view) || hub.views.get("play-notice");
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
    // At most one build per requested target: a repeat click is a no-op.
    if (hub.workerTrack === track)
      return { ok: true, message: "Already checking this build." };
    if (!hub.queue.some((q) => q.track === track)) hub.queue.push({ track });
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
  const watch = createSilenceWatch({
    onSilent: () => {
      if (hub.worker !== child) return;
      hub.phase[track] = {
        phase: hub.phase[track]?.phase ?? "fetching",
        message: silenceNotice({
          hasPlayableBuild: Boolean(readState()?.tracks[track]),
          seconds: SILENCE_NOTICE_MS / 1000,
        }),
      };
      broadcast();
    },
  });
  let pending = "";
  const consume = (chunk) => {
    watch.heard();
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
  child.on("error", (error) => {
    watch.settle();
    onWorkerEvent(track, { kind: "error", message: error.message });
  });
  child.on("exit", (code, signal) => {
    watch.settle();
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
    noteCheck(
      track,
      ["offline", "unsupported", "cancelled"].includes(event.reason)
        ? event.reason
        : "failed",
      event.message,
    );
  } else if (event.kind === "complete") {
    logLine(event.message);
    hub.phase[track] = { phase: "ready", message: event.message };
    let outcome =
      event.outcome === "up-to-date"
        ? "up-to-date"
        : event.outcome === "pending"
          ? "waiting"
          : "ready";
    if (event.outcome === "pending" && !hub.play.has(track)) {
      // Never swapped under a running game: this track has no open view.
      atomicWrite(statePath, activatePending(readState(), track));
      outcome = "ready";
      hub.phase[track] = {
        phase: "ready",
        message: `Ready: ${event.revision.slice(0, 12)} is now the ${track === MAIN_TRACK ? "main" : "preview"} build.`,
      };
    }
    noteCheck(track, outcome, event.message, event.revision);
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
  const token = selection.begin();
  const current = () => selection.isCurrent(token);
  const state = readState();
  // Whatever was on screen stays identified while the new choice prepares.
  hub.lastPlay = shownPlayTrack(state) ?? hub.lastPlay;
  atomicWrite(statePath, { ...state, selectedTrack: id });
  hub.activeTab = "play";
  // Queued builds for choices the owner has moved past are dropped; main and
  // the live selection keep their place.
  const kept = prunedQueue(hub.queue, id);
  hub.queue.splice(0, hub.queue.length, ...kept);
  if (state.tracks[id]) {
    const opened = await openPlay(id, current);
    if (!current()) {
      // The owner's log is where an abandoned choice is accounted for; the
      // bar belongs to the choice that won.
      logLine(`${branch}: ${SUPERSEDED}`);
      return superseded();
    }
    if (!opened.ok) logLine(opened.message);
  }
  // Explicitly selecting an owner-repository branch authorizes preparing it.
  const result = startWorker(id);
  layout();
  broadcast();
  return result;
}

const catalog = (() => {
  try {
    return cleanCatalog(
      JSON.parse(
        readFileSync(path.join(appRoot, "build-catalog.json"), "utf8"),
      ),
    );
  } catch {
    return {};
  }
})();
const pullRequestCache = { at: 0, value: [] };

/** Open PR titles from the public repository; a failure only drops labels. */
async function openPullRequests(repositoryPath) {
  if (Date.now() - pullRequestCache.at < 10 * 60 * 1000)
    return pullRequestCache.value;
  try {
    const origin = await git(["remote", "get-url", "origin"], repositoryPath);
    const match = /github\.com[/:]([\w.-]+)\/([\w.-]+?)(\.git)?$/.exec(
      origin.trim(),
    );
    if (!match) return pullRequestCache.value;
    const response = await fetch(
      `https://api.github.com/repos/${match[1]}/${match[2]}/pulls?state=open&per_page=100`,
      {
        headers: { accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) return pullRequestCache.value;
    pullRequestCache.value = cleanPullRequests(await response.json());
    pullRequestCache.at = Date.now();
  } catch {
    /* labels fall back to the authored catalog and branch names */
  }
  return pullRequestCache.value;
}

async function buildChooser() {
  const repositoryPath = await verifiedRepository();
  const branches = await listBranches(repositoryPath);
  const commitTimes = {};
  const merged = new Set();
  try {
    const refs = await git(
      [
        "for-each-ref",
        "--format=%(refname:strip=3)\t%(committerdate:unix)",
        "refs/remotes/origin",
      ],
      repositoryPath,
    );
    for (const line of refs.split("\n")) {
      const [name, time] = line.split("\t");
      if (name && Number(time)) commitTimes[name] = Number(time);
    }
    const landed = await git(
      [
        "branch",
        "-r",
        "--format=%(refname:strip=3)",
        "--merged",
        "origin/main",
      ],
      repositoryPath,
    );
    for (const name of landed.split("\n")) if (name) merged.add(name.trim());
  } catch {
    /* dates and merged state are refinements, not requirements */
  }
  const unsupported = new Set(
    Object.entries(readChecks())
      .filter(([, check]) => check.outcome === "unsupported")
      .map(([id]) => id.slice("branch:".length)),
  );
  const view = projectBuildChooser({
    branches: branches.map((b) => ({ name: b.name, sha: b.revision })),
    catalog,
    pullRequests: await openPullRequests(repositoryPath),
    commitTimes,
    merged,
    unsupported,
  });
  const decorate = (item) => ({ ...item, label: chooserLabel(item) });
  return {
    main: view.main,
    previews: view.previews.map(decorate),
    technical: view.technical.map(decorate),
  };
}

async function listBranches(repositoryPathArg) {
  const repositoryPath = repositoryPathArg ?? (await verifiedRepository());
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

/**
 * An isolated (test) data root must never reach the owner's real Drive
 * exchange through the bench's default discovery: unless a root is set
 * explicitly, it gets a local fixture exchange inside the data root.
 */
function artbenchDriveRoot() {
  if (settings.artbenchDriveRoot) return settings.artbenchDriveRoot;
  if (process.env.OCD_CONTROLLER_DATA_ROOT) {
    const fixture = path.join(dataRoot, "fixture-drive-exchange");
    mkdirSync(fixture, { recursive: true });
    return fixture;
  }
  return null;
}

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
    const head = await git(
      [
        "rev-parse",
        "--verify",
        "--end-of-options",
        `refs/remotes/origin/${branch}^{commit}`,
      ],
      repositoryPath,
    );
    let revision = head;
    if (settings.artDeskPin) {
      // A pin must be part of the selected owner-repository branch.
      await git(
        ["merge-base", "--is-ancestor", settings.artDeskPin, head],
        repositoryPath,
      ).catch(() => {
        throw new Error(
          `Pinned Art Desk source ${settings.artDeskPin.slice(0, 12)} is not on ${branch}.`,
        );
      });
      revision = settings.artDeskPin;
    }
    const status = await hub.artdesk.start({
      repositoryPath,
      branch,
      revision,
      packPath: state.privatePackPath,
      driveRoot: artbenchDriveRoot(),
    });
    const existing = hub.views.get("artdesk");
    if (
      status.state === "ready" &&
      existing &&
      !existing.webContents.isDestroyed() &&
      existing.webContents.getURL().startsWith(new URL(status.url).origin)
    )
      return { ok: true, message: status.message };
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
handle("hub:branches", async () => {
  try {
    return { ok: true, chooser: await buildChooser() };
  } catch (error) {
    return {
      ok: false,
      message: `Could not list game builds: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
});
handle("hub:check-updates", () => {
  const track = readState()?.selectedTrack ?? MAIN_TRACK;
  return startWorker(track);
});
handle("hub:return-to-title", async () => {
  const id = shownPlayTrack(readState());
  const contents = id ? hub.play.get(id)?.view.webContents : null;
  if (!contents || contents.isDestroyed())
    return { ok: false, message: "No game is open." };
  // The game owns the flow (save / return without saving / cancel); the hub
  // only asks. Navigation, never a reset, reload or delete.
  const acknowledged = await contents
    .executeJavaScript(
      `!window.dispatchEvent(new CustomEvent("ocd:request-return-to-title", { cancelable: true }))`,
      true,
    )
    .catch(() => false);
  return acknowledged
    ? { ok: true }
    : {
        ok: false,
        message:
          "This game build has no Return to title yet; use the game's own menu.",
      };
});
handle("hub:reveal-download", () => {
  const target = hub.lastDownload?.path;
  if (!target || !existsSync(target)) return { ok: false };
  shell.showItemInFolder(target);
  return { ok: true };
});
handle("hub:copy-text", (text) => {
  // Only the exact ref/SHA lines the chooser shows; nothing else crosses.
  const value = String(text ?? "");
  if (!/^[A-Za-z0-9._/:@ -]{1,300}$/.test(value)) return { ok: false };
  clipboard.writeText(value);
  return { ok: true };
});
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
    const startSelection = readState().selectedTrack;
    const opened = await openPlay(startSelection);
    if (!opened.ok) logLine(opened.message);
    // A requested preview with no build yet keeps its selection; main plays
    // meanwhile and is named as what is on screen.
    if (!readState().tracks[startSelection] && startSelection !== MAIN_TRACK) {
      const fallback = await openPlay(MAIN_TRACK);
      if (fallback.ok) hub.lastPlay = MAIN_TRACK;
    }
    if (!readState().tracks[MAIN_TRACK])
      hub.phase[MAIN_TRACK] = {
        phase: "preparing",
        message:
          "First start: preparing the private main build on this Mac. This takes several minutes once.",
      };
    layout();
    // The Art Desk starts in the background next to the game, so switching
    // tabs never waits for it once it is up.
    if (process.env.OCD_HUB_NO_ARTDESK_AUTOSTART !== "1")
      void startArtDesk().then((result) => {
        if (!result.ok) logLine(`Art Desk: ${result.message}`);
        broadcast();
      });
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

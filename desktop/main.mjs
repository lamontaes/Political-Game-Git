/* global process */
/**
 * Our Civic Duty — desktop shell main process.
 *
 * This process is a thin, hardened host for the compiled game. It owns
 * exactly three things: a stable application identity (which fixes the
 * storage origin and therefore the save profile), a restricted custom
 * protocol that serves the packaged build output, and the direct-update
 * seam (disabled until an endpoint is explicitly authorized, and hard
 * disabled in Steam-output builds).
 *
 * It deliberately owns nothing else. No game logic, no second save system,
 * no filesystem or shell bridge into the renderer. The game itself is the
 * unmodified Vite production build; saves live in the renderer's IndexedDB
 * under the stable app://game origin, inside Electron's per-app userData
 * directory, independent of where the application is installed.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import electron from "electron";
import { runUpdateCheck, updateActivation } from "./updater.mjs";
import { windowsAllClosed } from "./window-close.mjs";
import { portableDownloadSavePath } from "./download-policy.mjs";
import {
  APP_ORIGIN,
  APP_SCHEME,
  APP_SCHEME_PRIVILEGES,
  serveAppRequest,
} from "./app-protocol.mjs";

const { app, BrowserWindow, Menu, dialog, protocol, session, shell } = electron;

const desktopRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Build identity is stamped at stage time by scripts/stage.mjs from the
 * repository package version and the actual git revision of the checkout
 * that produced the packaged client. The shell never invents a version.
 */
function readBuildIdentity() {
  const identityPath = app.isPackaged
    ? path.join(process.resourcesPath, "build-identity.json")
    : path.join(desktopRoot, "staged", "build-identity.json");
  try {
    const parsed = JSON.parse(readFileSync(identityPath, "utf8"));
    if (typeof parsed !== "object" || parsed === null) throw new Error("bad");
    return parsed;
  } catch {
    return {
      version: "unknown",
      revision: "unknown",
      revisionShort: "unknown",
      dirty: false,
      distribution: "unknown",
      channel: "internal",
      composition: "unknown",
      stagedAt: "unknown",
    };
  }
}

const identity = readBuildIdentity();

/**
 * The packaged client content root. In a packaged app the client sits in
 * resources/client (extraResources); in development it is the staged copy
 * of the repository's dist/client.
 */
const contentRoot = app.isPackaged
  ? path.join(process.resourcesPath, "client")
  : path.join(desktopRoot, "staged", "client");

/**
 * Stable application identity and storage origin.
 *
 * The renderer origin is app://game, and the profile lives in the
 * platform userData directory for "Our Civic Duty". Both are independent
 * of the installation directory, so installing build B over build A keeps
 * the same IndexedDB and therefore the same saves.
 *
 * OCD_USER_DATA_DIR exists only so automated continuity tests can run
 * against an isolated throwaway profile without touching a player's real
 * saves. It redirects the profile location; it grants nothing else.
 */
if (process.env.OCD_USER_DATA_DIR) {
  app.setPath("userData", path.resolve(process.env.OCD_USER_DATA_DIR));
} else if (identity.profile === "internal-art-review") {
  app.setPath(
    "userData",
    path.join(app.getPath("appData"), "Our Civic Duty Internal Art Review"),
  );
}

// Standard + secure gives the origin real web semantics (IndexedDB,
// absolute /assets/ paths); the rest stays minimal.
protocol.registerSchemesAsPrivileged([APP_SCHEME_PRIVILEGES]);

/**
 * Direct-update seam. Disabled by default and hard disabled for Steam
 * output: Steam owns delivery there, and two updaters over one install is
 * exactly the kind of confusion this file exists to prevent.
 *
 * An update endpoint becomes active only when a packaged update-config
 * names one explicitly (a deliberate, reviewed act — see
 * scripts/stage.mjs). Until then the menu item reports the truth: updates
 * are not configured.
 */
function readUpdateConfig() {
  const configPath = app.isPackaged
    ? path.join(process.resourcesPath, "update-config.json")
    : path.join(desktopRoot, "staged", "update-config.json");
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8"));
    if (typeof parsed !== "object" || parsed === null) throw new Error("bad");
    return parsed;
  } catch {
    return { enabled: false, channel: "internal", feedURL: null };
  }
}

const updateConfig = readUpdateConfig();
const activation = updateActivation(updateConfig, identity);

let updateCheckInFlight = false;

/**
 * Asks every window to close through the normal close flow and reports
 * whether all of them actually did — the game gets its chance to finish
 * persisting, and a window that stays open blocks the restart.
 */
async function closeAllWindows() {
  const windows = BrowserWindow.getAllWindows().filter(
    (win) => !win.isDestroyed(),
  );
  const closed = await windowsAllClosed(windows, 15000);
  return closed && BrowserWindow.getAllWindows().length === 0;
}

async function checkForUpdates() {
  if (updateCheckInFlight) return;
  updateCheckInFlight = true;
  try {
    await runUpdateCheck({
      activation,
      currentVersion: identity.version,
      channel: identity.channel ?? "internal",
      loadUpdater: async () => {
        const { default: updaterModule } = await import("electron-updater");
        const { autoUpdater } = updaterModule;
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = false;
        autoUpdater.channel = updateConfig.channel ?? "internal";
        autoUpdater.setFeedURL({
          provider: "generic",
          url: updateConfig.feedURL,
          channel: updateConfig.channel ?? "internal",
        });
        return {
          checkForUpdates: () => autoUpdater.checkForUpdates(),
          downloadUpdate: () => autoUpdater.downloadUpdate(),
          quitAndInstall: () => autoUpdater.quitAndInstall(),
          setAutoInstallOnAppQuit: (value) => {
            autoUpdater.autoInstallOnAppQuit = value;
          },
        };
      },
      ask: async (message, detail, buttons) => {
        const { response } = await dialog.showMessageBox({
          type: "question",
          buttons: [...buttons],
          cancelId: buttons.length - 1,
          message,
          detail,
        });
        return response;
      },
      notify: async (message, detail) => {
        await dialog.showMessageBox({ type: "info", message, detail });
      },
      closeAllWindows,
    });
  } finally {
    updateCheckInFlight = false;
  }
}

function showAbout() {
  const dirtyNote = identity.dirty ? " (dirty tree)" : "";
  void dialog.showMessageBox({
    type: "info",
    message: "Our Civic Duty",
    detail: [
      `Release version: ${identity.version}`,
      `Build revision: ${identity.revision}${dirtyNote}`,
      `Composition: ${identity.composition}`,
      `Build profile: ${identity.profile ?? "production"}`,
      `Client tree: ${identity.clientTreeSha256 ?? "unknown"}`,
      `Distribution: ${identity.distribution} / channel ${identity.channel}`,
      `Staged: ${identity.stagedAt}`,
    ].join("\n"),
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    backgroundColor: "#1a1a1a",
    title: "Our Civic Duty",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      // The game needs nothing from the shell; there is deliberately no
      // preload bridge and no IPC surface into the renderer.
      preload: undefined,
    },
  });
  win.once("ready-to-show", () => win.show());
  void win.loadURL(`${APP_ORIGIN}/index.html`);
  return win;
}

function buildMenu() {
  const template = [
    ...(process.platform === "darwin"
      ? [
          {
            label: "Our Civic Duty",
            submenu: [
              { label: "About Our Civic Duty", click: showAbout },
              {
                label: "Check for Updates…",
                click: () => checkForUpdates(),
              },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        ...(process.platform === "darwin"
          ? [{ role: "close" }]
          : [
              { label: "About Our Civic Duty", click: showAbout },
              {
                label: "Check for Updates…",
                click: () => checkForUpdates(),
              },
              { type: "separator" },
              { role: "quit" },
            ]),
      ],
    },
    {
      label: "Edit",
      submenu: [{ role: "copy" }, { role: "paste" }, { role: "selectAll" }],
    },
    {
      label: "View",
      submenu: [
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { label: "Window", submenu: [{ role: "minimize" }, { role: "zoom" }] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Single instance: two processes over one IndexedDB profile is a
// concurrency surface the save protocol tolerates but the shell need not
// invite.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    protocol.handle(APP_SCHEME, (request) =>
      serveAppRequest(contentRoot, request),
    );

    const ses = session.defaultSession;
    // The game asks for no device or web-platform permissions; deny all.
    ses.setPermissionRequestHandler((_wc, _permission, callback) =>
      callback(false),
    );
    ses.setPermissionCheckHandler(() => false);

    // Browser-compatible save export uses an <a download> of a JSON blob.
    // Electron will not finish that download unless the main process names a
    // destination. Only JSON portable-save files from blob/data/app origin.
    ses.on("will-download", (event, item) => {
      const destDir = process.env.OCD_DOWNLOAD_DIR || app.getPath("downloads");
      const dest = portableDownloadSavePath(
        item.getFilename(),
        item.getURL(),
        destDir,
        APP_ORIGIN,
      );
      if (dest === null) {
        event.preventDefault();
        return;
      }
      item.setSavePath(dest);
    });

    app.on("web-contents-created", (_event, contents) => {
      contents.on("will-prevent-unload", () => {
        // Honour the page's unsaved-work guard. Forcing the unload would
        // skip persistence and then claim a safe close or update.
      });
      contents.on("will-navigate", (event, url) => {
        if (!url.startsWith(`${APP_ORIGIN}/`)) event.preventDefault();
      });
      contents.setWindowOpenHandler(({ url }) => {
        // External links open in the user's browser, never in the shell.
        if (url.startsWith("https://")) void shell.openExternal(url);
        return { action: "deny" };
      });
      contents.session.setSpellCheckerEnabled?.(false);
    });

    buildMenu();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}

/* global console, process, setTimeout, document */
/**
 * Bounded packaged-client smoke: launch → title menu → New game → the loading
 * line appears → Options opens and closes → Quit to title → clean quit. One
 * binary, one isolated disposable profile; this is the per-OS runtime proof
 * used on CI runners (a build that merely compiles is not runtime-tested).
 *
 * With --shell it additionally exercises the window contract on the same
 * packaged build: resize, fullscreen on/off, minimize/restore.
 *
 * NOT YET COVERED: the play screen and its menus (People and the rest). The
 * play page talks to the game through /api/* routes that only the bench
 * server (src/bench/server.ts) serves; the desktop shell serves static files
 * only (desktop/app-protocol.mjs), so New game cannot get past its loading
 * line in a packaged client today. When the shell runs the play server, add
 * after New game: wait for the play screen, open People from the menu, close
 * it, then Options and Quit to title from inside play, with data-testid
 * attributes on those controls in src/bench/play.html and play.mjs.
 *
 * Usage: node scripts/smoke-test.mjs --app <executable> [--shell] [--screenshot <png>]
 */

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import {
  gameLaunchEnvironment,
  isPackagedRenderRequest,
} from "./game-launch-environment.mjs";

const require = createRequire(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "package.json",
  ),
);
const { _electron } = require("playwright");

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
const hubPath = arg("--hub");
const payloadPath = arg("--payload");
const appPath = hubPath ?? arg("--app");
const screenshot = arg("--screenshot");
const shellChecks = process.argv.includes("--shell");
if (!appPath) {
  console.error(
    "Usage: node scripts/smoke-test.mjs --app <executable> [--shell] [--screenshot <png>]",
  );
  process.exit(1);
}
const profile = mkdtempSync(path.join(os.tmpdir(), "ocd-smoke-"));
if (hubPath) {
  if (!payloadPath) throw new Error("A hub smoke check requires --payload.");
  const identity = JSON.parse(
    readFileSync(
      path.join(payloadPath, "Contents", "Resources", "build-identity.json"),
      "utf8",
    ),
  );
  writeFileSync(
    path.join(profile, "state.json"),
    JSON.stringify({
      schema: 2,
      repositoryPath: null,
      privatePackPath: null,
      selectedTrack: "main",
      tracks: {
        main: {
          branch: "main",
          current: {
            ...identity,
            appPath: path.resolve(payloadPath),
            delivery: "console-client-payload",
          },
          pending: null,
          previous: null,
        },
      },
    }),
  );
}

const failures = [];
function check(label, condition, detail = "") {
  console.log(
    `${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`,
  );
  if (!condition) failures.push(label);
}

async function launch() {
  const app = await _electron.launch({
    executablePath: appPath,
    env: {
      ...gameLaunchEnvironment(process.env, profile),
      ...(hubPath
        ? {
            OCD_CONTROLLER_DATA_ROOT: profile,
            OCD_HUB_SKIP_STARTUP_CHECK: "1",
            OCD_HUB_NO_BUILDS: "1",
            OCD_HUB_NO_ARTDESK_AUTOSTART: "1",
          }
        : {}),
    },
  });
  const page = hubPath
    ? (app.windows().find((page) => page.url().startsWith("app://game/")) ??
      (await app.waitForEvent("window", {
        predicate: (page) => page.url().startsWith("app://game/"),
        timeout: 30000,
      })))
    : await app.firstWindow();
  const foreign = [];
  // Electron's will-prevent-unload handler owns this decision in standalone
  // clients as well as the hub. Playwright's automatic dismissal can race a
  // native close, even after the saved identity has been proven durable.
  page.on("dialog", (dialog) => {
    if (dialog.type() !== "beforeunload")
      throw new Error(`Unexpected browser dialog: ${dialog.type()}`);
    console.log("Native before-unload decision remains with the host.");
  });
  page.on("request", (request) => {
    if (!isPackagedRenderRequest(request.url())) foreign.push(request.url());
  });
  await page.waitForLoadState("domcontentloaded");
  return { app, page, foreign };
}

// ---- Launch, title menu, New game, Options, Quit to title, clean quit -------
{
  const { app, page, foreign } = await launch();
  check(
    "launch: window served from app://game",
    page.url().startsWith("app://game/"),
    page.url(),
  );
  await page.getByTestId("title-menu").waitFor();
  check(
    "title: the menu offers New game and Options",
    (await page.getByTestId("new-game").isVisible()) &&
      (await page.getByTestId("title-options").isVisible()),
  );
  if (screenshot) {
    await page.screenshot({ path: path.resolve(screenshot), fullPage: true });
  }

  // Options opens from the title, closes, and offers Quit to title.
  await page.getByTestId("title-options").click();
  await page.getByTestId("sheet").waitFor();
  check("options: the sheet opens from the title", true);
  await page.getByTestId("sheet-close").click();
  await page.getByTestId("sheet").waitFor({ state: "hidden" });
  check("options: the sheet closes", true);

  // New game starts loading: the loading line appears with words in it.
  await page.getByTestId("new-game").click();
  await page.waitForFunction(
    () => {
      const line = document.querySelector('[data-testid="loading-line"]');
      return Boolean(line && !line.hidden && line.textContent.trim());
    },
    undefined,
    { timeout: 30000 },
  );
  check("new game: the loading line appears", true);

  // Quit to title returns to a fresh title menu.
  await page.getByTestId("title-options").click();
  await page.getByTestId("quit-to-title").click();
  await page.waitForLoadState("domcontentloaded");
  await page.getByTestId("title-menu").waitFor();
  check("options: Quit to title returns to the title menu", true);
  check(
    "offline: no request left the packaged origin",
    foreign.length === 0,
    foreign.slice(0, 3).join(", "),
  );

  if (shellChecks) {
    const win = async (fn) =>
      app.evaluate(({ BrowserWindow }, body) => {
        const w = BrowserWindow.getAllWindows()[0];
        return new Function("w", `return (${body})(w);`)(w);
      }, fn.toString());

    const before = await win((w) => w.getSize());
    await win((w) => w.setSize(1024, 700));
    await new Promise((r) => setTimeout(r, 400));
    const size = await win((w) => w.getSize());
    // A small runner display may clamp the height. The contract is that
    // the window is at the requested width and at least the minimum
    // height. If it was already at that clamped size, setSize is a no-op
    // rather than a product defect.
    const withinContract = size[0] === 1024 && size[1] >= 640;
    const changed = String(size) !== String(before);
    const alreadyClamped =
      before[0] === 1024 && before[1] >= 640 && before[1] <= 700;
    check(
      "shell: resize applies",
      withinContract && (changed || alreadyClamped),
      `${before} -> ${size}`,
    );
    check(
      "shell: game still rendered after resize",
      (await page.getByTestId("new-game").count()) > 0,
    );

    await win((w) => w.setFullScreen(true));
    await new Promise((r) => setTimeout(r, 1200));
    check("shell: fullscreen on", await win((w) => w.isFullScreen()));
    await win((w) => w.setFullScreen(false));
    await new Promise((r) => setTimeout(r, 1200));
    check("shell: fullscreen off", !(await win((w) => w.isFullScreen())));

    // macOS animates the fullscreen exit above; a minimize requested during
    // that animation lands a beat later. Wait for the state, bounded, rather
    // than sampling it once. The contract is unchanged: the window must
    // actually reach the minimized state and leave it again.
    const settles = async (predicate) => {
      for (let i = 0; i < 12; i += 1) {
        if (await win(predicate)) return true;
        await new Promise((r) => setTimeout(r, 250));
      }
      return false;
    };
    await win((w) => w.minimize());
    check("shell: minimized", await settles((w) => w.isMinimized()));
    await win((w) => w.restore());
    check("shell: restored", await settles((w) => !w.isMinimized()));
  }

  // Clean quit through the normal close path.
  await app.close();
  check("shell: clean quit", true);
}

console.log(`\nProfile: ${profile}`);
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED`);
  process.exit(1);
}
console.log("\nSmoke checks passed.");

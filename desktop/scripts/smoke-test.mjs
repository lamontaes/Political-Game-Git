/* global console, process, setTimeout, document, URL */
/**
 * Bounded packaged-client smoke: launch → title menu → Options opens and
 * closes → New game → the play server (run in-process by the shell) builds
 * the town and the opening plays → Options and Quit to title from inside play
 * → clean quit. One binary, one isolated disposable profile; this is the
 * per-OS runtime proof used on CI runners (a build that merely compiles is
 * not runtime-tested).
 *
 * With --shell it additionally exercises the window contract on the same
 * packaged build: resize, fullscreen on/off, minimize/restore.
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
  // The title is a full-window national scene with the menu over it: the
  // backdrop has a picture, the build version in the corner, and no place field on the front.
  const titleScreen = await page.evaluate(async () => {
    const backdrop = document.getElementById("backdrop");
    // The title's scene is chosen by the play server, so its picture arrives
    // a moment after the menu does: wait for it before judging it.
    for (let i = 0; i < 100 && !backdrop.getAttribute("src"); i++)
      await new Promise((resolve) => setTimeout(resolve, 100));
    if (backdrop.getAttribute("src") && !backdrop.complete)
      await new Promise((resolve) => {
        backdrop.onload = backdrop.onerror = resolve;
      });
    const front = document.getElementById("front");
    const place = document.getElementById("place");
    return {
      src: backdrop.getAttribute("src") ?? "",
      painted: backdrop.naturalWidth > 0,
      version: /\d+\.\d+\.\d+/.test(
        document.getElementById("title-version")?.textContent ?? "",
      ),
      placeShown: Boolean(place && place.offsetParent !== null),
      seedShown: Boolean(document.getElementById("seed")?.offsetParent),
      patchNotes: document.getElementById("front-patch-notes")?.disabled,
      saves: document.getElementById("front-saves")?.disabled,
      subtitle: Boolean(front.querySelector(".sub")),
      // A description line is a span of text under an item. The Continue
      // item's face (.bust) and its label span (<b>Continue</b> plus the
      // life's name) are not description lines (#6283).
      itemLines: [...front.querySelectorAll(".item span")].filter(
        (s) => !s.classList.contains("bust") && !s.querySelector("b"),
      ).length,
      continueShown: Boolean(document.getElementById("front-continue")),
      continueDisabled: document.getElementById("front-continue")?.disabled,
      figures: document.querySelectorAll("#people img").length,
      quitShown: !document.getElementById("front-quit")?.hidden,
    };
  });
  check(
    "title: the backdrop is a painted national scene",
    titleScreen.src !== "" &&
      titleScreen.painted &&
      /^\/art\/backdrops\/(white-house-exterior|lincoln-memorial|national-convention-floor|national-convention-stage|rally-stage|rally-town-square|rally-courthouse-square|us-house-floor|us-senate-floor|debate-stage|oval-office)__/.test(
        titleScreen.src,
      ),
    titleScreen.src,
  );
  check("title: no subtitle under the wordmark", !titleScreen.subtitle);
  check(
    "title: no description line under any item",
    titleScreen.itemLines === 0,
  );
  check(
    "title: no seed or place controls on the title",
    !titleScreen.seedShown && !titleScreen.placeShown,
  );
  // Patch notes open the release notes (owner, Oct 28: "get them in"); Saved
  // games wait for the save format.
  check(
    "title: Patch notes is there and opens; Saved games is there, disabled",
    titleScreen.patchNotes === false && titleScreen.saves === true,
  );
  check("title: no figure stands on the title", titleScreen.figures === 0);
  check(
    "title: Continue is there, disabled with no life saved",
    titleScreen.continueShown && titleScreen.continueDisabled === true,
  );
  check("title: Quit is offered on the desktop", titleScreen.quitShown);
  check("title: the build version shows on the title", titleScreen.version);
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
  const built = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/newlife",
    { timeout: 240000 },
  );
  await page.getByTestId("new-game").click();
  // New world lives under Advanced since the one dev-mode start (#6232).
  await page.getByTestId("advanced").click();
  await page.getByTestId("new-world").click();
  await page.waitForFunction(
    () => {
      const line = document.querySelector('[data-testid="loading-line"]');
      return Boolean(line && !line.hidden && line.textContent.trim());
    },
    undefined,
    { timeout: 30000 },
  );
  check("new game: the loading line appears", true);

  // The in-process play server builds the town, and the opening plays.
  const life = await built;
  check(
    "new game: the play server builds the town",
    life.status() === 200,
    `${life.status()} ${(await life.text()).slice(0, 200)}`,
  );
  await page.waitForFunction(
    () => document.getElementById("front")?.hidden === true,
    undefined,
    { timeout: 120000 },
  );
  check("new game: the title menu gives way to play", true);
  const art = await page.evaluate(() =>
    [...document.images]
      .filter((img) => img.src.includes("/art/") && img.complete)
      .map((img) => img.naturalWidth),
  );
  check(
    "new game: the opening's pictures load from the packaged art",
    art.length > 0 && art.every((width) => width > 0),
    JSON.stringify(art),
  );

  // Options from inside play, then Quit to title returns to the title menu.
  await page.keyboard.press("Escape");
  await page.getByTestId("quit-to-title").click();
  await page.waitForLoadState("domcontentloaded");
  await page.getByTestId("title-menu").waitFor();
  check("options: Quit to title returns to the title menu", true);
  await page.waitForFunction(
    () => !document.getElementById("front-continue").disabled,
  );
  check("title: Continue is offered for the life in progress", true);
  const title = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].getTitle(),
  );
  check(
    "identity: the window title names the version and the commit",
    /^Our Civic Duty \d+\.\d+\.\d+\S* \([0-9a-f]{7}\)$/.test(title),
    title,
  );
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

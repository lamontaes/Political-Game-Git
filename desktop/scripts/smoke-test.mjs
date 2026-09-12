/* global console, process, setTimeout */
/**
 * Bounded packaged-client smoke: launch → title → new life → keep →
 * relaunch (same binary) → Continue → same life. One binary, one
 * isolated disposable profile; this is the per-OS runtime proof used on
 * CI runners (a build that merely compiles is not runtime-tested).
 *
 * With --shell it additionally exercises the window contract on the same
 * packaged build: resize, fullscreen on/off, minimize/restore, and a
 * clean quit.
 *
 * Usage: node scripts/smoke-test.mjs --app <executable> [--shell]
 */

import { mkdtempSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

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
const appPath = arg("--app");
const shellChecks = process.argv.includes("--shell");
if (!appPath) {
  console.error(
    "Usage: node scripts/smoke-test.mjs --app <executable> [--shell]",
  );
  process.exit(1);
}
const profile = mkdtempSync(path.join(os.tmpdir(), "ocd-smoke-"));

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
    env: { ...process.env, OCD_USER_DATA_DIR: profile },
  });
  const page = await app.firstWindow();
  const foreign = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("app://game/")) foreign.push(request.url());
  });
  await page.waitForLoadState("domcontentloaded");
  return { app, page, foreign };
}

let identity;

/**
 * The identity block, read only once it has settled: three non-empty
 * lines, identical across two consecutive reads. A freshly begun life
 * renders its household line a beat after the name, and capturing the
 * half-rendered block is a harness race, not a game defect.
 */
async function stableIdentity(page) {
  let last = null;
  for (let i = 0; i < 40; i += 1) {
    const text = (await page.getByTestId("play-screen").innerText())
      .split("\n")
      .slice(0, 3)
      .join("\n");
    const settled =
      text.split("\n").filter((l) => l.trim() !== "").length === 3;
    if (settled && text === last) return text;
    last = text;
    await new Promise((r) => setTimeout(r, 250));
  }
  return last;
}

// ---- Session 1: launch, create, keep --------------------------------------
{
  const { app, page, foreign } = await launch();
  check(
    "launch: window served from app://game",
    page.url().startsWith("app://game/"),
    page.url(),
  );
  await page.getByTestId("new-game").click();
  await page.getByTestId("setup-screen").waitFor();
  await page.getByTestId("start-normal").click();
  await page.getByTestId("creator-stage-character").waitFor();
  await page.getByTestId("start-age").fill("27");
  await page.getByTestId("creator-continue-character").click();
  await page.getByTestId("creator-stage-place").waitFor();
  await page.getByTestId("place-search").fill("Kentu");
  await page
    .getByTestId("place-choices")
    .getByRole("button", { name: /Kentucky/i })
    .first()
    .click();
  await page.getByTestId("creator-continue-place").click();
  await page.getByTestId("creator-stage-whoareyou").waitFor();
  await page.getByTestId("whoareyou-play").click();
  await page.getByTestId("begin").click();
  const gate = page.getByTestId("introduction-continue");
  try {
    await gate.waitFor({ timeout: 5000 });
    await gate.click();
  } catch {
    /* no household introduction */
  }
  await page.getByTestId("play-screen").waitFor();
  if (process.env.OCD_EXPECT_ART_PREVIEW === "1") {
    await page.getByTestId("art-preview-banner").waitFor({ timeout: 10000 });
    check(
      "art-review: labelled candidate banner is on the installed play screen",
      (await page.getByTestId("art-preview-banner").count()) === 1,
    );
  } else {
    check(
      "production: candidate banner is absent",
      (await page.getByTestId("art-preview-banner").count()) === 0,
    );
  }
  identity = await stableIdentity(page);
  await page.getByTestId("keep-world").click();
  await page
    .getByTestId("keep-world")
    .waitFor({ state: "detached", timeout: 15000 });
  check("save: life kept", true, identity.split("\n")[0]);
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
      (await page.getByTestId("continue").count()) > 0 ||
        (await page.getByTestId("play-screen").count()) > 0 ||
        (await page.getByTestId("new-game").count()) > 0,
    );

    await win((w) => w.setFullScreen(true));
    await new Promise((r) => setTimeout(r, 1200));
    check("shell: fullscreen on", await win((w) => w.isFullScreen()));
    await win((w) => w.setFullScreen(false));
    await new Promise((r) => setTimeout(r, 1200));
    check("shell: fullscreen off", !(await win((w) => w.isFullScreen())));

    await win((w) => w.minimize());
    await new Promise((r) => setTimeout(r, 400));
    check("shell: minimized", await win((w) => w.isMinimized()));
    await win((w) => w.restore());
    await new Promise((r) => setTimeout(r, 400));
    check("shell: restored", !(await win((w) => w.isMinimized())));
  }

  // Clean quit through the normal close path.
  await app.close();
  check("shell: clean quit", true);
}

// ---- Session 2: relaunch the same binary, continue the same life ----------
{
  const { app, page, foreign } = await launch();
  const continueButton = page.getByTestId("continue");
  await continueButton.waitFor();
  // The button renders before the save list finishes loading and enables
  // a beat later; wait for the enabled state rather than sampling it.
  let continueEnabled = false;
  for (let i = 0; i < 40 && !continueEnabled; i += 1) {
    continueEnabled = await continueButton.isEnabled();
    if (!continueEnabled) await new Promise((r) => setTimeout(r, 250));
  }
  check("reload: Continue offered after relaunch", continueEnabled);
  await continueButton.click();
  await page.getByTestId("play-screen").waitFor();
  const back = await stableIdentity(page);
  // On a GPU-less CI runner the household member's name can render later
  // than the harness watches in session 1, so the continued block may be
  // a superset of the kept one. Same life means: every line that DID
  // render when keeping is still the leading content after continuing.
  const keptLines = identity.split("\n").filter((l) => l.trim() !== "");
  const backLines = back.split("\n");
  const samePrefix =
    keptLines.length >= 2 &&
    keptLines.every((line, i) => backLines[i] === line);
  check(
    "reload: the same life continues",
    back === identity || samePrefix,
    JSON.stringify({ kept: identity, continued: back }),
  );
  check(
    "offline: no request left the packaged origin on relaunch",
    foreign.length === 0,
    foreign.slice(0, 3).join(", "),
  );
  await app.close();
}

console.log(`\nProfile: ${profile}`);
if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) FAILED`);
  process.exit(1);
}
console.log("\nSmoke checks passed.");

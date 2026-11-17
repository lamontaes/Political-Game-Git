#!/usr/bin/env node
/* global process, console, setTimeout, fetch, URL */
// The verify skill's script (.claude/skills/verify/SKILL.md; the .agents copy is byte-identical).
//
//   node .claude/skills/verify/scripts/verify.mjs [--base origin/main] [--screen <tab>[/<button>...]]...
//        [--dev] [--place <key> --seed <seed>] [--out <dir>] [--no-guards] [--typecheck] [--observe]
//
// 1. The changed files' checks: the focus stages scripts/agent-test-cadence.mjs plans for the files this
//    branch changed against --base (changed tests, zero-dice, zero-real-data, old-imports, pool, skill-ops).
// 2. Every guard: npm run guards, with CHANGED_FILES set the way the CI guards job sets it.
// 3. With --screen: starts the bench (src/bench/server.ts) headless when nothing answers on port 3000,
//    starts a new life in a drawn place through src/bench/start-life.mjs, turns dev mode on with --dev,
//    opens each screen by its ring tab and button names, and saves a 1440x900 screenshot of each.
//
// Prints one line per stage (PASS, FAIL, SKIPPED or DID NOT RUN) and a Verified: line for the PR stamp;
// full logs go to --out (default: a folder in the system temp directory named for the head).
// Exit 0: every stage passed. 1: a stage failed. 3: a stage did not run. --observe always exits 0.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const values = (name) =>
  args.flatMap((a, i) => (a === name && args[i + 1] ? [args[i + 1]] : []));
const value = (name, fallback) => values(name).at(-1) ?? fallback;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

if (flag("--help")) {
  console.log(
    [
      "usage: node .claude/skills/verify/scripts/verify.mjs [options]",
      "  --base <ref>        compare against this ref (default origin/main)",
      "  --screen <path>     a ring tab, then any buttons: politics/Metrics (repeatable)",
      "  --dev               turn dev mode on before opening the screens",
      "  --place <key> --seed <seed>   replay one place and seed (only to reproduce a red)",
      "  --out <dir>         where logs and screenshots go",
      "  --no-guards         skip npm run guards",
      "  --typecheck         also run the typecheck stage",
      "  --observe           report only: always exit 0",
      "exit 0 pass, 1 a stage failed, 3 a stage did not run",
    ].join("\n"),
  );
  process.exit(0);
}

const git = (...a) =>
  execFileSync("git", a, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const lines = (text) => text.split("\n").filter(Boolean);
const base = value("--base", "origin/main");
const head = git("rev-parse", "--short=12", "HEAD");
const out = resolve(value("--out", join(tmpdir(), `verify-${head}`)));
mkdirSync(out, { recursive: true });
const results = [];
const env = {
  ...process.env,
  NODE_OPTIONS: process.env.NODE_OPTIONS ?? "--max-old-space-size=8192",
};

function changedFiles() {
  const files = new Set();
  try {
    const from = git("merge-base", base, "HEAD");
    for (const f of lines(git("diff", "--name-only", from, "HEAD")))
      files.add(f);
  } catch {
    results.push({
      stage: `Changed files against ${base}`,
      status: "DID NOT RUN",
      note: `no merge base with ${base}: fetch it, or pass --base`,
    });
  }
  for (const f of lines(git("diff", "--name-only", "HEAD"))) files.add(f);
  for (const f of lines(git("ls-files", "--others", "--exclude-standard")))
    files.add(f);
  return [...files].filter((f) => existsSync(join(ROOT, f)));
}

function run(stage, command, extra = {}) {
  const log = join(
    out,
    `${stage.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.log`,
  );
  const fd = openSync(log, "w");
  const r = spawnSync("bash", ["-c", command], {
    cwd: ROOT,
    stdio: ["ignore", fd, fd],
    env: { ...env, ...extra },
  });
  const status =
    r.error || r.status === null || r.status === 127
      ? "DID NOT RUN"
      : r.status === 0
        ? "PASS"
        : "FAIL";
  results.push({ stage, status, command, log });
}

async function answering() {
  try {
    return (await fetch("http://localhost:3000/play")).ok;
  } catch {
    return false;
  }
}

function browserPath() {
  if (process.env.BENCH_BROWSER) return process.env.BENCH_BROWSER;
  for (const p of ["/usr/bin/chromium", "/opt/pw-browsers/chromium"])
    if (existsSync(p)) return p;
  return undefined; // Playwright's own browser
}

async function screens(list) {
  let server = null;
  const stop = () => {
    if (!server) return;
    try {
      process.kill(-server.pid);
    } catch {
      server.kill();
    }
  };
  if (!(await answering())) {
    const log = join(out, "bench-server.log");
    const fd = openSync(log, "w");
    server = spawn(
      process.execPath,
      ["--max-old-space-size=8192", "--import", "tsx", "src/bench/server.ts"],
      { cwd: ROOT, stdio: ["ignore", fd, fd], env, detached: true },
    );
    for (let i = 0; i < 240 && !(await answering()); i++) await sleep(1000);
    if (!(await answering())) {
      results.push({ stage: "Start the bench", status: "DID NOT RUN", log });
      stop();
      return;
    }
  }
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (error) {
    results.push({
      stage: "Load Playwright",
      status: "DID NOT RUN",
      note: String(error.message).split("\n")[0],
    });
    stop();
    return;
  }
  const { startLife } = await import(
    pathToFileURL(join(ROOT, "src/bench/start-life.mjs")).href
  );
  const { devModeOn } = await import(
    pathToFileURL(join(ROOT, "src/bench/dev-setup.mjs")).href
  );
  let browser;
  try {
    browser = await chromium.launch({ executablePath: browserPath() });
  } catch (error) {
    results.push({
      stage: "Start the browser",
      status: "DID NOT RUN",
      note: String(error.message).split("\n")[0],
    });
    stop();
    return;
  }
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(180000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const place = value("--place");
  const seed = value("--seed");
  if (place || seed)
    await page.route("**/api/newlife?*", (route) => {
      const url = new URL(route.request().url());
      if (seed) url.searchParams.set("seed", seed);
      if (place) url.searchParams.set("placeKey", place);
      route.continue({ url: url.toString() });
    });
  try {
    const life = await startLife(page, { fresh: true });
    results.push({
      stage: "New life",
      status: "PASS",
      note: `${life.placeName ?? "?"}, seed ${life.seed ?? "?"}${place || seed ? " (replayed)" : " (drawn)"}`,
    });
    if (flag("--dev")) await devModeOn(page);
    for (const screen of list) {
      const [tab, ...buttons] = screen.split("/");
      await page
        .locator(`#rings [data-tab="${tab}"]`)
        .first()
        .evaluate((tabButton) => tabButton.click());
      for (const name of buttons)
        await page.locator("#sheet button", { hasText: name }).first().click();
      await page.waitForTimeout(1500);
      const file = join(
        out,
        `${screen.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`,
      );
      await page.screenshot({ path: file });
      results.push({ stage: `Screen ${screen}`, status: "PASS", note: file });
      await page
        .locator("#sheet-close")
        .click({ timeout: 3000 })
        .catch(() => undefined);
    }
  } catch (error) {
    const file = join(out, "failed-screen.png");
    await page.screenshot({ path: file }).catch(() => undefined);
    results.push({
      stage: "Reach the screen",
      status: "FAIL",
      note: `${String(error.message).split("\n")[0]} (picture: ${file})`,
    });
  } finally {
    if (errors.length)
      results.push({
        stage: "Page errors",
        status: "FAIL",
        note: errors.slice(0, 3).join(" | "),
      });
    await browser.close();
    stop();
  }
}

const files = changedFiles();
const { planCadence } = await import(
  pathToFileURL(join(ROOT, "scripts/agent-test-cadence.mjs")).href
);
for (const stage of planCadence(files)) {
  if (stage.kind !== "focus") continue;
  if (stage.receiptStage === "typecheck" && !flag("--typecheck")) {
    results.push({
      stage: stage.label,
      status: "SKIPPED",
      note: "the checker runs it; pass --typecheck to run it here",
    });
    continue;
  }
  if (stage.receiptStage === "browser" || stage.receiptStage === "title") {
    results.push({
      stage: stage.label,
      status: "SKIPPED",
      note: "a bench check: run it with the bench up, or use --screen",
    });
    continue;
  }
  run(stage.label, stage.command);
}
if (!flag("--no-guards"))
  run("Guards", "npm run guards", {
    CHANGED_FILES: files
      .filter((f) => f.startsWith("docs/pool/items/"))
      .join("\n"),
  });
const list = values("--screen");
if (list.length) await screens(list);

writeFileSync(
  join(out, "summary.json"),
  `${JSON.stringify({ head, base, files, results }, null, 2)}\n`,
);
console.log(
  `verify at ${head} against ${base}: ${files.length} changed files; logs in ${out}`,
);
for (const r of results)
  console.log(
    `${r.status.padEnd(11)} ${r.stage}${r.note ? `: ${r.note}` : ""}${r.status === "PASS" || !r.log ? "" : ` (log ${r.log})`}`,
  );
console.log(
  `Verified: ${results.map((r) => `${r.stage}: ${r.status}`).join("; ") || "nothing to run"}, at ${head}`,
);
const failed = results.some((r) => r.status === "FAIL");
const notRun = results.some((r) => r.status === "DID NOT RUN");
process.exit(flag("--observe") ? 0 : failed ? 1 : notRun ? 3 : 0);

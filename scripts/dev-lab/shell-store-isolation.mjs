#!/usr/bin/env node
/* global console, process, URLSearchParams, indexedDB */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { encodeReplayDescriptor } from "../../src/presentation/new-game-identity.ts";

/**
 * Does the MOUNTED game keep the art preview out of an ordinary save?
 *
 * The store-class tests answer a narrower question. They build correctly named
 * `BrowserShellStateStore` instances by hand and show that two databases stay
 * apart — which was true, and was never the thing that was broken. `useShell`,
 * the hook that actually persists pins, preferences, the journal and wardrobe
 * choices, constructed its own store with no database name, so the writer that
 * mattered wrote candidate choices into the ordinary player's save no matter
 * how carefully anything else was namespaced. A test that never runs that line
 * cannot notice.
 *
 * So this drives the real application. It plays an ordinary life, pins people
 * and dresses somebody, saves; opens the SAME SLOT in candidate mode and
 * changes those things again; then comes back to the ordinary save and checks
 * that what the player had is exactly what they still have. It also reads both
 * IndexedDB databases out of the page, because the visible screen alone cannot
 * show which file a record landed in.
 *
 *   node --import tsx scripts/dev-lab/shell-store-isolation.mjs [baseUrl] [out]
 *
 * Chromium is named explicitly: @playwright/test here resolves a build this
 * container does not have and cannot download, so the repository config cannot
 * launch at all. The version used is printed with the results and must not be
 * passed off as a run on the project's own harness.
 */

const BASE = process.argv[2] ?? "http://127.0.0.1:5173";
const OUT = resolve(process.argv[3] ?? "test-results/shell-store-isolation");
const EXECUTABLE = "/opt/pw-browsers/chromium";
const SEED = "shell-store-isolation";

function address({ preview }) {
  const query = new URLSearchParams({
    replay: encodeReplayDescriptor({
      startKind: "custom",
      placeKey: "kentucky",
      startAge: 34,
      depth: "play-formative-years",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      seed: SEED,
      givenName: null,
      familyName: null,
      questionnaire: "skipped",
      priors: [],
    }),
  });
  if (preview) query.set("art-preview", "candidate");
  return `${BASE}/?${query.toString()}`;
}

/** Every shell record in both databases, read straight out of the page. */
async function readBothStores(page) {
  return page.evaluate(async () => {
    async function dump(name) {
      return new Promise((done) => {
        const request = indexedDB.open(name);
        request.onerror = () => done({ database: name, error: "open failed" });
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("interface")) {
            db.close();
            return done({ database: name, records: [] });
          }
          const all = db
            .transaction("interface", "readonly")
            .objectStore("interface")
            .getAll();
          all.onsuccess = () => {
            db.close();
            done({
              database: name,
              records: all.result.map((row) => ({
                saveId: row.saveId,
                pins: (row.pins ?? []).map((pin) => pin.key),
                ambition: row.journal?.ambition ?? "",
                notes: (row.journal?.notes ?? []).length,
                wardrobes: Object.fromEntries(
                  Object.entries(row.personWardrobes ?? {}).map(
                    ([id, value]) => [id, value.families?.top ?? null],
                  ),
                ),
              })),
            });
          };
          all.onerror = () => {
            db.close();
            done({ database: name, error: "read failed" });
          };
        };
      });
    }
    return {
      ordinary: await dump("political-life-worlds"),
      preview: await dump("political-life-worlds-art-preview"),
    };
  });
}

async function enter(page, preview) {
  await page.goto(address({ preview }), { waitUntil: "domcontentloaded" });
  await page.getByTestId("play-screen").waitFor({ timeout: 25000 });
  await page.waitForTimeout(900);
  const skip = page.getByRole("button", { name: /skip introduction/i });
  if (await skip.count()) {
    await skip.click().catch(() => {});
    await page.waitForTimeout(1200);
  }
}

async function saveThroughNavigation(page) {
  const cluster = page.getByTestId("shell-nav-cluster");
  const save = page
    .getByTestId("keep-world")
    .or(page.getByTestId("save-world"));
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await cluster.click({ timeout: 5000 }).catch(() => {});
    await page
      .getByTestId("shell-nav-flyout")
      .waitFor({ timeout: 5000 })
      .catch(() => {});
    if (await save.count()) {
      await save.first().click({ timeout: 5000 });
      await page.waitForTimeout(2500);
      return true;
    }
    await cluster.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  return false;
}

/** Pin whoever is in the room, and dress them. Returns what was chosen. */
async function arrange(page, { ambition }) {
  const railPerson = page.locator("[data-testid^='scene-person-']").first();
  const personId = (await railPerson.getAttribute("data-testid")).replace(
    "scene-person-",
    "",
  );
  await railPerson.click();
  await page.waitForTimeout(400);
  await page.getByTestId("action-pin").click({ timeout: 4000 });
  await page.waitForTimeout(500);
  await page
    .getByTestId("action-inspect")
    .click({ timeout: 4000 })
    .catch(() => {});
  await page.waitForTimeout(700);
  await page
    .getByRole("button", { name: /full record/i })
    .first()
    .click({ timeout: 4000 })
    .catch(() => {});
  await page.waitForTimeout(900);

  let chosen = null;
  const controls = page.getByTestId("saved-appearance-controls");
  if (await controls.count()) {
    await controls
      .locator("summary")
      .click()
      .catch(() => {});
    await page.waitForTimeout(400);
    const top = page.locator('select[aria-label="top"]');
    if (await top.count()) {
      const options = await top
        .locator("option")
        .evaluateAll((nodes) =>
          nodes.map((n) => n.getAttribute("value")).filter(Boolean),
        );
      if (options.length) {
        chosen = options[0];
        await top.selectOption(chosen);
        await page.waitForTimeout(800);
      }
    }
  }

  // The journal's ambition line, if this build exposes it.
  let wroteAmbition = false;
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(300);
  const cluster = page.getByTestId("shell-nav-cluster");
  await cluster.click().catch(() => {});
  await page
    .getByTestId("shell-nav-flyout")
    .waitFor({ timeout: 4000 })
    .catch(() => {});
  if (await page.getByTestId("nav-journal-entry").count()) {
    await page.getByTestId("nav-journal-entry").click();
    await page.waitForTimeout(1000);
    const field = page
      .getByRole("textbox")
      .filter({ hasNot: page.locator("[readonly]") })
      .first();
    if (await field.count()) {
      await field.fill(ambition).catch(() => {});
      await field.blur().catch(() => {});
      await page.waitForTimeout(800);
      wroteAmbition = true;
    }
    const back = page.getByRole("button", { name: /back/i }).first();
    if (await back.count()) await back.click().catch(() => {});
    await page.waitForTimeout(600);
  } else {
    await cluster.click().catch(() => {});
  }

  return { personId, chosen, wroteAmbition };
}

const browser = await chromium.launch({ executablePath: EXECUTABLE });
console.log(`browser: ${browser.version()} (${EXECUTABLE})`);
mkdirSync(OUT, { recursive: true });
const report = [];
const say = (line) => {
  report.push(line);
  console.log(line);
};

// ONE browser context throughout, so both databases are the same origin's.
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();

say("--- 1. an ordinary life, arranged and saved ---");
await enter(page, false);
const ordinary = await arrange(page, {
  ambition: "Ordinary ambition, written on production art.",
});
say(`  person        ${ordinary.personId}`);
say(`  wardrobe      ${ordinary.chosen ?? "(nothing offered)"}`);
say(`  journal typed ${ordinary.wroteAmbition}`);
say(`  saved         ${await saveThroughNavigation(page)}`);
const afterOrdinary = await readBothStores(page);
say(`  ordinary db   ${JSON.stringify(afterOrdinary.ordinary.records)}`);
say(`  preview db    ${JSON.stringify(afterOrdinary.preview.records)}`);
await page.screenshot({ path: resolve(OUT, "1-ordinary-saved.png") });

say("");
say("--- 2. the SAME slot, in candidate mode, changed and saved ---");
await enter(page, true);
const candidate = await arrange(page, {
  ambition: "Candidate ambition, written in the art preview.",
});
say(`  person        ${candidate.personId}`);
say(`  wardrobe      ${candidate.chosen ?? "(nothing offered)"}`);
say(`  saved         ${await saveThroughNavigation(page)}`);
await page.screenshot({ path: resolve(OUT, "2-candidate-saved.png") });

say("");
say("--- 3. back to the ordinary save ---");
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.getByTestId("title-screen").waitFor({ timeout: 20000 });
await page.getByTestId("open-saves").click({ timeout: 5000 });
await page.getByTestId("saves-screen").waitFor({ timeout: 10000 });
const entries = await page.getByTestId("save-entry").count();
say(`  saved games   ${entries}`);
if (entries > 0) {
  await page
    .getByTestId("save-entry")
    .first()
    .locator("button")
    .first()
    .click();
  await page.getByTestId("play-screen").waitFor({ timeout: 20000 });
  await page.waitForTimeout(2000);
}
const final = await readBothStores(page);
say(`  ordinary db   ${JSON.stringify(final.ordinary.records)}`);
say(`  preview db    ${JSON.stringify(final.preview.records)}`);
await page.screenshot({ path: resolve(OUT, "3-ordinary-reopened.png") });

say("");
say("--- verdict ---");
const before = JSON.stringify(afterOrdinary.ordinary.records);
const after = JSON.stringify(final.ordinary.records);
say(`  ordinary records unchanged by the preview: ${before === after}`);
say(
  `  preview kept its own records:              ${final.preview.records.length > 0}`,
);
if (before !== after) {
  say(`  BEFORE ${before}`);
  say(`  AFTER  ${after}`);
}

await context.close();
await browser.close();
writeFileSync(resolve(OUT, "isolation.txt"), `${report.join("\n")}\n`);
console.log(`\nreport: ${resolve(OUT, "isolation.txt")}`);

import fs from "node:fs";
import { chromium, expect } from "@playwright/test";
import {
  enterLife,
  openElsewhere,
  saveLife,
} from "../../tests/e2e/support/creator";
const out =
  process.env.MODULAR_PROOF_OUT ?? "/private/tmp/modular47-historical";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 860 },
});
const page = await context.newPage();
page.setDefaultTimeout(30000);
const report: Record<string, unknown> = {
  kind: "generation-14 regression save fixture; no owner save modified",
  errors: [],
};
page.on("pageerror", (error) =>
  (report.errors as string[]).push(error.message),
);
try {
  await page.goto("http://127.0.0.1:5488/?art-preview=candidate", {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  const fixture = await page.evaluate(async () => {
    const gamePath = "/src/presentation/new-game.ts";
    const storePath = "/src/presentation/browser-world-repository.ts";
    const { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } = await import(
      /* @vite-ignore */ gamePath
    );
    const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
    const built = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "modular47-historical-generation14",
      startKind: "custom",
      placeKey: "kentucky",
      startAge: 30,
      depth: "summarize-earlier-life",
      givenName: "Historical",
      familyName: "Control",
      appearanceRecipeVersion: "appearance-recipe-v2",
      appearanceCatalogGeneration: 14,
      questionnaire: "skipped",
    });
    const store = new BrowserSaveStore({
      databaseName: "political-life-worlds-art-preview",
    });
    const saveId = store.newSaveId(built.world);
    const result = await store.save(built.world, saveId);
    return {
      saveId,
      result,
      worldId: built.world.id,
      appearances: Object.fromEntries(
        Object.entries(built.world.people).map(([id, p]) => [
          id,
          (p as { appearance: unknown }).appearance,
        ]),
      ),
    };
  });
  report.fixture = fixture;
  await page.reload();
  await page.getByTestId("continue").click();
  await page
    .getByTestId("orientation-skip")
    .waitFor({ state: "visible", timeout: 10000 })
    .then(() => page.getByTestId("orientation-skip").click())
    .catch(() => {});
  await enterLife(page);
  await expect(
    page.locator(
      '[data-material-state="loading"], [data-material-group-state="loading"]',
    ),
  ).toHaveCount(0, {
    timeout: 60000,
  });
  await expect(
    page.locator(
      '[data-material-state="unavailable"], [data-material-group-state="unavailable"]',
    ),
  ).toHaveCount(0);
  const ids = await page
    .locator('[data-testid^="scene-person-"] [data-asset-id]')
    .evaluateAll((xs) => xs.map((x) => x.getAttribute("data-asset-id")!));
  expect(ids.length).toBeGreaterThan(0);
  expect(ids.some((id) => id.startsWith("m47"))).toBe(false);
  report.roomIds = ids;
  await page.screenshot({ path: out + "/generation14-room.png" });
  await openElsewhere(page, "people");
  await expect(page.getByTestId("person-portrait").first()).toBeVisible();
  await page.screenshot({ path: out + "/generation14-people.png" });
  await saveLife(page);
  const after = await page.evaluate(async (saveId) => {
    const path = "/src/presentation/browser-world-repository.ts";
    const { BrowserSaveStore } = await import(/* @vite-ignore */ path);
    const store = new BrowserSaveStore({
      databaseName: "political-life-worlds-art-preview",
    });
    const world = await store.inspectSnapshot(saveId);
    return Object.fromEntries(
      Object.entries(world.people).map(([id, p]) => [
        id,
        (p as { appearance: unknown }).appearance,
      ]),
    );
  }, fixture.saveId);
  expect(after).toEqual(fixture.appearances);
  report.appearancesPreserved = true;
  expect(report.errors).toEqual([]);
} catch (error) {
  report.failure = String(error);
  process.exitCode = 1;
  await page.screenshot({ path: out + "/failure.png" }).catch(() => {});
  fs.writeFileSync(
    out + "/failure-dom.txt",
    await page
      .locator("body")
      .innerText()
      .catch(() => "unavailable"),
  );
} finally {
  fs.writeFileSync(out + "/report.json", JSON.stringify(report, null, 2));
  await browser.close();
}

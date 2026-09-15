import fs from "node:fs";
import { chromium } from "playwright";
import { expect } from "@playwright/test";
import { fillCreator } from "../tests/e2e/support/creator";
const out = "/private/tmp/modular41-evidence";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
page.setDefaultTimeout(120000);
const report: { cases: unknown[]; errors: string[]; error?: string } = {
  cases: [],
  errors: [],
};
page.on("pageerror", (e) => report.errors.push(e.message));
const base = process.env.PG_REVIEW_URL ?? "http://127.0.0.1:5350";
async function ready() {
  await expect(page.locator('[data-material-state="loading"]')).toHaveCount(0);
  await expect(page.locator('[data-material-state="unavailable"]')).toHaveCount(
    0,
  );
  await page
    .locator(".kit41-creator-preview img")
    .evaluateAll(async (xs: HTMLImageElement[]) =>
      Promise.all(xs.map((x) => x.decode())),
    );
}
async function apply() {
  const button = page.getByRole("button", {
    name: "Apply this outfit",
    exact: true,
  });
  if (await button.count()) await button.click();
  await ready();
}
try {
  for (const gender of ["male", "female"]) {
    await page.goto(base + "/?art-preview=candidate", {
      waitUntil: "domcontentloaded",
    });
    await fillCreator(page, {
      route: "normal",
      age: 42,
      gender,
      state: "Kentucky",
      place: "Lexington",
      givenName: "Repair",
      familyName: gender,
    });
    await ready();
    const body = page.getByRole("combobox", { name: "Body", exact: true });
    const selected = await body.inputValue();
    expect(selected).toMatch(gender === "male" ? /^ep41-masc-/ : /^ep41-fem-/);
    report.cases.push({ kind: "fresh-default", gender, selected });
    await page.screenshot({ path: out + "/final-" + gender + "-default.png" });
    const presentation = gender === "male" ? "masc" : "fem";
    for (const shape of ["average", "lean", "heavy"]) {
      const family = `${presentation}-${shape}`;
      await body.selectOption(`ep41-${family}-body`);
      await apply();
      await page
        .getByRole("combobox", { name: "Face", exact: true })
        .selectOption(`ep41-${family}-head-${shape}`);
      await apply();
      const hair = page.getByRole("combobox", {
        name: "Hairstyle",
        exact: true,
      });
      await hair.selectOption(`ep41-${family}-hair-${shape}`);
      await apply();
      for (const sleeve of ["short", "long"]) {
        await page
          .getByRole("combobox", { name: "Shirt style", exact: true })
          .selectOption(`ep41-${family}-${sleeve}-sleeve-torso`);
        await apply();
        await page
          .locator(".kit41-creator-preview")
          .screenshot({ path: `${out}/final-${family}-${sleeve}.png` });
        report.cases.push({
          family,
          sleeve,
          body: await body.inputValue(),
          head: await page
            .getByRole("combobox", { name: "Face", exact: true })
            .inputValue(),
          hair: await hair.inputValue(),
          images: await page
            .locator(".kit41-creator-preview img")
            .evaluateAll((xs: HTMLImageElement[]) =>
              xs.map((x) => ({
                src: x.getAttribute("src"),
                width: x.naturalWidth,
                height: x.naturalHeight,
              })),
            ),
        });
      }
      await hair.selectOption("");
      await ready();
      await page
        .locator(".kit41-creator-preview")
        .screenshot({ path: `${out}/final-${family}-bald.png` });
      await page
        .getByRole("combobox", { name: "Face", exact: true })
        .selectOption(
          `ep41-${family}-head-${presentation === "masc" ? "average" : "lean"}`,
        );
      await apply();
      await page
        .locator(".kit41-creator-preview")
        .screenshot({ path: `${out}/final-${family}-mature.png` });
    }
  }
  await page.setViewportSize({ width: 1200, height: 720 });
  await page.screenshot({ path: out + "/final-compact-creator.png" });
} catch (e) {
  report.error = String(e);
  await page.screenshot({ path: out + "/visual-failure.png" });
} finally {
  fs.writeFileSync(
    out + "/visual-report.json",
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  console.log({
    cases: report.cases.length,
    errors: report.errors,
    error: report.error,
  });
}

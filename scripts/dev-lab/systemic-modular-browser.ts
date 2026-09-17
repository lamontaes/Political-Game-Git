import fs from "node:fs";
import { chromium, expect } from "@playwright/test";
import {
  fillCreator,
  enterLife,
  openShellMenu,
  openElsewhere,
} from "../../tests/e2e/support/creator";
const out =
  process.env.MODULAR_PROOF_OUT ?? "/private/tmp/systemic-modular-browser";
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
page.setDefaultTimeout(25000);
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const report: Record<string, unknown> = {
  errors,
  route: "http://127.0.0.1:5487/?art-preview=candidate",
  acceptance: "candidate-unapproved",
};
try {
  await page.goto(String(report.route), {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await fillCreator(page, {
    age: 30,
    givenName: "Systemic",
    familyName: "Proof",
    state: "Iowa",
    place: "Mona",
    route: "custom",
    household: "shares-a-home",
    gender: "male",
  });
  await expect(page.getByTestId("creator-stage-appearance")).toBeVisible();
  await expect(page.locator('[data-material-state="loading"]')).toHaveCount(0, {
    timeout: 60000,
  });
  await expect(page.locator('[data-material-state="unavailable"]')).toHaveCount(
    0,
  );
  report.creatorIds = await page
    .locator("[data-asset-id]")
    .evaluateAll((xs) => xs.map((x) => x.getAttribute("data-asset-id")));
  fs.writeFileSync(
    out + "/creator-dom.txt",
    await page.locator("body").innerText(),
  );
  await page.screenshot({ path: out + "/creator.png", fullPage: true });
  const hair = page.getByTestId("person-appearance-hair-grid");
  if (await hair.count()) {
    const radios = hair.getByRole("radio");
    const n = await radios.count();
    report.hairChoices = n;
    if (n > 1) {
      await radios.nth(1).focus();
      await page.keyboard.press("Space");
      report.hairKeyboard = await radios.nth(1).isChecked();
      await radios.nth(0).locator("..").click();
      report.hairPointer = await radios.nth(0).isChecked();
    }
  }
  const stable = async () => {
    await expect(page.locator('[data-material-state="loading"]')).toHaveCount(
      0,
      { timeout: 60000 },
    );
    await expect(
      page.locator('[data-material-state="unavailable"]'),
    ).toHaveCount(0);
  };
  const pixels = async () => {
    await stable();
    return page
      .getByTestId("outfit-pending-full-body")
      .first()
      .locator("img[data-asset-id]")
      .evaluateAll(async (xs) =>
        Promise.all(
          xs.map(async (x) => {
            const im = x as HTMLImageElement;
            await im.decode();
            const bytes = await (await fetch(im.src)).arrayBuffer();
            const hash = Array.from(
              new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
            )
              .map((x) => x.toString(16).padStart(2, "0"))
              .join("");
            return { id: im.dataset.assetId!, hash };
          }),
        ),
      );
  };
  await hair.getByRole("radio").nth(1).locator("..").click();
  const beforeSkin = await pixels();
  expect(beforeSkin.length).toBeGreaterThan(4);
  const skin = page.getByTestId("appearance-skin-swatches").getByRole("radio");
  const skinPointerIndex = (await skin.nth(6).isChecked()) ? 0 : 6;
  await skin.nth(skinPointerIndex).locator("..").click();
  expect(await skin.nth(skinPointerIndex).isChecked()).toBe(true);
  const darkSkin = await pixels();
  report.skinPointer = true;
  await page.screenshot({ path: out + "/creator-dark.png", fullPage: true });
  await skin.nth(0).focus();
  await page.keyboard.press("Space");
  expect(await skin.nth(0).isChecked()).toBe(true);
  report.skinKeyboard = true;
  const hairColor = page.getByRole("combobox", {
    name: "Hair color",
    exact: true,
  });
  await hairColor.click();
  await page.getByRole("option", { name: "Black", exact: true }).click();
  const black = await pixels();
  await hairColor.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  const changed = await pixels();
  report.materialPixels = { beforeSkin, darkSkin, black, changed };
  const headHash = (xs: typeof black) =>
    xs.find((x) => x.id.includes("-head-"))?.hash;
  const hairHash = (xs: typeof black) =>
    xs.find((x) => x.id.includes("-hair-"))?.hash;
  expect(headHash(beforeSkin)).not.toBe(headHash(darkSkin));
  expect(headHash(black)).toBe(headHash(changed));
  expect(hairHash(black)).not.toBe(hairHash(changed));
  report.independentMaterialPixels = true;
  const body = page.getByRole("combobox", { name: "Body", exact: true });
  const beforeBody = await pixels();
  await body.click();
  const choice = await page
    .getByRole("option")
    .evaluateAll(
      (xs) =>
        xs.find(
          (x) =>
            x.getAttribute("aria-disabled") !== "true" &&
            x.getAttribute("aria-selected") !== "true",
        )?.textContent,
    );
  expect(choice).toBeTruthy();
  await page.getByRole("option", { name: choice!, exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(await pixels()).toEqual(beforeBody);
  report.bodyCancel = true;
  await body.click();
  await page.getByRole("option", { name: choice!, exact: true }).click();
  await page
    .getByRole("button", { name: "Apply this outfit", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  expect(await pixels()).not.toEqual(beforeBody);
  report.bodyApplyKeyboard = true;
  await page.getByTestId("begin").focus();
  await page.keyboard.press("Enter");
  await page
    .getByTestId("orientation-skip")
    .waitFor({ state: "visible", timeout: 10000 })
    .then(() => page.getByTestId("orientation-skip").click())
    .catch(() => {});
  await enterLife(page);
  await page.screenshot({ path: out + "/room.png" });
  report.room = true;
  await openShellMenu(page);
  const keep = page.getByTestId("keep-world");
  if (await keep.count()) await keep.click();
  else await page.getByTestId("save-world").click();
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  report.disposableSave = true;
  await page.reload();
  await page.getByTestId("continue").click();
  await page
    .getByTestId("orientation-skip")
    .waitFor({ state: "visible", timeout: 10000 })
    .then(() => page.getByTestId("orientation-skip").click())
    .catch(() => {});
  await enterLife(page);
  report.reloaded = true;
  await expect(page.locator('[data-material-state="unavailable"]')).toHaveCount(
    0,
  );
  await page.screenshot({ path: out + "/reload.png" });
  await openElsewhere(page, "people");
  await stable();
  expect(await page.getByTestId("person-portrait").count()).toBeGreaterThan(0);
  await page.screenshot({ path: out + "/people.png" });
  report.peoplePortraits = true;
} catch (e) {
  report.failure = String(e);
  fs.writeFileSync(
    out + "/failure-dom.txt",
    await page
      .locator("body")
      .innerText()
      .catch(() => "unavailable"),
  );
  await page.screenshot({ path: out + "/failure.png" }).catch(() => {});
  process.exitCode = 1;
} finally {
  fs.writeFileSync(out + "/report.json", JSON.stringify(report, null, 2));
  await browser.close();
}

/* eslint-disable @typescript-eslint/no-explicit-any -- browser evidence serializes measured DOM and decoded layers. */
import fs from "node:fs";
import { chromium, expect, type Locator } from "@playwright/test";
import {
  fillCreator,
  enterLife,
  openShellMenu,
  goTo,
} from "../../tests/e2e/support/creator";
const out = "/private/tmp/kit41-delivery/evidence";
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
page.setDefaultTimeout(20000);
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const report: any = { errors, matrix: [], base: "http://127.0.0.1:5294" };
async function drawn(locator: Locator) {
  await expect(locator.locator("img").first()).toBeVisible();
  await expect(locator.locator('[data-material-state="loading"]')).toHaveCount(
    0,
  );
  await expect(
    locator.locator('[data-material-state="unavailable"]'),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      locator
        .locator("img")
        .evaluateAll((xs) =>
          xs.every(
            (im) =>
              (im as HTMLImageElement).complete &&
              (im as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  return locator.locator("img[data-asset-id]").evaluateAll(async (imgs) =>
    Promise.all(
      imgs.map(async (el) => {
        const im = el as HTMLImageElement;
        const svg = await (await fetch(im.src)).text();
        const hash = [
          ...new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(svg),
            ),
          ),
        ]
          .map((n) => n.toString(16).padStart(2, "0"))
          .join("");
        return { id: im.dataset.assetId, kind: im.dataset.kind, hash };
      }),
    ),
  );
}
async function approve() {
  const dialog = page.getByTestId("outfit-replacement-preview");
  if (await dialog.count()) {
    await dialog
      .getByRole("button", { name: "Apply this outfit", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
  }
}
async function wardrobe() {
  await openShellMenu(page);
  await page.getByTestId("nav-group-personal").click();
  await page.getByTestId("nav-personal").click();
  await page.getByTestId("personal-appearance").click();
  await page
    .getByTestId("saved-appearance-controls")
    .locator("summary")
    .first()
    .click();
}
try {
  await page.goto(report.base + "/?art-preview=candidate");
  await fillCreator(page, {
    age: 34,
    givenName: "Morgan",
    familyName: "Kit",
    state: "Kentucky",
    place: "Lexington",
    household: "shares-a-home",
    gender: "male",
  });
  const creator = page.getByTestId("creator-stage-appearance");
  await expect(creator).toBeVisible();
  const body = page.getByRole("combobox", { name: "Body", exact: true });
  const bodies = await body
    .locator("option:not([disabled])")
    .evaluateAll((xs) => xs.map((x) => (x as HTMLOptionElement).value));
  expect(bodies).toHaveLength(6);
  for (const value of bodies) {
    await body.selectOption(value);
    await approve();
    const face = page.getByRole("combobox", { name: "Face", exact: true });
    const heads = await face
      .locator("option:not([disabled])")
      .evaluateAll((xs) => xs.map((x) => (x as HTMLOptionElement).value));
    expect(heads).toHaveLength(3);
    for (const head of heads) {
      await face.selectOption(head);
      await approve();
      await drawn(creator.getByTestId("person-portrait"));
    }
    const shirt = page.getByRole("combobox", {
      name: "Shirt style",
      exact: true,
    });
    const shirts = await shirt
      .locator("option")
      .evaluateAll((xs) =>
        xs.map((x) => (x as HTMLOptionElement).value).filter(Boolean),
      );
    for (const top of shirts) {
      await shirt.selectOption(top);
      await drawn(creator.getByTestId("outfit-pending-full-body"));
    }
    const full = await drawn(creator.getByTestId("outfit-pending-full-body"));
    const portrait = await drawn(creator.getByTestId("person-portrait"));
    expect(portrait.find((x: any) => x.kind === "head")).toEqual(
      full.find((x: any) => x.kind === "head"),
    );
    await creator.scrollIntoViewIfNeeded();
    await page.screenshot({ path: out + `/matrix-${value}.png` });
    report.matrix.push({ body: value, heads, shirts, full, portrait });
  }
  // Explicit imported shoes on their real compatible body.
  await body.selectOption("ep41-masc-average-body");
  await approve();
  await page
    .getByRole("combobox", { name: "Shoes", exact: true })
    .selectOption("kit41-external-shoes-v1");
  await page
    .getByRole("combobox", { name: "Hairstyle", exact: true })
    .selectOption("");
  report.preview = await drawn(creator.getByTestId("outfit-pending-full-body"));
  report.playerId = await creator
    .getByTestId("outfit-pending-full-body")
    .getAttribute("data-person-id");
  // Body proposal cancel and keyboard activation preserve the selected recipe.
  await body.selectOption("ep41-fem-heavy-body");
  await page
    .getByTestId("outfit-replacement-preview")
    .getByRole("button", { name: "Cancel", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  expect(await drawn(creator.getByTestId("outfit-pending-full-body"))).toEqual(
    report.preview,
  );
  await page.screenshot({ path: out + "/creator-final.png" });
  await page.getByTestId("begin").focus();
  await page.keyboard.press("Enter");
  await enterLife(page);
  await wardrobe();
  report.begun = await drawn(page.getByTestId("wardrobe-full-body"));
  expect(report.begun).toEqual(report.preview);
  await page.screenshot({ path: out + "/personal-after-begin.png" });
  await openShellMenu(page);
  const keep = page.getByTestId("keep-world");
  if (await keep.count()) await keep.click();
  else await page.getByTestId("save-world").click();
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
  await goTo(page, "elsewhere-people");
  await page.getByTestId("people-view-web").click();
  const node = page.getByTestId(`people-web-node-${report.playerId}`);
  await expect(node).toBeVisible();
  report.web = await drawn(node);
  expect(report.web.find((x: any) => x.kind === "head")).toEqual(
    report.preview.find((x: any) => x.kind === "head"),
  );
  // A physical click in the painted face, not an artificial event dispatch.
  const faceBox = await node.locator("foreignObject").boundingBox();
  expect(faceBox).toBeTruthy();
  await page.mouse.click(
    faceBox!.x + faceBox!.width / 2,
    faceBox!.y + faceBox!.height / 2,
  );
  const card = page.getByTestId("quick-dossier");
  await expect(card).toHaveCount(1);
  await expect(card).toHaveAttribute("data-person-id", report.playerId);
  report.card = await drawn(card.getByTestId("person-portrait").first());
  for (const key of ["Enter", "Space"]) {
    await node.locator("circle").focus();
    await page.keyboard.press(key);
    await expect(card).toHaveCount(1);
    await expect(card).toHaveAttribute("data-person-id", report.playerId);
  }
  await card.getByTestId("quick-dossier-pin").click();
  const pin = page.getByTestId(`pin-person:${report.playerId}`);
  report.pin = await drawn(pin);
  expect(report.pin).toEqual(report.web);
  await page.screenshot({ path: out + "/people-web-card-pin.png" });
  await page.getByTestId("people-view-list").click();
  const row = page.getByTestId(`people-person-${report.playerId}`);
  if (await row.count()) report.list = await drawn(row);
  await page.screenshot({ path: out + "/people-list.png" });
  await page.goto(report.base + "/?art-preview=candidate");
  await page.getByTestId("open-saves").click();
  await page
    .getByTestId("save-entry")
    .filter({ hasText: "Morgan Kit" })
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await enterLife(page);
  await wardrobe();
  report.reopened = await drawn(page.getByTestId("wardrobe-full-body"));
  expect(report.reopened).toEqual(report.preview);
  await page.screenshot({ path: out + "/save-reopened.png" });
  await context.storageState({
    path: out + "/browser-state.json",
    indexedDB: true,
  });
  report.success = true;
} catch (e) {
  report.success = false;
  report.error = String(e);
  report.stack = (e as Error).stack;
  report.visibleText = await page.locator("body").innerText();
  await page.screenshot({ path: out + "/failure.png" });
  process.exitCode = 1;
} finally {
  fs.writeFileSync(out + "/report.json", JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      success: report.success,
      error: report.error,
      matrix: report.matrix.length,
      errors,
    }),
  );
  await browser.close();
}

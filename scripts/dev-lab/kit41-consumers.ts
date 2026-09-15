/* eslint-disable @typescript-eslint/no-explicit-any -- measured browser evidence. */
import fs from "node:fs";
import { chromium, expect, type Locator } from "@playwright/test";
import { enterLife, goTo } from "../../tests/e2e/support/creator";
const out = "/private/tmp/kit41-delivery/evidence";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const context = await browser.newContext({
  storageState: out + "/browser-state.json",
  viewport: { width: 1280, height: 860 },
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
const report: any = { errors: [] };
page.on("pageerror", (e) => report.errors.push(e.message));
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
            (x) =>
              (x as HTMLImageElement).complete &&
              (x as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  return locator.locator("img[data-asset-id]").evaluateAll(async (xs) =>
    Promise.all(
      xs.map(async (x) => {
        const im = x as HTMLImageElement;
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
try {
  await page.goto("http://127.0.0.1:5294/?art-preview=candidate");
  await page.getByTestId("open-saves").click();
  await page
    .getByTestId("save-entry")
    .filter({ hasText: "Morgan Kit" })
    .getByRole("button", { name: "Open", exact: true })
    .click();
  await enterLife(page);
  const back = page.getByRole("button", {
    name: "Return to your day",
    exact: true,
  });
  if (await back.count()) await back.click();
  const npc = page.locator('[data-testid^="scene-person-"]').first();
  await expect(npc).toBeVisible();
  report.npcId = (await npc.getAttribute("data-testid"))!.replace(
    "scene-person-",
    "",
  );
  report.room = await drawn(npc);
  report.roomBox = await npc.boundingBox();
  await page.screenshot({ path: out + "/room.png" });
  await npc.click();
  const talk = page.getByTestId("dossier-talk");
  await talk.focus();
  await page.keyboard.press("Enter");
  const portrait = page
    .getByTestId(`talk-face-${report.npcId}`)
    .getByTestId("person-portrait");
  report.talk = await drawn(portrait);
  report.portraitBox = await portrait
    .locator(".person-portrait-mark")
    .boundingBox();
  expect(report.talk.find((x: any) => x.kind === "head")).toEqual(
    report.room.find((x: any) => x.kind === "head"),
  );
  await page.screenshot({ path: out + "/room-conversation.png" });
  await page.getByTestId("talk-back").click();
  await goTo(page, "elsewhere-people");
  await page.getByTestId("people-view-list").click();
  const row = page.getByTestId(`people-person-${report.npcId}`);
  report.list = await drawn(row);
  expect(report.list.find((x: any) => x.kind === "head")).toEqual(
    report.talk.find((x: any) => x.kind === "head"),
  );
  await row.click();
  const card = page.getByTestId("quick-dossier");
  await expect(card).toHaveCount(1);
  report.card = await drawn(card.getByTestId("person-portrait").first());
  expect(report.card).toEqual(report.list);
  await page.screenshot({ path: out + "/npc-list-card.png" });
  await page.getByTestId("people-view-web").click();
  const node = page.getByTestId(`people-web-node-${report.npcId}`);
  report.web = await drawn(node);
  expect(report.web).toEqual(report.list);
  const pinButton = card.getByTestId("quick-dossier-pin");
  if ((await pinButton.getAttribute("aria-pressed")) !== "true")
    await pinButton.click();
  report.pin = await drawn(page.getByTestId(`pin-person:${report.npcId}`));
  expect(report.pin).toEqual(report.list);
  await page.screenshot({ path: out + "/npc-web-card-pin.png" });
  report.success = true;
} catch (e) {
  report.success = false;
  report.error = String(e);
  report.text = await page.locator("body").innerText();
  await page.screenshot({ path: out + "/consumers-failure.png" });
  process.exitCode = 1;
} finally {
  fs.writeFileSync(out + "/consumers.json", JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      success: report.success,
      error: report.error,
      errors: report.errors,
    }),
  );
  await browser.close();
}

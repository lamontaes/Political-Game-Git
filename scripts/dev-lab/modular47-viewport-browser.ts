import fs from "node:fs";
import { chromium, expect } from "@playwright/test";
import { fillCreator } from "../../tests/e2e/support/creator";
const out = process.env.MODULAR_PROOF_OUT ?? "/private/tmp/modular47-viewport";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();
const report: Record<string, unknown> = { errors: [], viewports: [] };
page.on("pageerror", (e) => (report.errors as string[]).push(e.message));
try {
  await page.goto("http://127.0.0.1:5487/?art-preview=candidate", {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await fillCreator(page, {
    age: 30,
    givenName: "Viewport",
    familyName: "Proof",
    state: "Iowa",
    place: "Mona",
    route: "custom",
    household: "shares-a-home",
    gender: "female",
  });
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.locator('[data-material-state="loading"]')).toHaveCount(
      0,
      { timeout: 60000 },
    );
    await expect(
      page.locator('[data-material-state="unavailable"]'),
    ).toHaveCount(0);
    const stage = page.locator(".wardrobe-figure-stage").first();
    const box = await stage.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    await expect(page.getByTestId("begin")).toBeVisible();
    (report.viewports as unknown[]).push({ ...viewport, stage: box });
    await page.screenshot({ path: `${out}/creator-${viewport.width}.png` });
  }
  await page.goto("http://127.0.0.1:5487/art-desk.html", {
    timeout: 60000,
    waitUntil: "domcontentloaded",
  });
  await page
    .getByRole("textbox", { name: "Search requests" })
    .fill("modular47");
  await page
    .getByTestId("art-desk-row-person-modular47-masc-lean-standing-anatomy")
    .click();
  await expect(page.getByTestId("art-desk-candidate-preview")).toBeVisible();
  await expect(
    page.getByText("Authorized private pack path supplied to this worktree."),
  ).toBeVisible();
  expect(await page.locator("body").innerText()).not.toContain("not handed");
  await page.screenshot({ path: out + "/art-desk-installed.png" });
  report.artDeskInputEvidence = true;
  expect(report.errors).toEqual([]);
} catch (e) {
  report.failure = String(e);
  process.exitCode = 1;
  await page.screenshot({ path: out + "/failure.png" }).catch(() => {});
} finally {
  fs.writeFileSync(out + "/report.json", JSON.stringify(report, null, 2));
  await browser.close();
}

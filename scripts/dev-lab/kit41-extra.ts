import fs from "node:fs";
import { chromium, expect } from "@playwright/test";
import { fillCreator } from "../../tests/e2e/support/creator";
const out =
  process.env.KIT41_EVIDENCE ?? "/private/tmp/kit41-delivery/evidence";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1200, height: 720 } });
const report: Record<string, unknown> = {};
try {
  await page.goto("http://127.0.0.1:5294/?art-preview=candidate");
  await fillCreator(page, {
    age: 34,
    givenName: "Quinn",
    familyName: "Kit",
    state: "Kentucky",
    place: "Lexington",
    gender: "female",
    calibration: "short",
  });
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("questionnaire-screen")).toBeVisible();
  await page
    .getByTestId("questionnaire-options")
    .getByRole("button")
    .first()
    .click();
  await page.getByTestId("questionnaire-finish").click();
  const creator = page.getByTestId("creator-stage-appearance");
  await expect(creator).toBeVisible();
  await expect(page.getByTestId("play-screen")).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Randomize appearance · preview",
      exact: true,
    })
    .click();
  const dialog = page.getByTestId("outfit-replacement-preview");
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Apply this outfit", exact: true })
    .click();
  await expect(creator.locator('[data-material-state="loading"]')).toHaveCount(
    0,
  );
  await expect(
    creator.locator('[data-material-state="unavailable"]'),
  ).toHaveCount(0);
  await creator
    .getByTestId("outfit-pending-full-body")
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: out + "/creator-1200-questionnaire-randomize.png",
  });
  report.questionnaireReturnsToAppearance = true;
  report.allRandomizeProposal = true;
  await page.getByTestId("begin").focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("play-screen")).toBeVisible();
  report.keyboardBegin = true;
  await page.goto("http://127.0.0.1:5294/?art-preview=candidate");
  await fillCreator(page, {
    age: 8,
    givenName: "Child",
    familyName: "Kit",
    state: "Kentucky",
    place: "Lexington",
    gender: "male",
    childhood: true,
  });
  await expect(page.getByTestId("creator-stage-appearance")).toContainText(
    "no supported portrait artwork",
  );
  await expect(page.getByTestId("begin")).toBeEnabled();
  await page.screenshot({ path: out + "/creator-child-unsupported.png" });
  report.childRefusal = true;
  report.success = true;
} catch (e) {
  report.error = String(e);
  report.success = false;
  report.text = await page.locator("body").innerText();
  process.exitCode = 1;
} finally {
  fs.writeFileSync(out + "/extra.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
  await browser.close();
}

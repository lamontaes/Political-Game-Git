import { test, expect, type Page } from "./fixtures";
import type { TestInfo } from "@playwright/test";
import {
  startLife,
  enterLife,
  openElsewhere,
  saveLife,
} from "./support/creator";
import { drawRandomPlace } from "../support/random-place";

const random = drawRandomPlace("session13-municipal-estimate-random-town");
const cases = [
  {
    place: "East Providence, Rhode Island",
    seed: "session13-east-providence-estimate",
    officeKey: "local-government-194033-chief-executive",
  },
  {
    place: random.displayName,
    seed: "session13-municipal-estimate-random-town",
    officeKey: "local-government-136030-chief-executive",
  },
];
async function capture(page: Page, name: string, info: TestInfo) {
  await page.screenshot({
    path: info.outputPath(`${name}.png`),
    fullPage: true,
  });
  await info.attach(`${name}-offered-controls`, {
    body: JSON.stringify(await page.getByRole("button").allTextContents()),
    contentType: "application/json",
  });
}
for (const row of cases) {
  test(`ordinary municipal qualification and filing: ${row.place}`, async ({
    page,
  }, info) => {
    await page.goto(`/?seed=${row.seed}`);
    await startLife(page, { age: 34, place: row.place });
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await capture(page, "01-generated-life", info);
    await enterLife(page);
    await openElsewhere(page, "campaign");
    const status = page.getByTestId(`campaign-office-status-${row.officeKey}`);
    await expect(status).toContainText(
      "estimated from similar elected offices",
    );
    await expect(status).toContainText(
      "municipality's own age rule is unconfirmed",
    );
    await status.scrollIntoViewIfNeeded();
    await capture(page, "02-office-offer", info);
    const office = page
      .getByTestId("campaign-office-browser")
      .locator(`input[value="${row.officeKey}"]`);
    await office.check();
    await expect(page.getByTestId("file-candidacy")).toBeEnabled();
    await capture(page, "03-selected-office", info);
    await page.getByTestId("file-candidacy").click();
    await expect(page.getByTestId("campaign-band")).toBeVisible();
    await page.getByTestId("campaign-band").scrollIntoViewIfNeeded();
    await capture(page, "04-filed", info);
    const band = await page.getByTestId("campaign-band").textContent();
    await saveLife(page);
    await page.reload();
    await expect(page.getByTestId("continue")).toBeEnabled();
    await page.getByTestId("continue").click();
    await enterLife(page);
    await openElsewhere(page, "campaign");
    await expect(page.getByTestId("campaign-band")).toHaveText(band!);
    await capture(page, "05-reloaded", info);
  });
}

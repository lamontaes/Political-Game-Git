import { test, expect, type Page } from "./fixtures";
import type { TestInfo } from "@playwright/test";
import {
  startLife,
  enterLife,
  openElsewhere,
  saveLife,
} from "./support/creator";
import { drawRandomPlace } from "../support/random-place";
import { attendFilingCounter, fileAtCounter } from "./support/campaign";

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
    // A city seat is filed at the city's counter (owner, October 8, 2026).
    // Its age rule is the estimated one until the municipality's own is
    // read, and the counter says so when asked.
    await attendFilingCounter(page, row.officeKey);
    await page.getByTestId("clerk-filing-continue").click();
    await expect(
      page
        .getByTestId("clerk-filing-turn")
        .first()
        .getByTestId(`clerk-filing-answer-${row.officeKey}`),
    ).toContainText("(estimated)");
    await capture(page, "02-office-offer", info);
    expect(await fileAtCounter(page, row.officeKey, undefined, true)).toBe(
      true,
    );
    await capture(page, "03-selected-office", info);
    await openElsewhere(page, "campaign");
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

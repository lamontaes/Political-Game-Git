import { expect, test } from "./fixtures";
import { goTo, saveLife } from "./support/creator";
import {
  enterRecordedMemberTerm,
  expectRecordedMember,
  readSavedLegislativeWorld as savedWorld,
} from "./support/legislative-entry";

/**
 * A story about a bill links to the bill's own page, where what the bill did,
 * once law, is written. The member files a bill through the ordinary drafting
 * table; the paper prints the filing; the player opens the bill from the
 * story. Reading the paper and the bill spends no time and writes nothing.
 */
test("a news story about a bill opens the bill's page", async ({ page }) => {
  await enterRecordedMemberTerm(page);
  await page.getByTestId("open-drafting-table").click();
  await page.locator('[data-testid^="drafting-option-"]').first().click();
  // A bill that funds a program names the program it funds.
  const program = page.locator('[data-testid^="drafting-authority-"]').first();
  if ((await program.count()) > 0) await program.click();
  await page.getByTestId("file-the-draft").press("Enter");
  await expect(page.getByTestId("docket-bill")).toBeVisible();
  await saveLife(page);
  const filed = await savedWorld(page);
  const { measure } = expectRecordedMember(filed);

  await goTo(page, "nav-news");
  await expect(page.getByTestId("news-front-page")).toBeVisible();
  const link = page.getByTestId(`news-story-law-${measure.id}`).first();
  await expect(link).toHaveText(
    `${measure.shortTitle} (${measure.designation})`,
  );
  await link.click();
  await expect(page.getByTestId("measure-workspace")).toContainText(
    measure.shortTitle,
  );

  expect(await savedWorld(page)).toEqual(filed);
});

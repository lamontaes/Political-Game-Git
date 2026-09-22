import { expect, test } from "./fixtures";
import { enterLife, goTo } from "./support/creator";

/**
 * Putting your name in for a seat that is filled by district.
 *
 * The office browser offers an Alaska House seat to somebody who has lived in
 * Sitka long enough for it. Pressing the button used to be refused, because a
 * filing for a district seat has to name which numbered district it is for and
 * the screen that produces one was imported nowhere. This walks the route with
 * a pointer: choose the office, see the district the world recorded, put your
 * name in, and land in a campaign.
 */
test("a district seat is filed for through the district screen", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("new-game")).toBeVisible();
  await page.evaluate(async () => {
    const fixturePath = "/tests/fixtures/settled-district-life.ts";
    const storePath = "/src/presentation/browser-world-repository.ts";
    const { settledDistrictLife } = await import(
      /* @vite-ignore */ fixturePath
    );
    const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
    const { world } = settledDistrictLife("US-AK", "Sitka", 700);
    const store = new BrowserSaveStore();
    const saved = await store.save(world, store.newSaveId(world));
    if (saved.status !== "saved")
      throw new Error(`Settled-life fixture refused: ${saved.status}`);
  });
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await goTo(page, "elsewhere-campaign");

  const house = page
    .getByTestId("campaign-office-browser")
    .locator('input[value="us-ak-legislature-v1:house"]');
  await house.press("Space");
  await expect(house).toBeChecked();

  // The district screen appears with the office, and the filing button waits
  // for it rather than being pressed into a refusal.
  await expect(page.getByTestId("district-residence-panel")).toBeVisible();
  await expect(page.getByTestId("district-residence-recorded")).toBeVisible();
  await expect(page.getByTestId("file-candidacy")).toBeEnabled();
  await page.getByTestId("file-candidacy").click();

  await expect(page.getByTestId("campaign-fundraising")).toBeVisible();
});

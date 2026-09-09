import { test, expect } from "./fixtures";
import { startLife, enterLife, saveLife } from "./support/creator";

test("current normal scene and saved-person dossier remain available for owner review", async ({
  page,
}, info) => {
  await page.goto("/?seed=ui-save5-owner-review");
  await startLife(page, { age: 34, household: "shares-a-home" });
  await enterLife(page);
  await saveLife(page);
  await page.getByTestId("shell-nav-cluster").click();
  await page.screenshot({
    path: info.outputPath("normal-scene.png"),
    fullPage: true,
  });
  await page.locator('[data-testid^="rail-person-"]').first().click();
  await page.getByTestId("action-inspect").click();
  await page.getByTestId("quick-dossier-full").click();
  const controls = page.getByTestId("saved-appearance-controls");
  await controls.locator("summary").focus();
  await controls.locator("summary").press("Enter");
  await expect(controls).toHaveAttribute("open", "");
  await expect(page.getByTestId("person-portrait")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("normal-dossier-wardrobe.png"),
    fullPage: true,
  });
});

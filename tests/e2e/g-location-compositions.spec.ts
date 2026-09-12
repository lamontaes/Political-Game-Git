import { test, expect } from "./fixtures";

test.use({ video: "on" });
import { startLife, enterLife, openElsewhere } from "./support/creator";

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1200, height: 720 },
]) {
  test(`candidate compositions activate by pointer and keyboard at ${viewport.width}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport);
    await page.goto("/?view=location-review");
    for (const label of ["Storefront", "Pavilion", "Press room"]) {
      const button = page.getByRole("button", { name: label, exact: true });
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByTestId("scene-backdrop")).toHaveAttribute(
        "data-has-plate",
        "true",
      );
      const figures = page
        .getByTestId("scene-people")
        .locator('button[data-testid^="scene-person-"]');
      await expect(figures).toHaveCount(2);
      await expect(figures.first()).toHaveAttribute("data-has-art", "true");
      await figures.first().click();
      await expect(page.getByTestId("location-dialogue-sample")).toBeVisible();
      await page
        .getByRole("button", { name: "Back to room", exact: true })
        .click();
      await expect(page.getByTestId("location-dialogue-sample")).toHaveCount(0);
      await figures.first().focus();
      await figures.first().press("Enter");
      await expect(page.getByTestId("location-dialogue-sample")).toBeVisible();
      const sample = await page
        .getByTestId("location-dialogue-sample")
        .boundingBox();
      expect(sample).not.toBeNull();
      expect(sample!.y + sample!.height).toBeLessThanOrEqual(viewport.height);
      expect(
        Math.abs(sample!.x + sample!.width / 2 - viewport.width / 2),
      ).toBeLessThan(2);
      await page.screenshot({
        path: info.outputPath(
          `${label.toLowerCase().replace(" ", "-")}-${viewport.width}.png`,
        ),
      });
      await page
        .getByRole("button", { name: "Back to room", exact: true })
        .focus();
      await page.keyboard.press("Space");
      await expect(page.getByTestId("location-dialogue-sample")).toHaveCount(0);
    }
  });
}

test("ordinary campaign action paints the storefront only in isolated candidate mode", async ({
  page,
}, info) => {
  await page.goto("/?art-preview=candidate&seed=g-storefront-route-v1");
  await startLife(page, {
    age: 34,
    route: "custom",
    statewide: true,
    place: "Kentucky",
    household: "shares-a-home",
  });
  await enterLife(page);
  await openElsewhere(page, "work");
  await expect(page.getByTestId("file-candidacy")).toBeVisible();
  await page.getByTestId("file-candidacy").click();
  await expect(page.getByTestId("campaign-fundraising")).toBeEnabled();
  await page.getByTestId("campaign-fundraising").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("play-screen")).toHaveAttribute(
    "data-scene-id",
    "campaign-storefront-production",
  );
  await page
    .getByRole("region", { name: "Work", exact: true })
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(page.getByTestId("scene-backdrop")).toHaveAttribute(
    "data-has-plate",
    "true",
  );
  await expect(page.getByTestId("art-preview-banner")).toBeVisible();
  // The canonical producer lists the player alone; household people must not teleport.
  await expect(page.getByTestId("scene-people")).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("storefront-normal-action.png"),
  });
});

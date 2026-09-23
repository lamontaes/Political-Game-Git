import { expect, test } from "./fixtures";

/**
 * A resident of Grand Island, Nebraska starts a recall petition against a
 * neighbor who sits on the council, and the panel shows it circulating. In
 * Indiana, whose law gives towns no recall, the panel says so and offers
 * nothing to press.
 */
test.describe("recall panel", () => {
  test("a resident starts a recall petition against a council member", async ({
    page,
  }) => {
    await page.goto(
      "/tests/browser/municipal.html?place=3119595&role=neighbor-member",
    );
    const panel = page.getByTestId("municipal-recall");
    await expect(panel).toContainText("A petition circulates for 30 days.");
    const sequence = await page.getByTestId("sequence").textContent();
    const start = panel.getByRole("button", {
      name: "Start a recall petition",
    });
    await expect(start).toHaveCount(1);
    await start.click();
    await expect(panel).toContainText("a recall petition is circulating until");
    await expect(panel).toContainText(
      "A recall petition against this official is already under way.",
    );
    await expect(start).toHaveCount(0);
    await expect(page.getByTestId("sequence")).not.toHaveText(sequence!);
  });

  test("a town whose state gives no recall says so", async ({ page }) => {
    await page.goto(
      "/tests/browser/municipal.html?place=1805860&role=neighbor-member",
    );
    const panel = page.getByTestId("municipal-recall");
    await expect(panel).toContainText("Indiana law gives towns no recall.");
    await expect(panel.getByRole("button")).toHaveCount(0);
  });
});

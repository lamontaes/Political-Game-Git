import { expect, test } from "./fixtures";

import { enterLife, goTo, startLife } from "./support/creator";

/*
 * Claude CTO, 8:00 a.m., September 29, 2026: a law's effect is readable
 * wherever the player looks, the ledger included. Money and property says
 * what new laws did to money. A new life opens it before any law has passed,
 * so it says no new law has reached anyone's money yet; the unit test and the
 * watched run show the lines once one has. Reading it passes no time.
 */
test("Money and property says what new laws did to money, and passes no time", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await startLife(page, { place: "Santa Fe", state: "New Mexico", age: 44 });
  await enterLife(page);
  const when = await page.getByTestId("story-when").textContent();

  await goTo(page, "nav-finances");
  const panel = page.getByTestId("money-laws");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("heading", { level: 3 })).toHaveText(
    "What new laws did to money",
  );
  await expect(panel.getByTestId("money-laws-none")).toHaveText(
    /^No new law has reached anyone's money in .+ yet\.$/,
  );
  await expect(page.getByTestId("story-when")).toHaveText(when ?? "");
});

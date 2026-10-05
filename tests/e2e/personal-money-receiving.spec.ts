import { expect, test } from "./fixtures";
import { enterLife, goTo, startLife } from "./support/creator";
import { drawRandomPlace } from "../support/random-place";

test("ordinary Money keeps personal funds separate from diagnostic context", async ({
  page,
}) => {
  test.setTimeout(240_000);
  const place = drawRandomPlace(
    "team8-money-receiving-20261004",
    (p) => p.scope === "locality",
  );
  test
    .info()
    .annotations.push({ type: "random-place", description: place.displayName });
  await page.goto("/");
  await startLife(page, {
    place: place.displayName,
    age: 34,
    household: "shares-a-home",
  });
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 180_000,
  });
  await enterLife(page);
  const when = await page.getByTestId("story-when").textContent();
  await goTo(page, "nav-finances");
  const purses = page.getByTestId("personal-purses");
  await expect(purses.locator('[data-purse="personal"]')).toHaveCount(1);
  await expect(
    purses.locator('[data-purse="household"], [data-purse="committee"]'),
  ).toHaveCount(0);
  await expect(purses).not.toContainText("Nobody else can spend it");
  await expect(page.getByTestId("personal-economic-context")).toHaveCount(0);
  await expect(page.getByTestId("story-when")).toHaveText(when ?? "");
  await page.screenshot({
    path: test.info().outputPath("personal-money-only.png"),
  });
});

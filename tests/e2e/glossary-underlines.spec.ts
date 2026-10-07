import { expect, test } from "./fixtures";

import { enterLife, goTo, startLife } from "./support/creator";

/*
 * MR-16 removed the Guide's written definitions, so there is no sentence for a
 * civic word to sit in and no popover text to rest on. The Guide lists terms
 * only; opening one shows no explanation and marks no words.
 */

test("the Guide lists terms only, with no explanation text or underlined words", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await startLife(page, { place: "Peoria", state: "Illinois", age: 34 });
  await enterLife(page);

  await goTo(page, "nav-guide");
  await page.getByTestId("guide-result-veto").click();
  await expect(page.getByTestId("guide-entry-explanation")).toHaveCount(0);

  const marked = await page.evaluate(() => {
    const registry = (
      CSS as unknown as { highlights?: Map<string, Set<Range>> }
    ).highlights;
    return registry?.get("pg-guide-term")?.size ?? 0;
  });
  expect(marked).toBe(0);
  await expect(page.getByTestId("guide-result-veto-override")).toBeVisible();
});

import { expect, test } from "./fixtures";

import { drawRandomPlace } from "../support/random-place";
import { enterLife, goTo, startLife } from "./support/creator";

test.describe.configure({ timeout: 120_000 });

test("People places the directory beside the selected record", async ({
  page,
}) => {
  const place = drawRandomPlace("session36-mr5-people-layout");
  const [town, state] = place.displayName.split(", ");
  if (!town || !state)
    throw new Error(`Unexpected place: ${place.displayName}`);

  await page.setViewportSize({ width: 1440, height: 900 });
  await startLife(page, { age: 34, place: town, state });
  await enterLife(page);
  await goTo(page, "elsewhere-people");

  const layout = page.getByTestId("people-layout");
  const list = page.getByTestId("people-list");
  const dossier = page.getByTestId("people-dossier");
  await expect(layout).toBeVisible();
  await expect(list).toBeVisible();
  await expect(dossier).toBeVisible();

  const first = list.locator('[data-testid^="people-person-"]').first();
  const personId = ((await first.getAttribute("data-testid")) ?? "").replace(
    "people-person-",
    "",
  );
  const name = await first.locator("strong").textContent();
  expect(personId).not.toBe("");
  expect(name).not.toBeNull();
  await first.click();
  await expect(dossier).toHaveAttribute("data-person-id", personId);
  await expect(dossier.getByRole("heading", { level: 2 })).toHaveText(name!);

  await page.getByText("Search", { exact: true }).click();
  await page.getByTestId("people-search").fill(name!);
  await expect(first).toBeVisible();

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  }
});

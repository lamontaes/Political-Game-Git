import { expect, test } from "./fixtures";

import {
  enterLife,
  openPoliticsHub,
  saveLife,
  startLife,
} from "./support/creator";

/*
 * CRUNCH46 UI: Politics > Government > Map mounts the MAPS lane's political
 * map. A new life reaches it the ordinary way, changes the layer, finds a
 * state in the list, opens a senator's quick dossier, and finds the chosen
 * layer again after a reload. The workspace fits a 1024x768 window.
 */

test.describe.configure({ timeout: 240_000 });

test("Government Map opens, remembers its layer and opens people", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/?art-preview=candidate");
  await startLife(page, {
    state: "Nevada",
    place: "Alamo",
    age: 34,
    calibration: "skipped",
  });
  await enterLife(page);

  await openPoliticsHub(page, "nav-politics-government");
  const sub = page.getByTestId("politics-sub-map");
  await expect(sub).toBeVisible();
  await sub.click();
  await expect(sub).toHaveAttribute("aria-current", "page");
  const workspace = page.getByTestId("government-map-workspace");
  await expect(workspace).toBeVisible();
  const map = page.getByTestId("political-map");
  await expect(map).toBeVisible({ timeout: 60_000 });

  // No sideways scroll at 1024 wide.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const senate = page.getByTestId("map-mode-senate");
  await senate.click();
  await expect(senate).toHaveAttribute("aria-pressed", "true");

  const search = page.getByTestId("map-search");
  await search.fill("Nevada");
  const row = page.getByTestId("map-list-row").first();
  await expect(row).toBeVisible();
  await expect(row).toContainText("Nevada");
  await row.focus();
  await page.keyboard.press("Enter");

  const person = page.getByTestId("map-open-person").first();
  await expect(person).toBeVisible();
  const name = (await person.textContent())?.trim() ?? "";
  expect(name.length).toBeGreaterThan(0);
  await person.click();
  const card = page.getByTestId("quick-dossier");
  await expect(card).toBeVisible();
  await expect(card).toContainText(name);
  await page.keyboard.press("Escape");
  await expect(card).toBeHidden();

  // The layer is a saved preference; reopening the save restores it.
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openPoliticsHub(page, "nav-politics-government");
  await page.getByTestId("politics-sub-map").click();
  await expect(page.getByTestId("political-map")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("map-mode-senate")).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  expect(errors).toEqual([]);
});

import { expect, test } from "./fixtures";
import {
  enterLife,
  goTo,
  saveLife,
  startLife,
} from "./support/creator";

/**
 * Reproduces the pinned-government selection bug from UI9-12:
 * pin A, choose B from the dropdown, then accept external pin C.
 */
test("pinned government A, dropdown B, and external pin C all control inspection correctly", async ({
  page,
}) => {
  await page.goto("/?seed=municipal-selection11");
  await startLife(page, {
    age: 34,
    route: "custom",
    household: "lives-alone",
    place: "Lexington",
  });
  await enterLife(page);
  await goTo(page, "nav-municipal");

  const workspace = page.getByRole("region", { name: "Municipal government" });
  const homeName = await workspace.getByTestId("municipal-current-name").textContent();
  expect(homeName).toBeTruthy();

  await workspace.getByTestId("municipal-pin").click();
  await page.getByTestId("municipal-workspace-close").click();
  const pin = page.locator('[data-testid^="pin-government:"]');
  await expect(pin).toBeVisible();

  await goTo(page, "nav-municipal");
  await expect(workspace.getByTestId("municipal-current-name")).toHaveText(
    homeName!.trim(),
  );

  const select = workspace.getByTestId("municipal-government-select");
  await select.selectOption("us-nv-carson-city");
  await expect(workspace.getByTestId("municipal-current-name")).toContainText(
    "Carson City",
  );
  await expect(workspace.getByTestId("municipal-standing")).toContainText(
    "Library inspection",
  );

  await page.getByTestId("municipal-workspace-close").click();
  await pin.click();
  await expect(workspace.getByTestId("municipal-current-name")).toHaveText(
    homeName!.trim(),
  );

  await workspace.getByTestId("municipal-search").fill("Fargo");
  await select.selectOption("us-nd-fargo");
  await expect(workspace.getByTestId("municipal-current-name")).toContainText(
    "Fargo",
  );

  await workspace.getByTestId("municipal-search").fill("");
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await pin.click();
  await expect(workspace.getByTestId("municipal-current-name")).toHaveText(
    homeName!.trim(),
  );
});

test("municipal search clears and reports no matches at a narrow viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?seed=municipal-search11");
  await startLife(page, {
    age: 38,
    place: "Carson City, Nevada",
    placeScope: "locality",
    placeQuery: "Carson City",
    route: "normal",
  });
  await enterLife(page);
  await goTo(page, "nav-municipal");

  const workspace = page.getByRole("region", { name: "Municipal government" });
  await expect(workspace.getByTestId("municipal-home-context")).toBeVisible();
  await expect(workspace.getByTestId("municipal-standing")).toBeVisible();
  await expect(workspace.getByTestId("municipal-people")).toBeVisible();
  await expect(workspace.getByTestId("municipal-activities")).toBeVisible();

  const search = workspace.getByTestId("municipal-search");
  await search.fill("zzzz-no-match");
  await expect(workspace.getByTestId("municipal-search-empty")).toBeVisible();
  await search.fill("");
  await expect(workspace.getByTestId("municipal-search-empty")).toHaveCount(0);

  await search.press("Tab");
  await expect(workspace.getByTestId("municipal-government-select")).toBeFocused();
});

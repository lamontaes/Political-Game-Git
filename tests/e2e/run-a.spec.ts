import { expect, test } from "@playwright/test";

const STORAGE_KEY = "political-game:run-a:learned-concepts:v1";
const HIDDEN_CANONICAL_TEXT = "Initial synthetic diagnostic record.";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test("loads the player-facing office instead of only the diagnostic viewer", async ({
  page,
}) => {
  await expect(page.getByTestId("player-office")).toBeVisible();
  await expect(page.getByTestId("political-office-scene")).toBeVisible();
  await expect(
    page.getByText("Simulation foundation · Developer tooling"),
  ).toHaveCount(0);
  await expect(page.getByTestId("player-office")).toHaveAttribute(
    "data-simulation-date",
    "2026-01-05",
  );
});

test("opens navigation upward and keeps its single submenu dark", async ({
  page,
}) => {
  const cluster = page.getByTestId("navigation-cluster");
  await cluster.click();
  const flyout = page.getByTestId("navigation-flyout");
  await expect(flyout).toBeVisible();

  const clusterBox = await cluster.boundingBox();
  const flyoutBox = await flyout.boundingBox();
  expect(clusterBox).not.toBeNull();
  expect(flyoutBox).not.toBeNull();
  expect((flyoutBox?.y ?? 9999) + (flyoutBox?.height ?? 0)).toBeLessThan(
    clusterBox?.y ?? 0,
  );

  await page.getByRole("menuitem", { name: "Places" }).click();
  const submenu = page.getByTestId("nav-submenu");
  await expect(submenu).toBeVisible();
  const background = await submenu.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expect(background).not.toBe("rgb(255, 255, 255)");
  expect(background).not.toBe("rgba(255, 255, 255, 1)");
  await expect(page.getByTestId("player-office")).toHaveAttribute(
    "data-simulation-date",
    "2026-01-05",
  );
});

test("replaces the anchored person menu with an epistemically filtered dossier", async ({
  page,
}) => {
  const office = page.getByTestId("player-office");
  const person = page.getByTestId("scene-person");
  await person.click();
  const menu = page.getByTestId("person-action-menu");
  await expect(menu).toBeVisible();

  const personBox = await person.boundingBox();
  const menuBox = await menu.boundingBox();
  expect(personBox).not.toBeNull();
  expect(menuBox).not.toBeNull();
  expect(
    Math.abs((menuBox?.x ?? 0) + (menuBox?.width ?? 0) - (personBox?.x ?? 0)),
  ).toBeLessThan(260);

  await page.getByRole("menuitem", { name: /Inspect/ }).click();
  await expect(menu).toBeHidden();
  const dossier = page.getByTestId("quick-dossier");
  await expect(dossier).toBeVisible();
  await expect(dossier).toContainText("Andre Collins");
  await expect(dossier).toContainText("Age");
  await expect(dossier).toContainText("Hometown");
  await expect(dossier).toContainText("Uncertain read");
  await expect(dossier).toContainText("Unknown");
  await expect(dossier).toContainText("Latest meaningful interaction");
  await expect(dossier).not.toContainText(HIDDEN_CANONICAL_TEXT);
  await expect(page.locator("body")).not.toContainText(HIDDEN_CANONICAL_TEXT);
  await expect(office).toHaveAttribute("data-simulation-date", "2026-01-05");
  await expect(office).toHaveAttribute("data-action-sequence", "0");
});

test("marks civic learning explicitly and preserves the reference", async ({
  page,
}) => {
  const marker = page.getByTestId("civic-learning-marker");
  await marker.click();
  const popover = page.getByTestId("civic-learning-popover");
  await expect(popover).toBeVisible();
  await expect(popover).toContainText("does not mark it learned");
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBe('{"version":1,"concepts":[]}');

  await page.getByRole("button", { name: "Close civic reference" }).click();
  await page.reload();
  await expect(marker).toBeVisible();
  await marker.click();
  await page.getByRole("button", { name: "Mark as learned" }).click();
  await expect(marker).toBeHidden();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toContain("committee-referral");

  await page.reload();
  await expect(page.getByTestId("civic-learning-marker")).toHaveCount(0);
  await page.getByTestId("navigation-cluster").click();
  await page.getByRole("menuitem", { name: /Civic reference/ }).click();
  await expect(page.getByTestId("civic-learning-popover")).toContainText(
    "Marked learned",
  );
  await expect(page.getByTestId("player-office")).toHaveAttribute(
    "data-simulation-date",
    "2026-01-05",
  );
});

test("supports the Shift-click learning shortcut", async ({ page }) => {
  const marker = page.getByTestId("civic-learning-marker");
  await marker.click({ modifiers: ["Shift"] });
  await expect(marker).toBeHidden();
  await expect(page.getByTestId("civic-learning-popover")).toHaveCount(0);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toContain("committee-referral");
});

test("supports the core keyboard and focus path", async ({ page }) => {
  const person = page.getByTestId("scene-person");
  await person.focus();
  await page.keyboard.press("Enter");
  const inspect = page.getByRole("menuitem", { name: /Inspect/ });
  await expect(inspect).toBeFocused();
  await page.keyboard.press("Enter");
  const closeDossier = page.getByRole("button", { name: "Close dossier" });
  await expect(closeDossier).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("quick-dossier")).toHaveCount(0);

  const navigation = page.getByTestId("navigation-cluster");
  await navigation.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("navigation-flyout")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("navigation-flyout")).toHaveCount(0);

  const civicMarker = page.getByTestId("civic-learning-marker");
  await civicMarker.focus();
  await page.keyboard.press("Enter");
  const markLearned = page.getByRole("button", { name: "Mark as learned" });
  await markLearned.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("civic-learning-marker")).toHaveCount(0);
});

test("keeps manual pin sizing through other inspectorial actions", async ({
  page,
}) => {
  const personPin = page.locator('[data-pin-id="person"]');
  await expect(personPin).toHaveAttribute("data-size", "tiny");
  await personPin.click();
  await expect(personPin).toHaveAttribute("data-size", "normal");

  await page.getByTestId("scene-person").click();
  await expect(page.getByTestId("person-action-menu")).toBeVisible();
  await expect(personPin).toHaveAttribute("data-size", "normal");
  await page.keyboard.press("Escape");
  await expect(personPin).toHaveAttribute("data-size", "normal");
});

test("reproduces every named Run A fixture state by URL", async ({ page }) => {
  const expectations = [
    ["person-menu", "person-action-menu"],
    ["dossier", "quick-dossier"],
    ["civic-learning", "civic-learning-popover"],
    ["navigation", "navigation-flyout"],
    ["submenu", "nav-submenu"],
  ] as const;

  for (const [fixture, testId] of expectations) {
    await page.goto(`/?fixture=${fixture}`);
    await expect(page.getByTestId(testId)).toBeVisible();
  }

  await page.goto("/?fixture=mixed-pins");
  await expect(page.locator('[data-pin-id="briefing"]')).toHaveAttribute(
    "data-size",
    "normal",
  );
  await expect(page.locator('[data-pin-id="person"]')).toHaveAttribute(
    "data-size",
    "tiny",
  );
  await expect(page.locator('[data-pin-id="district-notes"]')).toHaveAttribute(
    "data-size",
    "expanded",
  );
});

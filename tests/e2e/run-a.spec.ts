import { expect, test, type Locator } from "@playwright/test";

const STORAGE_KEY = "political-game:run-a:learned-concepts:v1";
const HIDDEN_CANONICAL_TEXT = "Initial synthetic diagnostic record.";

async function hoverStyle(locator: Locator) {
  await locator.hover();
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      color: style.color,
    };
  });
}

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
  await expect(page.getByTestId("political-office-scene")).toHaveAttribute(
    "aria-label",
    "A quiet legislative office in Lexington, Kentucky",
  );
  await expect(page.getByTestId("navigation-cluster")).toContainText(
    "Lexington, KY · Legislative Office",
  );
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
  expect(await cluster.getAttribute("aria-controls")).toBeNull();
  await cluster.click();
  const flyout = page.getByTestId("navigation-flyout");
  await expect(flyout).toBeVisible();
  await expect(cluster).toHaveAttribute("aria-controls", "run-a-navigation");
  await expect(flyout).toHaveAttribute("id", "run-a-navigation");

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
  await cluster.click();
  await expect(flyout).toHaveCount(0);
  expect(await cluster.getAttribute("aria-controls")).toBeNull();
});

test("preserves deliberate component hover surfaces", async ({ page }) => {
  const pinStyle = await hoverStyle(page.locator('[data-pin-id="person"]'));
  expect(pinStyle.backgroundImage).toContain("linear-gradient");
  expect(pinStyle.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");

  const markerStyle = await hoverStyle(
    page.getByTestId("civic-learning-marker"),
  );
  expect(markerStyle.backgroundColor).toBe("rgb(227, 188, 97)");
  expect(markerStyle.color).toBe("rgb(17, 23, 34)");

  await page.getByTestId("civic-learning-marker").click();
  const learnedStyle = await hoverStyle(
    page.getByRole("button", { name: "Mark as learned" }),
  );
  expect(learnedStyle.backgroundColor).toBe("rgb(240, 207, 123)");
  expect(learnedStyle.color).toBe("rgb(23, 20, 14)");
  await page.getByRole("button", { name: "Close civic reference" }).click();

  await page.getByTestId("scene-person").click();
  const actionStyle = await hoverStyle(
    page.getByRole("menuitem", { name: /Inspect/ }),
  );
  expect(actionStyle.backgroundColor).toBe("rgba(197, 164, 87, 0.12)");
  expect(actionStyle.color).toBe("rgb(245, 235, 212)");
  await page.keyboard.press("Escape");

  await page.getByTestId("navigation-cluster").click();
  const navigationStyle = await hoverStyle(
    page.getByRole("menuitem", { name: "Places" }),
  );
  expect(navigationStyle.backgroundColor).toBe("rgb(32, 45, 64)");
  expect(navigationStyle.color).toBe("rgb(255, 244, 216)");
});

test("replaces the anchored person menu with an epistemically filtered dossier", async ({
  page,
}) => {
  const office = page.getByTestId("player-office");
  const person = page.getByTestId("scene-person");
  await person.click();
  const menu = page.getByTestId("person-action-menu");
  await expect(menu).toBeVisible();
  await expect(page.getByTestId("player-office")).not.toContainText(
    /quick dossier/i,
  );
  await expect(menu).toContainText("Review your notes and impressions");

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
  await expect(dossier).toContainText("Your read");
  await expect(dossier).toContainText("Born in Lexington, Kentucky");
  await expect(dossier).not.toContainText("Lexington-Fayette");
  await expect(dossier).toContainText("Established working rapport");
  await expect(dossier).toContainText("Last interaction");
  await expect(dossier).toContainText("You're not sure");
  await expect(
    dossier.locator('[data-access="inferred-uncertain"]'),
  ).toContainText("You have a useful working impression");
  await expect(
    dossier.locator('[data-access="unknown"]').filter({
      hasText: "You're not sure",
    }),
  ).toHaveCount(1);
  await expect(dossier.locator(".access-label")).toHaveCount(0);
  for (const rejectedLabel of [
    "Quick dossier",
    "What you know",
    "Office record",
    "Known directly",
    "Uncertain read",
    "Known context",
    "Recent history",
    "Latest meaningful interaction",
    "Unconfirmed priority",
    "This view reflects access and uncertainty",
  ]) {
    await expect(dossier).not.toContainText(rejectedLabel);
  }
  await expect(dossier).not.toContainText(HIDDEN_CANONICAL_TEXT);
  await expect(page.locator("body")).not.toContainText(HIDDEN_CANONICAL_TEXT);

  const officeBox = await office.boundingBox();
  const dossierBox = await dossier.boundingBox();
  const selectedPersonBox = await person.boundingBox();
  expect(officeBox).not.toBeNull();
  expect(dossierBox).not.toBeNull();
  expect(selectedPersonBox).not.toBeNull();
  expect(dossierBox?.width ?? Infinity).toBeLessThan(
    (officeBox?.width ?? 0) * 0.36,
  );
  expect(dossierBox?.height ?? Infinity).toBeLessThan(
    (officeBox?.height ?? 0) * 0.75,
  );
  const overlapsSelectedPerson = !(
    (dossierBox?.x ?? 0) + (dossierBox?.width ?? 0) <=
      (selectedPersonBox?.x ?? 0) ||
    (selectedPersonBox?.x ?? 0) + (selectedPersonBox?.width ?? 0) <=
      (dossierBox?.x ?? 0) ||
    (dossierBox?.y ?? 0) + (dossierBox?.height ?? 0) <=
      (selectedPersonBox?.y ?? 0) ||
    (selectedPersonBox?.y ?? 0) + (selectedPersonBox?.height ?? 0) <=
      (dossierBox?.y ?? 0)
  );
  expect(overlapsSelectedPerson).toBe(false);
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
  await expect(page.getByTestId("navigation-flyout")).toHaveCount(0);
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
  const controls = page.getByTestId("pin-controls-person");
  await expect(controls).toBeVisible();
  await controls.getByRole("menuitem", { name: "Standard" }).click();
  await expect(personPin).toHaveAttribute("data-size", "normal");

  await page.getByTestId("scene-person").click();
  await expect(page.getByTestId("person-action-menu")).toBeVisible();
  await expect(personPin).toHaveAttribute("data-size", "normal");
  await page.keyboard.press("Escape");
  await expect(controls).toHaveCount(0);
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

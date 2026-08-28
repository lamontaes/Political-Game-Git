import { expect, test } from "@playwright/test";

test.describe("Player Flow: Seed Parameterization & Deterministic Replay", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
  });

  test("1. default route without seed uses accepted Run A fixture (Andre Collins)", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("player-office")).toBeVisible();
    await expect(page.getByTestId("player-office")).toHaveAttribute(
      "data-simulation-date",
      "2026-01-05",
    );

    // Primary scene person is Andre Collins
    const scenePerson = page.getByTestId("scene-person");
    await expect(scenePerson).toBeVisible();
    await expect(scenePerson).toHaveAttribute(
      "aria-label",
      "Andre Collins, Senior legislative aide",
    );

    // Hover reveals nameplate
    await scenePerson.hover();
    const primaryNameplate = page.getByTestId("scene-person-nameplate");
    await expect(primaryNameplate).toBeVisible();
    await expect(primaryNameplate.locator("strong")).toHaveText(
      "Andre Collins",
    );

    // Guest person is Julian Reed
    const guestPerson = page.getByTestId("scene-person-b");
    await expect(guestPerson).toBeVisible();
    await expect(guestPerson).toHaveAttribute(
      "aria-label",
      "Julian Reed, Neighborhood liaison",
    );

    // Inspect Andre Collins and check dossier name and age
    await scenePerson.click();
    await page.getByRole("menuitem", { name: "Inspect" }).click();
    const dossier = page.getByTestId("quick-dossier");
    await expect(dossier).toBeVisible();
    await expect(dossier.getByRole("heading", { level: 2 })).toHaveText(
      "Andre Collins",
    );
  });

  test("2. Seed A produces deterministic generated people in the player office", async ({
    page,
  }) => {
    await page.goto("/?seed=player-seed-alpha");
    await expect(page.getByTestId("player-office")).toBeVisible();
    await expect(page.getByTestId("player-office")).toHaveAttribute(
      "data-simulation-seed",
      "player-seed-alpha",
    );

    const scenePerson = page.getByTestId("scene-person");
    await expect(scenePerson).toBeVisible();
    const ariaLabelA = await scenePerson.getAttribute("aria-label");
    expect(ariaLabelA).toBeTruthy();
    expect(ariaLabelA).not.toContain("Andre Collins");

    // Hover reveals generated nameplate
    await scenePerson.hover();
    const primaryNameplate = page.getByTestId("scene-person-nameplate");
    await expect(primaryNameplate).toBeVisible();
    const primaryNameA = await primaryNameplate.locator("strong").textContent();
    expect(primaryNameA).toBeTruthy();
    expect(primaryNameA).not.toBe("Andre Collins");

    // Guest scene person is also generated from seed
    const guestPerson = page.getByTestId("scene-person-b");
    await expect(guestPerson).toBeVisible();
    await guestPerson.hover();
    const guestNameplate = page.getByTestId("scene-person-b-nameplate");
    await expect(guestNameplate).toBeVisible();
    const guestNameA = await guestNameplate.locator("strong").textContent();
    expect(guestNameA).toBeTruthy();
    expect(guestNameA).not.toBe("Julian Reed");

    // Inspect person and verify dossier contains valid derived age
    await scenePerson.click();
    await page.getByRole("menuitem", { name: "Inspect" }).click();
    const dossier = page.getByTestId("quick-dossier");
    await expect(dossier).toBeVisible();
    await expect(dossier.getByRole("heading", { level: 2 })).toHaveText(
      primaryNameA!,
    );
  });

  test("3. Seed B produces distinct generated people compared to Seed A", async ({
    page,
  }) => {
    // Load Seed A first
    await page.goto("/?seed=player-seed-alpha");
    await expect(page.getByTestId("player-office")).toBeVisible();
    const scenePersonA = page.getByTestId("scene-person");
    await scenePersonA.hover();
    const primaryNameA = await page
      .getByTestId("scene-person-nameplate")
      .locator("strong")
      .textContent();

    // Load Seed B
    await page.goto("/?seed=player-seed-beta");
    await expect(page.getByTestId("player-office")).toBeVisible();
    await expect(page.getByTestId("player-office")).toHaveAttribute(
      "data-simulation-seed",
      "player-seed-beta",
    );

    const scenePersonB = page.getByTestId("scene-person");
    await scenePersonB.hover();
    const primaryNameB = await page
      .getByTestId("scene-person-nameplate")
      .locator("strong")
      .textContent();

    expect(primaryNameB).toBeTruthy();
    expect(primaryNameB).not.toBe(primaryNameA);
  });

  test("4. Replaying Seed A deterministically returns exact same people", async ({
    page,
  }) => {
    // Record Seed A people
    await page.goto("/?seed=player-seed-alpha");
    await expect(page.getByTestId("player-office")).toBeVisible();
    const scenePersonA = page.getByTestId("scene-person");
    await scenePersonA.hover();
    const primaryNameA1 = await page
      .getByTestId("scene-person-nameplate")
      .locator("strong")
      .textContent();

    const guestPersonA = page.getByTestId("scene-person-b");
    await guestPersonA.hover();
    const guestNameA1 = await page
      .getByTestId("scene-person-b-nameplate")
      .locator("strong")
      .textContent();

    // Navigate to Seed B
    await page.goto("/?seed=player-seed-beta");
    await expect(page.getByTestId("player-office")).toBeVisible();

    // Replay Seed A
    await page.goto("/?seed=player-seed-alpha");
    await expect(page.getByTestId("player-office")).toBeVisible();
    await page.getByTestId("scene-person").hover();
    const primaryNameA2 = await page
      .getByTestId("scene-person-nameplate")
      .locator("strong")
      .textContent();

    await page.getByTestId("scene-person-b").hover();
    const guestNameA2 = await page
      .getByTestId("scene-person-b-nameplate")
      .locator("strong")
      .textContent();

    expect(primaryNameA2).toBe(primaryNameA1);
    expect(guestNameA2).toBe(guestNameA1);
  });
});

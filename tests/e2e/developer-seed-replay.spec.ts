import { expect, test } from "@playwright/test";

test.describe("Developer View: Seed Generation and Deterministic Replay", () => {
  test("loads developer viewer and creates new simulation from seed", async ({
    page,
  }) => {
    await page.goto("/?view=developer");

    // Check title and masthead
    await expect(
      page.getByText("Simulation foundation · Developer tooling"),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Political Life Simulation",
    );

    // Active seed is displayed
    const activeSeedCode = page.locator(".active-seed code");
    await expect(activeSeedCode).toBeVisible();
    const initialSeed = await activeSeedCode.textContent();
    expect(initialSeed).toBeTruthy();

    // Replay explicit seed "e2e-replay-test-seed"
    const inputLocator = page.locator(".seed-entry input");
    await inputLocator.fill("e2e-replay-test-seed");
    await page.getByRole("button", { name: "Replay / Load" }).click();

    // Verify active seed changed
    await expect(activeSeedCode).toHaveText("e2e-replay-test-seed");

    // Record the first person's name and details
    const firstPersonNameLocator = page.locator(".person-row strong").first();
    await expect(firstPersonNameLocator).toBeVisible();
    const firstPersonName = await firstPersonNameLocator.textContent();
    expect(firstPersonName).toBeTruthy();

    // Click "New simulation"
    await page.getByRole("button", { name: "New simulation" }).click();

    // Verify active seed changed to a new generated simulation seed
    const newSeed = await activeSeedCode.textContent();
    expect(newSeed).not.toBe("e2e-replay-test-seed");

    // Replay "e2e-replay-test-seed" again
    await inputLocator.fill("e2e-replay-test-seed");
    await page.getByRole("button", { name: "Replay / Load" }).click();

    // Verify exact same first person is produced
    await expect(activeSeedCode).toHaveText("e2e-replay-test-seed");
    await expect(firstPersonNameLocator).toHaveText(firstPersonName!);
  });

  test("loads specific seed directly from URL query param ?view=developer&seed=...", async ({
    page,
  }) => {
    await page.goto("/?view=developer&seed=custom-url-seed-42");

    const activeSeedCode = page.locator(".active-seed code");
    await expect(activeSeedCode).toHaveText("custom-url-seed-42");

    const peopleList = page.locator(".people-list");
    await expect(peopleList).toBeVisible();
  });
});

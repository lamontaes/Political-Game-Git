import { expect, test } from "@playwright/test";

test.describe("First-Session Foundation E2E Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(async () => {
      window.localStorage.clear();
      if (window.indexedDB) {
        const dbs = await window.indexedDB.databases?.();
        if (dbs) {
          for (const db of dbs) {
            if (db.name) window.indexedDB.deleteDatabase(db.name);
          }
        }
      }
    });
    await page.reload();
  });

  test("1. Normal application boot displays the Title Screen with real player options", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("life-title-screen")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Political Game" }),
    ).toBeVisible();

    // Verify main player options exist
    await expect(page.getByRole("button", { name: "New Game" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Load Game" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();

    // Verify Continue is disabled with no saves
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  test("2. Title -> New Game -> Character Setup -> Opening -> Action -> Save -> Reload -> Continue", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("life-title-screen")).toBeVisible();

    // 1. Click New Game
    await page.getByRole("button", { name: "New Game" }).click();
    await expect(page.getByTestId("new-game-flow")).toBeVisible();

    // 2. Step 1: Identity & Age
    const firstNameInput = page.getByLabel("First name");
    await expect(firstNameInput).toBeVisible();
    await firstNameInput.fill("Morgan");
    const lastNameInput = page.getByLabel("Last name");
    await lastNameInput.fill("Vance");

    // Select Age 32
    await page.getByRole("radio", { name: "Age 32" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // 3. Step 2: Background
    await expect(page.getByText("Background & Occupation")).toBeVisible();
    await page.getByRole("radio", { name: "Neighborhood Advocate" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // 4. Step 3: Outlook
    await expect(
      page.getByText("Political Affiliation & Perspective"),
    ).toBeVisible();
    await page
      .getByRole("radio", { name: /Independent \/ Unaffiliated/i })
      .click();
    await page.locator('input[name="value"][value="service"]').check();
    await page.getByRole("radio", { name: /Deliberate & Careful/i }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // 5. Step 4: Review & Begin
    await expect(page.getByTestId("life-start-review")).toBeVisible();
    await expect(page.getByText("Morgan Vance")).toBeVisible();
    await expect(page.getByText("Age 32 · Lexington, Kentucky")).toBeVisible();

    await page.getByRole("button", { name: "Begin Life" }).click();

    // 6. Non-office opening experience
    await expect(page.getByTestId("life-home")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Morgan Vance" }),
    ).toBeVisible();
    await expect(page.getByText("Age 32")).toBeVisible();
    await expect(page.getByText("A turning point in Lexington")).toBeVisible();

    // 7. Perform an opening life action
    const talkAllyAction = page.getByRole("button", {
      name: /Talk with a trusted community ally/i,
    });
    await expect(talkAllyAction).toBeVisible();
    await talkAllyAction.click();

    // History is updated with the action outcome
    await expect(page.getByText(/Morgan Vance spoke with/i)).toBeVisible();

    // 8. Reload page and test Continue
    await page.reload();
    await expect(page.getByTestId("life-title-screen")).toBeVisible();

    // Status text now reflects the saved player
    await expect(
      page.getByText(/Continue as Morgan Vance, age 32/i),
    ).toBeVisible();
    const continueButton = page.getByRole("button", { name: "Continue" });
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    // Returned directly to the saved life
    await expect(page.getByTestId("life-home")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Morgan Vance" }),
    ).toBeVisible();
    await expect(page.getByText(/Morgan Vance spoke with/i)).toBeVisible();
  });

  test("3. Pause menu opens with button and Escape key, and resumes cleanly", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "New Game" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Begin Life" }).click();
    await expect(page.getByTestId("life-home")).toBeVisible();

    // Open pause menu via button
    await page.getByRole("button", { name: "Open pause menu" }).click();
    await expect(page.getByTestId("pause-menu")).toBeVisible();

    // Resume via button
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByTestId("pause-menu")).not.toBeVisible();

    // Toggle pause menu via Escape
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("pause-menu")).toBeVisible();

    // Close pause menu via Escape
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("pause-menu")).not.toBeVisible();
  });

  test("4. Explicit regression routes ?view=office and ?view=developer remain reachable", async ({
    page,
  }) => {
    // Office regression route
    await page.goto("/?view=office");
    await expect(page.getByTestId("player-office")).toBeVisible();

    // Developer viewer route
    await page.goto("/?view=developer");
    await expect(page.getByTestId("developer-viewer")).toBeVisible();
  });
});

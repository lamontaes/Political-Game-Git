import { expect, test } from "./fixtures";
import { startLife } from "./support/creator";

test("a person card closes when the day moves on", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.evaluate(async () => {
    const databases = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      databases.map(
        (database) =>
          new Promise<void>((resolve) => {
            if (!database.name) return resolve();
            const request = indexedDB.deleteDatabase(database.name);
            request.onsuccess =
              request.onerror =
              request.onblocked =
                () => resolve();
          }),
      ),
    );
    window.localStorage.clear();
  });
  await page.reload();
  await startLife(page, {
    age: 34,
    place: "Lexington",
    state: "Kentucky",
    household: "shares-a-home",
  });
  await page.getByTestId("orientation-skip").click({ timeout: 60000 });
  await expect(page.getByTestId("world-orientation")).toBeHidden();

  const person = page.locator('[data-testid^="scene-person-"]').first();
  await person.click();
  await expect(page.getByTestId("quick-dossier")).toBeVisible();

  await page.getByTestId("shell-pass-day").click();
  await expect(page.getByTestId("quick-dossier")).toHaveCount(0);
});

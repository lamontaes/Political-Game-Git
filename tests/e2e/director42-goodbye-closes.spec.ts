import { expect, test, type Page } from "./fixtures";

import { enterLife, openElsewhere, startLife } from "./support/creator";

/**
 * Saying goodbye ends the conversation.
 *
 * The fourth playtest said goodbye, got "See you.", and then sat looking at
 * the same list of openings: "If I say goodbye, it should just end the
 * conversation." The farewell had always committed correctly — what it never
 * did was close the box, so the complaint was about the surface rather than
 * the exchange.
 *
 * This walks the production route to a real conversation instead of asserting
 * on the component, because the thing being fixed is what a player sees after
 * pressing one button, and a unit test cannot see that.
 */

async function freshBrowser(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const databases = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      databases.map(
        (database) =>
          new Promise<void>((resolve) => {
            if (!database.name) return resolve();
            const request = indexedDB.deleteDatabase(database.name);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve();
            request.onblocked = () => resolve();
          }),
      ),
    );
    window.localStorage.clear();
  });
  await page.reload();
}

/**
 * Opens whichever conversation on this life actually offers a farewell.
 *
 * Which subjects a household yields is the content lane's business and moves;
 * pinning one subject key here would make this spec fail for reasons that have
 * nothing to do with goodbye. What it needs is any conversation with the
 * farewell in it, so it finds one and says so plainly if there is none.
 */
async function openConversationOfferingGoodbye(page: Page) {
  const starters = page.locator('[data-testid^="conversation-start-"]');
  await expect(starters.first()).toBeVisible();
  const keys = await starters.evaluateAll((nodes) =>
    nodes.map((node) =>
      (node.getAttribute("data-testid") ?? "").replace(
        "conversation-start-",
        "",
      ),
    ),
  );

  for (const key of keys) {
    const starter = page.getByTestId(`conversation-start-${key}`);
    if (!(await starter.isVisible())) continue;
    await starter.click();
    const box = page.getByTestId(`conversation-${key}`);
    await expect(box).toBeVisible();
    if ((await box.getByTestId("intent-leave").count()) > 0) return box;
    await box.getByTestId("talk-back").click();
  }

  throw new Error(
    `No conversation on this life offered a farewell. Subjects tried: ${keys.join(", ")}`,
  );
}

test("saying goodbye closes the conversation instead of leaving it open", async ({
  page,
}) => {
  await freshBrowser(page);
  await startLife(page, {
    place: "Lexington",
    state: "Kentucky",
    age: 34,
    household: "shares-a-home",
  });
  await enterLife(page);
  await openElsewhere(page, "people");

  const box = await openConversationOfferingGoodbye(page);

  // Before: the farewell is one of the things this conversation can say.
  await expect(box.getByTestId("intent-leave")).toBeVisible();

  await box.getByTestId("intent-leave").click();

  // The box stops offering new openings the moment the farewell is said,
  // which is the part the playtest was looking at and did not get.
  await expect(box.getByTestId("conversation-intents")).toHaveCount(0);

  // And it closes itself, with no second press.
  await expect(box).toBeHidden({ timeout: 6000 });
});

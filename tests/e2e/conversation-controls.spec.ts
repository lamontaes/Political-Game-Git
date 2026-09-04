import { expect, test, type Page } from "@playwright/test";

/**
 * Talking to somebody, in a browser.
 *
 * The unit proofs next door establish that the engine records different
 * listeners for different volumes and lets a player choose between people.
 * What these add is the thing a passing unit test cannot: that somebody who
 * opens the game and plays can actually do it, on the production route, with
 * no query parameter and nothing typed into an address bar.
 *
 * That distinction is the whole reason this packet exists. All of this
 * machinery worked before it; none of it was reachable.
 */

/** Vocabulary the engine uses about itself, which must never reach a screen. */
const MACHINERY =
  /\baudibility\b|\bboundary-held\b|\bsilence-held\b|\bdurable\b|privateAvailable|eligibleAddressee|\bintent\b|\bprogress\b/i;

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

async function startLife(page: Page, age: number, childhood = false) {
  await page.getByTestId("new-game").click();
  await expect(page.getByTestId("setup-screen")).toBeVisible();
  await page.getByTestId("start-age").fill(String(age));
  if (childhood) {
    await page
      .getByRole("button", { name: /Start in childhood/i })
      .first()
      .click();
  }
  await page.getByTestId("calibration-skip").click();
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
}

test.describe("A player can choose how loudly to speak, and to whom", () => {
  test("offers the three volumes at home, and says who hears it", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, 34);

    const conversation = page.getByTestId("conversation-household-obligation");
    await expect(conversation).toBeVisible();

    const controls = conversation.getByTestId("conversation-audibility");
    await expect(controls).toBeVisible();
    await expect(controls.getByRole("button")).toHaveCount(3);

    // Normal is where it starts, and the screen says who that reaches.
    await expect(conversation).toHaveAttribute("data-audibility", "normal");
    await expect(
      conversation.getByTestId("conversation-hearing"),
    ).toBeVisible();

    // Choosing a different volume changes what the surface is committed to.
    await conversation.getByTestId("audibility-quiet").click();
    await expect(conversation).toHaveAttribute("data-audibility", "quiet");
    await conversation.getByTestId("audibility-private").click();
    await expect(conversation).toHaveAttribute("data-audibility", "private");

    // And none of it is described in the engine's words.
    expect(await controls.innerText()).not.toMatch(MACHINERY);
  });

  test("records more listeners for a normal word than a quiet one", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, 15, true);

    const conversation = page.getByTestId("conversation-school-project-share");
    await expect(conversation).toBeVisible();

    const hearing = conversation.getByTestId("conversation-hearing");
    const loud = await hearing.innerText();

    await conversation.getByTestId("audibility-quiet").click();
    const quiet = await hearing.innerText();

    // A corridor with the class in it hears an ordinary word; a quiet one
    // reaches the person it was meant for. The sentence is names, not a count.
    expect(loud).not.toBe(quiet);
    expect(loud.length).toBeGreaterThan(quiet.length);
    expect(loud).not.toMatch(MACHINERY);
  });

  test("explains why a private word is not possible in a corridor", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, 15, true);

    const conversation = page.getByTestId("conversation-school-project-share");
    await expect(conversation).toBeVisible();
    await expect(conversation.getByTestId("audibility-private")).toBeDisabled();

    const reason = conversation.getByTestId("audibility-unavailable");
    await expect(reason).toBeVisible();
    const said = await reason.innerText();
    expect(said).toMatch(/corridor/i);
    expect(said).not.toMatch(MACHINERY);
  });

  test("lets the player pick which classmate to go to", async ({ page }) => {
    await freshBrowser(page);
    await startLife(page, 15, true);

    const conversation = page.getByTestId("conversation-school-project-share");
    const addressees = conversation.getByTestId("conversation-addressees");
    await expect(addressees).toBeVisible();

    const buttons = addressees.getByRole("button");
    await expect(buttons).toHaveCount(2);

    const firstChosen = await conversation.getAttribute("data-addressee");
    await buttons.nth(1).click();
    const secondChosen = await conversation.getAttribute("data-addressee");
    expect(secondChosen).not.toBe(firstChosen);

    // Both are named people, not slots.
    const labels = await buttons.allInnerTexts();
    for (const label of labels) {
      expect(label).not.toMatch(MACHINERY);
      expect(label.trim().length).toBeGreaterThan(1);
    }
  });
});

test.describe("More than one conversation is reachable", () => {
  test("puts the doorstep and the kitchen on an ordinary adult day", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, 34);

    await expect(
      page.getByTestId("conversation-household-obligation"),
    ).toBeVisible();
    await expect(
      page.getByTestId("conversation-neighborhood-meeting-notice"),
    ).toBeVisible();
  });

  test("puts the school corridor in a childhood", async ({ page }) => {
    await freshBrowser(page);
    await startLife(page, 15, true);
    await expect(
      page.getByTestId("conversation-school-project-share"),
    ).toBeVisible();
  });

  test("says something back, and shows it", async ({ page }) => {
    await freshBrowser(page);
    await startLife(page, 34);

    const conversation = page.getByTestId("conversation-household-obligation");
    const before = await conversation
      .getByTestId("conversation-beat")
      .innerText();

    await conversation
      .getByTestId("conversation-intents")
      .getByRole("button")
      .first()
      .click();

    const after = await conversation
      .getByTestId("conversation-beat")
      .innerText();
    expect(after).not.toBe(before);
    expect(after).not.toMatch(MACHINERY);
    // Somebody said something, in quotation marks, like a person.
    expect(after).toMatch(/[“"]/);
  });
});

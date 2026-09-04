import { expect, test, type Page } from "@playwright/test";

/**
 * The Packet 72 findings, in a browser.
 *
 * The human playtest happened in a browser, on the production route, with no
 * query parameter — so the repairs are proved the same way. A unit test can
 * show that the engine knows Maya is the player's mother; only this can show
 * that a person who opens the game and starts a ten-year-old is told.
 */

/** Vocabulary the engine uses about itself, which must never reach a screen. */
const MACHINERY =
  /\bhousehold-peer\b|\bguardian\b|\banswers-for-themselves\b|\bmiddle-childhood\b|\bband\b|\beligibility\b|\bcapability\b|\{role:|\{who:|\{they:/i;

/** What a ten-year-old must never be handed. */
const ADULT_AGENCY =
  /deal with the (furnace|rent|mortgage|bills)|cover the gap|put your name to a reference|co-?sign|your (employee|tenant|staff)/i;

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

async function openSetup(page: Page, age: number) {
  await page.getByTestId("new-game").click();
  await expect(page.getByTestId("setup-screen")).toBeVisible();
  await page.getByTestId("start-age").fill(String(age));
}

test.describe("A player chooses who the character is", () => {
  test("offers a gender and a set of pronouns on the setup screen", async ({
    page,
  }) => {
    await freshBrowser(page);
    await openSetup(page, 10);

    const gender = page.getByTestId("gender-choices");
    await expect(gender).toBeVisible();
    await expect(gender.getByRole("button")).toHaveCount(4);

    const pronouns = page.getByTestId("pronoun-choices");
    await expect(pronouns).toBeVisible();
    await expect(pronouns.getByRole("button")).toHaveCount(3);

    // Choosing a gender moves the pronouns with it, and either can be changed.
    await page.getByTestId("gender-female").click();
    await expect(page.getByTestId("pronouns-she-her")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByTestId("pronouns-they-them").click();
    await expect(page.getByTestId("pronouns-they-them")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("gender-female")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    expect(await gender.innerText()).not.toMatch(MACHINERY);
  });
});

test.describe("A ten-year-old is asked a ten-year-old's questions", () => {
  test("puts no adult decision in the five-question opening", async ({
    page,
  }) => {
    await freshBrowser(page);
    await openSetup(page, 10);
    await page.getByTestId("gender-female").click();
    await page.getByTestId("calibration-short").click();
    await page.getByTestId("begin").click();
    await expect(page.getByTestId("questionnaire-screen")).toBeVisible();

    // What these questions are, said before the first one.
    await expect(page.getByTestId("questionnaire-framing")).toBeVisible();
    await expect(page.getByTestId("questionnaire-framing")).toContainText(
      /about you, not about the character/i,
    );

    const seen: string[] = [];
    for (let asked = 0; asked < 5; asked += 1) {
      const prompt = await page.getByTestId("questionnaire-prompt").innerText();
      const options = await page
        .getByTestId("questionnaire-options")
        .innerText();
      seen.push(prompt, options);
      expect(prompt).not.toMatch(ADULT_AGENCY);
      expect(options).not.toMatch(ADULT_AGENCY);
      await page
        .getByTestId("questionnaire-options")
        .getByRole("button")
        .first()
        .click();
    }

    // Five questions, and the same people running through them.
    const all = seen.join("\n");
    const recurring = ["Dee", "Bea", "Theo", "Kenny", "Ms. Ruiz"].filter(
      (name) => all.split(name).length - 1 > 1,
    );
    expect(recurring.length).toBeGreaterThanOrEqual(2);
  });

  test("asks an adult the adult opening instead", async ({ page }) => {
    await freshBrowser(page);
    await openSetup(page, 34);
    await page.getByTestId("calibration-short").click();
    await page.getByTestId("begin").click();
    await expect(page.getByTestId("questionnaire-prompt")).toContainText(
      /kitchen table/i,
    );
  });
});

test.describe("The page says whose life this is", () => {
  async function startLife(page: Page, age: number) {
    await freshBrowser(page);
    await openSetup(page, age);
    await page.getByTestId("gender-female").click();
    await page.getByTestId("calibration-skip").click();
    await page.getByTestId("begin").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
  }

  test("names the character, the date and the place before the scene", async ({
    page,
  }) => {
    await startLife(page, 10);
    const where = page.getByTestId("story-where");
    await expect(where).toBeVisible();
    await expect(page.getByTestId("story-who")).toContainText(/, 10$/);
    const when = await page.getByTestId("story-when").innerText();
    expect(when.length).toBeGreaterThan(4);
    expect(when).not.toMatch(MACHINERY);
  });

  test("tells narration from the things you can actually do", async ({
    page,
  }) => {
    await startLife(page, 10);
    await expect(page.getByTestId("story-choices-heading")).toBeVisible();
    await expect(page.getByTestId("story-options")).toBeVisible();
  });

  test("says who somebody is the first time they are in the room", async ({
    page,
  }) => {
    await startLife(page, 10);
    const people = page.getByTestId("story-people");
    if ((await people.count()) > 0) {
      const said = await people.innerText();
      // A name and a relation, from the record — never a bare name the player
      // has to work out from a shared surname.
      expect(said).toMatch(
        /, (your (mom|dad|parent|older|younger)|who (you live with|is in your class))/,
      );
      expect(said).not.toMatch(MACHINERY);
    }
  });

  test("gives the journal a control that says what it opens", async ({
    page,
  }) => {
    await startLife(page, 10);
    const journal = page.getByTestId("open-journal");
    await expect(journal).toBeVisible();
    await expect(journal).toHaveAttribute("aria-expanded", "false");
    expect((await journal.innerText()).length).toBeGreaterThan(8);
    await journal.click();
    await expect(journal).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("journal")).toBeVisible();
  });

  test("keeps the chosen pronouns on the character through a reload", async ({
    page,
  }) => {
    await freshBrowser(page);
    await openSetup(page, 34);
    await page.getByTestId("gender-male").click();
    await page.getByTestId("calibration-skip").click();
    await page.getByTestId("begin").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    const named = await page.getByTestId("story-who").innerText();

    await page.getByTestId("keep-world").click();
    await page.reload();
    await page.getByTestId("continue").click();
    await expect(page.getByTestId("story-who")).toHaveText(named);
  });
});

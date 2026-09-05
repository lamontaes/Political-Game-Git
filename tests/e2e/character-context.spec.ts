import { expect, test, type Page } from "@playwright/test";
import {
  enterLife,
  openCreator,
  startLife as walkCreator,
} from "./support/creator";

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

/** Stops on the character stage, which is where the identity assertions live. */
async function openSetup(page: Page, age: number) {
  await openCreator(page);
  await page.getByTestId("start-normal").click();
  await page.getByTestId("place-search").fill("Kentu");
  await page
    .getByTestId("place-choices")
    .getByRole("button", { name: /Kentucky/i })
    .first()
    .click();
  await expect(page.getByTestId("creator-stage-character")).toBeVisible();
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
  test("opens a child's calibration on a child's three, then widens", async ({
    page,
  }) => {
    // SUPERSEDED CLAIM, NARROWED. Packet 72 held that a ten-year-old start must
    // see no adult decision anywhere in the opening, because a player who had
    // just said "my character is ten" was asked about a furnace bill and the
    // game read as having lost the plot. Packet 77 says the opposite about the
    // wider bank: the calibration may put civic, moral and ordinary-life
    // questions to a player whatever age their character starts at.
    //
    // What reconciles them is the addressee, and that is what is checked here:
    // the screen says who is being asked, the first three still belong to the
    // character's own register, and the questions after them are not confined
    // to it.
    await freshBrowser(page);
    await walkCreator(page, {
      age: 10,
      gender: "female",
      calibration: "short",
    });
    await expect(page.getByTestId("questionnaire-screen")).toBeVisible();

    await expect(page.getByTestId("questionnaire-framing")).toBeVisible();
    await expect(page.getByTestId("questionnaire-framing")).toContainText(
      /put to you, not to your character/i,
    );

    const prompts: string[] = [];
    for (let asked = 0; asked < 5; asked += 1) {
      prompts.push(await page.getByTestId("questionnaire-prompt").innerText());
      await page
        .getByTestId("questionnaire-options")
        .getByRole("button")
        .first()
        .click();
    }

    // The three openers are one life at that age, with the same people in
    // them — which is a cast the questions themselves establish rather than a
    // cast a player is expected to already know.
    const opening = prompts.slice(0, 3).join("\n");
    for (const line of prompts.slice(0, 3)) {
      expect(line).not.toMatch(ADULT_AGENCY);
    }
    const recurring = ["Dee", "Bea", "Theo", "Kenny", "Ms. Ruiz"].filter(
      (name) => opening.includes(name),
    );
    expect(recurring.length).toBeGreaterThanOrEqual(2);

    // And the calibration does not stay in a ten-year-old's house. Five
    // questions drawn from ten childhood items was the shortage the second
    // playtest ran into; the bank is open now.
    expect(prompts).toHaveLength(5);
    expect(new Set(prompts).size).toBe(5);
  });

  test("asks an adult the adult opening instead", async ({ page }) => {
    await freshBrowser(page);
    await walkCreator(page, { age: 34, calibration: "short" });
    await expect(page.getByTestId("questionnaire-prompt")).toContainText(
      /kitchen table/i,
    );
  });
});

test.describe("The page says whose life this is", () => {
  async function startLife(page: Page, age: number) {
    await freshBrowser(page);
    await walkCreator(page, { age, gender: "female" });
    await expect(page.getByTestId("play-screen")).toBeVisible();
    // The generated household is introduced before the first beat now.
    await enterLife(page);
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
    await page.getByTestId("creator-continue-character").click();
    await page.getByTestId("creator-continue-life").click();
    await page.getByTestId("calibration-skip").click();
    await page.getByTestId("begin").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await enterLife(page);
    const named = await page.getByTestId("story-who").innerText();

    await page.getByTestId("keep-world").click();
    // Saving is asynchronous, and the control leaving is how the screen says
    // it finished. Reloading before that raced the write; every sibling spec
    // waits here, and this one did not.
    await expect(page.getByTestId("keep-world")).toHaveCount(0);
    await page.reload();
    await page.getByTestId("continue").click();
    // A loaded save has been introduced already, so it opens on the moment.
    await expect(page.getByTestId("story-who")).toHaveText(named);
  });
});

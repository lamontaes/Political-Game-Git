import { expect, test, type Page } from "@playwright/test";
import {
  enterLife,
  openCreator,
  startLife as walkCreator,
} from "./support/creator";

/**
 * The life-flow repair, played in a browser.
 *
 * The unit proofs next door establish that the machinery composes a life. What
 * these add is the thing a passing unit test cannot: that a person opening the
 * game gets it. Every assertion here is about what is on the screen.
 *
 * The negative assertions matter as much as the positive ones. The sentences
 * the human playtest named — "nothing this year that anyone would tell a story
 * about", "let the year go by, some of them do", "this character does not work
 * in a legislature" — are gone, and a test is the only thing that keeps them
 * gone once somebody is writing new copy against a deadline.
 */

const DEVELOPER_WORDS =
  /synthetic|fixture|stage[- ]?6|run[- ][a-d]\b|scenario|placeholder|lorem|TODO/i;

/** Vocabulary that would tell a player how much a choice is going to matter. */
const FORECAST_WORDS =
  /\bstakes\b|cross[- ]pressure|\bdormant\b|thread key|episode key|\+\d|will (?:affect|matter|change)/i;

/** The exact sentences the playtest asked to be removed. */
const BANNED_COPY = [
  /nothing this year that anyone would tell a story about/i,
  /let the year go by/i,
  /some of them do/i,
  /does not work in a legislature/i,
  /i would rather not say/i,
  /what you remember/i,
  /lexington-fayette/i,
];

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

function watchForErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("Failed to load resource")
    ) {
      errors.push(message.text());
    }
  });
  return errors;
}

async function startLife(page: Page, age: number, childhood = false) {
  await walkCreator(page, { age, childhood });
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await enterLife(page);
}

interface Beat {
  readonly passage: string;
  readonly prose: string;
  readonly options: readonly string[];
}

async function readBeat(page: Page): Promise<Beat> {
  const passage =
    (await page.getByTestId("story-passage").count()) > 0
      ? await page.getByTestId("story-passage").innerText()
      : "";
  const prose =
    (await page.getByTestId("story-prose").count()) > 0
      ? await page.getByTestId("story-prose").innerText()
      : "";
  const buttons = page.getByTestId("story-options").getByRole("button");
  const count = await buttons.count();
  const options: string[] = [];
  for (let index = 0; index < count; index += 1) {
    options.push(await buttons.nth(index).innerText());
  }
  return { passage, prose, options };
}

async function takeBeat(page: Page, index = 0): Promise<Beat> {
  const beat = await readBeat(page);
  const buttons = page.getByTestId("story-options").getByRole("button");
  const count = await buttons.count();
  await buttons.nth(Math.min(index, count - 1)).click();
  return beat;
}

/* -------------------------------------------------------------------------- */

test.describe("The game opens as Our Civic Duty", () => {
  test("shows the title, five controls, and a Quit that is honest about itself", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    const title = page.getByTestId("title-screen");
    await expect(title).toBeVisible();
    await expect(title.getByRole("heading")).toHaveText("Our Civic Duty");

    await expect(page.getByTestId("new-game")).toBeVisible();
    await expect(page.getByTestId("continue")).toBeVisible();
    await expect(page.getByTestId("open-saves")).toBeVisible();
    await expect(page.getByTestId("open-options")).toBeVisible();
    // Present and disabled rather than missing, and it does not mention a
    // browser to a player.
    await expect(page.getByTestId("quit")).toBeDisabled();
    const quit = await page.getByTestId("quit").innerText();
    expect(quit).not.toMatch(/browser|tab|window/i);

    // No tagline.
    const text = await title.innerText();
    expect(text).not.toMatch(/a life, and the places it can reach/i);
    expect(errors).toEqual([]);
  });

  test("opens the options screen and comes back", async ({ page }) => {
    await freshBrowser(page);
    await page.getByTestId("open-options").click();
    await expect(page.getByTestId("options-screen")).toBeVisible();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByTestId("title-screen")).toBeVisible();
  });
});

/* -------------------------------------------------------------------------- */

test.describe("Setting up a life reads like a game, not a form", () => {
  test("opens one stage at a time instead of showing the whole form", async ({
    page,
  }) => {
    // The second playtest's finding, made checkable. What it saw was every
    // section at once on a blank page; what a player meets now is the first
    // decision, standing in the room the title screen was standing in.
    await freshBrowser(page);
    await openCreator(page);
    await expect(page.getByTestId("title-tableau")).toHaveAttribute(
      "data-has-plate",
      "true",
    );
    await expect(page.getByTestId("creator-stage-route")).toBeVisible();
    for (const later of [
      "creator-stage-place",
      "creator-stage-character",
      "creator-stage-life",
      "creator-stage-calibration",
    ]) {
      await expect(page.getByTestId(later)).toHaveCount(0);
    }
    // And Begin is not a thing you can press before you have decided anything.
    await expect(page.getByTestId("begin")).toBeDisabled();

    await page.getByTestId("start-normal").click();
    await expect(page.getByTestId("creator-stage-place")).toBeVisible();
    await expect(page.getByTestId("creator-stage-character")).toHaveCount(0);
  });

  test("names the two routes and says how they differ", async ({ page }) => {
    await freshBrowser(page);
    await openCreator(page);
    const route = (
      await page.getByTestId("creator-stage-route").innerText()
    ).toLowerCase();
    expect(route).toContain("normal start");
    expect(route).toContain("custom start");
    // The difference that matters, in the words a player reads: one has the
    // game writing the family, and the calibration leaning it.
    expect(route).toMatch(/the game writes the family/);
    expect(route).toMatch(/does not touch who your family is/);
  });

  test("keeps the seed behind Advanced", async ({ page }) => {
    await freshBrowser(page);
    await openCreator(page);
    // The reproducibility details are a collapsed disclosure labelled Advanced,
    // not a paragraph of seed on the New Game screen.
    const advanced = page.getByTestId("setup-advanced");
    await expect(advanced).toBeVisible();
    await expect(advanced).not.toHaveAttribute("open", "");
    expect(await advanced.locator("summary").innerText()).toMatch(/advanced/i);
  });

  test("offers no place until one is searched for", async ({ page }) => {
    // THE DEFAULT-CARD REPAIR. The four places the accepted data reaches used
    // to be laid out unprompted, which made a limitation read as the game's
    // four recommended starts — Lexington among them, which is never canonical.
    // They are found now, not offered.
    await freshBrowser(page);
    await openCreator(page);
    await page.getByTestId("start-normal").click();
    await expect(page.getByTestId("place-choices")).toHaveCount(0);
    await expect(page.getByTestId("place-prompt")).toBeVisible();

    await page.getByTestId("place-search").fill("nebra");
    await expect(
      page.getByTestId("place-choices").getByRole("button"),
    ).toHaveCount(1);

    // The formal jurisdiction name is searchable even though it is not shown,
    // so somebody who types the name on their tax bill finds where they live.
    await page.getByTestId("place-search").fill("Fayette");
    const found = page.getByTestId("place-choices").getByRole("button");
    await expect(found).toHaveCount(1);
    expect(await found.first().innerText()).toContain("Lexington, Kentucky");
    expect(await found.first().innerText()).not.toContain("Lexington-Fayette");

    await page.getByTestId("place-search").fill("zzzz");
    await expect(page.getByTestId("place-no-match")).toBeVisible();
  });
});

/* -------------------------------------------------------------------------- */

test.describe("A life is told continuously", () => {
  test("says how the time passed before every beat after the first", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await startLife(page, 34);

    const beats: Beat[] = [];
    for (let step = 0; step < 6; step += 1) {
      beats.push(await takeBeat(page, step % 3));
    }

    // The opening introduces; everything after it bridges.
    expect(beats[0]!.passage.length).toBeGreaterThan(20);
    for (const beat of beats.slice(1)) {
      expect(
        beat.passage.length,
        "a beat arrived with nothing said about the time before it",
      ).toBeGreaterThan(10);
    }
    // And the passages are not one sentence repeated.
    expect(new Set(beats.map((beat) => beat.passage)).size).toBeGreaterThan(2);
    expect(errors).toEqual([]);
  });

  test("narrates a quiet stretch instead of saying nothing happened", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, 44);

    const said: string[] = [];
    for (let step = 0; step < 6; step += 1) {
      await page.getByTestId("story-let-time-pass").click();
      const passage = await page.getByTestId("story-passage").innerText();
      said.push(passage);
      // The requirement: every quiet gap says something, and none of it is one
      // of the sentences the playtest asked to be removed.
      expect(passage.trim().length).toBeGreaterThan(10);
      for (const banned of BANNED_COPY) {
        expect(passage).not.toMatch(banned);
      }
    }
    // And a run of them is not one paragraph repeated. Two distinct is the
    // floor rather than six: a life with nothing in it but a household and a
    // place genuinely has less to say, and padding it would be invention.
    expect(new Set(said).size).toBeGreaterThan(1);
  });

  test("brings the same people back rather than a new cast every beat", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, 36);
    for (let step = 0; step < 8; step += 1) await takeBeat(page, 0);

    await page.getByTestId("open-journal").click();
    await expect(page.getByTestId("journal")).toBeVisible();
    const people = page.getByTestId("journal-people");
    await expect(people).toBeVisible();
    const listed = await people.innerText();
    expect(listed.trim().length).toBeGreaterThan(0);
    // Somebody has been through more than one thing with this character.
    expect(listed).toMatch(/\d+ times/);
  });

  test("keeps a childhood life on the same continuous surface", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await startLife(page, 10, true);
    await expect(page.getByTestId("story-section")).toBeVisible();

    const beats: Beat[] = [];
    for (let step = 0; step < 6; step += 1) beats.push(await takeBeat(page, 0));
    // A childhood is not all turning points, and it is not a blank either.
    for (const beat of beats) {
      expect(beat.options.length).toBeGreaterThan(1);
      for (const banned of BANNED_COPY) {
        expect(beat.prose).not.toMatch(banned);
        expect(beat.passage).not.toMatch(banned);
      }
    }
    expect(errors).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */

test.describe("The record is a journal, not a log down the page", () => {
  test("hides the record behind a control and shows it in chapters", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, 33);
    // Nothing is poured down the play screen before it is asked for.
    await expect(page.getByTestId("journal")).toHaveCount(0);
    for (let step = 0; step < 5; step += 1) await takeBeat(page, step % 2);
    const played = await page.getByTestId("play-screen").innerText();
    expect(played).not.toMatch(/what you remember/i);

    await page.getByTestId("open-journal").click();
    const journal = page.getByTestId("journal");
    await expect(journal).toBeVisible();
    const text = await journal.innerText();
    // Case-insensitive: the stylesheet uppercases the journal's section
    // headings, and this test is about the words rather than the letterforms.
    expect(text.toLowerCase()).toContain("what has happened");
    expect(text).not.toMatch(DEVELOPER_WORDS);
    expect(text).not.toMatch(FORECAST_WORDS);
    expect(text).not.toMatch(
      /you turned the job down and kept the week you already had/i,
    );
  });
});

/* -------------------------------------------------------------------------- */

test.describe("The calibration opens a life", () => {
  test("starts on something personal and never shows a denominator", async ({
    page,
  }) => {
    await freshBrowser(page);
    await walkCreator(page, { age: 30, calibration: "deep" });

    await expect(page.getByTestId("questionnaire-screen")).toBeVisible();
    const first = await page.getByTestId("questionnaire-prompt").innerText();
    // A kitchen, a person, a thing that is happening — not a policy docket.
    expect(first.length).toBeGreaterThan(60);
    expect(first).not.toMatch(
      /policy initiative|regional district|municipal budget|infrastructure grant/i,
    );

    const progress = await page
      .getByTestId("questionnaire-progress")
      .innerText();
    expect(progress).not.toMatch(/\d+\s*(?:of|\/)\s*\d+/);
    await expect(page.getByTestId("questionnaire-skip")).toHaveCount(0);

    // Options are actions, not essays.
    const options = page
      .getByTestId("questionnaire-options")
      .getByRole("button");
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(3);
    for (let index = 0; index < count; index += 1) {
      const text = await options.nth(index).innerText();
      expect(text.length).toBeLessThanOrEqual(60);
    }
  });

  test("stops on its own without being told a length up front", async ({
    page,
  }) => {
    await freshBrowser(page);
    await walkCreator(page, { age: 30, calibration: "deep" });

    let asked = 0;
    const phases = new Set<string>();
    for (; asked < 80; asked += 1) {
      if ((await page.getByTestId("questionnaire-screen").count()) === 0) break;
      phases.add(await page.getByTestId("questionnaire-progress").innerText());
      const options = page
        .getByTestId("questionnaire-options")
        .getByRole("button");
      await options.first().click();
    }
    await expect(page.getByTestId("play-screen")).toBeVisible();
    expect(asked).toBeGreaterThan(10);
    expect(asked).toBeLessThan(60);
    // The phase moved as it went, which is the only progress signal there is.
    expect(phases.size).toBeGreaterThan(1);
  });
});

import { expect, test, type Page } from "@playwright/test";

/**
 * The wave, played in a browser.
 *
 * The path this file walks is the one the packet asked to be proven: title,
 * new life, a calibration the player actually answers, adult play, an ordinary
 * moment, a moment where two things they care about collide, keep, reload,
 * and the same life carrying on.
 *
 * It also holds shut the properties that are about what the player is *not*
 * shown. Those are worth an end-to-end test rather than a unit test, because
 * the risk is not that the engine starts forecasting — it is that a helpful
 * label appears on a screen one day, and nothing else notices.
 */

const DEVELOPER_WORDS =
  /synthetic|fixture|stage[- ]?6|run[- ][a-d]\b|scenario|placeholder|lorem|TODO/i;

/** Words that would tell a player how much a choice is going to matter. */
const FORECAST_WORDS =
  /\bstakes\b|\bpressing\b|major decision|important decision|cross[- ]pressure|\+\d|−\d|-\d+ (?:trust|standing|reputation)|will (?:affect|matter|change)/i;

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

/** Opens the setup screen at a given age with a given calibration chosen. */
async function openSetup(
  page: Page,
  age: number,
  calibration: "short" | "deep" | "skip",
) {
  await page.getByTestId("new-game").click();
  await expect(page.getByTestId("setup-screen")).toBeVisible();
  await page.getByTestId("start-age").fill(String(age));
  await page.getByTestId(`calibration-${calibration}`).click();
  await page.getByTestId("begin").click();
}

/** Answers the whole calibration, taking the option at `index` each time. */
async function answerCalibration(page: Page, index: number, limit = 60) {
  const prompts: string[] = [];
  for (let asked = 0; asked < limit; asked += 1) {
    if ((await page.getByTestId("questionnaire-screen").count()) === 0) break;
    prompts.push(await page.getByTestId("questionnaire-prompt").innerText());
    const options = page
      .getByTestId("questionnaire-options")
      .getByRole("button");
    const count = await options.count();
    await options.nth(Math.min(index, count - 1)).click();
  }
  return prompts;
}

/** Takes one decision on the story surface, whichever kind of beat it is. */
async function takeOneBeat(page: Page, index = 0): Promise<string> {
  const section = page.getByTestId("story-section");
  await expect(section).toBeVisible();
  const prose =
    (await page.getByTestId("story-prose").count()) > 0
      ? await page.getByTestId("story-prose").innerText()
      : "";
  const options = page.getByTestId("story-options").getByRole("button");
  const count = await options.count();
  await options.nth(Math.min(index, count - 1)).click();
  return prose;
}

/** Opens the journal and returns what it says. */
async function readJournal(page: Page): Promise<string> {
  await page.getByTestId("open-journal").click();
  await expect(page.getByTestId("journal")).toBeVisible();
  const text = await page.getByTestId("journal").innerText();
  await page.getByTestId("open-journal").click();
  return text;
}

async function keepAndWait(page: Page) {
  await page.getByTestId("keep-world").click();
  await expect(page.getByTestId("keep-world")).toHaveCount(0);
}

/* -------------------------------------------------------------------------- */

test.describe("The calibration is a set of situations, not a quiz", () => {
  test("asks the short path, answers it, and starts the life", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await openSetup(page, 33, "short");

    await expect(page.getByTestId("questionnaire-screen")).toBeVisible();
    // A phase, not a fraction. "1 of 5" promised a length the deep path does
    // not have, and a denominator turns an opening into a form.
    await expect(page.getByTestId("questionnaire-progress")).toContainText(
      "Somewhere to start",
    );
    await expect(page.getByTestId("questionnaire-progress")).not.toContainText(
      " of ",
    );
    const prompts = await answerCalibration(page, 0);
    expect(prompts).toHaveLength(5);
    // Every prompt is a situation with several defensible readings, and no two
    // are the same question.
    expect(new Set(prompts).size).toBe(5);
    for (const prompt of prompts) {
      expect(prompt.length).toBeGreaterThan(60);
      expect(prompt).not.toMatch(DEVELOPER_WORDS);
      expect(prompt).not.toMatch(/liberal|conservative|left.wing|right.wing/i);
    }

    await expect(page.getByTestId("play-screen")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("never tells the player what it concluded about them", async ({
    page,
  }) => {
    await freshBrowser(page);
    await openSetup(page, 29, "short");
    await answerCalibration(page, 1);
    await expect(page.getByTestId("play-screen")).toBeVisible();

    const screen = await page.getByTestId("play-screen").innerText();
    for (const label of [
      /libertarian/i,
      /authoritarian/i,
      /progressive/i,
      /your (?:profile|type|score|personality)/i,
      /you (?:are|seem) (?:a|an) /i,
    ]) {
      expect(screen).not.toMatch(label);
    }
  });

  test("lets a player decline the whole thing, and lets them stop part way", async ({
    page,
  }) => {
    await freshBrowser(page);
    await openSetup(page, 40, "skip");
    // Declining goes straight into the life.
    await expect(page.getByTestId("play-screen")).toBeVisible();

    await page.getByTestId("leave-game").click();
    await openSetup(page, 40, "deep");
    await expect(page.getByTestId("questionnaire-screen")).toBeVisible();
    // There is no per-question decline any more. The authority removed it: a
    // player who does not want to answer leaves through the control that
    // starts the life, which is one honest act rather than twenty refusals.
    await expect(page.getByTestId("questionnaire-skip")).toHaveCount(0);
    const screen = await page.getByTestId("questionnaire-screen").innerText();
    expect(screen).not.toMatch(/rather not say/i);
    // And the life can be started at any point.
    await page.getByTestId("questionnaire-finish").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
  });

  test("describes the longer set without promising a length", async ({
    page,
  }) => {
    await freshBrowser(page);
    await page.getByTestId("new-game").click();
    await page.getByTestId("start-age").fill("31");
    const deep = await page.getByTestId("calibration-deep").innerText();
    const short = await page.getByTestId("calibration-short").innerText();
    expect(short).toContain("5 situations");
    // The deep path stops when it stops learning, so it must not claim a
    // count. Two runs of it are different lengths.
    expect(deep).not.toMatch(/\d+ situations/);
    expect(deep).toMatch(/as many as it takes/i);
  });
});

/* -------------------------------------------------------------------------- */

test.describe("An adult has something to do, and it follows from their life", () => {
  test("plays a run of adult situations and remembers every one", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await openSetup(page, 34, "short");
    await answerCalibration(page, 0);
    await expect(page.getByTestId("play-screen")).toBeVisible();

    const seen: string[] = [];
    for (let beat = 0; beat < 8; beat += 1) {
      const prose = await takeOneBeat(page, beat % 3);
      if (prose) seen.push(prose);
    }
    expect(seen.length).toBeGreaterThanOrEqual(6);
    // Different situations, not the same one eight times.
    expect(new Set(seen).size).toBeGreaterThanOrEqual(5);

    // The record is behind a control now rather than poured down the screen.
    const remembered = await readJournal(page);
    expect(remembered).not.toMatch(DEVELOPER_WORDS);
    expect(remembered).not.toMatch(/WHAT YOU REMEMBER/i);
    // Written as things that happened, not as buttons pressed.
    expect(remembered.split("\n").length).toBeGreaterThan(4);
    expect(errors).toEqual([]);
  });

  test("keeps the ordinary day beside the decision", async ({ page }) => {
    await freshBrowser(page);
    await openSetup(page, 37, "skip");
    await expect(page.getByTestId("story-section")).toBeVisible();
    await expect(page.getByTestId("ordinary-section")).toBeVisible();
    await expect(page.getByTestId("day-pending")).toBeVisible();
    // And the kitchen conversation, which is now one of several the day
    // offers rather than the single hard-wired panel it used to be.
    await expect(
      page.getByTestId("conversation-household-obligation"),
    ).toBeVisible();
  });

  test("shows a child a life and no adult day surface", async ({ page }) => {
    await freshBrowser(page);
    await openSetup(page, 9, "skip");
    await expect(page.getByTestId("story-section")).toBeVisible();
    // The growing-up years and adult life share one surface; what a child does
    // not get is the adult household day beside it.
    await expect(page.getByTestId("ordinary-section")).toHaveCount(0);
  });
});

/* -------------------------------------------------------------------------- */

test.describe("Nothing on screen says how much a choice will matter", () => {
  test("shows no tier, no meter and no forecast anywhere in a played run", async ({
    page,
  }) => {
    await freshBrowser(page);
    await openSetup(page, 35, "short");
    await answerCalibration(page, 2);

    for (let beat = 0; beat < 6; beat += 1) {
      const screen = await page.getByTestId("play-screen").innerText();
      expect(screen).not.toMatch(FORECAST_WORDS);
      await takeOneBeat(page, beat % 2);
    }
    const finalScreen = await page.getByTestId("play-screen").innerText();
    expect(finalScreen).not.toMatch(FORECAST_WORDS);
    expect(finalScreen).not.toMatch(DEVELOPER_WORDS);
  });

  test("writes no tier and no selection reason to disk", async ({ page }) => {
    await freshBrowser(page);
    await openSetup(page, 36, "short");
    await answerCalibration(page, 0);
    for (let beat = 0; beat < 4; beat += 1) await takeOneBeat(page, 0);
    await keepAndWait(page);

    const written = await page.evaluate(async () => {
      return new Promise<string>((resolve) => {
        const open = indexedDB.open("political-life-worlds", 1);
        open.onsuccess = () => {
          const transaction = open.result.transaction("worlds", "readonly");
          const request = transaction.objectStore("worlds").getAll();
          request.onsuccess = () =>
            resolve(JSON.stringify(request.result as unknown[]));
          request.onerror = () => resolve("");
        };
        open.onerror = () => resolve("");
      });
    });
    expect(written.length).toBeGreaterThan(1000);
    expect(written).not.toContain('"stakes"');
    expect(written).not.toContain("selectionReason");
    expect(written).not.toContain("crossPressure");
    // The answers themselves are on disk, because a reload has to reproduce
    // the same calibration — and they are in their own corner, not in history.
    expect(written).toContain("setupPriors");
  });
});

/* -------------------------------------------------------------------------- */

test.describe("A life is kept, and comes back adapting the same way", () => {
  test("keeps a calibrated life, reloads it, and continues the same sequence", async ({
    page,
  }) => {
    await freshBrowser(page);
    await openSetup(page, 32, "short");
    await answerCalibration(page, 0);

    for (let beat = 0; beat < 4; beat += 1) await takeOneBeat(page, 0);
    const beforeJournal = await readJournal(page);
    const beforeScene = await page.getByTestId("story-prose").innerText();

    await keepAndWait(page);
    await page.reload();
    await page.getByTestId("continue").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();

    // Same record, and the same next situation — which is the claim that
    // matters, because the next situation is chosen from the calibration and
    // the history together.
    expect(await readJournal(page)).toBe(beforeJournal);
    expect(await page.getByTestId("story-prose").innerText()).toBe(beforeScene);

    // And it keeps going from there rather than restarting.
    await takeOneBeat(page, 0);
    const afterJournal = await readJournal(page);
    expect(afterJournal).not.toBe(beforeJournal);
  });

  test("rebuilds a calibrated life exactly from a replay address", async ({
    page,
  }) => {
    await freshBrowser(page);
    await page.getByTestId("new-game").click();
    await page.getByTestId("start-age").fill("28");
    await page.getByTestId("calibration-short").click();
    // Taken from this setup screen, before the calibration is answered, which
    // is the point of the test: the address carries the world half, so it
    // rebuilds this same person whatever they went on to answer.
    const replay = (
      (await page.getByTestId("setup-replay-link").textContent()) ?? ""
    ).trim();
    expect(replay).toContain("replay=");

    await page.getByTestId("begin").click();
    await answerCalibration(page, 1);
    await expect(page.getByTestId("play-screen")).toBeVisible();
    const before = await page.getByTestId("play-screen").innerText();

    await page.goto(replay);
    await expect(page.getByTestId("play-screen")).toBeVisible();
    // The same person in the same place — the calibration changes what is
    // asked and offered, never who anybody is.
    const identity = before.split("\n").slice(0, 2).join("\n");
    expect(await page.getByTestId("play-screen").innerText()).toContain(
      identity,
    );
  });
});

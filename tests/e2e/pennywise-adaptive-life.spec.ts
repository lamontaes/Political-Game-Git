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

/** Takes one adult decision, or lets time pass when there is nothing to decide. */
async function takeOneAdultBeat(page: Page, index = 0): Promise<string> {
  const section = page.getByTestId("adult-section");
  await expect(section).toBeVisible();
  if ((await page.getByTestId("adult-options").count()) === 0) {
    await page.getByTestId("adult-let-time-pass").click();
    return "";
  }
  const prose = await page.getByTestId("adult-prose").innerText();
  const options = page.getByTestId("adult-options").getByRole("button");
  const count = await options.count();
  await options.nth(Math.min(index, count - 1)).click();
  return prose;
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
    await expect(page.getByTestId("questionnaire-progress")).toContainText(
      "1 of 5",
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
    await expect(page.getByTestId("questionnaire-progress")).toContainText(
      "1 of ",
    );
    // "I would rather not say" is a real answer and moves on.
    await page.getByTestId("questionnaire-skip").click();
    await expect(page.getByTestId("questionnaire-progress")).toContainText(
      "2 of ",
    );
    // And the life can be started at any point.
    await page.getByTestId("questionnaire-finish").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
  });

  test("offers a longer set than the quick one", async ({ page }) => {
    await freshBrowser(page);
    await page.getByTestId("new-game").click();
    await page.getByTestId("start-age").fill("31");
    const deep = await page.getByTestId("calibration-deep").innerText();
    const short = await page.getByTestId("calibration-short").innerText();
    const deepCount = Number(/(\d+)/.exec(deep)?.[1] ?? "0");
    const shortCount = Number(/(\d+)/.exec(short)?.[1] ?? "0");
    expect(shortCount).toBe(5);
    expect(deepCount).toBeGreaterThan(10);
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
      const prose = await takeOneAdultBeat(page, beat % 3);
      if (prose) seen.push(prose);
    }
    expect(seen.length).toBeGreaterThanOrEqual(6);
    // Different situations, not the same one eight times.
    expect(new Set(seen).size).toBeGreaterThanOrEqual(5);

    await expect(page.getByTestId("adult-moments")).toBeVisible();
    const remembered = await page.getByTestId("adult-moments").innerText();
    expect(remembered).not.toMatch(DEVELOPER_WORDS);
    // The record is written as things that happened, not as buttons pressed.
    expect(remembered.split("\n").length).toBeGreaterThan(4);
    expect(errors).toEqual([]);
  });

  test("keeps the ordinary day beside the decision", async ({ page }) => {
    await freshBrowser(page);
    await openSetup(page, 37, "skip");
    await expect(page.getByTestId("adult-section")).toBeVisible();
    await expect(page.getByTestId("ordinary-section")).toBeVisible();
    await expect(page.getByTestId("day-pending")).toBeVisible();
    // And the household conversation the shell already had.
    await expect(page.getByTestId("household-conversation")).toBeVisible();
  });

  test("shows a child the growing-up years and no adult situation", async ({
    page,
  }) => {
    await freshBrowser(page);
    await openSetup(page, 9, "skip");
    await expect(page.getByTestId("formative-section")).toBeVisible();
    await expect(page.getByTestId("adult-section")).toHaveCount(0);
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
      await takeOneAdultBeat(page, beat % 2);
    }
    const finalScreen = await page.getByTestId("play-screen").innerText();
    expect(finalScreen).not.toMatch(FORECAST_WORDS);
    expect(finalScreen).not.toMatch(DEVELOPER_WORDS);
  });

  test("writes no tier and no selection reason to disk", async ({ page }) => {
    await freshBrowser(page);
    await openSetup(page, 36, "short");
    await answerCalibration(page, 0);
    for (let beat = 0; beat < 4; beat += 1) await takeOneAdultBeat(page, 0);
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

    for (let beat = 0; beat < 4; beat += 1) await takeOneAdultBeat(page, 0);
    const beforeMoments = await page.getByTestId("adult-moments").innerText();
    const beforeScene = await page.getByTestId("adult-prose").innerText();

    await keepAndWait(page);
    await page.reload();
    await page.getByTestId("continue").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();

    // Same record, and the same next situation — which is the claim that
    // matters, because the next situation is chosen from the calibration and
    // the history together.
    expect(await page.getByTestId("adult-moments").innerText()).toBe(
      beforeMoments,
    );
    expect(await page.getByTestId("adult-prose").innerText()).toBe(beforeScene);

    // And it keeps going from there rather than restarting.
    await takeOneAdultBeat(page, 0);
    const afterMoments = await page.getByTestId("adult-moments").innerText();
    expect(afterMoments).not.toBe(beforeMoments);
    expect(afterMoments).toContain(beforeMoments.split("\n")[0]!);
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

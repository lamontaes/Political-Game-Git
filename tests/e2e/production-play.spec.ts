import { expect, test, type Page } from "@playwright/test";

/**
 * The game, in a browser, on the route a player actually opens.
 *
 * Every player-facing end-to-end test on this branch used to route to
 * `?view=office-fixture`, which is the regression harness. It proved the
 * fixture worked and said nothing about the game. These go through the front
 * door: title, new life, play, keep, reload, continue.
 *
 * The fixture specs stay where they are. Proving the harness and proving the
 * game are different jobs, and this file only does the second one.
 */

const DEVELOPER_WORDS =
  /synthetic|fixture|stage[- ]?6|run[- ][a-d]\b|scenario|placeholder|lorem|TODO/i;

/** Clears saved games so each test starts from a browser nobody has played in. */
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

interface LifeSetup {
  readonly age: number;
  readonly place?: string;
  readonly office?: boolean;
}

/** Walks the setup screen the way a player does and starts the life. */
async function startLife(page: Page, setup: LifeSetup) {
  await page.getByTestId("new-game").click();
  await expect(page.getByTestId("setup-screen")).toBeVisible();

  if (setup.place) {
    await page
      .getByTestId("place-choices")
      .getByRole("button", { name: new RegExp(setup.place, "i") })
      .first()
      .click();
  }
  await page.getByTestId("start-age").fill(String(setup.age));
  if (setup.office) await page.getByTestId("office-start").click();

  await page.getByTestId("begin").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
}

/** Every page error, so "it rendered" is not mistaken for "it worked". */
function watchForErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    // A missing favicon from the dev server is not the game going wrong.
    if (
      message.type() === "error" &&
      !message.text().includes("Failed to load resource")
    ) {
      errors.push(message.text());
    }
  });
  return errors;
}

/** Waits until the world has actually been written before leaving or reloading. */
async function keepAndWait(page: Page) {
  await page.getByTestId("keep-world").click();
  await expect(page.getByTestId("keep-world")).toHaveCount(0);
}

test.describe("Opening the game opens a game", () => {
  test("starts a life from the title screen and shows that life", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await expect(page.getByTestId("title-screen")).toBeVisible();

    await startLife(page, { age: 9 });
    // A nine-year-old plays the growing-up years and has no office.
    await expect(page.getByTestId("formative-section")).toBeVisible();
    await expect(page.getByTestId("office-section")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("gives three cold boots three different people", async ({ page }) => {
    const names: string[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await freshBrowser(page);
      await startLife(page, { age: 30 });
      names.push(
        (await page.getByTestId("play-screen").innerText()).slice(0, 400),
      );
    }
    // Not a claim that three draws must always differ — only that a cold boot
    // is not serving one fixed person, which is what it used to do.
    expect(new Set(names).size).toBeGreaterThan(1);
  });

  test("rebuilds the exact world from a replay address", async ({ page }) => {
    await freshBrowser(page);
    await page.getByTestId("new-game").click();
    await page
      .getByTestId("place-choices")
      .getByRole("button", { name: /Nebraska/i })
      .first()
      .click();
    await page.getByTestId("start-age").fill("24");

    // The link describes the setup on screen, which is the whole point: a bare
    // seed could not rebuild a configured world.
    const replay = (
      (await page.getByTestId("setup-replay-link").textContent()) ?? ""
    ).trim();
    expect(replay).toContain("replay=");

    await page.getByTestId("begin").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    const before = await page.getByTestId("play-screen").innerText();

    await page.goto(replay);
    await expect(page.getByTestId("play-screen")).toBeVisible();
    expect(await page.getByTestId("play-screen").innerText()).toBe(before);
  });
});

test.describe("A new life is not a renamed fixture", () => {
  test("shows a child no adult work, office or developer vocabulary", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 8 });

    const screen = await page.getByTestId("play-screen").innerText();
    expect(screen).not.toMatch(DEVELOPER_WORDS);
    expect(screen).not.toMatch(/legislature|constituent|referral|caseload/i);
    await expect(page.getByTestId("office-section")).toHaveCount(0);
  });

  test("shows an ordinary adult no political surfaces, and says why", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 41 });

    await expect(page.getByTestId("ordinary-section")).toBeVisible();
    await expect(page.getByTestId("office-section")).toHaveCount(0);
    const reason = await page.getByTestId("no-legislation").innerText();
    expect(reason.trim().length).toBeGreaterThan(0);
    expect(reason).not.toMatch(DEVELOPER_WORDS);
  });

  test("gives a staffer the legislature they work in, and no other", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 34, place: "Kentucky", office: true });

    await expect(page.getByTestId("office-section")).toBeVisible();
    await page.getByTestId("open-legislation").click();
    await expect(page.getByTestId("legislation-workspace")).toBeVisible();

    // The production surface has no jurisdiction switcher: which chamber your
    // bills go to is a fact about your job.
    await expect(page.getByTestId("legislation-place-nebraska")).toHaveCount(0);
    await expect(page.getByTestId("legislation-authored")).toContainText(
      "not a real one",
    );
  });
});

test.describe("A life is kept, and comes back", () => {
  test("keeps a life, reloads, and continues the same one", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 27 });
    const before = await page.getByTestId("play-screen").innerText();

    await keepAndWait(page);

    await page.reload();
    await page.getByTestId("continue").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    // The same person, the same age, the same place — the notice line above
    // them is session chrome and is allowed to differ.
    const identity = before.split("\n").slice(0, 3).join("\n");
    expect(await page.getByTestId("play-screen").innerText()).toContain(
      identity,
    );
  });

  test("keeps two lives apart in the saved games list", async ({ page }) => {
    await freshBrowser(page);
    await startLife(page, { age: 22, place: "Kentucky" });
    await keepAndWait(page);
    await page.getByTestId("leave-game").click();

    await startLife(page, { age: 55, place: "Alaska" });
    await keepAndWait(page);
    await page.getByTestId("leave-game").click();

    await page.getByTestId("open-saves").click();
    await expect(page.getByTestId("save-entry")).toHaveCount(2);
  });

  test("deletes a save and does not bring it back", async ({ page }) => {
    await freshBrowser(page);
    await startLife(page, { age: 31 });
    await keepAndWait(page);
    await page.getByTestId("leave-game").click();

    await page.getByTestId("open-saves").click();
    await expect(page.getByTestId("save-entry")).toHaveCount(1);
    await page.getByTestId("delete-save").click();
    await page.getByTestId("confirm-delete").click();
    await expect(page.getByTestId("save-entry")).toHaveCount(0);

    // And it stays gone across a reload, rather than being written back by
    // anything that was still in flight. With nothing left to open, the title
    // screen says so by leaving the saved-games door shut.
    await page.reload();
    await expect(page.getByTestId("open-saves")).toBeDisabled();
    await expect(page.getByTestId("continue")).toBeDisabled();
  });

  test("keeps healthy saves visible beside a damaged one", async ({ page }) => {
    await freshBrowser(page);
    await startLife(page, { age: 29 });
    await keepAndWait(page);
    await page.getByTestId("leave-game").click();

    // A record this build cannot read, written straight into storage.
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        const open = indexedDB.open("political-life-worlds", 1);
        open.onsuccess = () => {
          const database = open.result;
          const transaction = database.transaction("worlds", "readwrite");
          transaction.objectStore("worlds").put({
            kind: "political-life-browser-world",
            recordVersion: 99,
            saveId: "save_from_the_future",
            metadata: { savedAt: "2026-05-01T10:00:00.000Z" },
            payload: "{}",
          });
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => resolve();
        };
        open.onerror = () => resolve();
      });
    });

    await page.reload();
    await page.getByTestId("open-saves").click();
    // The healthy game is still listed and still openable — one damaged record
    // used to take the entire list down with it.
    await expect(page.getByTestId("save-entry")).toHaveCount(1);
    await expect(page.getByTestId("damaged-saves")).toBeVisible();
    await expect(page.getByTestId("damaged-entry")).toHaveCount(1);

    // The screen has just said this one may open in a later version and is
    // worth keeping. One click used to remove it anyway — the weakest guard in
    // the list on the most fragile thing in it.
    await page.getByTestId("delete-damaged").click();
    await expect(page.getByTestId("damaged-entry")).toHaveCount(1);
    await page.getByRole("button", { name: "Keep it" }).click();
    await expect(page.getByTestId("damaged-entry")).toHaveCount(1);

    await page.getByTestId("delete-damaged").click();
    await page.getByTestId("confirm-delete-damaged").click();
    await expect(page.getByTestId("damaged-entry")).toHaveCount(0);
    // And the healthy game beside it is untouched.
    await expect(page.getByTestId("save-entry")).toHaveCount(1);
  });
});

test.describe("What is written to disk is a player's world", () => {
  /** Reads the stored records the way a player's browser holds them. */
  async function storedRecords(page: Page) {
    return page.evaluate(async () => {
      return new Promise<readonly unknown[]>((resolve) => {
        const open = indexedDB.open("political-life-worlds", 1);
        open.onsuccess = () => {
          const transaction = open.result.transaction("worlds", "readonly");
          const request = transaction.objectStore("worlds").getAll();
          request.onsuccess = () => resolve(request.result as unknown[]);
          request.onerror = () => resolve([]);
        };
        open.onerror = () => resolve([]);
      });
    });
  }

  test("carries no validation substrate and no child's adult week", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 7 });
    await keepAndWait(page);

    const records = await storedRecords(page);
    expect(records).toHaveLength(1);
    const written = JSON.stringify(records);

    // The screen showed nothing wrong either time this was reproduced. What
    // was wrong was in the file: a demo generator stamp, a synthetic policy
    // catalog, a certain-death mortality fixture, and a seven-year-old down as
    // the person responsible for the week's errands and an evening meeting.
    expect(written).not.toMatch(/synthetic/i);
    expect(written).not.toMatch(/validation-only/i);
    expect(written).not.toMatch(/demo-world/i);
    expect(written).toContain("production-world-v1");
    expect(written).not.toMatch(/The week's errands/i);
    expect(written).not.toMatch(/Whether to go to the meeting/i);
  });

  test("keeps the newest revision when the player leaves straight after acting", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 9 });
    await keepAndWait(page);

    // Act, then leave immediately: the autosave for this revision is still in
    // flight as Leave is pressed. The revision used to be dropped and the
    // player would come back to the world before their last move.
    await page
      .getByTestId("formative-options")
      .getByRole("button")
      .first()
      .click();
    await expect(page.getByTestId("formative-memories")).toBeVisible();
    const remembered = await page.getByTestId("formative-memories").innerText();

    await page.getByTestId("leave-game").click();
    await expect(page.getByTestId("title-screen")).toBeVisible();
    await page.reload();
    await page.getByTestId("continue").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    expect(await page.getByTestId("formative-memories").innerText()).toBe(
      remembered,
    );
  });
});

test.describe("What the world records, it keeps", () => {
  test("remembers a formative choice through save and reload", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 9 });
    await expect(page.getByTestId("formative-section")).toBeVisible();

    await page
      .getByTestId("formative-options")
      .getByRole("button")
      .first()
      .click();
    await expect(page.getByTestId("formative-memories")).toBeVisible();
    const remembered = await page
      .getByTestId("formative-memories")
      .getByRole("listitem")
      .first()
      .innerText();
    expect(remembered.trim().length).toBeGreaterThan(0);
    expect(remembered).not.toMatch(DEVELOPER_WORDS);

    await keepAndWait(page);
    await page.reload();
    await page.getByTestId("continue").click();
    // The same sentence the world wrote down, not a re-derived paraphrase.
    await expect(page.getByTestId("formative-memories")).toContainText(
      remembered.slice(-60),
    );
  });

  test("keeps a household conversation settled after a reload", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 36 });
    await expect(page.getByTestId("household-conversation")).toBeVisible();

    const topic = await page.getByTestId("conversation-topic").innerText();
    expect(topic).not.toMatch(/constituent|referral|office/i);

    await page
      .getByTestId("conversation-intents")
      .getByRole("button")
      .first()
      .click();
    const afterTurn = await page
      .getByTestId("conversation-briefing")
      .innerText();
    await keepAndWait(page);

    await page.reload();
    await page.getByTestId("continue").click();
    // The conversation picks up where it was left, rather than reopening at
    // turn one because the screen forgot what the world remembered.
    await expect(page.getByTestId("conversation-briefing")).toHaveText(
      afterTurn,
    );
  });

  test("keeps a legislative step in the player's own save", async ({
    page,
  }) => {
    await freshBrowser(page);
    await startLife(page, { age: 38, place: "Kentucky", office: true });
    await page.getByTestId("open-legislation").click();
    await page.getByTestId("legislation-step-request-referral").click();

    const standing = await page.getByTestId("legislation-where").innerText();
    await keepAndWait(page);

    await page.reload();
    await page.getByTestId("continue").click();
    await page.getByTestId("open-legislation").click();
    // The bill is in the save, so it is where it was left rather than back at
    // the day it was filed.
    await expect(page.getByTestId("legislation-where")).toHaveText(standing);
  });
});

test.describe("Nothing on screen is developer vocabulary", () => {
  test("keeps fixture language out of every production surface", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);

    for (const testId of ["title-screen"]) {
      expect(await page.getByTestId(testId).innerText()).not.toMatch(
        DEVELOPER_WORDS,
      );
    }

    await startLife(page, { age: 33, place: "Kentucky", office: true });
    const screen = await page.getByTestId("play-screen").innerText();
    expect(screen).not.toMatch(/synthetic|lorem|TODO|placeholder/i);

    await keepAndWait(page);
    await page.getByTestId("leave-game").click();
    await page.getByTestId("open-saves").click();
    expect(await page.getByTestId("saves-screen").innerText()).not.toMatch(
      DEVELOPER_WORDS,
    );
    expect(errors).toEqual([]);
  });
});

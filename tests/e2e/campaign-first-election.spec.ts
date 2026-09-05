import { expect, test, type Page } from "@playwright/test";

/**
 * Standing for office, in a browser, on the route a player actually opens.
 *
 * The claims this file has to settle are the ones that cannot be settled in a
 * unit test, because they are claims about what a person sees:
 *
 * - a place the game has no sourced office for says so, and keeps its life;
 * - the only support number on the screen is a memo with a margin on it;
 * - election day arrives because the player got on with their weeks;
 * - losing leaves the game running, with the same day screen it started with.
 */

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

async function startLife(page: Page, place: string, age: number) {
  await page.getByTestId("new-game").click();
  await expect(page.getByTestId("setup-screen")).toBeVisible();
  await page
    .getByTestId("place-choices")
    .getByRole("button", { name: new RegExp(place, "i") })
    .first()
    .click();
  await page.getByTestId("start-age").fill(String(age));
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
  // The scene-first shell keeps the day — and the campaign that sits under it —
  // behind the HUD. Standing for office is one more thing in a life, so it is
  // reached the same way the ordinary day is.
  await openDay(page);
}

/** Opens the day overlay, where the ordinary day and the campaign both live. */
async function openDay(page: Page) {
  await page.getByTestId("elsewhere-day").click();
  await expect(page.getByTestId("ordinary-section")).toBeVisible();
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

/** Gets on with the week until the election has been decided, or gives up. */
async function liveUntilDecided(page: Page, maxDays = 45) {
  for (let day = 0; day < maxDays; day += 1) {
    if (await page.getByTestId("campaign-result").isVisible()) return true;
    await page.getByTestId("pass-day").click();
  }
  return page.getByTestId("campaign-result").isVisible();
}

test.describe("A life can stand for something", () => {
  test("offers a candidacy where the game has read the rules, and says how it knows", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await startLife(page, "Kentucky", 34);

    const campaign = page.getByTestId("campaign-section");
    await expect(campaign).toBeVisible();
    await expect(page.getByTestId("campaign-offer")).toBeVisible();
    // It names the instrument the office comes from rather than asserting it.
    await expect(campaign).toContainText(/as .* records it/i);
    // And it is willing to say what it still does not know.
    await campaign.getByRole("group").click();
    await expect(campaign).toContainText(/no accepted source/i);
    await expect(campaign).toContainText(
      /no instrument establishing the size of the chamber/i,
    );

    expect(errors).toEqual([]);
  });

  test("refuses to invent an office where nothing is sourced, and leaves the life alone", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await startLife(page, "Lexington", 34);

    await expect(page.getByTestId("no-campaign")).toContainText(
      /will not borrow another state/i,
    );
    await expect(page.getByTestId("campaign-section")).toHaveCount(0);
    await expect(page.getByTestId("campaign-offer")).toHaveCount(0);

    // The ordinary life is untouched by the refusal: the day still moves.
    const before = await page.getByTestId("day-date").innerText();
    await page.getByTestId("pass-day").click();
    await expect(page.getByTestId("day-date")).not.toHaveText(before);

    expect(errors).toEqual([]);
  });

  test("runs a campaign, and never shows more than somebody's estimate", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await startLife(page, "Kentucky", 34);

    await page.getByTestId("file-candidacy").click();
    const campaign = page.getByTestId("campaign-section");
    await expect(page.getByTestId("campaign-band")).toContainText(
      /days to go|day to go/i,
    );
    // The committee is named after the body, not after the game's description
    // of the seat.
    await expect(page.getByTestId("campaign-band")).toContainText(
      /for the House of Representatives/i,
    );
    await expect(page.getByTestId("campaign-treasury")).toContainText(
      "USD 0.00",
    );
    await expect(page.getByTestId("campaign-no-memo")).toBeVisible();

    // An afternoon on the phones puts money in the committee's account.
    await page.getByTestId("campaign-fundraising").click();
    await expect(page.getByTestId("campaign-treasury")).not.toContainText(
      "USD 0.00",
    );

    // An afternoon on the doors produces a memo, and the memo admits a margin.
    // A day only holds so much, so this one happens tomorrow.
    await page.getByTestId("pass-day").click();
    await page.getByTestId("campaign-outreach").click();
    const memo = page.getByTestId("campaign-memo");
    await expect(memo).toContainText(/give or take/i);
    await expect(memo).toContainText(/further out than that/i);

    // Nothing on this screen is a meter, a threshold, or a certainty.
    await expect(campaign.locator("progress")).toHaveCount(0);
    await expect(campaign.locator("meter")).toHaveCount(0);
    await expect(campaign.locator("[role='progressbar']")).toHaveCount(0);
    await expect(campaign).not.toContainText(/\d+\s*\/\s*\d+/);
    await expect(campaign).not.toContainText(/chance of winning|certain/i);

    expect(errors).toEqual([]);
  });

  test("reaches election day by living the weeks, and carries on afterwards", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await startLife(page, "Kentucky", 34);

    await page.getByTestId("file-candidacy").click();
    await page.getByTestId("campaign-outreach").click();
    await expect(page.getByTestId("campaign-memo")).toBeVisible();
    // A second afternoon, a day later, because a day only holds so much.
    await page.getByTestId("pass-day").click();
    await page.getByTestId("campaign-outreach").click();

    // Nobody presses "hold the election". The world reaches the date.
    expect(await liveUntilDecided(page)).toBe(true);

    const result = page.getByTestId("campaign-result");
    await expect(result).toBeVisible();
    await expect(page.getByTestId("campaign-afterword")).toContainText(
      /won\.|lost\./i,
    );
    // There is nothing left to spend an afternoon on, and the buttons say so.
    await expect(page.getByTestId("campaign-offers")).toHaveCount(0);

    // Whichever way it went, this is still a game with a day in it.
    const afterword = await page.getByTestId("campaign-afterword").innerText();
    await expect(page.getByTestId("ordinary-section")).toBeVisible();
    const before = await page.getByTestId("day-date").innerText();
    await page.getByTestId("pass-day").click();
    await expect(page.getByTestId("day-date")).not.toHaveText(before);
    await expect(page.getByTestId("play-screen")).toBeVisible();

    if (/lost\./i.test(afterword)) {
      // Losing is a thing that happened, said in those words.
      await expect(page.getByTestId("campaign-afterword")).toContainText(
        /not the end of them/i,
      );
      // And it opens no office it did not earn.
      await expect(page.getByTestId("office-section")).toHaveCount(0);
    } else {
      // Winning opens the office, through the ordinary work records. The work
      // surface is now its own HUD destination, so the office is reached there.
      await page.getByTestId("elsewhere-work").click();
      await expect(page.getByTestId("office-section")).toBeVisible();
      await expect(page.getByTestId("open-legislation")).toBeVisible();
    }

    expect(errors).toEqual([]);
  });

  test("keeps the campaign through a save and a reload", async ({ page }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await startLife(page, "Kentucky", 34);

    await page.getByTestId("file-candidacy").click();
    await page.getByTestId("campaign-fundraising").click();
    const treasury = await page.getByTestId("campaign-treasury").textContent();
    const band = await page.getByTestId("campaign-band").textContent();

    await page.getByTestId("keep-world").click();
    await expect(page.getByTestId("keep-world")).toHaveCount(0);
    await page.reload();

    await page.getByTestId("continue").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    // A reload starts the shell closed; the campaign is under the day again.
    await openDay(page);
    await expect(page.getByTestId("campaign-treasury")).toHaveText(
      treasury ?? "",
    );
    await expect(page.getByTestId("campaign-band")).toHaveText(band ?? "");

    expect(errors).toEqual([]);
  });
});

import { expect, test, type Page } from "./fixtures";

import {
  enterLife,
  expectNoDestination,
  goTo,
  openElsewhere,
  openShellMenu,
  shellIdentity,
  startLife,
} from "./support/creator";
import {
  candidacyPacks,
  searchLifePlaces,
  type LifePlace,
} from "../../src/simulation";

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

/**
 * Starts an adult life in `place`, then opens the day.
 *
 * The scene-first shell keeps the day — and the campaign that sits under it —
 * behind the HUD. Standing for office is one more thing in a life, so it is
 * reached the same way the ordinary day is. The creator walk itself is the
 * shared one every browser test uses, so this file does not carry its own copy.
 */
async function beginAdultLifeIn(page: Page, place: string) {
  await startLife(page, { age: 34, place });
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await enterLife(page);
  await openCampaign(page);
}

function unsupportedLocality(): LifePlace {
  const supported = new Set(
    candidacyPacks().map((pack) => pack.jurisdictionKey),
  );
  const place = searchLifePlaces("a", 500).find(
    (candidate) =>
      candidate.scope === "locality" &&
      candidate.stateJurisdictionKey !== null &&
      !supported.has(candidate.stateJurisdictionKey),
  );
  if (!place) throw new Error("The place corpus has no unsupported locality.");
  return place;
}

/** Opens Today: what is happening, what is next, and the day's time. */
async function openDay(page: Page) {
  await openElsewhere(page, "day");
  await expect(page.getByTestId("ordinary-section")).toBeVisible();
}

/**
 * Opens Work, where running for office lives.
 *
 * PT3 moved the campaign out of the day: the day says what is happening and
 * offers the time, Work holds everything the character works at. The day's
 * one waiting control — getting on with the day — is on Work too, so a
 * campaign's act-then-sleep loop does not bounce between two screens.
 */
async function openCampaign(page: Page) {
  await openElsewhere(page, "work");
  await expect(page.getByTestId("work-section-campaign")).toBeVisible();
}

/** Closes Work, whichever office-holder's frame it is drawn in. */
async function closeWork(page: Page) {
  await page
    .getByRole("region", { name: "Work", exact: true })
    .getByRole("button", { name: "Close", exact: true })
    .click();
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
    await beginAdultLifeIn(page, "Kentucky");

    const campaign = page.getByTestId("campaign-section");
    await expect(campaign).toBeVisible();
    await expect(page.getByTestId("campaign-offer")).toBeVisible();
    // Current main carries the unresolved formal count without a numeric fallback.
    await expect(campaign).toContainText(
      /unresolved formal count carries no numeric fallback/i,
    );
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
    // The negative control comes from the accepted pack set rather than naming
    // a state whose source coverage may arrive later.
    await beginAdultLifeIn(page, unsupportedLocality().displayName);

    await expect(page.getByTestId("no-campaign")).toContainText(
      /has not read this state/i,
    );
    await expect(page.getByTestId("campaign-section")).toHaveCount(0);
    await expect(page.getByTestId("campaign-offer")).toHaveCount(0);

    // The ordinary life is untouched by the refusal: the day still moves.
    await openDay(page);
    const before = await page.getByTestId("day-date").innerText();
    await page.getByTestId("pass-day").click();
    await expect(page.getByTestId("day-date")).not.toHaveText(before);

    expect(errors).toEqual([]);
  });

  test("a city reaches the offices of the state it is in", async ({ page }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await beginAdultLifeIn(page, "Lexington");

    // The repaired boundary, in the browser the owner played in: Lexington is
    // in Kentucky, so the Kentucky seats are on offer here.
    await expect(page.getByTestId("no-campaign")).toHaveCount(0);
    await expect(page.getByTestId("file-candidacy")).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("runs a campaign, and never shows more than somebody's estimate", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await beginAdultLifeIn(page, "Kentucky");

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
    await beginAdultLifeIn(page, "Kentucky");

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
    await openDay(page);
    const before = await page.getByTestId("day-date").innerText();
    await page.getByTestId("pass-day").click();
    await expect(page.getByTestId("day-date")).not.toHaveText(before);
    await expect(page.getByTestId("play-screen")).toBeVisible();

    if (/lost\./i.test(afterword)) {
      // Losing is a thing that happened, said in those words. The afterword
      // is in Work, where the campaign is, not on the day.
      await openCampaign(page);
      await expect(page.getByTestId("campaign-afterword")).toContainText(
        /not the end of them/i,
      );
      // And it opens no office it did not earn.
      await expect(page.getByTestId("office-section")).toHaveCount(0);
    } else {
      // Winning opens the office, through the ordinary work records. The work
      // surface is now its own HUD destination, so the office is reached there.
      await openElsewhere(page, "work");
      await expect(page.getByTestId("office-section")).toBeVisible();
      await expect(page.getByTestId("open-legislation")).toBeVisible();
    }

    expect(errors).toEqual([]);
  });

  test("keeps the campaign through a save and a reload", async ({ page }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await beginAdultLifeIn(page, "Kentucky");

    await page.getByTestId("file-candidacy").click();
    await page.getByTestId("campaign-fundraising").click();
    const treasury = await page.getByTestId("campaign-treasury").textContent();
    const band = await page.getByTestId("campaign-band").textContent();

    await goTo(page, "keep-world");
    await expectNoDestination(page, "keep-world");
    await page.reload();

    await page.getByTestId("continue").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    // A reload starts the shell closed; the campaign is in Work again.
    await enterLife(page);
    await openCampaign(page);
    await expect(page.getByTestId("campaign-treasury")).toHaveText(
      treasury ?? "",
    );
    await expect(page.getByTestId("campaign-band")).toHaveText(band ?? "");

    expect(errors).toEqual([]);
  });
});

test.describe("P85D integration through ordinary player controls", () => {
  for (const route of ["choice", "quiet"] as const) {
    test(`resolves election day through the ${route} story route`, async ({
      page,
    }) => {
      const errors = watchForErrors(page);
      await freshBrowser(page);
      await page.goto("/?seed=p85c-owner-clock");
      await startLife(page, { age: 34, place: "Lexington", gender: "male" });
      await enterLife(page);
      await openCampaign(page);
      await page.getByTestId("file-candidacy").click();
      const before = await page.getByTestId("day-date").innerText();
      await closeWork(page);
      if (route === "quiet") {
        await page.getByTestId("story-let-time-pass").focus();
        await page.keyboard.press("Enter");
      } else {
        await page
          .getByTestId("story-options")
          .getByRole("button")
          .first()
          .click();
      }
      await openCampaign(page);
      await expect(page.getByTestId("campaign-result")).toBeVisible();
      await expect(page.getByTestId("day-date")).not.toHaveText(before);
      expect(errors).toEqual([]);
    });
  }

  test("a Lexington winner can activate Kentucky Work before and after reload", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await page.goto("/?seed=p85c-owner-0");
    await startLife(page, { age: 34, place: "Lexington", gender: "male" });
    await enterLife(page);
    await openCampaign(page);
    await page.getByTestId("file-candidacy").click();
    await page.getByTestId("campaign-fundraising").click();
    for (let day = 0; day < 3; day += 1) {
      await page.getByTestId("pass-day").click();
      await page.getByTestId("campaign-outreach").click();
    }
    expect(await liveUntilDecided(page)).toBe(true);
    await expect(page.getByTestId("campaign-afterword")).toContainText("won.");
    await openElsewhere(page, "work");
    await expect(page.getByTestId("office-section")).toContainText(
      "Kentucky legislature",
    );
    await goTo(page, "keep-world");
    await expectNoDestination(page, "keep-world");
    await page.reload();
    await page.getByTestId("continue").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await enterLife(page);
    // Where and when live on the corner cluster now, in its own label.
    expect(await shellIdentity(page)).toContain("Lexington");
    await openShellMenu(page);
    await page.getByTestId("elsewhere-work").focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("office-section")).toContainText(
      "Kentucky legislature",
    );
    // PlayerGame opens this workspace inline; PlayerOffice's fixture route
    // navigates. Assert the destination owned by this root, not the other one.
    await page.getByTestId("open-legislation").click();
    await expect(page.getByTestId("legislation-workspace")).toBeVisible();
    await expect(page.getByTestId("legislation-error")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

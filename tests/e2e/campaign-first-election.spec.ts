import { campaignUntilDecided, fileCandidacy } from "./support/campaign";
import { expect, test, type Page } from "./fixtures";

import {
  KENTUCKY_LEXINGTON_REGRESSION,
  enterLife,
  expectNoDestination,
  goTo,
  openElsewhere,
  openShellMenu,
  shellIdentity,
  startLife,
  waitForClockIdle,
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
 * - a state the game has not read gets a legislature of its own, never a
 *   neighbour's, and keeps its life;
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
  const kentuckyHometown =
    place === "Kentucky" || place === "Lexington"
      ? KENTUCKY_LEXINGTON_REGRESSION
      : { place };
  await startLife(page, {
    age: 34,
    ...kentuckyHometown,
  });
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await enterLife(page);
  await openCampaign(page);
}

/**
 * A town in a state whose legislature nobody has read.
 *
 * `candidacyPacks()` is the researched set only, so anything outside it is a
 * state the game has to generate a legislature for rather than read one.
 */
function unreadStateLocality(): LifePlace {
  const supported = new Set(
    candidacyPacks().map((pack) => pack.jurisdictionKey),
  );
  const place = searchLifePlaces("a", 500).find(
    (candidate) =>
      candidate.scope === "locality" &&
      candidate.stateJurisdictionKey !== null &&
      !supported.has(candidate.stateJurisdictionKey),
  );
  if (!place) throw new Error("The place corpus has no unread-state locality.");
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
  await openElsewhere(page, "campaign");
  await expect(page.getByTestId("work-section-campaign")).toBeVisible();
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

/**
 * Presses one of the game's time controls and lets it finish.
 *
 * Neither clock disables itself while a command runs any more — the control
 * keeps focus and marks itself busy instead — and the runner ignores a submit
 * while one is in flight, so one press can never move the clock twice. The
 * consequence for a test is that a press issued on top of a running command is
 * simply lost: a loop that fires as fast as it can counts days it never
 * advanced. A player waits for "Time is passing…" to go; so does this.
 */
async function pressTime(page: Page, testid: string) {
  const control = page.getByTestId(testid);
  await expect(control).not.toHaveAttribute("aria-busy", "true");
  await waitForClockIdle(page);
  await control.click();
  await expect(control).not.toHaveAttribute("aria-busy", "true");
  await waitForClockIdle(page);
}

/** Gets on with the week until the election has been decided, or gives up. */
async function liveUntilDecided(page: Page, maxDays = 45) {
  for (let day = 0; day < maxDays; day += 1) {
    if (await page.getByTestId("campaign-result").isVisible()) return true;
    await pressTime(page, "shell-pass-day");
  }
  return page.getByTestId("campaign-result").isVisible();
}

test.describe("A life can stand for something", () => {
  test("deliberately selects the Senate and preserves the campaign while browsing and reloading", async ({
    page,
  }) => {
    // A fresh browser, the creator, a browse and a reload: about 25 s on a
    // quiet host, so the default budget is decided by runner load.
    test.setTimeout(90_000);
    await freshBrowser(page);
    await beginAdultLifeIn(page, "Kentucky");
    const browser = page.getByTestId("campaign-office-browser");
    await expect(browser.locator("input:checked")).toHaveCount(0);
    await expect(page.getByTestId("file-candidacy")).toBeDisabled();
    const senate = browser.locator(
      'input[value="us-ky-general-assembly-v1:senate"]',
    );
    await senate.focus();
    await page.keyboard.press("Space");
    await expect(senate).toBeChecked();
    await page.getByTestId("file-candidacy").click();
    await expect(page.getByTestId("campaign-band")).toContainText("Senate");
    const band = (await page.getByTestId("campaign-band").textContent()) ?? "";
    const opponents =
      (await page.getByTestId("campaign-opponents").textContent()) ?? "";
    const treasury =
      (await page.getByTestId("campaign-treasury").textContent()) ?? "";
    await browser
      .locator('input[value="us-ky-general-assembly-v1:house"]')
      .check();
    await expect(page.getByTestId("campaign-band")).toHaveText(band);
    await goTo(page, "keep-world");
    await expectNoDestination(page, "keep-world");
    await page.reload();
    await page.getByTestId("continue").click();
    await enterLife(page);
    await openCampaign(page);
    await expect(page.getByTestId("campaign-band")).toHaveText(band);
    await expect(page.getByTestId("campaign-opponents")).toHaveText(opponents);
    await expect(page.getByTestId("campaign-treasury")).toHaveText(treasury);
  });
  test("offers a candidacy where the game has read the rules, without reciting how they were compiled", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await beginAdultLifeIn(page, "Kentucky");

    const campaign = page.getByTestId("campaign-section");
    await expect(campaign).toBeVisible();
    await expect(page.getByTestId("campaign-offer")).toBeVisible();

    /*
     * This test used to require the opposite, and it was right to at the time:
     * the screen said "the unresolved formal count carries no numeric
     * fallback", and opened "What the game does not know about this" onto the
     * accepted-source gaps behind it. That is a real and careful account of the
     * rule pack's limits, and it is addressed to whoever compiles rule packs.
     *
     * A candidate deciding whether to stand is not that reader. The gate has
     * not moved — an unknown seat count is still unknown and still refuses to
     * invent a figure — but the screen no longer explains its own bookkeeping,
     * so the offer must be there and the compilation vocabulary must not.
     */
    await expect(campaign).not.toContainText(/numeric fallback/i);
    await expect(campaign).not.toContainText(/compiled research/i);
    await expect(campaign).not.toContainText(/for this pack/i);
    await expect(
      campaign.getByText("What the game does not know about this", {
        exact: true,
      }),
    ).toHaveCount(0);

    /* The offer itself still reads like an offer. */
    await page
      .getByTestId("campaign-office-browser")
      .locator('input[value="us-ky-general-assembly-v1:house"]')
      .check();
    await expect(page.getByTestId("campaign-offer")).toContainText(
      /there is a .* to be filled/i,
    );

    expect(errors).toEqual([]);
  });

  /*
   * This case used to assert the opposite: that a state with no researched
   * pack refuses with "has not read this state" and offers nothing. Giving
   * every unread state a disclosed, generated legislature is what replaced
   * that refusal, so the negative control became a positive one. What it
   * still guards is the half that never changes: the seats on offer belong
   * to the state the life is in, and borrowing a neighbour's is a failure.
   */
  test("gives a state the game has not read a legislature of its own, and leaves the life alone", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    const place = unreadStateLocality();
    const state = place.displayName.split(", ").at(-1) ?? "";
    expect(state).not.toBe("");
    await beginAdultLifeIn(page, place.displayName);

    await expect(page.getByTestId("no-campaign")).toHaveCount(0);
    const offices = page
      .getByTestId("campaign-office-browser")
      .getByRole("radio");
    await expect(offices.first()).toBeVisible();
    const count = await offices.count();
    for (let index = 0; index < count; index += 1) {
      await expect(offices.nth(index)).toHaveAccessibleName(
        new RegExp(`${state} Legislature`),
      );
    }

    // The ordinary life is untouched by standing or not: the day still moves.
    await openDay(page);
    const before = (await page.getByTestId("day-date").textContent()) ?? "";
    await page.getByTestId("shell-pass-day").click();
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

    await fileCandidacy(page);
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
    await page.getByTestId("shell-pass-day").click();
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

  test("sets an explicit campaign priority and geography with ordinary controls", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await beginAdultLifeIn(page, "Kentucky");

    await fileCandidacy(page);
    const strategy = page.getByTestId("campaign-strategy");
    await expect(strategy).toBeVisible();
    const geography = strategy.getByRole("group", {
      name: "Represented geography",
    });
    await expect(geography).toBeVisible();
    // With nothing in the account there is no advertising ceiling to set; the
    // advertising action itself says why, so no empty group is drawn.
    await expect(
      strategy.getByRole("group", { name: "Advertising spending ceiling" }),
    ).toHaveCount(0);

    // One control per intent: the plan only edits how the work is done, and
    // the work itself is the single "Do this now" row. The geography is chosen
    // with the keyboard, then the alternative priority is done with a pointer.
    await expect(strategy.getByTestId("campaign-strategy-commit")).toHaveCount(
      0,
    );
    const place = geography.getByRole("radio").first();
    await place.focus();
    await page.keyboard.press("Space");
    await expect(place).toBeChecked();
    await page
      .getByRole("group", { name: "Do this now" })
      .getByTestId("campaign-outreach")
      .click();

    const report = page.getByTestId("campaign-strategy-report");
    await expect(report).toBeVisible();
    await expect(report).toContainText(/player chose/i);
    await expect(report).toContainText(/with a ceiling of USD 0\.00/i);
    await expect(report).toContainText(/Kentucky/i);
    await expect(page.getByTestId("campaign-memo")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("reaches election day by living the weeks, and carries on afterwards", async ({
    page,
  }) => {
    // Living to election day is 27 shell days plus the creator: about 25 s on
    // a quiet host, so the default budget is decided by runner load.
    test.setTimeout(90_000);
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await beginAdultLifeIn(page, "Kentucky");

    await fileCandidacy(page);
    await page.getByTestId("campaign-outreach").click();
    await expect(page.getByTestId("campaign-memo")).toBeVisible();
    // A second afternoon, a day later, because a day only holds so much.
    await pressTime(page, "pass-day");
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
    const before = (await page.getByTestId("day-date").textContent()) ?? "";
    await pressTime(page, "shell-pass-day");
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
      // A recorded result precedes the supported term; it grants no current office.
      await openElsewhere(page, "work");
      await expect(page.getByTestId("office-section")).toHaveCount(0);
      await openElsewhere(page, "campaign");
      await expect(page.getByTestId("campaign-afterword")).toContainText(
        /term begins/,
      );
    }

    expect(errors).toEqual([]);
  });

  test("keeps the campaign through a save and a reload", async ({ page }) => {
    // Living to election day is 27 shell days plus the creator: about 25 s on
    // a quiet host, so the default budget is decided by runner load.
    test.setTimeout(90_000);
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await beginAdultLifeIn(page, "Kentucky");

    await fileCandidacy(page);
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
  for (const activation of ["pointer", "keyboard"] as const) {
    test(`resolves election day through the ${activation} Work day control`, async ({
      page,
    }) => {
      // Same 27-day path as above; the budget follows the sibling winner case.
      test.setTimeout(90_000);
      const errors = watchForErrors(page);
      await freshBrowser(page);
      await page.goto("/?seed=p85c-owner-clock");
      await startLife(page, {
        age: 34,
        place: "Lexington",
        state: "Kentucky",
        gender: "male",
      });
      await enterLife(page);
      await openCampaign(page);
      await fileCandidacy(page);
      const before = (await page.getByTestId("day-date").textContent()) ?? "";
      const passDay = page.getByTestId("pass-day");
      await waitForClockIdle(page);
      await expect(passDay).toHaveAttribute("aria-busy", "false");
      if (activation === "keyboard") {
        await passDay.focus();
        await page.keyboard.press("Enter");
      } else {
        await passDay.click();
      }
      // The press has to land before the corner clock takes over the loop:
      // the runner ignores a second command while the first is in flight.
      await expect(passDay).toHaveAttribute("aria-busy", "false");
      await waitForClockIdle(page);
      expect(await liveUntilDecided(page)).toBe(true);
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
    await startLife(page, {
      age: 34,
      place: "Lexington",
      state: "Kentucky",
      gender: "male",
    });
    await enterLife(page);
    await openCampaign(page);
    await fileCandidacy(page);
    await page.getByTestId("campaign-fundraising").click();
    expect(
      await campaignUntilDecided(page, (page) => pressTime(page, "pass-day")),
    ).toBe(true);
    await expect(page.getByTestId("campaign-afterword")).toContainText("won.");
    // The office is its own Politics tab, apart from the campaign.
    await openElsewhere(page, "work");
    await expect(page.getByTestId("office-section")).toHaveCount(0);
    // The ordinary shell clock processes the same pending term transition.
    for (let step = 0; step < 52; step += 1) {
      if (await page.getByTestId("office-section").isVisible()) break;
      await pressTime(page, "shell-pass-week");
    }
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
    await page.getByTestId("nav-politics").focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("politics-tab-office")).toHaveAttribute(
      "aria-current",
      "page",
    );
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

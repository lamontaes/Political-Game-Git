import { fileCandidacy } from "./support/campaign";
import {
  campaignHostedUntilDecided,
  secureCampaignHost,
  workOfferedCampaignChoices,
} from "./support/legislative-entry";
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
 *   neighbor's, and keeps its life;
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
 * The campaign is in Politics, and the corner Day control remains available
 * while its work is on screen.
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
 * The corner control keeps focus and marks itself unavailable while a command
 * runs, and the runner ignores a submit
 * while one is in flight, so one press can never move the clock twice. The
 * consequence for a test is that a press issued on top of a running command is
 * simply lost: a loop that fires as fast as it can counts days it never
 * advanced. A player waits for "Time is passing…" to go; so does this.
 */
async function pressTime(page: Page, testid: string) {
  const control = page.getByTestId(testid);
  await expect(control).not.toHaveAttribute("aria-disabled", "true");
  await waitForClockIdle(page);
  await control.click();
  await expect(control).not.toHaveAttribute("aria-disabled", "true");
  await waitForClockIdle(page);
}

/** Gets on with the week until the election has been decided, or gives up. */
async function liveUntilDecided(page: Page) {
  // The caller has already proved the Day control. A legislative seat is
  // decided on the state's election day, so use Week for the long interval.
  for (let week = 0; week < 110; week += 1) {
    if (await page.getByTestId("campaign-result").isVisible()) return true;
    await pressTime(page, "shell-pass-week");
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

    /* The offer itself still reads like an offer. Since 702852c0f (the
       grammar layer) it names the election rather than a seat "to be
       filled". */
    await page
      .getByTestId("campaign-office-browser")
      .locator('input[value="us-ky-general-assembly-v1:house"]')
      .check();
    await expect(page.getByTestId("campaign-offer")).toContainText(
      /there is an election for .* House of Representatives/i,
    );

    expect(errors).toEqual([]);
  });

  /*
   * This case used to assert the opposite: that a state with no researched
   * pack refuses with "has not read this state" and offers nothing. Giving
   * every unread state a disclosed, generated legislature is what replaced
   * that refusal, so the negative control became a positive one. What it
   * still guards is the half that never changes: the seats on offer belong
   * to the state the life is in, and borrowing a neighbor's is a failure.
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
      /for the [A-Z][a-z]+( [A-Z][a-z]+)? House of Representatives/,
    );
    await expect(page.getByTestId("campaign-treasury")).toContainText("$0.");
    await expect(page.getByTestId("campaign-no-memo")).toBeVisible();

    /*
     * This case used to press "Do this now": an afternoon on the phones put
     * money in the account and an afternoon on the doors produced the field
     * memo ("give or take"). c73ce6024 (PR #805) removed that row for an
     * active campaign; its work is now dated, hosted and attended, and field
     * work records an estimated range of conversations rather than a memo.
     * The memo is still written by the one campaign action left, the paid
     * advertising buy, which a committee opened with nothing cannot make, so
     * the memo half of this claim is not reachable from a new campaign.
     */
    await secureCampaignHost(page);
    expect(
      await workOfferedCampaignChoices(page, ["fundraiser", "door-canvass"]),
    ).toBe(2);
    const results = page.getByTestId("campaign-recent-results");
    // A fundraiser reports only money the committee actually received.
    await expect(results).toContainText(
      /Raised: \$|No contribution was received/,
    );
    // Field work is an estimate with a range on it, never a count.
    await expect(results).toContainText(/Estimated conversations: \d+–\d+/);

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
    /*
     * c73ce6024 (PR #805) retired "Edit the plan" and the "Do this now" row
     * for an active campaign: the priority is now the dated choice the
     * player puts on the calendar, and the geography belongs to the one
     * paid action left, the advertising buy. So the geography is chosen with
     * the keyboard there, and the priority is a hosted choice booked with a
     * pointer. The old report ("You chose direct outreach") came from the
     * retired row and has no producer on this route.
     */
    await expect(page.getByTestId("campaign-strategy")).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Do this now" })).toHaveCount(
      0,
    );
    const paid = page.getByTestId("campaign-paid-advertising");
    const geography = paid.getByRole("group", { name: "Where it runs" });
    await expect(geography).toBeVisible();
    // With nothing in the account there is no spending ceiling to set; the
    // buy itself says why, so no empty group is drawn.
    await expect(
      paid.getByRole("group", { name: "Spending ceiling" }),
    ).toHaveCount(0);
    await expect(page.getByTestId("campaign-advertising-buy")).toBeDisabled();
    await expect(page.getByTestId("campaign-advertising-buy")).toContainText(
      "nothing in the account",
    );
    const place = geography.getByRole("radio").first();
    await place.focus();
    await page.keyboard.press("Space");
    await expect(place).toBeChecked();
    await expect(place).toHaveAccessibleName(/Kentucky/);

    await secureCampaignHost(page);
    expect(await workOfferedCampaignChoices(page, ["door-canvass"])).toBe(1);
    await expect(page.getByTestId("campaign-recent-results")).toContainText(
      "Door canvass",
    );
    expect(errors).toEqual([]);
  });

  test("reaches election day by living the weeks, and carries on afterwards", async ({
    page,
  }) => {
    // The Day action and subsequent Week presses reach the real election day.
    test.setTimeout(90_000);
    const errors = watchForErrors(page);
    await freshBrowser(page);
    await beginAdultLifeIn(page, "Kentucky");

    await fileCandidacy(page);
    // Since c73ce6024 campaign work is booked from the hosted choices and
    // attended; the retired "Do this now" outreach row is gone.
    await secureCampaignHost(page);
    expect(await workOfferedCampaignChoices(page)).toBeGreaterThan(0);
    await expect(page.getByTestId("campaign-recent-results")).toBeVisible();

    // Nobody presses "hold the election". The world reaches the date.
    expect(await liveUntilDecided(page)).toBe(true);

    const result = page.getByTestId("campaign-result");
    await expect(result).toBeVisible();
    await expect(page.getByTestId("campaign-afterword")).toContainText(
      /\b(?:won|lost)[,.]/i,
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

    if (/\blost[,.]/i.test(afterword)) {
      // The recorded loss stays in Campaigns after another Day.
      await openCampaign(page);
      await expect(page.getByTestId("campaign-afterword")).toHaveText(
        afterword,
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
    // Since c73ce6024 the committee's work is a hosted, attended fundraiser.
    await secureCampaignHost(page);
    expect(await workOfferedCampaignChoices(page, ["fundraiser"])).toBe(1);
    const results =
      (await page.getByTestId("campaign-recent-results").textContent()) ?? "";
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
    await expect(page.getByTestId("campaign-recent-results")).toHaveText(
      results,
    );

    expect(errors).toEqual([]);
  });
});

test.describe("P85D integration through ordinary player controls", () => {
  for (const activation of ["pointer", "keyboard"] as const) {
    test(`resolves election day through the ${activation} Work day control`, async ({
      page,
    }) => {
      // Same Day-then-Week route as the sibling case.
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
      const before =
        (await page
          .getByTestId("shell-nav-cluster")
          .getAttribute("aria-label")) ?? "";
      const passDay = page.getByTestId("shell-pass-day");
      await waitForClockIdle(page);
      await expect(passDay).not.toHaveAttribute("aria-disabled", "true");
      if (activation === "keyboard") {
        await passDay.focus();
        await page.keyboard.press("Enter");
      } else {
        await passDay.click();
      }
      // The press has to land before the corner clock takes over the loop:
      // the runner ignores a second command while the first is in flight.
      await waitForClockIdle(page);
      await expect(page.getByTestId("shell-nav-cluster")).not.toHaveAttribute(
        "aria-label",
        before,
      );
      expect(await liveUntilDecided(page)).toBe(true);
      await expect(page.getByTestId("campaign-result")).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("a Lexington winner can activate Kentucky Work before and after reload", async ({
    page,
  }) => {
    // Measured on 730accec: securing a chapter host takes about 5 s and the
    // hosted weekly campaign to the November result about 160 s, before the
    // walk to the term and a reload.
    test.setTimeout(360_000);
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
    // Since c73ce6024 the campaign is won with hosted, attended field work
    // rather than the retired "Do this now" row.
    await secureCampaignHost(page);
    expect(await campaignHostedUntilDecided(page)).toBe(true);
    await expect(page.getByTestId("campaign-afterword")).toContainText(
      /\bwon[,.]/,
    );
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

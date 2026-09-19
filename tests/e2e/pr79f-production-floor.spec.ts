import { campaignUntilDecided, fileCandidacy } from "./support/campaign";
import { expect, test, type Page } from "./fixtures";

import {
  enterLife,
  expectNoDestination,
  goTo,
  openElsewhere,
  shellIdentity,
  startLife,
} from "./support/creator";

/**
 * 79F, in a browser, on the route a player actually opens.
 *
 * No `?view=floor` anywhere in this file: the game starts at the title
 * screen, a life is created, a candidacy is filed, the election is reached by
 * living the weeks, and the members' room is entered from the office the win
 * opened. The save/reload leg goes through the ordinary browser repository.
 */

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

/** Running for office lives in Politics → Campaigns, beside the time control. */
async function openCampaign(page: Page) {
  await openElsewhere(page, "campaign");
  await expect(page.getByTestId("work-section-campaign")).toBeVisible();
}

async function talkToFirstColleague(page: Page) {
  await page.getByTestId("scene-person").click();
  await page.getByRole("menuitem", { name: /Talk/ }).click();
  await expect(page.getByTestId("conversation-strip")).toBeVisible();
}

test("a winner reaches real bargaining from normal play, and keeps it through a reload", async ({
  page,
}) => {
  test.setTimeout(240_000);
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

  // Ordinary Work is available; it grants no institutional workspace.
  await goTo(page, "elsewhere-work");
  await expect(page.getByTestId("personal-work-section")).toBeVisible();
  await expect(page.getByTestId("office-section")).toHaveCount(0);

  await openCampaign(page);
  await fileCandidacy(page);
  await page.getByTestId("campaign-fundraising").click();
  expect(
    await campaignUntilDecided(page, (page) =>
      page.getByTestId("pass-day").click(),
    ),
  ).toBe(true);
  await expect(page.getByTestId("campaign-afterword")).toContainText("won.");

  // The win opened the office; the corner cluster still says Lexington.
  expect(await shellIdentity(page)).toContain("Lexington");
  await openElsewhere(page, "work");
  // The election result is not office authority. Advance the ordinary shell
  // clock until the recorded term starts, just as the composed campaign proof
  // does, and only then expect the legislative office to exist.
  for (let step = 0; step < 52; step += 1) {
    if (await page.getByTestId("office-section").isVisible()) break;
    await page.getByTestId("shell-pass-week").click();
  }
  await expect(page.getByTestId("office-section")).toContainText(
    "Kentucky legislature",
  );

  // Take the bill up and walk it to the floor through the ordinary steps.
  await page.getByTestId("open-legislation").click();
  await expect(page.getByTestId("legislation-workspace")).toBeVisible();
  for (const step of [
    "request-referral",
    "request-committee-hearing",
    "move-committee-report",
    "request-calendar-placement",
  ]) {
    await page.getByTestId(`legislation-step-${step}`).click();
  }

  // Into the members' room, from the office, in this world.
  await page.getByTestId("open-floor").click();
  await expect(page.getByTestId("production-floor")).toBeVisible();
  const view = page.getByTestId("measure-floor-view");
  await expect(view).toBeVisible();
  await expect(view).toHaveAttribute("data-provision-count", "3");

  // Talk to a modelled colleague; talking legislates nothing.
  await talkToFirstColleague(page);
  const strip = page.getByTestId("conversation-strip");
  // The colleague talks about the bill this world filed, whose number came
  // from the jurisdiction's own numbering rather than from a scenario. So the
  // check is that they name a House bill of this legislature — and, below,
  // that the paper on the desk is the same one.
  await expect(strip).toContainText(/\bHB \d+\b/);
  const designation = (await strip.textContent())?.match(/\bHB \d+\b/)?.[0];
  expect(designation, "the conversation should name the bill").toBeTruthy();
  await strip.getByRole("button", { name: /what they actually want/ }).click();
  await expect(strip.locator("blockquote").first()).not.toBeEmpty();
  await expect(view).toHaveAttribute("data-provision-count", "3");
  await strip.getByRole("button", { name: "Close conversation" }).click();

  // Inspect the bill and its fiscal note — canonical knowledge in this save.
  await page.getByTestId("working-document-entry").click();
  await expect(page.getByTestId("measure-paper")).toBeVisible();
  // One bill, named the same way in the room and on the page. The heading sits
  // on the workspace around the paper, not inside the sections article.
  await expect(page.getByTestId("measure-paper-workspace")).toContainText(
    designation!,
  );
  await page.getByTestId("open-fiscal-note").click();
  await page.getByTestId("read-fiscal-note").click();
  await expect(page.getByTestId("fiscal-note-body")).toContainText("8,000,000");
  await page.getByTestId("close-panel").click();
  await page.getByRole("button", { name: "Back to the room" }).click();

  // Save from the ordinary repository, then reload the browser.
  await page.getByTestId("leave-floor").click();
  await goTo(page, "keep-world");
  await expectNoDestination(page, "keep-world");
  await page.reload();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await enterLife(page);
  expect(await shellIdentity(page)).toContain("Lexington");

  // The same seat, chamber and bill are still there after the reload.
  await openElsewhere(page, "work");
  await page.getByTestId("open-legislation").click();
  await page.getByTestId("open-floor").click();
  await expect(page.getByTestId("measure-floor-view")).toBeVisible();
  await expect(page.getByTestId("measure-floor-view")).toHaveAttribute(
    "data-provision-count",
    "3",
  );

  // Put the negotiated section to the chamber, then call the vote — the two
  // moves that actually change something, now running against this save.
  await page.getByTestId("working-document-entry").click();
  await page.getByTestId("open-proposal").click();
  await page.getByTestId("variant-capped").click();
  await page.getByTestId("offer-amendment").click();
  await expect(page.getByTestId("measure-message")).toBeVisible();
  await page.getByTestId("call-the-vote").click();
  await expect(page.getByTestId("floor-result")).toBeVisible();
  await expect(page.getByTestId("member-accounts")).toBeVisible();

  expect(errors).toEqual([]);
});

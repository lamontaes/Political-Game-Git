import { programConfigurations } from "../../src/simulation/legislation-program-families";
import { shotPath } from "./support/shot-path";
import { expect, test, type Page } from "@playwright/test";

import {
  enterLife,
  expectNoDestination,
  goTo,
  openElsewhere,
  openShellMenu,
  startLife,
} from "./support/creator";

/**
 * The owner's click path, in a browser, through the ordinary game entry.
 *
 * No `?view=floor`, no fixture world, no developer state substitution: this
 * starts a life, wins a seat, and works the docket the way a player does. What
 * it has to show is the thing the packet asked for and the thing a screenshot
 * cannot fake — that the player can compare two genuinely different proposals,
 * change something meaningful, watch the clause text change with it, file the
 * bill, come back to it, and carry more than one at a time.
 */

const FORBIDDEN = [
  /decision trace/i,
  /optionKey/,
  /stableKey/,
  /provisionKey/,
  /familyKey/,
  /serializeWorld/,
  /undefined/,
  /\[object Object\]/,
  /NaN/,
];

async function expectNoDeveloperLeak(page: Page) {
  const body = page.locator("body");
  for (const pattern of FORBIDDEN) {
    await expect(body).not.toContainText(pattern);
  }
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
}

/** Running for office lives in Work (PT3), beside the day's time control. */
async function openCampaign(page: Page) {
  await openElsewhere(page, "work");
  await expect(page.getByTestId("work-section-campaign")).toBeVisible();
}

async function liveUntilDecided(page: Page, maxDays = 45) {
  for (let day = 0; day < maxDays; day += 1) {
    if (await page.getByTestId("campaign-result").isVisible()) return true;
    await page.getByTestId("pass-day").click();
  }
  return page.getByTestId("campaign-result").isVisible();
}

/** A won Kentucky seat, with Work open, reached the way a player reaches it. */
async function wonSeatWithWorkOpen(page: Page) {
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
  await expect(page.getByTestId("office-section")).toBeVisible();
}

test.describe("the docket, from the ordinary route", () => {
  test("compare two proposals, change the scope, file it, and come back", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await wonSeatWithWorkOpen(page);

    // The docket is there, and it is honest about being empty.
    const docket = page.getByTestId("docket");
    await expect(docket).toBeVisible();
    await expect(page.getByTestId("docket-empty")).toContainText(
      "Nothing has been filed yet",
    );

    // Every registered configuration is reachable; the original eight remain controls.
    await page.getByTestId("open-drafting-table").click();
    const options = page.getByTestId("drafting-options");
    await expect(options.getByRole("button")).toHaveCount(
      programConfigurations().length,
    );

    // Two genuinely different proposals, compared by reading them.
    await expect(options).toContainText("Program authorization");
    await expect(options).not.toContainText("Programme authorization");
    await expect(options).toContainText("Transit access");
    await expect(options).toContainText("Bridge and culvert maintenance");
    await expect(options).toContainText("Broadband access");
    await expect(options).toContainText("Water service lines");

    // Pick one that is not a spending bill at all, and read what it says.
    await page
      .getByTestId("drafting-option-water-service-lines-inventory-and-plan")
      .click();
    await expect(page.getByTestId("drafting-total")).toContainText(
      "authorizes no money at all",
    );

    // Now pick one that is, and change something that matters.
    await page
      .getByTestId("drafting-option-bridge-maintenance-worst-first-condition")
      .click();
    const compare = page.getByTestId("drafting-compare");
    await expect(compare).toBeVisible();
    await expect(compare).toContainText("condition rating of 4 or below");

    // Move the eligibility threshold with the keyboard, the way a control has
    // to work for somebody who is not using a mouse. End takes a range input
    // to its maximum.
    const threshold = page.getByTestId("draft-param-condition-threshold");
    await threshold.focus();
    await threshold.press("End");
    await expect(compare).toContainText("condition rating of 6 or below");
    await expect(
      page.getByTestId("drafting-row-eligible-structures"),
    ).toHaveClass(/drafting-row-changed/);

    // And the amount, which is a different dimension of the same bill. Taking
    // it to the family's declared ceiling proves the number and the text move
    // together, and that the ceiling is the one the bank declares.
    const money = page.getByTestId("draft-param-repair-authorization");
    await money.focus();
    await money.press("End");
    await expect(page.getByTestId("drafting-total")).toContainText(
      "$60,000,000",
    );
    await expect(compare).toContainText("$60,000,000");

    // File it. This is the only write on this surface.
    await page.getByTestId("file-the-draft").click();
    const bill = page.getByTestId("docket-bill");
    await expect(bill).toBeVisible();

    // Sponsor, the player's own part in it, the date and the stage are all
    // separate facts, and the lineage says which configuration wrote it.
    await expect(page.getByTestId("docket-role")).not.toBeEmpty();
    await expect(page.getByTestId("docket-lineage")).toContainText(
      "Bridge and culvert maintenance",
    );
    await expect(page.getByTestId("docket-filed-on")).not.toBeEmpty();

    // The filed sections are the ones that were configured, read back from the
    // bill rather than from the drafting table.
    const clauses = page.getByTestId("docket-clauses");
    await expect(clauses).toContainText("condition rating of 6 or below");
    await expect(page.getByTestId("docket-stated-total")).toContainText(
      "$60,000,000",
    );

    // The analysis refuses to forecast, and says exactly what is missing.
    await expect(page.getByTestId("docket-estimate")).toContainText(
      "No estimate is available",
    );

    await expectNoDeveloperLeak(page);
    expect(errors).toEqual([]);
  });

  test("carries three bills at once, and reopens the first", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await wonSeatWithWorkOpen(page);

    const configurations = [
      "drafting-option-transit-access-enrollment-fare-relief",
      "drafting-option-broadband-access-adoption-support",
      "drafting-option-water-service-lines-inventory-and-plan",
    ];
    for (const configuration of configurations) {
      await page.getByTestId("open-drafting-table").click();
      await page.getByTestId(configuration).click();
      await page.getByTestId("file-the-draft").click();
      await expect(page.getByTestId("docket-bill")).toBeVisible();
    }

    // Three separate bills on one docket, each with its own designation.
    const entries = page.getByTestId("docket-list").getByRole("listitem");
    await expect(entries).toHaveCount(3);

    // Reopen the first and confirm it is still itself.
    await page
      .getByTestId("docket-open-legislative-docket:kentucky:bill-001")
      .click();
    await expect(page.getByTestId("docket-lineage")).toContainText(
      "Transit access",
    );
    await expect(page.getByTestId("docket-clauses")).toContainText(
      "removing the fare barrier",
    );

    // And the third is a different bill entirely, not a renamed copy.
    await page
      .getByTestId("docket-open-legislative-docket:kentucky:bill-003")
      .click();
    await expect(page.getByTestId("docket-lineage")).toContainText(
      "Water service lines",
    );
    await expect(page.getByTestId("docket-clauses")).toContainText(
      "community water system",
    );
    await expect(page.getByTestId("docket-stated-total")).toContainText(
      "states no amount",
    );

    await expectNoDeveloperLeak(page);
    expect(errors).toEqual([]);
  });

  test("keeps the docket across a save and a reload", async ({ page }) => {
    const errors = watchForErrors(page);
    await wonSeatWithWorkOpen(page);

    await page.getByTestId("open-drafting-table").click();
    await page
      .getByTestId("drafting-option-broadband-access-unserved-buildout")
      .click();
    await page.getByTestId("file-the-draft").click();
    await expect(page.getByTestId("docket-bill")).toBeVisible();

    // Keep lives in the corner menu; it is opened the way a player opens it.
    await goTo(page, "keep-world");
    await expectNoDestination(page, "keep-world");
    await page.reload();
    await page.getByTestId("continue").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await enterLife(page);

    await openShellMenu(page);
    await page.getByTestId("elsewhere-work").focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("docket-list")).toBeVisible();
    await page
      .getByTestId("docket-open-legislative-docket:kentucky:bill-001")
      .click();
    await expect(page.getByTestId("docket-lineage")).toContainText(
      "Broadband access",
    );
    await expect(page.getByTestId("docket-clauses")).toContainText(
      "megabits per second",
    );

    await expectNoDeveloperLeak(page);
    expect(errors).toEqual([]);
  });
});

test("saves compatible proposed changes through ordinary Work without rewriting the bill", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const errors = watchForErrors(page);
  await wonSeatWithWorkOpen(page);
  const office = page.getByTestId("docket-office-record");
  await office.locator("summary").click();
  await expect(office).toContainText("No committee appointment record");
  await page.getByTestId("open-drafting-table").click();
  await page
    .getByTestId(
      "drafting-option-education-facilities-school-repair-authorization",
    )
    .click();
  await page.getByTestId("file-the-draft").click();
  await expect(page.getByTestId("docket-role")).toContainText(
    "You are the sponsor of record",
  );
  const history = page.getByTestId("docket-recorded-history");
  await history.locator("summary").click();
  await expect(history.locator("li")).not.toHaveCount(0);
  const clauses = page.getByTestId("docket-clauses");
  const originalText = await clauses.innerText();
  const composition = page.getByTestId("docket-composition");
  await composition.locator("summary").focus();
  await page.keyboard.press("Space");
  const choice = page.getByTestId("amend-param-operative-choice");
  await choice.focus();
  await choice.press("p");
  await choice.press("Tab");
  await expect(choice).toHaveValue("prevent-closure");
  const money = page.getByTestId("amend-param-programme-ceiling");
  await money.focus();
  await money.press("Home");
  const comparison = page.getByTestId("composition-comparison");
  await expect(comparison.locator("section")).toHaveCount(2);
  await expect(comparison).toContainText("keep teaching spaces usable");
  const save = page.getByTestId("save-composed-amendment");
  await save.focus();
  await page.keyboard.press("Enter");
  await expect(
    composition
      .getByRole("status")
      .filter({ hasText: "Proposed changes saved" }),
  ).toContainText("Proposed changes saved");
  expect(await clauses.innerText()).toBe(originalText);
  // Keep lives in the corner menu; it is opened the way a player opens it.
  await goTo(page, "keep-world");
  await expectNoDestination(page, "keep-world");
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openElsewhere(page, "work");
  await page.getByTestId("docket-composition").locator("summary").click();
  await expect(page.getByTestId("amend-param-operative-choice")).toHaveValue(
    "prevent-closure",
  );
  await expect(
    page.getByTestId("composition-comparison").locator("section"),
  ).toHaveCount(2);
  expect(await page.getByTestId("docket-clauses").innerText()).toBe(
    originalText,
  );
  await page.getByTestId("composition-comparison").scrollIntoViewIfNeeded();
  await page.screenshot({
    fullPage: true,
    path: shotPath("finish4-private-comparison.png"),
  });
  await expectNoDeveloperLeak(page);
  expect(errors).toEqual([]);
});

test("new service clauses, saved selection and unavailable scenario refusal work through Work", async ({
  page,
}) => {
  const errors = watchForErrors(page);
  await wonSeatWithWorkOpen(page);
  await page.getByTestId("open-drafting-table").click();
  await page
    .getByTestId(
      "drafting-option-education-facilities-school-repair-authorization",
    )
    .click();
  const choice = page.getByTestId("draft-param-operative-choice");
  await choice.focus();
  await choice.press("p");
  await choice.press("Tab");
  await expect(choice).toHaveValue("prevent-closure");
  const commencement = page.getByTestId("draft-param-commencement");
  await commencement.focus();
  await commencement.press("t");
  await commencement.press("Tab");
  await expect(commencement).toHaveValue("next-calendar-year");
  await expect(page.getByTestId("drafting-compare")).toContainText("January 1");
  await page.getByTestId("file-the-draft").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("docket-lineage")).toContainText(
    "Education facilities",
  );
  await expect(page.getByTestId("docket-clauses")).toContainText(
    "separate appropriation",
  );
  await page.getByTestId("record-conditional-estimate").focus();
  await page.keyboard.press("Enter");
  // The normal life route deliberately has no production metric/mechanism catalog.
  // It must refuse without importing the richer legislative test fixture.
  await expect(page.getByRole("alert")).toContainText(
    "A spending scenario cannot be calculated with the information currently available.",
  );
  await expect(page.getByTestId("docket-recorded-estimate")).toHaveCount(0);
  await page.screenshot({
    fullPage: true,
    path: shotPath("american-english1-unavailable-estimate.png"),
  });

  await page.getByTestId("open-drafting-table").click();
  await page
    .getByTestId(
      "drafting-option-procurement-disclosure-award-reasons-publication",
    )
    .click();
  await page.getByTestId("file-the-draft").click();
  await expect(page.getByTestId("docket-clauses")).toContainText(
    "selection criteria",
  );
  await expect(page.getByTestId("record-conditional-estimate")).toHaveCount(0);
  await page
    .getByTestId("docket-open-legislative-docket:kentucky:bill-001")
    .click();
  // Keep lives in the corner menu; it is opened the way a player opens it.
  await goTo(page, "keep-world");
  await expectNoDestination(page, "keep-world");
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openElsewhere(page, "work");
  // The selected bill returns without another selection; refusal created no estimate.
  await expect(page.getByTestId("docket-lineage")).toContainText(
    "Education facilities",
  );
  await expect(page.getByTestId("docket-recorded-estimate")).toHaveCount(0);
  await page.screenshot({
    fullPage: true,
    path: shotPath("american-english1-reloaded-selection.png"),
  });
  await page
    .getByTestId("docket-open-legislative-docket:kentucky:bill-002")
    .focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("docket-lineage")).toContainText(
    "Procurement disclosure",
  );
  await expectNoDeveloperLeak(page);
  expect(errors).toEqual([]);
});

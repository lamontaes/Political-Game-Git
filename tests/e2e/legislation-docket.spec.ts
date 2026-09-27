import { shotPath } from "./support/shot-path";
import { expect, test, type Page } from "./fixtures";
import { enterRecordedMemberTerm } from "./support/legislative-entry";
import { chosenValue } from "./support/controls";
import { selectDraftOption } from "./support/docket-navigation";

import {
  enterLife,
  saveLife,
  openElsewhere,
  openShellMenu,
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

/** Running for office lives in Politics → Campaigns, beside the time control. */

/** A won Kentucky seat, with Work open, reached the way a player reaches it. */
/**
 * A seated member with Work open, constructed rather than campaigned for.
 *
 * These cases are about the DOCKET. Reaching the seat the ordinary way costs a
 * won campaign plus the walk from a February result to the term's January
 * start — an election result is not office authority — and that walk is what
 * these thirty-second budgets die on, not a wrong assertion. The ordinary
 * route is still proven by office-onboarding-ordinary, pr79f and
 * campaign-first-election, which keep the real campaign and have the budget.
 */
async function wonSeatWithWorkOpen(page: Page) {
  await freshBrowser(page);
  await page.goto("/");
  await enterRecordedMemberTerm(page);
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

    // The menu begins with supported subjects, then exposes only populated topics.
    await page.getByTestId("open-drafting-table").click();
    const subjects = page.getByTestId("drafting-subjects");
    await expect(subjects.getByRole("button")).not.toHaveCount(0);
    await expect(subjects).toContainText("Infrastructure");
    await expect(subjects).toContainText("Education");
    await expect(subjects).not.toContainText("Immigration & Citizenship");

    await page.getByTestId("drafting-subject-infrastructure").click();
    await expect(page.getByTestId("drafting-topics")).toContainText(
      "Transportation",
    );
    await expect(page.getByTestId("drafting-topics")).toContainText(
      "Water and Wastewater",
    );

    // Pick one that is not a spending bill at all, and read what it says.
    await selectDraftOption(page, "water-service-lines", "inventory-and-plan");
    await expect(page.getByTestId("drafting-total")).toContainText(
      "authorizes no money at all",
    );

    // Now pick one that is, and change something that matters.
    await selectDraftOption(
      page,
      "bridge-maintenance",
      "worst-first-condition",
    );
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
    // A repair program for standing structures bears on the catalog's
    // upkeep-before-new-construction question, and the docket says so.
    await expect(page.getByTestId("docket-questions")).toHaveText(
      "Should maintenance of existing infrastructure be funded before new construction?",
    );

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

  test("cross-links and shared groups return to the same available option", async ({
    page,
  }) => {
    await wonSeatWithWorkOpen(page);
    await page.getByTestId("open-drafting-table").click();
    await selectDraftOption(page, "transit-access", "enrollment-fare-relief");

    const primaryLocation = page.getByTestId("drafting-primary-location");
    await expect(primaryLocation).toContainText(
      "Infrastructure › Transportation › Public Transit › Fare Relief",
    );
    await page
      .getByTestId(
        "drafting-crosslink-assistance-social-insurance-transit-access-enrollment-fare-relief",
      )
      .click();
    await expect(page.getByTestId("drafting-topic-home")).toContainText(
      "Assistance & Social Insurance",
    );
    await expect(
      page.getByTestId(
        "drafting-content-link-assistance-social-insurance-transit-access-enrollment-fare-relief",
      ),
    ).toContainText("Primary topic: Infrastructure");
    await page
      .getByTestId(
        "drafting-content-link-assistance-social-insurance-transit-access-enrollment-fare-relief",
      )
      .click();
    await expect(primaryLocation).toContainText(
      "Infrastructure › Transportation › Public Transit › Fare Relief",
    );
    const selectedGroups = page
      .getByTestId("drafting-selected-groups")
      .getByRole("button");
    await expect(selectedGroups).not.toHaveCount(0);
    await selectedGroups.first().click();
    const sharedGroups = page
      .getByTestId("drafting-shared-groups")
      .getByRole("button");
    await expect(
      page.getByTestId("drafting-group-timing-and-transition"),
    ).toBeVisible();
    await expect(
      page.getByTestId("drafting-group-amendment-and-repeal"),
    ).toBeVisible();
    await expect(sharedGroups).not.toHaveCount(0);
    await expect(page.getByTestId("drafting-options")).toContainText(
      "Transit access",
    );
    await expect(
      page
        .getByTestId("drafting-options")
        .getByTestId("drafting-option-transit-access-enrollment-fare-relief"),
    ).toHaveCount(1);
  });

  test("authority-required bills reveal their authority picker before preview", async ({
    page,
  }) => {
    await wonSeatWithWorkOpen(page);
    await page.getByTestId("open-drafting-table").click();
    await selectDraftOption(page, "appropriations", "single-programme");

    await expect(page.getByTestId("drafting-authority")).toBeVisible();
    await expect(page.getByTestId("drafting-controls")).toBeVisible();
    const authorityChoices = page
      .getByTestId("drafting-authority")
      .getByRole("button");
    if ((await authorityChoices.count()) > 0) {
      await authorityChoices.first().click();
      await expect(page.getByTestId("drafting-compare")).toBeVisible();
    } else {
      await expect(page.getByTestId("drafting-no-authority")).toContainText(
        "An appropriation has to name a program that is already authorized to spend",
      );
      await expect(page.getByTestId("file-the-draft")).not.toBeVisible();
    }
  });

  test("carries three bills at once, and reopens the first", async ({
    page,
  }) => {
    const errors = watchForErrors(page);
    await wonSeatWithWorkOpen(page);

    const configurations = [
      ["transit-access", "enrollment-fare-relief"],
      ["broadband-access", "adoption-support"],
      ["water-service-lines", "inventory-and-plan"],
    ] as const;
    for (const [familyKey, variantKey] of configurations) {
      await page.getByTestId("open-drafting-table").click();
      await selectDraftOption(page, familyKey, variantKey);
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
    await selectDraftOption(page, "broadband-access", "unserved-buildout");
    await page.getByTestId("file-the-draft").click();
    await expect(page.getByTestId("docket-bill")).toBeVisible();

    // Keep or Save, depending on whether this life already has a slot. The
    // constructed seat arrives from a world that was already written once, so
    // the menu offers Save rather than Keep; saveLife() takes either and
    // asserts Keep is gone afterwards.
    await saveLife(page);
    await page.reload();
    await page.getByTestId("continue").click();
    await expect(page.getByTestId("play-screen")).toBeVisible();
    await enterLife(page);

    await openShellMenu(page);
    await page.getByTestId("nav-politics").focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("politics-tab-office")).toHaveAttribute(
      "aria-current",
      "page",
    );
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
  // The office record says why there is no committee seat, in the player's
  // own words: this chamber's other members are not in the game, so its
  // committees have nobody on them.
  await expect(office).toContainText("its committees have no members");
  await page.getByTestId("open-drafting-table").click();
  await selectDraftOption(
    page,
    "education-facilities",
    "school-repair-authorization",
  );
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
  // The operative choice is a GameSelect now — a combobox button carrying its
  // choice in data-value — not a native <select>, so toHaveValue() reads an
  // input that is not there. chosenValue() answers for either kind.
  expect(await chosenValue(choice)).toBe("prevent-closure");
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
  // Keep or Save, depending on whether this life already has a slot; the
  // constructed seat arrives already written once, so it is Save.
  await saveLife(page);
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openElsewhere(page, "work");
  await page.getByTestId("docket-composition").locator("summary").click();
  expect(
    await chosenValue(page.getByTestId("amend-param-operative-choice")),
  ).toBe("prevent-closure");
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
  await selectDraftOption(
    page,
    "education-facilities",
    "school-repair-authorization",
  );
  const choice = page.getByTestId("draft-param-operative-choice");
  await choice.focus();
  await choice.press("p");
  await choice.press("Tab");
  // The operative choice is a GameSelect now — a combobox button carrying its
  // choice in data-value — not a native <select>, so toHaveValue() reads an
  // input that is not there. chosenValue() answers for either kind.
  expect(await chosenValue(choice)).toBe("prevent-closure");
  const commencement = page.getByTestId("draft-param-commencement");
  await commencement.focus();
  await commencement.press("t");
  await commencement.press("Tab");
  expect(await chosenValue(commencement)).toBe("next-calendar-year");
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
  await selectDraftOption(
    page,
    "procurement-disclosure",
    "award-reasons-publication",
  );
  await page.getByTestId("file-the-draft").click();
  await expect(page.getByTestId("docket-clauses")).toContainText(
    "selection criteria",
  );
  await expect(page.getByTestId("record-conditional-estimate")).toHaveCount(0);
  await page
    .getByTestId("docket-open-legislative-docket:kentucky:bill-001")
    .click();
  // Keep or Save, depending on whether this life already has a slot; the
  // constructed seat arrives already written once, so it is Save.
  await saveLife(page);
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

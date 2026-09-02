import { expect, test, type Page } from "@playwright/test";

const KENTUCKY = "/?view=legislation&place=kentucky";
const NEBRASKA = "/?view=legislation&place=nebraska";
const ALASKA = "/?view=legislation&place=alaska";

async function open(page: Page, url: string) {
  await page.goto(url);
  await page.evaluate(() => window.localStorage.clear());
  await page.goto(url);
  await expect(page.getByTestId("legislation-workspace")).toBeVisible();
}

async function step(page: Page, key: string) {
  const button = page.getByTestId(`legislation-step-${key}`);
  await expect(button, `step ${key} should be offered`).toBeVisible();
  await button.click();
}

async function where(page: Page): Promise<string> {
  return (await page.getByTestId("legislation-where").textContent()) ?? "";
}

async function voteRows(page: Page): Promise<string[][]> {
  const toggle = page.getByTestId("legislation-toggle-record");
  if ((await toggle.textContent())?.includes("Show")) await toggle.click();
  return page
    .getByTestId("legislation-votes")
    .locator("tbody tr")
    .evaluateAll((rows) =>
      rows.map((row) =>
        Array.from(row.querySelectorAll("td")).map((cell) =>
          cell.textContent!.trim(),
        ),
      ),
    );
}

test.describe("Moving a bill through a legislature", () => {
  test("Kentucky: the Senate changes the bill, so the House has to agree", async ({
    page,
  }) => {
    await open(page, KENTUCKY);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "HB 214",
    );
    expect(await where(page)).toContain("waiting to be sent to a committee");
    await expect(page.getByTestId("legislation-who")).toHaveText(
      "Committee on Committees",
    );

    await step(page, "request-referral");
    expect(await where(page)).toContain("Committee on Transportation");
    // Kentucky committees may sit on a bill, and the game says so.
    await expect(page.getByTestId("legislation-uncertainties")).toContainText(
      "can simply decline to take the bill up",
    );
    await expect(page.getByTestId("legislation-requirement")).toContainText(
      "a majority of the committee's membership",
    );

    await step(page, "request-committee-hearing");
    await step(page, "move-committee-report");
    await step(page, "request-calendar-placement");
    await expect(page.getByTestId("legislation-requirement")).toContainText(
      "a majority of all the members elected to the chamber",
    );

    await step(page, "move-floor-vote");
    expect(await where(page)).toContain("now goes to the Senate");
    await step(page, "transmit-to-second-chamber");
    await step(page, "request-referral");
    await step(page, "move-committee-report");
    await step(page, "request-calendar-placement");

    // The Senate changes the text before it passes it.
    await step(page, "offer-amendment");
    await step(page, "move-floor-vote");

    // That is not the end of it: the House has to live with the change.
    expect(await where(page)).toContain("has to decide whether to live");
    expect(await where(page)).not.toContain("final form");
    await expect(page.getByTestId("legislation-who")).toHaveText(
      "House of Representatives",
    );
    await page.screenshot({
      path: "test-results/legislation/kentucky-concurrence.png",
      fullPage: true,
    });

    await step(page, "move-concurrence");
    expect(await where(page)).toContain("agreed on one bill");

    await step(page, "request-enrollment");
    await step(page, "present-to-executive");
    expect(await where(page)).toContain("governor's desk");

    // The governor's decision is not the player's to make. There is one
    // neutral wait, and no button claiming to sign or veto.
    await expect(page.getByTestId("legislation-options")).toHaveCount(0);
    await expect(page.getByTestId("legislation-waiting")).toContainText(
      "Wait for the governor's decision",
    );
    await expect(page.getByTestId("legislation-waiting")).not.toContainText(
      /signs|vetoes/,
    );
    await page.screenshot({
      path: "test-results/legislation/kentucky-governor-wait.png",
      fullPage: true,
    });

    await step(page, "await-executive-decision");
    expect(await where(page)).toContain("vetoed the bill");
    await expect(page.getByTestId("legislation-requirement")).toContainText(
      "a majority of all the members elected to each house",
    );

    await step(page, "move-veto-override");
    await step(page, "record-enactment");
    expect(await where(page)).toBe("The bill is law.");
    await expect(page.getByTestId("legislation-workspace")).toHaveAttribute(
      "data-finished",
      "true",
    );

    const rows = await voteRows(page);
    // Each chamber counts against its own elected membership.
    expect(
      rows.some(
        (row) =>
          row[1] === "House of Representatives" && row[6] === "51 of 100",
      ),
    ).toBe(true);
    expect(
      rows.some((row) => row[1] === "Senate" && row[6] === "20 of 38"),
    ).toBe(true);
    expect(
      rows.some((row) => row[0] === "Accept the other chamber's changes"),
    ).toBe(true);
    expect(
      rows.filter((row) => row[0] === "Override the governor's veto"),
    ).toHaveLength(2);

    await page.screenshot({
      path: "test-results/legislation/kentucky-enacted.png",
      fullPage: true,
    });
  });

  test("Nebraska: one chamber, three floor votes on three different days", async ({
    page,
  }) => {
    await open(page, NEBRASKA);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "LB 88",
    );

    await step(page, "request-referral");
    // Most bills are heard here, and the game will not promise more than that.
    await expect(page.getByTestId("legislation-uncertainties")).toContainText(
      "Most bills get a hearing here",
    );
    await step(page, "request-committee-hearing");
    await step(page, "move-committee-report");
    await step(page, "request-calendar-placement");

    expect(await where(page)).toContain("General File");
    await step(page, "move-floor-vote");
    expect(await where(page)).toContain("Select File");

    // The stages fall on separate legislative days, so the bill cannot be
    // reached again today. Waiting is the only thing on offer.
    await expect(page.getByTestId("legislation-options")).toHaveCount(0);
    await expect(page.getByTestId("legislation-waiting")).toContainText(
      "Wait for the next legislative day",
    );
    await page.screenshot({
      path: "test-results/legislation/nebraska-separate-days.png",
      fullPage: true,
    });
    await step(page, "await-next-legislative-day");
    await step(page, "move-floor-vote");

    expect(await where(page)).toContain("Final Reading");
    await step(page, "await-next-legislative-day");
    await step(page, "move-floor-vote");

    // There is never a second chamber to send it to.
    await expect(
      page.getByTestId("legislation-step-transmit-to-second-chamber"),
    ).toHaveCount(0);

    await step(page, "request-enrollment");
    await step(page, "present-to-executive");
    // Alaska is not the only place inaction is settled: here the bill becomes
    // law if the Governor lets the clock run out.
    await expect(page.getByTestId("legislation-uncertainties")).toContainText(
      "becomes law anyway",
    );
    await step(page, "await-executive-decision");
    await expect(page.getByTestId("legislation-requirement")).toContainText(
      "three-fifths of all the senators elected",
    );
    await step(page, "move-veto-override");
    await step(page, "record-enactment");
    expect(await where(page)).toBe("The bill is law.");

    const rows = await voteRows(page);
    const floorVotes = rows.filter((row) => row[0] === "Pass the bill");
    expect(floorVotes).toHaveLength(3);
    for (const row of floorVotes) expect(row[6]).toBe("25 of 49");
    // Three stages, three separate legislative days.
    expect(new Set(floorVotes.map((row) => row[2])).size).toBe(3);
    const override = rows.find(
      (row) => row[0] === "Override the governor's veto",
    );
    expect(override?.[6]).toBe("30 of 49");

    await page.screenshot({
      path: "test-results/legislation/nebraska-enacted.png",
      fullPage: true,
    });
  });

  test("Alaska: a whole-bill veto goes to both houses sitting together", async ({
    page,
  }) => {
    await open(page, ALASKA);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "HB 41",
    );

    await step(page, "request-referral");
    await step(page, "move-committee-report");
    await step(page, "request-calendar-placement");
    // Nothing read for this pack establishes the authority to amend on the
    // floor here, so the game does not offer it.
    await expect(
      page.getByTestId("legislation-step-offer-amendment"),
    ).toHaveCount(0);
    await step(page, "move-floor-vote");
    await step(page, "transmit-to-second-chamber");
    await step(page, "request-referral");
    await step(page, "move-committee-report");
    await step(page, "request-calendar-placement");
    await step(page, "move-floor-vote");
    await step(page, "request-enrollment");
    await step(page, "present-to-executive");
    await step(page, "await-executive-decision");

    // A whole bill returned, not an item struck out of it.
    expect(await where(page)).toContain("vetoed the bill");
    await expect(page.getByTestId("legislation-history")).toContainText(
      "returned the whole bill",
    );
    await expect(page.getByTestId("legislation-history")).not.toContainText(
      "reduced the appropriation",
    );

    // One joint sitting, not two chamber votes, and a higher bar for money.
    await expect(page.getByTestId("legislation-who")).toHaveText(
      "Joint session of the Legislature",
    );
    await expect(page.getByTestId("legislation-requirement")).toContainText(
      "three-quarters of the membership",
    );
    await expect(page.getByTestId("legislation-uncertainties")).toContainText(
      "as one body of 60",
    );

    await step(page, "move-veto-override");
    await step(page, "record-enactment");
    expect(await where(page)).toBe("The bill is law.");
    // Alaska's effective-date rule is settled, and the game states it.
    await expect(page.getByTestId("legislation-uncertainties")).toContainText(
      "ninety days after enactment",
    );

    const rows = await voteRows(page);
    const override = rows.find(
      (row) => row[0] === "Override the governor's veto",
    );
    expect(override?.[1]).toBe("Joint session of the Legislature");
    expect(override?.[6]).toBe("45 of 60");
    expect(
      rows.filter((row) => row[0] === "Override the governor's veto"),
    ).toHaveLength(1);

    await page.screenshot({
      path: "test-results/legislation/alaska-enacted.png",
      fullPage: true,
    });
  });

  test("a bill survives two saves and reloads with several amendments", async ({
    page,
  }) => {
    await open(page, KENTUCKY);
    await step(page, "request-referral");
    await step(page, "request-committee-hearing");
    await step(page, "move-committee-report");
    await step(page, "request-calendar-placement");

    // Amend, save, reload, amend again, save, reload, amend a third time.
    for (let round = 0; round < 2; round += 1) {
      await step(page, "offer-amendment");
      await page.getByTestId("legislation-save").click();
      await page.reload();
      await expect(page.getByTestId("legislation-workspace")).toHaveAttribute(
        "data-world-source",
        "restored",
      );
    }
    await step(page, "offer-amendment");
    await expect(page.getByTestId("legislation-error")).toHaveCount(0);

    const before = await where(page);
    const historyBefore = await page
      .getByTestId("legislation-history")
      .locator("li")
      .count();
    await page.getByTestId("legislation-save").click();
    await page.reload();

    expect(await where(page)).toBe(before);
    await expect(
      page.getByTestId("legislation-history").locator("li"),
    ).toHaveCount(historyBefore);
    // Carrying on after the reload still works, which is what used to break.
    await step(page, "move-floor-vote");
    await expect(page.getByTestId("legislation-error")).toHaveCount(0);

    await page.screenshot({
      path: "test-results/legislation/kentucky-restored.png",
      fullPage: true,
    });
  });

  test("the player surface speaks plainly", async ({ page }) => {
    await open(page, KENTUCKY);
    await step(page, "request-referral");
    const text = (await page.locator("main").innerText()).toLowerCase();
    for (const forbidden of [
      "run a",
      "run b",
      "run c",
      "fixture",
      "simulation",
      "presentation-only",
      "canonical",
      "minuteofday",
      "stablekey",
      "not settled in our sources",
    ]) {
      expect(
        text,
        `player text should not contain "${forbidden}"`,
      ).not.toContain(forbidden);
    }
  });

  test("the office shell offers a way in", async ({ page }) => {
    await page.goto("/?view=office-fixture");
    await page.getByTestId("navigation-cluster").click();
    await expect(page.getByTestId("nav-legislation")).toBeVisible();
    await page.getByTestId("nav-legislation").click();
    await expect(page.getByTestId("legislation-workspace")).toBeVisible();
  });
});

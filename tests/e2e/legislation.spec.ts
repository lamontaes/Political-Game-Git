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
  test("Kentucky: a bill becomes law over the governor's veto", async ({
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

    await step(page, "referred");
    expect(await where(page)).toContain("standing committee");
    // Kentucky committees may decline to take a bill up, and the game says so.
    await expect(page.getByTestId("legislation-uncertainties")).toContainText(
      "can simply decline to take the bill up",
    );
    await expect(page.getByTestId("legislation-requirement")).toContainText(
      "a majority of the committee's appointed members",
    );

    await step(page, "committee-hearing-held");
    await step(page, "committee-reported");
    await step(page, "placed-on-calendar");
    await expect(page.getByTestId("legislation-requirement")).toContainText(
      "a majority of all members elected to the chamber",
    );

    await step(page, "floor-stage-passed");
    expect(await where(page)).toContain("now goes to the Senate");
    await step(page, "transmitted");
    await step(page, "referred");
    await step(page, "committee-reported");
    await step(page, "placed-on-calendar");
    await step(page, "floor-stage-passed");

    await step(page, "enrolled");
    await step(page, "presented-to-executive");
    expect(await where(page)).toContain("governor's desk");
    // The sources do not settle what inaction means, and the game admits it.
    await expect(page.getByTestId("legislation-uncertainties")).toContainText(
      "not settled in our sources",
    );

    await step(page, "signed");
    expect(await where(page)).toContain("vetoed the bill");
    await expect(page.getByTestId("legislation-requirement")).toContainText(
      "a majority of all members elected to each house",
    );

    await step(page, "override-succeeded");
    await step(page, "enacted");
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
          row[1] === "House of Representatives" && row[5] === "51 of 100",
      ),
    ).toBe(true);
    expect(
      rows.some((row) => row[1] === "Senate" && row[5] === "20 of 38"),
    ).toBe(true);
    expect(
      rows.filter((row) => row[0] === "Override the governor's veto"),
    ).toHaveLength(2);

    await page.screenshot({
      path: "test-results/legislation/kentucky-enacted.png",
      fullPage: true,
    });
  });

  test("Nebraska: one chamber, three floor votes, and no second house at all", async ({
    page,
  }) => {
    await open(page, NEBRASKA);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "LB 88",
    );

    await step(page, "referred");
    // Nebraska guarantees a hearing, so the committee cannot skip it.
    await expect(page.getByTestId("legislation-uncertainties")).toContainText(
      "guaranteed a public hearing",
    );
    await step(page, "committee-hearing-held");
    await step(page, "committee-reported");
    await step(page, "placed-on-calendar");

    expect(await where(page)).toContain("General File");
    await step(page, "floor-stage-passed");
    expect(await where(page)).toContain("Select File");
    await step(page, "floor-stage-passed");
    expect(await where(page)).toContain("Final Reading");
    await step(page, "floor-stage-passed");

    // There is never a second chamber to send it to.
    await expect(page.getByTestId("legislation-step-transmitted")).toHaveCount(
      0,
    );
    expect(await where(page)).toContain("cleared the legislature");

    await step(page, "enrolled");
    await step(page, "presented-to-executive");
    await step(page, "signed");
    await expect(page.getByTestId("legislation-requirement")).toContainText(
      "three-fifths of all elected senators",
    );
    await step(page, "override-succeeded");
    await step(page, "enacted");
    expect(await where(page)).toBe("The bill is law.");

    const rows = await voteRows(page);
    const floorVotes = rows.filter((row) => row[0] === "Pass the bill");
    expect(floorVotes).toHaveLength(3);
    for (const row of floorVotes) expect(row[5]).toBe("25 of 49");
    const override = rows.find(
      (row) => row[0] === "Override the governor's veto",
    );
    expect(override?.[5]).toBe("30 of 49");

    await page.screenshot({
      path: "test-results/legislation/nebraska-enacted.png",
      fullPage: true,
    });
  });

  test("Alaska: the veto goes to both houses sitting together", async ({
    page,
  }) => {
    await open(page, ALASKA);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "HB 41",
    );

    await step(page, "referred");
    await step(page, "committee-reported");
    await step(page, "placed-on-calendar");
    await step(page, "floor-stage-passed");
    await step(page, "transmitted");
    await step(page, "referred");
    await step(page, "committee-reported");
    await step(page, "placed-on-calendar");
    await step(page, "floor-stage-passed");
    await step(page, "enrolled");
    await step(page, "presented-to-executive");
    await step(page, "signed");

    // One joint sitting, not two chamber votes, and a higher bar for money.
    await expect(page.getByTestId("legislation-who")).toHaveText(
      "Joint session of the Legislature",
    );
    await expect(page.getByTestId("legislation-requirement")).toContainText(
      "three-quarters of the combined membership",
    );
    await expect(page.getByTestId("legislation-uncertainties")).toContainText(
      "as one body of 60",
    );

    await step(page, "override-succeeded");
    await step(page, "enacted");
    expect(await where(page)).toBe("The bill is law.");

    const rows = await voteRows(page);
    const override = rows.find(
      (row) => row[0] === "Override the governor's veto",
    );
    expect(override?.[1]).toBe("Joint session of the Legislature");
    expect(override?.[5]).toBe("45 of 60");
    expect(
      rows.filter((row) => row[0] === "Override the governor's veto"),
    ).toHaveLength(1);

    await page.screenshot({
      path: "test-results/legislation/alaska-enacted.png",
      fullPage: true,
    });
  });

  test("a bill keeps its place across save and reload", async ({ page }) => {
    await open(page, KENTUCKY);
    await step(page, "referred");
    await step(page, "committee-hearing-held");
    await step(page, "committee-reported");
    await step(page, "placed-on-calendar");
    await step(page, "floor-stage-passed");
    const before = await where(page);
    const historyBefore = await page
      .getByTestId("legislation-history")
      .locator("li")
      .count();

    await page.getByTestId("legislation-save").click();
    await page.reload();

    await expect(page.getByTestId("legislation-workspace")).toHaveAttribute(
      "data-world-source",
      "restored",
    );
    expect(await where(page)).toBe(before);
    await expect(
      page.getByTestId("legislation-history").locator("li"),
    ).toHaveCount(historyBefore);

    await page.screenshot({
      path: "test-results/legislation/kentucky-restored.png",
      fullPage: true,
    });
  });

  test("the player surface speaks plainly", async ({ page }) => {
    await open(page, KENTUCKY);
    await step(page, "referred");
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
    ]) {
      expect(
        text,
        `player text should not contain "${forbidden}"`,
      ).not.toContain(forbidden);
    }
  });

  test("the office shell offers a way in", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("navigation-cluster").click();
    await expect(page.getByTestId("nav-legislation")).toBeVisible();
    await page.getByTestId("nav-legislation").click();
    await expect(page.getByTestId("legislation-workspace")).toBeVisible();
  });
});

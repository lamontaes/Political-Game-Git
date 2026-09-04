import { expect, test, type Page } from "@playwright/test";

/**
 * Browser proof for the pose contract.
 *
 * The acceptance standard this file holds: from ONE view a reviewer must be
 * able to see that changing pose does not change the person, that the drawn
 * body lands on the pose family's declared contacts, and that a pose with no
 * art says exactly what is missing instead of showing somebody else's picture.
 */

const ROUTE = "/?view=scene-proof";

async function openProof(page: Page) {
  await page.goto(ROUTE);
  await expect(page.getByTestId("pose-proof")).toBeVisible();
}

test.describe("pose and contact proof", () => {
  test("shows every registered pose family for more than one body family", async ({
    page,
  }) => {
    await openProof(page);
    const proof = page.getByTestId("pose-proof");
    await expect(proof).toHaveAttribute("data-person-count", "2");
    await expect(proof).toHaveAttribute("data-body-family-count", "2");

    const rows = page.getByTestId("pose-proof-person");
    await expect(rows).toHaveCount(2);
    const bodyFamilies = await rows.evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLElement).dataset.bodyFamily),
    );
    expect(new Set(bodyFamilies).size).toBe(2);

    // Six registered families per person: four P0 and two P1.
    await expect(page.getByTestId("pose-proof-cell")).toHaveCount(12);
    const p0 = page.locator(
      '[data-testid="pose-proof-cell"][data-priority="P0"]',
    );
    await expect(p0).toHaveCount(8);
  });

  test("keeps one identity across every pose family", async ({ page }) => {
    await openProof(page);
    await expect(page.getByTestId("pose-proof")).toHaveAttribute(
      "data-identity-stable",
      "true",
    );
    const keys = await page
      .getByTestId("pose-proof-person")
      .evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLElement).dataset.identityKey),
      );
    expect(new Set(keys).size).toBe(2);
    for (const key of keys) expect(key).toBeTruthy();
  });

  test("draws the body on the pose family's declared contacts", async ({
    page,
  }) => {
    await openProof(page);
    const drawn = page.locator(
      '[data-testid="pose-proof-cell"][data-drawn="true"]',
    );
    expect(await drawn.count()).toBeGreaterThanOrEqual(4);
    for (const cell of await drawn.all()) {
      const verdict = await cell.getAttribute("data-contacts-agree");
      // A drawn cell either lands inside its family's tolerance, or is a
      // generation-1 body that predates the contact contract and says so.
      expect(["true", "legacy-contactless"]).toContain(verdict);
      if (verdict === "true") {
        await expect(
          cell.getByTestId("pose-proof-contact-verdict"),
        ).toContainText("within");
      } else {
        await expect(
          cell.getByTestId("pose-proof-contact-verdict"),
        ).toContainText("legacy-contactless");
      }
    }
    // At least one drawn cell must be a real measured agreement, or the check
    // above would pass on a library that declares no contacts at all.
    expect(
      await page
        .locator('[data-testid="pose-proof-cell"][data-contacts-agree="true"]')
        .count(),
    ).toBeGreaterThanOrEqual(2);
    // No cell anywhere may report art outside its family's tolerance.
    await expect(
      page.locator(
        '[data-testid="pose-proof-cell"][data-contacts-agree="false"]',
      ),
    ).toHaveCount(0);
  });

  test("names the missing P0 poses instead of borrowing another pose's art", async ({
    page,
  }) => {
    await openProof(page);
    const missing = page.locator(
      '[data-testid="pose-proof-cell"][data-drawn="false"][data-priority="P0"]',
    );
    // Two P0 families have no art, for both people.
    await expect(missing).toHaveCount(4);
    for (const cell of await missing.all()) {
      await expect(cell.getByTestId("pose-proof-empty-cell")).toBeVisible();
      await expect(cell.getByTestId("pose-proof-body-layer")).toHaveCount(0);
      const gaps = cell.getByTestId("pose-proof-gaps");
      await expect(gaps).toBeVisible();
      await expect(gaps).toContainText("no released body art");
    }
    const families = await missing.evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLElement).dataset.poseFamily),
    );
    expect(new Set(families)).toEqual(
      new Set(["standing-conversational", "seated-guest-neutral"]),
    );
  });

  test("renders a control plate whose overlay lands exactly on the plate", async ({
    page,
  }) => {
    await openProof(page);
    const cell = page
      .locator(
        '[data-testid="pose-proof-cell"][data-pose-family="standing-neutral"]',
      )
      .first();
    const plate = cell.getByTestId("pose-proof-plate");
    await expect(plate.locator("img")).toBeVisible();

    // The plate box carries the plate's own aspect ratio, so an overlay
    // expressed in percentages is not thrown off by letterboxing.
    const letterboxed = await plate.evaluate((node) => {
      const image = node.querySelector("img") as HTMLImageElement;
      const box = node.getBoundingClientRect();
      const natural = image.naturalWidth / image.naturalHeight;
      const painted =
        natural > box.width / box.height
          ? { width: box.width, height: box.width / natural }
          : { width: box.height * natural, height: box.height };
      return (
        Math.abs(painted.width - box.width) > 1 ||
        Math.abs(painted.height - box.height) > 1
      );
    });
    expect(letterboxed).toBe(false);

    // Eighteen landmarks and two contacts, all drawn as overlay elements.
    await expect(
      plate.locator(
        '[data-testid="pose-proof-marker"][data-variant="plate-landmark"]',
      ),
    ).toHaveCount(18);
    await expect(
      plate.locator(
        '[data-testid="pose-proof-marker"][data-variant="plate-contact"]',
      ),
    ).toHaveCount(2);
  });

  test("hides every marker when the overlay is turned off", async ({
    page,
  }) => {
    await openProof(page);
    expect(await page.getByTestId("pose-proof-marker").count()).toBeGreaterThan(
      0,
    );
    await page.getByTestId("pose-proof-overlay-toggle").uncheck();
    await expect(page.getByTestId("pose-proof-marker")).toHaveCount(0);
  });

  test("reports pose coverage as data and captures the acceptance evidence", async ({
    page,
  }) => {
    await openProof(page);
    const table = page.getByTestId("pose-proof-coverage");
    await expect(table).toBeVisible();
    await expect(page.getByTestId("pose-proof-coverage-row")).toHaveCount(6);
    await expect(
      page.locator(
        '[data-testid="pose-proof-coverage-row"][data-covered="true"]',
      ),
    ).toHaveCount(2);
    await expect(page.getByTestId("pose-proof")).toHaveAttribute(
      "data-p0-gap-count",
      "2",
    );

    await page.getByTestId("pose-proof").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "docs/agent/evidence/pose-proof-coverage.png",
      fullPage: false,
    });
    await page
      .locator('[data-testid="pose-proof-person"]')
      .first()
      .screenshot({ path: "docs/agent/evidence/pose-proof-person.png" });
  });
});

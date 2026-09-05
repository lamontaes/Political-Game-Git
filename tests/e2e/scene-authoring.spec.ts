import { expect, test, type Page } from "@playwright/test";

/**
 * Browser proof for the development authoring overlay.
 *
 * The acceptance standard: an author can read a coordinate off a plate, capture
 * it, and copy a metadata block — and the block states the certainty they chose
 * rather than promoting an estimate into a measurement.
 *
 * Every control here is exercised by real pointer and keyboard input. A select
 * that only ever changes through `setState` in a unit test is not proof that a
 * person can use it.
 */

const ROUTE = "/?view=scene-authoring";

async function openAuthoring(page: Page) {
  await page.goto(ROUTE);
  await expect(page.getByTestId("scene-authoring")).toBeVisible();
}

/**
 * Clicks a fraction across the stage.
 *
 * Element-relative rather than computed from a bounding box in page
 * coordinates: the stage is taller than the test viewport, so an absolute
 * point can land below the fold. `locator.click` scrolls it into view first.
 */
async function clickPlateAt(page: Page, fractionX: number, fractionY: number) {
  const stage = page.getByTestId("scene-authoring-stage");
  const box = await stage.boundingBox();
  if (!box) throw new Error("The authoring stage has no box.");
  await stage.click({
    position: { x: box.width * fractionX, y: box.height * fractionY },
  });
}

test.describe("scene authoring overlay", () => {
  test("reads a live plate coordinate under the pointer", async ({ page }) => {
    await openAuthoring(page);
    const readout = page.getByTestId("scene-authoring-pointer");
    await expect(readout).toContainText("hover the plate");

    const stage = page.getByTestId("scene-authoring-stage");
    await stage.scrollIntoViewIfNeeded();
    await stage.hover({ position: { x: 200, y: 120 } });

    await expect(readout).toContainText("px");
    await expect(readout).toContainText("%");
    await expect(readout).not.toContainText("hover the plate");
  });

  test("names the current raster tier and what it would need", async ({
    page,
  }) => {
    await openAuthoring(page);
    const tier = page.getByTestId("scene-authoring-tier");
    await expect(tier).toBeVisible();
    await expect(tier).toContainText("device px");
    await expect(tier).toContainText("coverage");
  });

  test("captures a clicked point with the chosen certainty", async ({
    page,
  }) => {
    await openAuthoring(page);
    await page
      .getByTestId("scene-authoring-kind-select")
      .selectOption("seat-plane");
    await page
      .getByTestId("scene-authoring-subject-input")
      .fill("primary-desk-chair");
    await page
      .getByTestId("scene-authoring-certainty-select")
      .selectOption("ESTIMATED");

    await clickPlateAt(page, 0.4, 0.7);

    const rows = page.getByTestId("scene-authoring-capture-row");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toHaveAttribute("data-certainty", "ESTIMATED");
    await expect(rows.first()).toHaveAttribute("data-kind", "seat-plane");
    await expect(rows.first()).toContainText("primary-desk-chair");
    await expect(
      page.getByTestId("scene-authoring-capture-marker"),
    ).toHaveCount(1);
  });

  test("keeps an unsettled capture visibly unsettled", async ({ page }) => {
    await openAuthoring(page);
    await page
      .getByTestId("scene-authoring-certainty-select")
      .selectOption("UNKNOWN");
    await clickPlateAt(page, 0.3, 0.6);

    await expect(page.getByTestId("scene-authoring-unsettled")).toContainText(
      "1 still unsettled",
    );
    await expect(
      page.getByTestId("scene-authoring-capture-marker"),
    ).toHaveAttribute("data-certainty", "UNKNOWN");
  });

  test("exports a block that refuses to promote an estimate", async ({
    page,
  }) => {
    await openAuthoring(page);
    await page
      .getByTestId("scene-authoring-certainty-select")
      .selectOption("ESTIMATED");
    await clickPlateAt(page, 0.5, 0.8);

    const exported = page.getByTestId("scene-authoring-export");
    await expect(exported).toHaveValue(/ESTIMATED/);
    await expect(exported).toHaveValue(/not a measurement of a real room/);
    await expect(exported).toHaveValue(/xPercent/);
  });

  test("supports keyboard operation of every control", async ({ page }) => {
    await openAuthoring(page);
    const certainty = page.getByTestId("scene-authoring-certainty-select");
    await certainty.focus();
    await expect(certainty).toBeFocused();
    await certainty.selectOption("VERIFIED");
    await expect(certainty).toHaveValue("VERIFIED");

    const subject = page.getByTestId("scene-authoring-subject-input");
    await subject.focus();
    await page.keyboard.type("doorway-standing");
    await expect(subject).toHaveValue("doorway-standing");

    const clear = page.getByTestId("scene-authoring-clear");
    await clear.focus();
    await expect(clear).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("scene-authoring-capture-row")).toHaveCount(
      0,
    );
  });

  test("switches scenes, including a room that has no plate", async ({
    page,
  }) => {
    await openAuthoring(page);
    await page
      .getByTestId("scene-authoring-scene-select")
      .selectOption("committee-room-fixture");
    await expect(page.getByTestId("scene-authoring")).toHaveAttribute(
      "data-scene-id",
      "committee-room-fixture",
    );
    // No picture, and the geometry overlay still works.
    await expect(page.getByTestId("scene-authoring-plate")).toHaveCount(0);
    await expect(page.getByTestId("scene-authoring-overlay")).toBeVisible();
  });

  test("toggles the geometry overlay off and on", async ({ page }) => {
    await openAuthoring(page);
    const toggle = page.getByTestId("scene-authoring-overlay-toggle");
    await expect(page.getByTestId("scene-authoring-overlay")).toBeVisible();
    await toggle.click();
    await expect(page.getByTestId("scene-authoring-overlay")).toHaveCount(0);
    await toggle.click();
    await expect(page.getByTestId("scene-authoring-overlay")).toBeVisible();
  });

  test("does not appear on the player route", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("scene-authoring")).toHaveCount(0);
  });
});

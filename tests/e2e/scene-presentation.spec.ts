import { expect, test, type Page } from "@playwright/test";

/**
 * Browser proof for the scene and person presentation contract.
 *
 * The acceptance standard this file exists to hold: a person who is floating,
 * sinking or clipping must be diagnosable from ONE view, as a named contract
 * mismatch with both numbers on screen, without reading source.
 */

const ROUTE = "/?view=scene-proof";

async function openProof(page: Page) {
  await page.goto(ROUTE);
  await expect(page.getByTestId("scene-proof")).toBeVisible();
}

function approximately(actual: number, expected: number, tolerance: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

test.describe("scene and person presentation", () => {
  test("places people in both scene purposes from one compositor", async ({
    page,
  }) => {
    await openProof(page);
    await expect(page.getByTestId("scene-proof-context")).toHaveCount(2);
    const characters = page.getByTestId("scene-proof-character");
    expect(await characters.count()).toBeGreaterThanOrEqual(6);
    expect(
      await page.getByTestId("scene-proof-character-layer").count(),
    ).toBeGreaterThanOrEqual(30);
  });

  test("shows the room with no plate honestly instead of borrowing a picture", async ({
    page,
  }) => {
    await openProof(page);
    const committee = page.locator(
      '[data-testid="scene-proof-context"][data-scene-id="committee-room-fixture"]',
    );
    await expect(committee.getByTestId("scene-proof-no-plate")).toBeVisible();
    await expect(committee.getByTestId("scene-proof-no-plate")).toContainText(
      "no picture of this room yet",
    );
    await expect(committee.getByTestId("scene-proof-plate")).toHaveCount(0);
    // ...and the people are still placed in it.
    expect(
      await committee.getByTestId("scene-proof-character").count(),
    ).toBeGreaterThanOrEqual(3);
  });

  test("names the selected raster tier, the pixels required, and the coverage", async ({
    page,
  }) => {
    await openProof(page);
    const panel = page.getByTestId("scene-debug-overlay-panel").first();
    await expect(panel.getByTestId("scene-debug-overlay-tier")).toContainText(
      "2048px",
    );
    // The shipped office plate is a 2x resample of a 1024 source, and the
    // overlay says so rather than implying 2048 of real detail.
    await expect(panel.getByTestId("scene-debug-overlay-tier")).toContainText(
      "upscaled-development-fixture",
    );
    const required = await panel
      .getByTestId("scene-debug-overlay-required-device-width")
      .textContent();
    expect(Number(required)).toBeGreaterThan(1_000);
    await expect(
      panel.getByTestId("scene-debug-overlay-coverage"),
    ).toContainText("under-resolved");
    await expect(
      panel.getByTestId("scene-debug-overlay-tier-warnings"),
    ).toBeVisible();
  });

  /**
   * The overlay must be drawn from metadata, so its markers land on the exact
   * plate percentages the scene and the body declared. This measures them in
   * the real DOM rather than trusting the numbers printed beside them.
   */
  test("draws contacts where the metadata says they are", async ({ page }) => {
    await openProof(page);
    const camera = page
      .locator(
        '[data-testid="scene-proof-camera"][data-scene-id="office-council-staff-fixture"]',
      )
      .first();
    const cameraBox = (await camera.boundingBox())!;

    const footMarkers = camera.getByTestId("scene-debug-overlay-foot-marker");
    expect(await footMarkers.count()).toBeGreaterThanOrEqual(4);

    for (let index = 0; index < (await footMarkers.count()); index += 1) {
      const marker = footMarkers.nth(index);
      const declared = Number(await marker.getAttribute("data-y-percent"));
      const box = (await marker.boundingBox())!;
      const measured =
        ((box.y + box.height / 2 - cameraBox.y) / cameraBox.height) * 100;
      approximately(measured, declared, 1);
    }
  });

  test("shows the floor line and seat plane a person is placed against", async ({
    page,
  }) => {
    await openProof(page);
    const camera = page
      .locator(
        '[data-testid="scene-proof-camera"][data-scene-id="office-council-staff-fixture"]',
      )
      .first();
    expect(
      await camera.getByTestId("scene-debug-overlay-anchor-floor").count(),
    ).toBeGreaterThanOrEqual(2);
    expect(
      await camera.getByTestId("scene-debug-overlay-seat-plane").count(),
    ).toBeGreaterThanOrEqual(2);
    await expect(
      camera.getByTestId("scene-debug-overlay-near-floor"),
    ).toBeAttached();
    await expect(
      camera.getByTestId("scene-debug-overlay-far-floor"),
    ).toBeAttached();
  });

  test("shows named occluders and surface slots with their own z-orders", async ({
    page,
  }) => {
    await openProof(page);
    const occluders = page.getByTestId("scene-debug-overlay-occluder");
    expect(await occluders.count()).toBeGreaterThanOrEqual(4);
    const zOrders = await occluders.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-z-order")),
    );
    expect(new Set(zOrders).size).toBeGreaterThan(1);

    const slots = page.getByTestId("scene-debug-overlay-surface-slot");
    expect(await slots.count()).toBeGreaterThanOrEqual(5);
    const kinds = await slots.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-slot-kind")),
    );
    expect(kinds).toContain("desk-document");
    expect(kinds).toContain("picture-frame");
    expect(kinds).toContain("roll-call-board");
  });

  /**
   * THE ACCEPTANCE CASE. A person the contract cannot fully draw is visibly
   * marked, and the reason is on screen as a W-numbered contract mismatch that
   * names the slot and the pose.
   */
  test("diagnoses an incomplete person from the view alone", async ({
    page,
  }) => {
    await openProof(page);
    const broken = page.locator(
      '[data-testid="scene-proof-card"][data-complete="false"]',
    );
    expect(await broken.count()).toBeGreaterThanOrEqual(1);

    const first = broken.first();
    const warnings = first.getByTestId("scene-proof-card-warnings");
    await expect(warnings).toBeVisible();
    await expect(warnings).toContainText("W9");
    await expect(warnings).toContainText("footwear");
    await expect(warnings).toContainText("seated-at-desk");

    // ...and the same person's player-facing sentence says what is happening
    // without any of that vocabulary.
    const copy = await first
      .getByTestId("scene-proof-fallback-copy")
      .textContent();
    expect(copy).toBeTruthy();
    for (const word of ["slot", "asset", "anchor", "pose", "component"]) {
      expect(copy!.toLowerCase()).not.toContain(word);
    }
  });

  test("reports derived scale and floor line for every placed person", async ({
    page,
  }) => {
    await openProof(page);
    const people = page.getByTestId("scene-debug-overlay-person");
    const rows = await people.evaluateAll((nodes) =>
      nodes.map((node) => ({
        scale: Number(node.getAttribute("data-derived-scale")),
        floor: Number(node.getAttribute("data-contact-floor")),
      })),
    );
    expect(rows.length).toBeGreaterThanOrEqual(6);
    for (const row of rows) {
      expect(row.scale).toBeGreaterThan(0);
      expect(row.floor).toBeGreaterThan(0);
    }
    // A deeper floor line paints smaller. That is the perspective ramp, visible
    // in the DOM rather than asserted in a unit test alone.
    const sorted = [...rows].sort((a, b) => a.floor - b.floor);
    expect(sorted[0]!.scale).toBeLessThan(sorted[sorted.length - 1]!.scale);
  });

  test("hides the whole overlay when it is switched off", async ({ page }) => {
    await openProof(page);
    await expect(
      page.getByTestId("scene-debug-overlay").first(),
    ).toBeAttached();
    await page.getByTestId("scene-proof-debug-toggle").uncheck();
    await expect(page.getByTestId("scene-debug-overlay")).toHaveCount(0);
    // The people themselves stay on screen.
    expect(
      await page.getByTestId("scene-proof-character").count(),
    ).toBeGreaterThanOrEqual(6);
  });

  test("keeps a raster painted while the viewport changes size", async ({
    page,
  }) => {
    await openProof(page);
    const camera = page
      .locator(
        '[data-testid="scene-proof-camera"][data-scene-id="office-council-staff-fixture"]',
      )
      .first();
    await expect(camera).toHaveAttribute("data-painted-tier", /\d+/);

    for (const size of [
      { width: 1_280, height: 720 },
      { width: 1_920, height: 1_080 },
      { width: 1_440, height: 900 },
    ]) {
      await page.setViewportSize(size);
      await expect(page.getByTestId("scene-proof-plate").first()).toBeVisible();
      const painted = await camera.getAttribute("data-painted-tier");
      expect(Number(painted), `${size.width}x${size.height}`).toBeGreaterThan(
        0,
      );
    }
  });

  test("never appears on the production route", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("scene-proof")).toHaveCount(0);
    await expect(page.getByTestId("scene-debug-overlay")).toHaveCount(0);
  });
});

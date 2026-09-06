import { expect, test } from "@playwright/test";

/**
 * The room, in a browser, saying a true thing.
 *
 * Everything else about this feature is provable in unit tests: what the
 * projection holds, what the access ladder refuses, what a save reloads to.
 * What only a browser can answer is whether the words are ACTUALLY THERE and
 * on the right object — real selectable text, in the document, positioned on
 * the surface the scene declared, and not a picture of some letters baked into
 * the background plate.
 */

/**
 * A staff analysis the office route deliberately keeps from the player. It is
 * in the same world as the surfaces and it is not the surfaces' to tell.
 */
const HIDDEN_ANALYSIS =
  "Internal sensitivity case: uptake could reduce modeled delivery to one half.";

const OFFICE_VIEWPORTS = [
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1600, 900],
  [1280, 720],
  [1366, 768],
  [1920, 1080],
  [1920, 1200],
  [2560, 1440],
  [2560, 1600],
  [2560, 1080],
  [3440, 1440],
  [3840, 1600],
  [3840, 2160],
  [5120, 1440],
  [7680, 2160],
] as const;

for (const deviceScaleFactor of [1, 1.25, 2]) {
  test.describe(`working paper co-registration at DPR ${deviceScaleFactor}`, () => {
    test.use({ deviceScaleFactor });
    for (const [width, height] of OFFICE_VIEWPORTS) {
      test(`${width}x${height}: one paper, pointer and keyboard`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height });
        await page.goto("/?view=office-fixture");
        const desk = page.getByTestId("scene-surface-desk-working-document");
        const entry = page.getByTestId("working-document-entry");
        const memo = page.getByTestId("briefing-memo-entry");
        await expect(desk).toBeVisible();
        const assertGeometry = async () => {
          const paper = (await desk.boundingBox())!;
          const target = (await entry.boundingBox())!;
          const briefing = (await memo.boundingBox())!;
          for (const key of ["x", "y", "width", "height"] as const) {
            expect(Math.abs(paper[key] - target[key])).toBeLessThan(0.5);
          }
          expect(paper.x).toBeGreaterThan(briefing.x + briefing.width);
        };
        await assertGeometry();
        await expect(entry).toBeEmpty(); // No second painted title/paper.
        expect(
          await page
            .getByTestId("scene-surfaces")
            .evaluate((node) => getComputedStyle(node).pointerEvents),
        ).toBe("none");
        if (
          OFFICE_VIEWPORTS.slice(0, 4).some(
            ([w, h]) => w === width && h === height,
          )
        ) {
          // Geometry can settle before the raster has decoded. Visual evidence
          // must show the actual plate, not an incidental loading frame.
          await page
            .locator(".scene-environment-art")
            .evaluate(async (node) => {
              await (node as HTMLImageElement).decode();
            });
          await page.screenshot({
            path: testInfo.outputPath(
              `office-${width}x${height}-dpr-${deviceScaleFactor}.png`,
            ),
          });
        }
        await entry.hover();
        await assertGeometry();
        await entry.click();
        const workspace = page.getByTestId("working-document-workspace");
        await expect(workspace).toBeVisible();
        await workspace
          .getByRole("button", { name: "Return to office" })
          .click();
        await entry.focus();
        await assertGeometry();
        await page.keyboard.press("Enter");
        await expect(workspace).toBeVisible();
      });
    }
  });
}

test.describe("dynamic scene surfaces in the office", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?view=office-fixture");
    await expect(page.getByTestId("political-office-scene")).toBeVisible();
  });

  test("draws canonical text on the office's declared surfaces", async ({
    page,
  }) => {
    const surfaces = page.getByTestId("scene-surfaces");
    await expect(surfaces).toBeAttached();

    // The desk document carries the draft this office is actually working on,
    // which is the same document the workspace beside it opens.
    const desk = page.getByTestId("scene-surface-desk-working-document");
    await expect(desk).toBeAttached();
    await expect(desk).toContainText("Transit Access Pilot");
    await expect(desk).toHaveAttribute("data-content-class", "document-body");
    await expect(desk).toHaveAttribute("data-access", "institutional-working");

    // The wall map is the surface that decouples this plate from one place.
    const map = page.getByTestId("scene-surface-wall-district-map-slot");
    await expect(map).toBeAttached();
    await expect(map).not.toBeEmpty();
    await expect(map).toHaveAttribute("data-access", "public-record");
  });

  test("puts the text in the document rather than in the plate", async ({
    page,
  }) => {
    const desk = page.getByTestId("scene-surface-desk-working-document");
    const text = await desk.innerText();
    expect(text.trim().length).toBeGreaterThan(0);

    // It is a real element with real layout inside the scene camera, so a
    // change of wording needs no new background raster.
    const box = await desk.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    // And it is decoration for assistive technology, not a second control:
    // the same facts are reachable in the workspace, in reading order.
    const layer = page.getByTestId("scene-surfaces");
    await expect(layer).toHaveAttribute("aria-hidden", "true");
  });

  test("survives a resize without leaving its surface", async ({ page }) => {
    const desk = page.getByTestId("scene-surface-desk-working-document");
    const camera = page.getByTestId("office-art-compositor");

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1280, height: 800 },
      { width: 1024, height: 768 },
    ]) {
      await page.setViewportSize(viewport);
      const deskBox = await desk.boundingBox();
      const cameraBox = await camera.boundingBox();
      expect(deskBox, `${viewport.width}x${viewport.height}`).not.toBeNull();
      expect(cameraBox).not.toBeNull();
      // Inside the plate, at every viewport. A surface that drifts off the
      // object it is painted on is worse than a surface that says nothing.
      expect(deskBox!.x).toBeGreaterThanOrEqual(cameraBox!.x - 1);
      expect(deskBox!.y).toBeGreaterThanOrEqual(cameraBox!.y - 1);
      expect(deskBox!.x + deskBox!.width).toBeLessThanOrEqual(
        cameraBox!.x + cameraBox!.width + 1,
      );
      expect(deskBox!.y + deskBox!.height).toBeLessThanOrEqual(
        cameraBox!.y + cameraBox!.height + 1,
      );
    }
  });

  test("never puts withheld material on a surface", async ({ page }) => {
    const layer = page.getByTestId("scene-surfaces");
    const text = await layer.innerText();
    expect(text).not.toContain(HIDDEN_ANALYSIS);
    expect(text).not.toContain("Internal sensitivity case");

    // Every element in the layer is a bound surface. Empty, withheld and
    // unowned surfaces render nothing at all, so there is no blank rectangle
    // for a reader to mistake for a broken screen.
    const drawn = page.locator('[data-testid="scene-surfaces"] .scene-surface');
    const count = await drawn.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      await expect(drawn.nth(index)).toHaveAttribute(
        "data-binding-state",
        "bound",
      );
      await expect(drawn.nth(index)).not.toBeEmpty();
    }
  });
});

test.describe("the review route", () => {
  test("shows every surface's state against one named world", async ({
    page,
  }) => {
    await page.goto("/?view=scene-gallery");
    const world = page.getByTestId("scene-gallery-surface-world").first();
    await expect(world).toContainText("fixed review world");

    const surfaces = page.getByTestId("scene-gallery-surface");
    await expect(surfaces.first()).toBeVisible();

    // A reviewer can see all four honest outcomes, which is the only way to
    // tell "nothing owns this" from "this room may not have it".
    const states = await surfaces.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-binding-state")),
    );
    expect(states).toContain("bound");
    expect(states).toContain("withheld");
    expect(states).toContain("unowned");
    expect(states).toContain("decorative");
  });
});

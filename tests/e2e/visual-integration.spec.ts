import { expect, test, type Locator, type Page } from "@playwright/test";

async function closeConversation(page: Page) {
  const close = page
    .getByTestId("conversation-strip")
    .getByRole("button", { name: "Close conversation" });
  if (await close.count()) await close.click();
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function boxesOverlap(left: Box, right: Box): boolean {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}

async function requiredBox(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

for (const viewport of [
  { width: 1_440, height: 900 },
  { width: 1_200, height: 720 },
]) {
  test(`composes released office art at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await closeConversation(page);

    const compositor = page.getByTestId("office-art-compositor");
    await expect(compositor).toHaveAttribute(
      "data-environment-asset-id",
      "env_lexington_council_staff_office_prompt30_v1",
    );
    await expect(page.locator(".scene-environment-art")).toBeVisible();
    await expect(
      page.locator(".office-window, .office-desk, .person-head"),
    ).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(
      "Synthetic placeholder office fixture",
    );
    await expect(page.locator(".scene-caption")).toHaveCount(0);
    const status = page.getByTestId("current-commitment");
    const pinned = page.getByTestId("pinned-collection");
    const personPin = pinned.locator('[data-pin-id="person"]');
    await expect(status).toBeVisible();
    await expect(status.locator(".next-commitment-compact")).toHaveText(
      "Next · 9:30 AM",
    );
    await expect(status.locator(".next-commitment-detail")).toBeHidden();
    await expect(pinned).toBeVisible();
    await expect(personPin).toHaveCount(1);

    const environmentMetrics = await page
      .locator(".scene-environment-art")
      .evaluate((element: HTMLImageElement) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          renderedWidth: box.width,
          renderedHeight: box.height,
          naturalWidth: element.naturalWidth,
          naturalHeight: element.naturalHeight,
          filter: style.filter,
          transform: style.transform,
        };
      });
    expect(environmentMetrics).toMatchObject({
      naturalWidth: 2_048,
      naturalHeight: 1_144,
      filter: "none",
      transform: "none",
    });
    expect(environmentMetrics.renderedWidth).toBeLessThanOrEqual(2_048);
    expect(environmentMetrics.renderedHeight).toBeLessThanOrEqual(1_144);
    expect(
      environmentMetrics.renderedWidth / environmentMetrics.renderedHeight,
    ).toBeCloseTo(1_024 / 572, 3);

    const stageBox = await compositor.boundingBox();
    expect(stageBox).not.toBeNull();

    for (const variant of ["primary", "guest"] as const) {
      const art = page.getByTestId(`scene-character-art-${variant}`);
      const control = page.getByTestId(
        variant === "primary" ? "scene-person" : "scene-person-b",
      );
      await expect(art).toBeVisible();
      await expect(art).toHaveAttribute("aria-hidden", "true");
      expect(
        await art.evaluate(
          (element) => getComputedStyle(element).pointerEvents,
        ),
      ).toBe("none");
      await expect(control).toBeVisible();

      const [artBox, controlBox] = await Promise.all([
        art.boundingBox(),
        control.boundingBox(),
      ]);
      expect(artBox).not.toBeNull();
      expect(controlBox).not.toBeNull();
      expect(controlBox!.x + controlBox!.width).toBeGreaterThan(0);
      expect(controlBox!.x).toBeLessThan(viewport.width);
      expect(controlBox!.y + controlBox!.height).toBeGreaterThan(0);
      expect(controlBox!.y).toBeLessThan(viewport.height);
      expect(controlBox!.x + controlBox!.width / 2).toBeGreaterThan(artBox!.x);
      expect(controlBox!.x + controlBox!.width / 2).toBeLessThan(
        artBox!.x + artBox!.width,
      );
      const raster = await art.evaluate((element: HTMLImageElement) => ({
        naturalWidth: element.naturalWidth,
        naturalHeight: element.naturalHeight,
        filter: getComputedStyle(element).filter,
        transform: getComputedStyle(element).transform,
      }));
      expect(raster).toEqual({
        naturalWidth: 765,
        naturalHeight: 1_024,
        filter: "none",
        transform: "none",
      });
      expect(artBox!.width).toBeLessThan(raster.naturalWidth);
      expect(artBox!.height).toBeLessThan(raster.naturalHeight);

      const root =
        variant === "primary"
          ? { x: 0.56, y: 0.6, anchorX: 0.777, anchorY: 0.665 }
          : { x: 0.55, y: 0.61, anchorX: 0.295, anchorY: 0.7 };
      expect(artBox!.x + artBox!.width * root.x).toBeCloseTo(
        stageBox!.x + stageBox!.width * root.anchorX,
        1,
      );
      expect(artBox!.y + artBox!.height * root.y).toBeCloseTo(
        stageBox!.y + stageBox!.height * root.anchorY,
        1,
      );
    }

    const foreground = page.locator(
      '[data-occluder-id="office-furniture-foreground"]',
    );
    await expect(foreground).toHaveCount(1);
    await expect(foreground).toBeVisible();
    await expect(foreground).toHaveAttribute(
      "data-asset-id",
      "env_lexington_council_staff_office_prompt30_foreground_mask_v1",
    );
    await expect(page.locator(".scene-environment-occluder")).toHaveCount(1);
    await expect(
      page.locator(
        '[data-occluder-id="primary-desk-front"], [data-occluder-id="left-guest-chair-near-arm"]',
      ),
    ).toHaveCount(0);

    const shell = page.getByTestId("navigation-cluster");
    const sceneReferences = [
      page.getByTestId("scene-character-art-primary"),
      page.getByTestId("scene-character-art-guest"),
      page.locator(".briefing-memo"),
      page.getByTestId("working-document-entry"),
    ];
    const [closedShellBox, closedStatusBox, closedPinBox] = await Promise.all([
      requiredBox(shell),
      requiredBox(status),
      requiredBox(personPin),
    ]);
    expect(boxesOverlap(closedShellBox, closedStatusBox)).toBe(false);
    expect(boxesOverlap(closedStatusBox, closedPinBox)).toBe(false);
    for (const reference of sceneReferences) {
      const referenceBox = await requiredBox(reference);
      expect(boxesOverlap(closedStatusBox, referenceBox)).toBe(false);
      expect(boxesOverlap(closedPinBox, referenceBox)).toBe(false);
    }

    await page.mouse.move(viewport.width / 2, 20);
    await page.waitForTimeout(180);
    await page.screenshot({
      path: `test-results/visual-acceptance-${viewport.width}x${viewport.height}-closed.png`,
      fullPage: false,
    });

    await shell.click();
    await expect(status).toContainText("Constituent intake briefing");
    await expect(status.locator(".next-commitment-detail")).toBeVisible();
    await expect(pinned).toContainText("AC");
    for (const [name, fullShellLine] of [
      ["expanded date", shell.locator(".cluster-date-full")],
      ["expanded location", shell.locator(".cluster-location-full")],
    ] as const) {
      await expect(fullShellLine).toBeVisible();
      const lineMetrics = await fullShellLine.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        text: element.textContent,
      }));
      expect(
        lineMetrics.scrollWidth,
        `${name} is truncated: ${JSON.stringify(lineMetrics)}`,
      ).toBeLessThanOrEqual(lineMetrics.clientWidth);
    }
    const flyout = page.getByTestId("navigation-flyout");
    await expect(flyout.getByRole("menuitem")).toHaveCount(5);
    await expect(flyout).toContainText("Calendar");
    await expect(flyout).toContainText("Work / Pending");
    await expect(flyout).toContainText("Places");
    await expect(flyout).toContainText("Civic reference");
    await expect(flyout).not.toContainText(/pinned|next commitment/i);
    await expect(flyout.locator(".pin-rail, .current-commitment")).toHaveCount(
      0,
    );
    const [flyoutBox, openStatusBox, openPinBox] = await Promise.all([
      requiredBox(flyout),
      requiredBox(status),
      requiredBox(personPin),
    ]);
    expect(flyoutBox.x).toBeLessThan(viewport.width * 0.3);
    expect(boxesOverlap(flyoutBox, openStatusBox)).toBe(false);
    expect(boxesOverlap(flyoutBox, openPinBox)).toBe(false);
    for (const reference of sceneReferences) {
      expect(boxesOverlap(flyoutBox, await requiredBox(reference))).toBe(false);
    }

    await page.mouse.move(viewport.width / 2, 20);
    await page.screenshot({
      path: `test-results/visual-acceptance-${viewport.width}x${viewport.height}-open.png`,
      fullPage: false,
    });

    await personPin.click();
    const pinControls = page.getByTestId("pin-controls-person");
    await expect(pinControls).toBeVisible();
    await expect(flyout).toHaveCount(0);
    const controlsBox = await requiredBox(pinControls);
    const controlClearanceSurfaces = [
      ["next commitment", status],
      ["navigation shell", shell],
      ["pin", personPin],
      ["primary character", page.getByTestId("scene-person")],
      ["guest character", page.getByTestId("scene-person-b")],
      ["briefing memo", page.locator(".briefing-memo")],
      ["working document", page.getByTestId("working-document-entry")],
    ] as const;
    for (const [name, surface] of controlClearanceSurfaces) {
      expect(
        boxesOverlap(controlsBox, await requiredBox(surface)),
        `pin controls overlap ${name}`,
      ).toBe(false);
    }
    await page.keyboard.press("Escape");
    await expect(pinControls).toHaveCount(0);
    await status.click();
    await expect(page.getByTestId("calendar-workspace")).toBeVisible();
    await expect(page.getByTestId("calendar-event-detail")).toContainText(
      "Constituent intake briefing",
    );
    await expect(page.locator(".pin-rail")).toHaveCount(0);
    await expect(page.getByTestId("current-commitment")).toHaveCount(0);
    await page
      .getByTestId("calendar-workspace")
      .getByRole("button", { name: "Return to office" })
      .click();

    await page.getByTestId("scene-person").click();
    await expect(page.getByTestId("person-action-menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByTestId("scene-person-b").click();
    await expect(page.getByTestId("person-action-menu")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      "OFFICE REMAINS IN VIEW",
    );
    await page.keyboard.press("Escape");
  });
}

test("keeps workspace safe areas, compact date, and retreat behavior honest", async ({
  page,
}) => {
  await page.goto("/");
  await closeConversation(page);
  const shell = page.getByTestId("navigation-cluster");
  const shellButton = page.locator(".nav-cluster-button");
  await expect(shell.locator(".cluster-date-compact")).toHaveText("Mon, Jan 5");
  await expect(shell.locator(".cluster-date-full")).toBeHidden();

  await shell.click();
  await page.getByRole("menuitem", { name: /Calendar/ }).click();
  await page.mouse.move(700, 100);
  await page.waitForTimeout(220);
  const workspace = page.getByTestId("calendar-workspace");
  await expect(page.locator(".pin-rail")).toHaveCount(0);
  await expect(page.getByTestId("current-commitment")).toHaveCount(0);
  const workspaceBox = await workspace.boundingBox();
  expect(workspaceBox!.x + workspaceBox!.width).toBeLessThanOrEqual(1_424);
  expect(
    await shellButton.evaluate((element) =>
      Number(getComputedStyle(element).opacity),
    ),
  ).toBeLessThanOrEqual(0.8);
  expect(
    await shellButton.evaluate((element) =>
      Number(
        getComputedStyle(element).transform === "none"
          ? 1
          : new DOMMatrix(getComputedStyle(element).transform).a,
      ),
    ),
  ).toBeLessThanOrEqual(1);

  await shell.focus();
  await expect(shell).toBeFocused();
  await shell.click();
  await expect(page.getByTestId("navigation-flyout")).toBeVisible();
  await expect(
    page.getByTestId("navigation-flyout").locator(".pin-rail"),
  ).toHaveCount(0);
  await expect(page.locator(".pin-rail")).toHaveCount(0);
  await expect(page.getByTestId("current-commitment")).toHaveCount(0);
});

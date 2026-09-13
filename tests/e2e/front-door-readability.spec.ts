import { expect, test, type Page } from "./fixtures";

import { enterLife, goTo, startLife } from "./support/creator";

/**
 * MORNING23 F: the title and creator have to be readable on the actual
 * ambient plates, without restoring the rejected light card.
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

function relativeLuminance(color: string): number {
  const match = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (!match) {
    throw new Error(`Unparseable color: ${color}`);
  }
  const toLinear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const r = toLinear(Number(match[1]));
  const g = toLinear(Number(match[2]));
  const b = toLinear(Number(match[3]));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function computed(page: Page, testId: string, selector?: string) {
  const locator = selector
    ? page.getByTestId(testId).locator(selector)
    : page.getByTestId(testId);
  return locator.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      fontFamily: style.fontFamily,
      fontSize: Number.parseFloat(style.fontSize),
      opacity: Number(style.opacity),
      textTransform: style.textTransform,
    };
  });
}

test.describe("The front door stays compact and readable over the room", () => {
  for (const viewport of [
    { name: "1440x900", width: 1440, height: 900 },
    { name: "1280x720", width: 1280, height: 720 },
  ]) {
    test(`uses light type and a serif wordmark at ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await freshBrowser(page);
      await expect(page.getByTestId("title-tableau")).toHaveAttribute(
        "data-has-plate",
        "true",
      );
      await expect(page.getByTestId("title-tableau")).toHaveClass(/front-door/);

      const heading = await computed(page, "title-screen", "h1");
      expect(relativeLuminance(heading.color)).toBeGreaterThan(0.7);
      expect(heading.fontSize).toBeGreaterThanOrEqual(22);
      expect(heading.fontFamily).toMatch(/Palatino|Georgia|serif/i);
      expect(heading.backgroundColor).not.toMatch(/248,\s*249,\s*252/);

      const panel = await computed(page, "title-screen");
      expect(panel.backgroundColor).toMatch(/0,\s*0,\s*0,\s*0|transparent/i);
      expect(relativeLuminance(panel.color)).toBeGreaterThan(0.7);

      const newGame = await computed(page, "new-game");
      expect(newGame.fontFamily).toMatch(/ui-sans-serif|system-ui|sans-serif/i);
      expect(relativeLuminance(newGame.color)).toBeGreaterThan(0.7);

      const box = await page.getByTestId("title-screen").boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width / viewport.width).toBeLessThan(0.34);
      expect(box!.x + box!.width / 2).toBeLessThan(viewport.width / 2);

      const overflowX = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflowX).toBeLessThanOrEqual(1);
    });
  }

  test("moves the compact menu to the thumb edge on a narrow phone", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await freshBrowser(page);
    const box = await page.getByTestId("title-screen").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height / 2).toBeGreaterThan(844 / 2);
    const heading = await computed(page, "title-screen", "h1");
    expect(relativeLuminance(heading.color)).toBeGreaterThan(0.7);
  });

  test("keeps disabled Continue and Saved games readable, not merely dim", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);

    const cont = await computed(page, "continue");
    expect(cont.opacity).toBe(1);
    expect(relativeLuminance(cont.color)).toBeGreaterThan(0.28);
    await expect(page.getByTestId("continue")).toBeDisabled();
    await expect(page.getByTestId("open-saves")).toBeDisabled();
  });

  test("moves focus visibly and activates New game from the keyboard", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("new-game")).toBeFocused();
    const outline = await page.getByTestId("new-game").evaluate((node) => {
      const style = getComputedStyle(node);
      return { width: style.outlineWidth, style: style.outlineStyle };
    });
    expect(Number.parseFloat(outline.width)).toBeGreaterThanOrEqual(2);
    expect(outline.style).not.toBe("none");

    await page.keyboard.press("Enter");
    await expect(page.getByTestId("setup-screen")).toBeVisible();
    await expect(page.getByTestId("creator-stage-route")).toBeVisible();
  });

  test("keeps creator headings and fields on the same compact slot", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    const titleBox = await page.getByTestId("title-screen").boundingBox();
    await page.getByTestId("new-game").click();

    const heading = await computed(page, "setup-screen", "h1");
    expect(relativeLuminance(heading.color)).toBeGreaterThan(0.7);
    const stage = await computed(page, "creator-stage-route", "h2");
    expect(relativeLuminance(stage.color)).toBeGreaterThan(0.7);
    expect(stage.fontFamily).toMatch(/Palatino|Georgia|serif/i);

    const creatorBox = await page.getByTestId("setup-screen").boundingBox();
    expect(creatorBox).not.toBeNull();
    expect(Math.abs(creatorBox!.x - titleBox!.x)).toBeLessThanOrEqual(8);
    expect(Math.abs(creatorBox!.y - titleBox!.y)).toBeLessThanOrEqual(8);
    expect(creatorBox!.width).toBeLessThanOrEqual(titleBox!.width + 24);

    await page.getByTestId("start-normal").click();
    const field = await page
      .getByLabel("First name", { exact: true })
      .evaluate((node) => {
        const style = getComputedStyle(node);
        return { color: style.color, backgroundColor: style.backgroundColor };
      });
    expect(relativeLuminance(field.color)).toBeGreaterThan(0.7);
    expect(relativeLuminance(field.backgroundColor)).toBeLessThan(0.2);
  });

  test("wraps a long saved name on Continue without covering the room", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    await startLife(page, {
      age: 34,
      givenName: "Alexandrina-Therese",
      familyName: "Montgomery-Westmoreland",
      place: "Lexington",
    });
    await enterLife(page);
    await goTo(page, "keep-world");
    await goTo(page, "leave-game");
    await expect(page.getByTestId("continue")).toBeEnabled();
    await expect(page.getByTestId("continue")).toContainText(
      "Alexandrina-Therese",
    );

    const box = await page.getByTestId("title-screen").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width / 1440).toBeLessThan(0.34);
    const small = await computed(page, "continue", "small");
    expect(relativeLuminance(small.color)).toBeGreaterThan(0.5);
  });

  test("holds the version stamp legible in the corner", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshBrowser(page);
    const version = await computed(page, "shell-version");
    expect(relativeLuminance(version.color)).toBeGreaterThan(0.35);
    await expect(page.getByTestId("shell-version")).toHaveText(
      /^v\d+\.\d+\.\d+$/,
    );
  });

  test("stays readable when the viewer asked for less motion", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await freshBrowser(page);
    await expect(page.getByTestId("title-tableau")).toHaveAttribute(
      "data-motion",
      "reduced",
    );
    const heading = await computed(page, "title-screen", "h1");
    expect(relativeLuminance(heading.color)).toBeGreaterThan(0.7);
    await context.close();
  });
});

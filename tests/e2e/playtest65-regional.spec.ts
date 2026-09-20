import { expect, test } from "./fixtures";

const places = [
  {
    placeKey: "2160852",
    name: "Pikeville",
    stateName: "Kentucky",
    width: 1536,
  },
  { placeKey: "2135362", name: "Hazard", stateName: "Kentucky", width: 1536 },
  {
    placeKey: "4622260",
    name: "Fort Pierre",
    stateName: "South Dakota",
    width: 2496,
  },
  {
    placeKey: "2015900",
    name: "Cottonwood Falls",
    stateName: "Kansas",
    width: 2496,
  },
  { placeKey: "3109760", name: "Cody", stateName: "Nebraska", width: 2496 },
];

for (const place of places) {
  test(`regional opening reuses suitable artwork in ${place.name} without changing the saved world`, async ({
    page,
  }, info) => {
    test.setTimeout(120_000);
    await page.goto("/?art-preview=candidate&seed=regional-fixture");
    const result = await page.evaluate(
      async (options) => {
        const path = "/tests/support/regional-opening-preview.tsx";
        const fixture = await import(/* @vite-ignore */ path);
        return fixture.mountRegionalOpeningPreview(options);
      },
      {
        ...place,
        summer: true,
        reviewCandidates: process.env.PG_REGIONAL_REVIEW === "1",
      },
    );
    expect(result.date).toBe("2026-06-05");
    await expect(page.getByTestId("orientation-step-executive")).toBeVisible();
    await page.getByTestId("orientation-next").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("orientation-step-state")).toBeVisible();
    const plate = page.getByTestId("opening-regional-plate");
    await expect(plate).toBeVisible();
    await expect(
      page.getByText("Your home region · Illustration", { exact: true }),
    ).toBeVisible();
    await expect(plate).toHaveJSProperty("naturalWidth", place.width);
    await expect(plate).toHaveAttribute(
      "src",
      place.width === 1536 ? /street-cleanup-r2/ : /great-plains-pond-r1/,
    );
    for (const size of [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
    ]) {
      await page.setViewportSize(size);
      const rect = await plate.boundingBox();
      expect(rect!.height).toBeGreaterThan(300);
      await expect(plate).toHaveCSS("object-fit", "contain");
      const scene = await page
        .getByTestId("opening-regional-scene")
        .boundingBox();
      expect(rect!.width).toBeCloseTo(scene!.width, 0);
      expect(rect!.height).toBeCloseTo(scene!.height, 0);
      const reading = await page
        .locator(".pg-orientation-reading")
        .boundingBox();
      const card = await page
        .locator(".pg-regional-state-information")
        .boundingBox();
      expect(scene!.y + scene!.height).toBeLessThanOrEqual(
        reading!.y + reading!.height + 1,
      );
      expect(card!.y + card!.height).toBeLessThanOrEqual(
        reading!.y + reading!.height,
      );
      const paintedWidth = Math.min(rect!.width, rect!.height * 1.5);
      expect(paintedWidth).toBeLessThanOrEqual(place.width);
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(size.width);
      await page.screenshot({
        path: info.outputPath(`regional-${size.width}.png`),
      });
    }
    await page.getByRole("button", { name: "Population", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Population", exact: true }),
    ).toHaveCSS("background-color", "rgb(234, 208, 148)");
    await expect(
      page.getByRole("button", { name: "Population", exact: true }),
    ).toHaveCSS("color", "rgb(23, 32, 43)");
    await expect(page.getByTestId("opening-state-population")).toBeVisible();
    await expect(page.getByText(/Population, all ages · 20/)).toBeVisible();
    await page.screenshot({
      path: info.outputPath("regional-population-1024.png"),
    });
    await page.getByRole("button", { name: "Government", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Your state government" }),
    ).toBeVisible();
    await page.getByTestId("orientation-next").click();
    await expect(page.getByTestId("orientation-step-congress")).toBeVisible();
    await expect(plate).toHaveCount(0);
    await page.getByTestId("orientation-next").click();
    await expect(page.getByTestId("orientation-step-locality")).toBeVisible();
    if (place.placeKey === "2160852") {
      // Two real banked images, only in this explicit test fixture. The old
      // alternative is never restored to the ordinary private candidate list.
      await page.evaluate(
        async (options) => {
          const path = "/tests/support/regional-opening-preview.tsx";
          (await import(/* @vite-ignore */ path)).mountRegionalOpeningPreview(
            options,
          );
        },
        {
          ...place,
          summer: true,
          reviewCandidates: false,
          includeBankedTestAlternative: true,
        },
      );
      await expect(
        page.getByTestId("orientation-step-executive"),
      ).toBeVisible();
      await page.getByTestId("orientation-next").click();
      const region = page.getByTestId("opening-regional-plate");
      const first = await region.getAttribute("data-asset-id");
      await page
        .getByRole("button", { name: "Population", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Next view", exact: true })
        .click();
      await expect(region).not.toHaveAttribute("data-asset-id", first!);
      await expect(page.getByTestId("opening-state-population")).toBeVisible();
      await page
        .getByRole("button", { name: "Previous view", exact: true })
        .focus();
      await page.keyboard.press("Enter");
      await expect(region).toHaveAttribute("data-asset-id", first!);
      await expect(page.getByTestId("opening-state-population")).toBeVisible();
      await page.screenshot({
        path: info.outputPath("regional-multiple-views-test-fixture.png"),
      });
    }
    expect(
      await page.evaluate(async () => {
        const path = "/tests/support/regional-opening-preview.tsx";
        return (
          await import(/* @vite-ignore */ path)
        ).regionalPreviewUnchanged();
      }),
    ).toBe(true);
  });
}

for (const scenario of [
  {
    name: "unknown regional coverage",
    placeKey: "lexington-fayette",
    stateName: "Kentucky",
    summer: true,
    candidate: true,
  },
  {
    name: "winter",
    placeKey: "2160852",
    stateName: "Kentucky",
    summer: false,
    candidate: true,
  },
  {
    name: "ordinary production art",
    placeKey: "2015900",
    stateName: "Kansas",
    summer: true,
    candidate: false,
  },
]) {
  test(`regional opening omits pending summer artwork for ${scenario.name}`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.goto(scenario.candidate ? "/?art-preview=candidate" : "/");
    await page.evaluate(
      async (options) => {
        const path = "/tests/support/regional-opening-preview.tsx";
        (await import(/* @vite-ignore */ path)).mountRegionalOpeningPreview(
          options,
        );
      },
      { ...scenario, reviewCandidates: process.env.PG_REGIONAL_REVIEW === "1" },
    );
    await expect(page.getByTestId("orientation-step-executive")).toBeVisible();
    await page.getByTestId("orientation-next").click();
    await expect(page.getByTestId("orientation-step-state")).toBeVisible();
    await expect(page.getByTestId("opening-regional-plate")).toHaveCount(0);
    expect(
      await page.evaluate(async () => {
        const path = "/tests/support/regional-opening-preview.tsx";
        return (
          await import(/* @vite-ignore */ path)
        ).regionalPreviewUnchanged();
      }),
    ).toBe(true);
  });
}

test("District introduction follows the White House and keeps population and Congress reachable", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.goto("/?art-preview=candidate");
  await page.evaluate(async () => {
    const path = "/tests/support/regional-opening-preview.tsx";
    (await import(/* @vite-ignore */ path)).mountRegionalOpeningPreview({
      placeKey: "1150000",
      stateName: "District of Columbia",
      summer: false,
      reviewCandidates: false,
    });
  });
  await expect(page.getByTestId("orientation-step-executive")).toBeVisible();
  await page.getByTestId("orientation-next").click();
  await expect(
    page.getByRole("heading", { name: "Your District government" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your state government" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Population", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "People in the District" }),
  ).toBeVisible();
  await expect(page.getByText(/Population, all ages · 20/)).toBeVisible();
  await page.screenshot({ path: info.outputPath("district-population.png") });
  await page.getByTestId("orientation-next").click();
  await expect(page.getByTestId("orientation-step-congress")).toBeVisible();
  await page.getByTestId("orientation-next").click();
  await expect(page.getByTestId("orientation-step-your-life")).toBeVisible();
  expect(
    await page.evaluate(async () => {
      const path = "/tests/support/regional-opening-preview.tsx";
      return (await import(/* @vite-ignore */ path)).regionalPreviewUnchanged();
    }),
  ).toBe(true);
});

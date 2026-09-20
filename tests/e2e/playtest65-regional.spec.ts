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
    await page.getByTestId("orientation-next").click();
    await page.getByTestId("orientation-next").click();
    await expect(page.getByTestId("orientation-step-state")).toBeVisible();
    await expect(page.getByTestId("opening-regional-plate")).toHaveCount(0);
    await page.getByTestId("orientation-next").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("orientation-step-locality")).toBeVisible();
    const plate = page.getByTestId("opening-regional-plate");
    await expect(plate).toBeVisible();
    await expect(
      page.getByText("Regional illustration", { exact: true }),
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
      expect(rect!.height).toBeLessThanOrEqual(280);
      expect(rect!.width / rect!.height).toBeCloseTo(1.5, 1);
      expect(rect!.x).toBeGreaterThanOrEqual(0);
      expect(rect!.x + rect!.width).toBeLessThanOrEqual(size.width);
      await page.screenshot({
        path: info.outputPath(`regional-${size.width}.png`),
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
    for (let step = 0; step < 3; step++)
      await page.getByTestId("orientation-next").click();
    await expect(page.getByTestId("orientation-step-locality")).toBeVisible();
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

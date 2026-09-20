import { expect, test } from "./fixtures";

test("regional candidate keeps geographic scope and aspect in the opening panel", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.goto("/?art-preview=candidate&seed=regional-fixture");
  await page.evaluate(async () => {
    const path = "/tests/support/regional-opening-preview.tsx";
    const fixture = await import(/* @vite-ignore */ path);
    fixture.mountRegionalOpeningPreview();
  });
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
  await expect(plate).toHaveJSProperty("naturalWidth", 2496);
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
});

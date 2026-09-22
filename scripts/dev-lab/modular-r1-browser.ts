import fs from "node:fs";
import { chromium, expect } from "@playwright/test";
const output =
  process.env.MODULAR_PROOF_OUT ?? "/private/tmp/modular-r1-browser";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const report: Record<string, unknown> = {
  errors,
  kind: "actual installed generation-16 browser regression fixture; separate from ordinary-game proof",
};
page.setDefaultTimeout(60000);
try {
  await page.goto(
    `${process.env.MODULAR_BASE_URL ?? "http://127.0.0.1:5488"}/?art-preview=candidate`,
    { waitUntil: "domcontentloaded", timeout: 60000 },
  );
  await page.evaluate(async () => {
    const modulePath = "/scripts/dev-lab/modular-r1-fixture.tsx";
    const module = await import(/* @vite-ignore */ modulePath);
    const host = document.createElement("div");
    host.id = "r1-fixture";
    Object.assign(host.style, {
      position: "fixed",
      inset: "0",
      overflow: "auto",
      zIndex: "99999",
      background: "#eee9df",
    });
    document.body.append(host);
    Reflect.set(window, "r1Fixture", module.mountFixture(host));
  });
  const fixture = page.locator("#r1-fixture");
  await expect(
    fixture.locator('[data-testid="modular-character"]'),
  ).toHaveCount(12, { timeout: 60000 });
  await expect(fixture.locator("img")).toHaveCount(72, { timeout: 60000 });
  const live = await fixture.locator("img").evaluateAll(async (images) =>
    Promise.all(
      images.map(async (image) => {
        const im = image as HTMLImageElement;
        await im.decode();
        return {
          asset: im.dataset.assetId,
          width: im.naturalWidth,
          height: im.naturalHeight,
        };
      }),
    ),
  );
  expect(live.every((x) => x.width > 0 && x.height > 0)).toBe(true);
  report.liveLayers = live;
  report.liveDiagnostics = await page.evaluate(() =>
    Reflect.get(window, "r1Fixture").diagnostics(),
  );
  expect(
    (report.liveDiagnostics as { variants: number }).variants,
  ).toBeGreaterThanOrEqual(72);
  await page.screenshot({ path: output + "/twelve-people.png" });
  const neutral = await fixture
    .locator('img[data-kind="head"]')
    .evaluateAll((xs) => xs.map((x) => (x as HTMLImageElement).src));
  await page.evaluate(() => Reflect.get(window, "r1Fixture").draw("smile"));
  await expect(fixture.locator("img")).toHaveCount(72, { timeout: 60000 });
  const smile = await fixture
    .locator('img[data-kind="head"]')
    .evaluateAll((xs) => xs.map((x) => (x as HTMLImageElement).src));
  expect(smile).not.toEqual(neutral);
  report.expressionChanged = true;
  report.corrective = await page.evaluate(() =>
    Reflect.get(window, "r1Fixture").corrective(),
  );
  await page.evaluate(() => Reflect.get(window, "r1Fixture").unmount());
  await expect(fixture.locator("img")).toHaveCount(0);
  report.released = await page.evaluate(() =>
    Reflect.get(window, "r1Fixture").diagnostics(),
  );
  expect((report.released as { variants: number }).variants).toBe(0);
  for (const kind of ["ramp", "stops", "map"]) {
    await page.evaluate(async (k) => {
      const p = "/scripts/dev-lab/modular-r1-fixture.tsx";
      const m = await import(/* @vite-ignore */ p);
      const f = m.mountFixture(document.querySelector("#r1-fixture")!);
      Reflect.set(window, "r1Restore", await f.materialFault(k));
    }, kind);
    await expect(
      fixture.locator('[data-material-group-state="unavailable"]'),
    ).toHaveCount(1);
    await expect(fixture.locator("img")).toHaveCount(0);
    report[`missing-${kind}`] = await fixture.innerText();
    await page.evaluate(() => Reflect.get(window, "r1Restore")());
  }
  report.rasterRoundTrip = await page.evaluate(async () => {
    const path = "/scripts/dev-lab/modular-r1-fixture.tsx";
    return (await import(/* @vite-ignore */ path)).rasterRoundTrip();
  });
  const raster = report.rasterRoundTrip as {
    input: number[][];
    decoded: number[];
    roundTrip: number[];
  };
  expect(raster.roundTrip.slice(8, 12)).toEqual(raster.input[2]);
  for (let i = 0; i < 4; i++)
    expect(raster.roundTrip[i * 4 + 3]).toBe(raster.input[i]![3]);
  expect(raster.decoded.slice(0, 3)).not.toEqual(raster.input[0]!.slice(0, 3));
  expect(errors).toEqual([]);
} finally {
  fs.writeFileSync(output + "/report.json", JSON.stringify(report, null, 2));
  await browser.close();
}

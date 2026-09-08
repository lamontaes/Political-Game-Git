import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 900, height: 1100 },
]) {
  for (const reducedMotion of ["reduce", "no-preference"] as const) {
    test(`initial raster waits for readiness ${viewport.width} ${reducedMotion}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion });
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let requests = 0;
      await page.route(/\.(png|webp|jpg|jpeg)(\?.*)?$/, async (route) => {
        if (route.request().resourceType() !== "image") return route.continue();
        requests++;
        await gate;
        await route.continue();
      });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const stage = page.getByTestId("title-tableau-stage");
      const camera = page.getByTestId("title-tableau-camera");
      await expect(stage).toBeVisible();
      await expect.poll(() => requests).toBeGreaterThan(0);
      const before = await camera.evaluate((element) => {
        const image = element.querySelector("img");
        return {
          paintedTier: element.getAttribute("data-painted-tier"),
          imagePresent: !!image,
          naturalWidth: image?.naturalWidth ?? 0,
          stageOpacity: getComputedStyle(element.parentElement!).opacity,
        };
      });
      await testInfo.attach("held-response-state", {
        body: JSON.stringify(before),
        contentType: "application/json",
      });
      try {
        expect(before.paintedTier).toBe("");
        expect(before.imagePresent).toBe(false);
      } finally {
        release();
      }
      const image = page.getByTestId("title-tableau-plate");
      await expect
        .poll(() =>
          image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
      await expect(camera).not.toHaveAttribute("data-painted-tier", "");
    });
  }
}

type HarnessApi = {
  request(width: number): void;
  missing(value: boolean): void;
  rerender(): void;
  loads(): { src: string; complete: boolean; naturalWidth: number }[];
  load(index: number): void;
  decode(index: number): void;
  fail(index: number): void;
  reject(index: number): void;
};
declare global {
  interface Window {
    rasterHarness: HarnessApi;
  }
}

test("hook gates actual decode, retains A during resize, ignores stale completion and reuses same width", async ({
  page,
}) => {
  await page.goto("/tests/e2e/support/raster-harness.html");
  const state = page.getByTestId("harness");
  await expect
    .poll(() => page.evaluate(() => window.rasterHarness.loads().length))
    .toBe(1);
  await expect(state).toHaveAttribute("data-painted", "");
  await page.evaluate(() => window.rasterHarness.load(0));
  await expect(state).toHaveAttribute("data-painted", "");
  await page.evaluate(() => window.rasterHarness.decode(0));
  await expect(state).toHaveAttribute("data-painted", "1024");
  const image = await page.getByTestId("harness-image").elementHandle();
  await page.evaluate(() => window.rasterHarness.request(2048));
  await expect
    .poll(() => page.evaluate(() => window.rasterHarness.loads().length))
    .toBe(2);
  await expect(state).toHaveAttribute("data-painted", "1024");
  await page.evaluate(() => {
    window.rasterHarness.load(1);
    window.rasterHarness.request(3072);
  });
  await expect
    .poll(() => page.evaluate(() => window.rasterHarness.loads().length))
    .toBe(3);
  await page.evaluate(() => window.rasterHarness.decode(1));
  await expect(state).toHaveAttribute("data-painted", "1024");
  await page.evaluate(() => {
    window.rasterHarness.load(2);
    window.rasterHarness.decode(2);
  });
  await expect(state).toHaveAttribute("data-painted", "3072");
  await page.evaluate(() => {
    window.rasterHarness.request(3072);
    window.rasterHarness.rerender();
  });
  await expect(state).toHaveAttribute("data-revision", "1");
  expect(await page.evaluate(() => window.rasterHarness.loads().length)).toBe(
    3,
  );
  expect(
    await image!.evaluate(
      (node) =>
        node === document.querySelector('[data-testid="harness-image"]'),
    ),
  ).toBe(true);
  await expect(state).toHaveAttribute("data-pending", "false");
});

for (const failure of ["error", "decode-rejection", "unavailable"] as const) {
  test(`initial ${failure} never claims paint and a later valid tier recovers`, async ({
    page,
  }) => {
    await page.goto("/tests/e2e/support/raster-harness.html");
    await expect
      .poll(() => page.evaluate(() => window.rasterHarness.loads().length))
      .toBe(1);
    await page.evaluate((kind) => {
      const api = window.rasterHarness;
      if (kind === "error") api.fail(0);
      else if (kind === "decode-rejection") {
        api.load(0);
        api.reject(0);
      } else api.missing(true);
      api.rerender();
    }, failure);
    const state = page.getByTestId("harness");
    await expect(state).toHaveAttribute("data-revision", "1");
    await expect(state).toHaveAttribute("data-painted", "");
    await expect(state).toHaveAttribute("data-pending", "true");
    await page.evaluate(() => {
      window.rasterHarness.request(2048);
    });
    if (failure === "unavailable") {
      // Let the missing-URL request settle before restoring the URL map.
      await page.evaluate(() => window.rasterHarness.rerender());
      await expect(state).toHaveAttribute("data-revision", "2");
      await page.evaluate(() => window.rasterHarness.missing(false));
    }
    await expect
      .poll(() => page.evaluate(() => window.rasterHarness.loads().length))
      .toBe(2);
    await page.evaluate(() => {
      window.rasterHarness.load(1);
      window.rasterHarness.decode(1);
    });
    await expect(state).toHaveAttribute("data-painted", "2048");
  });
}

test("non-title production office waits for its image response", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route(/\.(png|webp|jpg|jpeg)(\?.*)?$/, async (route) => {
    if (route.request().resourceType() !== "image") return route.continue();
    requested = true;
    await gate;
    await route.continue();
  });
  try {
    await page.goto("/?view=production-office", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("production-office-proof")).toBeVisible();
    await expect.poll(() => requested).toBe(true);
    await expect(page.getByTestId("production-office-plate")).toHaveCount(0);
  } finally {
    release();
  }
  await expect
    .poll(() =>
      page
        .getByTestId("production-office-plate")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
});

test("cold and warm title paint plus resize sweep never expose an undecoded claimed tier", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const ids = new WeakMap<Element, number>();
    let nextId = 0;
    const id = (element: Element | null) => {
      if (!element) return null;
      if (!ids.has(element)) ids.set(element, ++nextId);
      return ids.get(element)!;
    };
    window.rasterFrames = [];
    const sample = () => {
      const stage = document.querySelector(
        '[data-testid="title-tableau-stage"]',
      );
      const camera = stage?.querySelector(
        '[data-testid="title-tableau-camera"]',
      );
      const image = camera?.querySelector("img") ?? null;
      if (stage && camera)
        window.rasterFrames.push({
          stage: id(stage),
          image: id(image),
          tier: camera.getAttribute("data-painted-tier") ?? "",
          naturalWidth: image?.naturalWidth ?? 0,
          complete: image?.complete ?? false,
          opacity: getComputedStyle(stage).opacity,
        });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  for (const cache of ["cold", "warm"]) {
    await page.goto("/");
    const image = page.getByTestId("title-tableau-plate");
    await expect
      .poll(() =>
        image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    const stageHandle = await page
      .getByTestId("title-tableau-stage")
      .elementHandle();
    const imageHandle = await image.elementHandle();
    for (const viewport of [
      { width: 1000, height: 600 },
      { width: 2300, height: 1300 },
      { width: 900, height: 1100 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      // Wait for the real registry ladder and measured camera width to converge.
      await expect
        .poll(async () =>
          page.evaluate(async () => {
            const modulePath = "/src/presentation/scene-registry.ts";
            const { SCENE_REGISTRY } = await import(
              /* @vite-ignore */ modulePath
            );
            const stage = document.querySelector(
              '[data-testid="title-tableau-stage"]',
            )!;
            const camera = stage.querySelector(
              '[data-testid="title-tableau-camera"]',
            )!;
            const scene = SCENE_REGISTRY.scenes.get(
              stage.getAttribute("data-scene-id"),
            );
            const required =
              camera.getBoundingClientRect().width * devicePixelRatio;
            const tiers = scene.raster.ladder.tiers as { width: number }[];
            const expected =
              tiers.find((tier) => tier.width >= required) ??
              tiers[tiers.length - 1]!;
            return (
              camera.getAttribute("data-painted-tier") ===
              String(expected.width)
            );
          }),
        )
        .toBe(true);
      await expect
        .poll(() =>
          image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
    }
    // Cross at least two paint opportunities after the final resize.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    const frames = await page.evaluate(() => window.rasterFrames);
    const claimed = frames.filter((frame) => frame.tier !== "");
    expect(claimed.length).toBeGreaterThan(0);
    expect(
      claimed.filter((frame) => !frame.complete || frame.naturalWidth === 0),
    ).toEqual([]);
    expect(
      await stageHandle!.evaluate(
        (node) =>
          node ===
          document.querySelector('[data-testid="title-tableau-stage"]'),
      ),
    ).toBe(true);
    expect(
      await imageHandle!.evaluate(
        (node) =>
          node ===
          document.querySelector('[data-testid="title-tableau-plate"]'),
      ),
    ).toBe(true);
    await testInfo.attach(`${cache}-frames`, {
      body: JSON.stringify(frames),
      contentType: "application/json",
    });
    await testInfo.attach(`${cache}-paint`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  }
});

declare global {
  interface Window {
    rasterFrames: {
      stage: number | null;
      image: number | null;
      tier: string;
      naturalWidth: number;
      complete: boolean;
      opacity: string;
    }[];
  }
}

test("decoded title A stays visible while resized B response is held", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1000, height: 600 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const image = page.getByTestId("title-tableau-plate");
  await expect
    .poll(() =>
      image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  const original = await image.elementHandle();
  const originalSrc = await image.getAttribute("src");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route(/\.(png|webp|jpg|jpeg)(\?.*)?$/, async (route) => {
    if (route.request().resourceType() !== "image") return route.continue();
    requested = true;
    await gate;
    await route.continue();
  });
  try {
    await page.setViewportSize({ width: 2300, height: 1300 });
    await expect.poll(() => requested).toBe(true);
    await expect(image).toHaveAttribute("src", originalSrc!);
    expect(
      await image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(0);
    await testInfo.attach("resize-held-A", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  } finally {
    release();
  }
  await expect(image).not.toHaveAttribute("src", originalSrc!);
  await expect
    .poll(() =>
      image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  expect(
    await original!.evaluate(
      (node) =>
        node === document.querySelector('[data-testid="title-tableau-plate"]'),
    ),
  ).toBe(true);
});

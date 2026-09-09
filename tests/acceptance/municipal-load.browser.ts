import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";

test("the original twelve-navigation authored-bill workload", async ({
  page,
}, info) => {
  // The default 250-entry buffer truncates this application's import graph.
  await page.addInitScript(() =>
    performance.setResourceTimingBufferSize(10_000),
  );
  const started = Date.now();
  const navigations: unknown[] = [];
  let assertionsCompleted = 0;
  try {
    for (const url of [
      "/?view=legislation&place=kentucky",
      "/?view=legislation&place=nebraska",
      "/?view=legislation&place=alaska",
      "/?view=legislation&place=kentucky-signage",
      "/?view=legislation&place=nebraska-credentials",
      "/?view=legislation&place=alaska-ferry-notice",
    ]) {
      for (let load = 0; load < 2; load++) {
        const before = Date.now();
        await page.goto(url);
        const resources = await page.evaluate(() =>
          performance.getEntriesByType("resource").map((entry) => {
            const resource = entry as PerformanceResourceTiming;
            return {
              path: new URL(resource.name).pathname,
              transferredBytes: resource.transferSize,
              decodedBytes: resource.decodedBodySize,
              durationMs: resource.duration,
            };
          }),
        );
        navigations.push({
          url,
          load,
          elapsedMs: Date.now() - before,
          resources,
        });
        if (load === 0) await page.evaluate(() => window.localStorage.clear());
      }
      await expect(page.getByTestId("legislation-workspace")).toBeVisible();
      await expect(page.getByTestId("legislation-authored")).toHaveText(
        /the bill is not a real one/i,
      );
      assertionsCompleted++;
    }
  } finally {
    writeFileSync(
      info.outputPath("loading.json"),
      JSON.stringify(
        { elapsedMs: Date.now() - started, assertionsCompleted, navigations },
        null,
        2,
      ),
    );
  }
});

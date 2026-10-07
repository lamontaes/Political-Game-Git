import { test, expect } from "@playwright/test";
import { build, preview, type PreviewServer } from "vite";
import react from "@vitejs/plugin-react";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

let server: PreviewServer;
let origin: string;
// Build only the fixture. This avoids the full-game dependency optimizer and
// exercises unmodified production Guide/persistence modules in a real browser.
test.beforeAll(async () => {
  const outDir = mkdtempSync(join(tmpdir(), "guide-underlines-browser-"));
  await build({
    configFile: false,
    root: process.cwd(),
    plugins: [react()],
    logLevel: "error",
    build: {
      outDir,
      emptyOutDir: true,
      rolldownOptions: { input: resolve("tests/e2e/guide-underlines.html") },
    },
  });
  server = await preview({
    configFile: false,
    root: process.cwd(),
    logLevel: "error",
    build: { outDir },
    preview: { host: "127.0.0.1", port: 0 },
  });
  const address = server.httpServer.address();
  if (!address || typeof address === "string")
    throw new Error("Fixture preview has no TCP address");
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : resolve())),
    );
});

for (const touch of [false, true]) {
  test(`automatic underline opens and learned preference survives reload (${touch ? "touch" : "mouse"})`, async ({
    browser,
  }, info) => {
    const context = await browser.newContext({
      hasTouch: touch,
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(`${origin}/tests/e2e/guide-underlines.html`);
    await expect(page.getByTestId("prose")).toBeVisible();
    await page.getByTestId("unrelated").click();
    await expect(page.getByTestId("guide-entry")).toHaveCount(0);
    const point = await page.waitForFunction(() => {
      const registry = CSS as typeof CSS & {
        highlights: Map<string, Set<Range>>;
      };
      const ranges = registry.highlights.get("pg-guide-term");
      const range =
        ranges && [...ranges].find((entry) => entry.toString() === "quorum");
      if (!range) return null;
      const rect = range.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    const position = await point.jsonValue();
    if (touch) await page.touchscreen.tap(position!.x, position!.y);
    else await page.mouse.click(position!.x, position!.y);
    await expect(page.locator('[data-guide-entry="quorum"]')).toBeVisible();
    await page.screenshot({ path: info.outputPath("guide-entry.png") });
    await page.getByTestId("guide-entry-learned").click();
    await page.reload();
    await expect(page.getByTestId("prose")).toBeVisible();
    await page.waitForFunction(() => {
      const registry = CSS as typeof CSS & {
        highlights: Map<string, Set<Range>>;
      };
      return [...(registry.highlights.get("pg-guide-term") ?? [])].some(
        (range) => range.toString() === "filing deadline",
      );
    });
    await expect
      .poll(() =>
        page.evaluate(() => {
          const registry = CSS as typeof CSS & {
            highlights: Map<string, Set<Range>>;
          };
          return [...(registry.highlights.get("pg-guide-term") ?? [])].some(
            (range) => range.toString() === "quorum",
          );
        }),
      )
      .toBe(false);
    await page.getByTestId("guide-term-veto").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("guide-term-card-veto")).toBeVisible();
    await context.close();
  });
}

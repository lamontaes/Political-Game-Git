import { test as base, type Page } from "@playwright/test";
export { expect } from "@playwright/test";
export type { Page, Locator, Download } from "@playwright/test";

/**
 * The game draws its first screen after the page has loaded, not as part of
 * loading it: main.tsx shows "Loading your game…", looks for an installed
 * artwork snapshot and only then imports the app, because several modules read
 * that snapshot when they are first evaluated. So `page.goto` and
 * `page.reload` return while the title is still on its way. Against the dev
 * server the suite runs on, that import compiles the app on demand, measured
 * at 9 seconds cold and 1.4 to 4.4 warm, which is longer than a default
 * five-second expectation for the title. Before runtime artwork, the app was a
 * static import and that time was inside the navigation.
 *
 * This puts it back inside the navigation: every goto and reload waits until
 * the page has replaced its loading line with the game or with the reason it
 * could not start. A page with no game root (a review page) is ready at once.
 */
async function gameMounted(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const root = document.getElementById("root");
      if (!root) return true;
      if (root.firstElementChild) return true;
      const text = root.textContent ?? "";
      return text !== "" && text !== "Loading your game…";
    },
    undefined,
    { timeout: 60_000 },
  );
}

/** Attach observed seed/build/browser identity without changing control seeds. */
export const test = base.extend<{ reviewProvenance: void }>({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      await gameMounted(page);
      return response;
    };
    page.reload = async (options) => {
      const response = await reload(options);
      await gameMounted(page);
      return response;
    };
    await use(page);
  },
  reviewProvenance: [
    async ({ context, browser }, use, info) => {
      const observed: {
        url: string;
        querySeed: string | null;
        worldSeeds: string[];
        worldIds: string[];
      }[] = [];
      const capture = async () => {
        for (const page of context.pages()) {
          if (page.isClosed()) continue;
          try {
            const url = page.url();
            const state = await page.evaluate(() => ({
              seeds: Array.from(
                document.querySelectorAll(
                  "[data-world-seed], [data-simulation-seed]",
                ),
              )
                .map(
                  (node) =>
                    node.getAttribute("data-world-seed") ??
                    node.getAttribute("data-simulation-seed")!,
                )
                .concat(
                  Array.from(
                    document.querySelectorAll(
                      '[data-testid="review-seed"], [data-testid="trace-seed"], [data-testid="setup-seed"], .active-seed code',
                    ),
                  ).map((node) => node.textContent ?? ""),
                )
                .filter(Boolean),
              ids: Array.from(document.querySelectorAll("[data-world-id]"))
                .map((node) => node.getAttribute("data-world-id")!)
                .filter(Boolean),
            }));
            observed.push({
              url,
              querySeed: new URL(url).searchParams.get("seed"),
              worldSeeds: [...new Set(state.seeds)],
              worldIds: [...new Set(state.ids)],
            });
          } catch {
            /* Closed/navigation pages report no invented seed. */
          }
        }
      };
      await use();
      await capture();
      await info.attach("run-provenance", {
        body: JSON.stringify(
          {
            test: info.titlePath,
            browser: browser.version(),
            source: info.config.metadata.expectedIdentity,
            observed,
            seedPolicy:
              "Observed values only; an empty list means the surface did not report a seed. Test control seeds are unchanged.",
          },
          null,
          2,
        ),
        contentType: "application/json",
      });
    },
    { auto: true },
  ],
});

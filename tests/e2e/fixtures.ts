import { test as base } from "@playwright/test";
export { expect } from "@playwright/test";
export type { Page, Locator, Download } from "@playwright/test";

/** Attach observed seed/build/browser identity without changing control seeds. */
export const test = base.extend<{ reviewProvenance: void }>({
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

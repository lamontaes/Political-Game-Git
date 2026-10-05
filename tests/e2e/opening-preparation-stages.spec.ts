import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type { OpeningLifeGenerationProgress } from "../../src/presentation/opening-life";

type Fixture = {
  evidence: {
    status: string;
    error: string | null;
    place: string;
    seed: string;
    world: { id: string; date: string; people: number } | null;
    reports: readonly OpeningLifeGenerationProgress[];
    painted: readonly {
      requested: string;
      visible: string;
      value: string | null;
    }[];
    animation: string;
  };
  cancel: () => void;
  hasPublishedGame: () => boolean;
};
declare global {
  interface Window {
    openingPreparationFixture: Fixture;
  }
}

async function openFixture(page: Page, cancel: boolean) {
  // This page has no PlayerGame, save repository, or owner-session route.
  await page.route("**/__opening-preparation-proof", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><head><title>Isolated opening preparation</title></head><body></body></html>",
    }),
  );
  await page.goto("/__opening-preparation-proof");
  await page.evaluate(async (cancelFirst) => {
    const refreshPath = "/@react-refresh";
    const refresh = await import(/* @vite-ignore */ refreshPath);
    refresh.default.injectIntoGlobalHook(window);
    Object.assign(window, {
      $RefreshReg$: () => {},
      $RefreshSig$: () => (type: unknown) => type,
      __vite_plugin_react_preamble_installed__: true,
    });
    const path = "/tests/e2e/support/opening-preparation-fixture.tsx";
    const { mountOpeningPreparationFixture } = await import(
      /* @vite-ignore */ path
    );
    window.openingPreparationFixture =
      mountOpeningPreparationFixture(cancelFirst);
  }, cancel);
}

test("a fresh random life paints actual preparation stages and counts", async ({
  page,
}, info) => {
  await openFixture(page, false);
  await page.waitForFunction(() =>
    ["complete", "failed"].includes(
      window.openingPreparationFixture.evidence.status,
    ),
  );
  const evidence = await page.evaluate(
    () => window.openingPreparationFixture.evidence,
  );
  await writeFile(
    info.outputPath("opening-preparation.json"),
    JSON.stringify(evidence, null, 2),
  );
  console.info(
    "Opening browser evidence",
    evidence.place,
    evidence.seed,
    evidence.world,
  );
  await info.attach("opening-preparation", {
    body: JSON.stringify(evidence, null, 2),
    contentType: "application/json",
  });
  expect(evidence.error).toBeNull();
  expect(evidence.status).toBe("complete");
  expect(evidence.world!.people).toBeGreaterThan(0);
  const stages = [...new Set(evidence.reports.map((step) => step.label))];
  expect(stages).toEqual([
    "Preparing your life",
    "Preparing government",
    "Preparing state legislatures",
    "Preparing Congress principles",
    "Preparing world conditions",
    "Preparing local press and schedules",
    "Preparing courts",
    "Finalizing your life",
  ]);
  for (const stage of stages) {
    expect(
      evidence.painted.some(
        (frame) => frame.requested === stage && frame.visible === stage,
      ),
    ).toBe(true);
  }
  expect(
    evidence.painted.find((frame) => frame.requested === "Preparing courts")!
      .value,
  ).toBeNull();
  await expect(page.getByRole("status")).not.toContainText("%");
  await page.screenshot({ path: info.outputPath("preparation-stage.png") });
});

test("reduced motion can cancel without publishing a world", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openFixture(page, true);
  await expect(
    page.getByText("Preparing your life", { exact: true }),
  ).toBeVisible();
  await page.waitForFunction(
    () => window.openingPreparationFixture.evidence.status === "preparing",
  );
  expect(
    await page.evaluate(
      () => window.openingPreparationFixture.evidence.animation,
    ),
  ).toBe("none");
  await page.evaluate(() => window.openingPreparationFixture.cancel());
  await page.waitForFunction(
    () => window.openingPreparationFixture.evidence.status === "aborted",
  );
  expect(
    await page.evaluate(() =>
      window.openingPreparationFixture.hasPublishedGame(),
    ),
  ).toBe(false);
  expect(
    await page.evaluate(() => window.openingPreparationFixture.evidence.world),
  ).toBeNull();
  await expect(page.getByTestId("life-start-transition")).toHaveCount(0);
});

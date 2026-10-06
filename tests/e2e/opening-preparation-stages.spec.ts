import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type { OpeningLifeGenerationProgress } from "../../src/presentation/opening-life";

// Keep the browser proof's serialized contract independent of a TSX import;
// the test-import typecheck compiles this file without JSX.
type Fixture = {
  evidence: {
    status: string;
    error: string | null;
    place: string;
    seed: string;
    startAge: number;
    world: { id: string; date: string; people: number } | null;
    reports: readonly Omit<OpeningLifeGenerationProgress, "world">[];
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
type PaintedFrame = Fixture["evidence"]["painted"][number];
declare global {
  interface Window {
    openingPreparationFixture: Fixture;
  }
}

async function openFixture(
  page: Page,
  cancel: boolean,
  pauseBeforeHistory = false,
) {
  // This page has no PlayerGame, save repository, or owner-session route.
  await page.route("**/__opening-preparation-proof", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><head><title>Isolated opening preparation</title></head><body></body></html>",
    }),
  );
  await page.goto("/__opening-preparation-proof");
  await page.evaluate(
    async ({ cancelFirst, pauseHistory }) => {
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
      window.openingPreparationFixture = mountOpeningPreparationFixture(
        cancelFirst,
        pauseHistory,
      );
    },
    { cancelFirst: cancel, pauseHistory: pauseBeforeHistory },
  );
}

test("the shared glass loading screen paints a real checkpoint before advancing history", async ({
  page,
}, info) => {
  await openFixture(page, false, true);
  await expect(page.locator(".pg-life-transition-progress p")).toHaveText(
    "Living through 2021",
    { timeout: 30_000 },
  );
  await expect(page.locator(".pg-life-transition-heading h1")).toHaveText(
    "2021",
  );
  await expect(page.getByLabel("My journal")).toContainText("I ");
  await expect(page.getByTestId("political-map")).toBeVisible();
  const frame = page.locator(".pg-life-transition-story");
  const styles = await frame.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      border: style.borderTopWidth,
      radius: style.borderRadius,
      shadow: style.boxShadow,
      blur: style.backdropFilter,
      font: style.fontFamily,
    };
  });
  expect(styles.border).toBe("1px");
  expect(styles.radius).toBe("2px");
  expect(styles.shadow).not.toBe("none");
  expect(styles.blur).toContain("blur(");
  expect(styles.font).toContain("Fira Sans");
  const evidence = await page.evaluate(
    () => window.openingPreparationFixture.evidence,
  );
  await writeFile(
    info.outputPath("checkpoint-style.json"),
    JSON.stringify(
      {
        scope:
          "Actual 2021 institutions; paused before historical advance. Not speed or five-year acceptance.",
        styles,
        evidence,
      },
      null,
      2,
    ),
  );
  await page.screenshot({ path: info.outputPath("loading-glass-2021.png") });
  await page.evaluate(() => window.openingPreparationFixture.cancel());
  await page.waitForFunction(
    () => window.openingPreparationFixture.evidence.status === "aborted",
  );
  expect(
    await page.evaluate(() =>
      window.openingPreparationFixture.hasPublishedGame(),
    ),
  ).toBe(false);
});

test("a fresh random life paints actual preparation stages and counts", async ({
  page,
}, info) => {
  test.setTimeout(145_000);
  await openFixture(page, false);
  await page.waitForFunction(
    () =>
      ["complete", "failed"].includes(
        window.openingPreparationFixture.evidence.status,
      ),
    undefined,
    { timeout: 125_000 },
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
  await expect(page.getByLabel("Elapsed preparation time")).toContainText(
    "/ 2:00",
  );
  await expect(
    page.getByRole("heading", { name: "My journal", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("My journal")).toContainText("I ");
  await expect(page.locator(".pg-life-transition-heading h1")).toBeVisible();
  const stages = [
    ...new Set(
      evidence.reports.map(
        (step: Omit<OpeningLifeGenerationProgress, "world">) => step.label,
      ),
    ),
  ];
  expect(
    stages.filter((stage) => !stage.startsWith("Living through ")),
  ).toEqual([
    "Preparing your life",
    "Preparing government",
    "Preparing state legislatures",
    "Preparing Congress principles",
    "Preparing world conditions",
    "Preparing local press and schedules",
    "Preparing courts",
    "Finalizing your life",
  ]);
  expect(stages.filter((stage) => stage.startsWith("Living through "))).toEqual(
    [
      "Living through 2021",
      "Living through 2022",
      "Living through 2023",
      "Living through 2024",
      "Living through 2025",
      "Living through 2026",
    ],
  );
  for (const stage of stages) {
    expect(
      evidence.painted.some(
        (frame: PaintedFrame) =>
          frame.requested === stage && frame.visible === stage,
      ),
    ).toBe(true);
  }
  expect(
    evidence.painted.find(
      (frame: PaintedFrame) => frame.requested === "Preparing courts",
    )!.value,
  ).toBeNull();
  await expect(page.locator(".pg-life-transition-progress")).not.toContainText(
    "%",
  );
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

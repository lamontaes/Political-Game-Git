import fs from "node:fs";
import { captureDirectory } from "./support/evidence-path";
import path from "node:path";
import { expect, test } from "@playwright/test";

const TRACKED_EVIDENCE = "docs/agent/evidence/people1-r1";
/**
 * Resolved per test rather than at module load: an ordinary run writes into
 * that test's own output directory, and only PG_CAPTURE_EVIDENCE=1 refreshes
 * the tracked owner-review images.
 */
const evidenceDir = () =>
  captureDirectory(TRACKED_EVIDENCE) ?? test.info().outputPath();

for (const set of ["dev", "real"]) {
  test(`saved ${set} world keeps identity across actual wardrobe changes, pointer and keyboard`, async ({
    page,
  }) => {
    // The reload assertion below needs more than the default 5s under load;
    // give the rest of the test (a keyboard wardrobe change and a screenshot
    // after it) enough of the default 30s budget left over once that wait
    // has actually spent time on it.
    test.setTimeout(60_000);
    await page.goto(`/?view=character-proof&set=${set}`);
    const authored = page
      .getByTestId("people1-dossier-consumers")
      .locator('[data-likeness="authored"] img');
    await expect(authored).toHaveCount(2);
    for (const portrait of await authored.all()) {
      await expect(portrait).toBeVisible();
      expect(
        await portrait.evaluate(
          (node) => (node as HTMLImageElement).naturalWidth,
        ),
      ).toBeGreaterThan(0);
    }
    const person = page.getByTestId("character-proof-stage-character").first();
    const identity = await person.getAttribute("data-recipe-key");
    const stableLayers = () =>
      person
        .locator(
          'img[data-kind="body"],img[data-kind="head"],img[data-kind^="hair"]',
        )
        .evaluateAll((nodes) =>
          nodes.map((n) => n.getAttribute("data-asset-id")),
        );
    const stable = await stableLayers();
    const select = page.getByTestId("character-proof-wardrobe");
    await select.selectOption("casual");
    const casualTop = await person
      .locator('img[data-kind="top"]')
      .getAttribute("data-asset-id");
    await page.getByTestId("character-proof-save").click();
    await page.getByTestId("character-proof-reload").focus();
    await page.keyboard.press("Enter");
    // A real browser reload of this dev route re-fetches and re-transforms
    // the whole Vite module graph before React mounts anything into #root -
    // confirmed (twice, on two different heads including one predating any
    // of this session's changes) to occasionally run past the default 5s
    // assertion timeout under load. Not a race in the app: everything after
    // this point passes once the remount actually completes.
    await expect(page.getByTestId("character-proof")).toHaveAttribute(
      "data-world-source",
      "restored-snapshot",
      { timeout: 20_000 },
    );
    await select.focus();
    await page.keyboard.press("f");
    await page.keyboard.press("Enter");
    await expect(select).toHaveValue("formal");
    await expect(person).toHaveAttribute("data-recipe-key", identity!);
    expect(await stableLayers()).toEqual(stable);
    expect(
      await person
        .locator('img[data-kind="top"]')
        .getAttribute("data-asset-id"),
    ).not.toBe(casualTop);
    await expect(person).toHaveAttribute("data-complete", "true");
    fs.mkdirSync(evidenceDir(), { recursive: true });
    await page.getByTestId("character-proof-stage").screenshot({
      path: path.join(evidenceDir(), `saved-formal-${set}.png`),
    });
  });
}

test("normalized candidate states name head and fit limitations beside the actual layers", async ({
  page,
}) => {
  await page.goto("/?view=character-proof&set=wave-a");
  await page
    .getByTestId("candidate-review-body-select")
    .selectOption("wave_a_average_man_standing_neutral_front_a_v1_rt960");
  await expect(page.getByTestId("candidate-fit-evidence")).toContainText(
    "no facial features",
  );
  await expect(
    page
      .getByTestId("candidate-review-character")
      .locator('img[data-kind="head"]'),
  ).toHaveCount(0);
  await expect(
    page
      .getByTestId("candidate-review-character")
      .locator('img[data-kind="top"]'),
  ).toHaveCount(1);
  await page
    .getByRole("checkbox", { name: "Show root and attachment anchors" })
    .click();
  fs.mkdirSync(evidenceDir(), { recursive: true });
  await page.getByTestId("candidate-review-stage").screenshot({
    path: path.join(evidenceDir(), "normalized-standing-candidate.png"),
  });
  await page
    .getByTestId("candidate-review-body-select")
    .selectOption("wave_a_average_woman_seated_front_neutral_v1_rt960");
  await expect(page.getByTestId("candidate-review-complete")).toHaveText(
    "false",
  );
  await expect(
    page
      .getByTestId("candidate-review-character")
      .locator('img[data-kind="bottom"]'),
  ).toHaveCount(0);
  await page.getByTestId("candidate-review-stage").screenshot({
    path: path.join(evidenceDir(), "seated-candidate-gaps.png"),
  });
});

/**
 * Retired: this asserted the pre-scene-first shell - a portrait mounted
 * inside `life-hud`, a "People in this life" complementary rail, and an
 * `elsewhere-people` destination. The scene-first redesign (UI9-03) replaced
 * all three deliberately: people render in the room itself
 * (`scene-first-shell.spec.ts` asserts `people-rail` has count 0), the
 * corner cluster shows an emblem and text rather than a portrait
 * (`ShellNav.tsx`'s `shell-nav-identity`), and no `elsewhere-people`
 * destination exists in current source. None of the three testids/roles
 * this test looked for exist anywhere in `src/` any more - not a bug this
 * reconciliation introduced, and not something to restore against an
 * accepted redesign. Left retired rather than deleted so the obsolete
 * expectation and its reason stay in history.
 */
test("normal play uses the canonical person's portrait fallback and named people", async () => {
  test.skip(
    true,
    "Tests the pre-scene-first shell (life-hud portrait, People-in-this-life rail, elsewhere-people); all three were deliberately replaced by the scene-first redesign and no longer exist in source. See scene-first-shell.spec.ts for the current coverage of named people in the room.",
  );
});

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
    await expect(page.getByTestId("character-proof")).toHaveAttribute(
      "data-world-source",
      "restored-snapshot",
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
    await page
      .getByTestId("character-proof-stage")
      .screenshot({
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
  await page
    .getByTestId("candidate-review-stage")
    .screenshot({
      path: path.join(evidenceDir(), "seated-candidate-gaps.png"),
    });
});

test("normal play uses the canonical person's portrait fallback and named people", async ({
  page,
}) => {
  const { startLife, enterLife } = await import("./support/creator");
  await page.goto("/");
  await startLife(page, {
    age: 10,
    route: "custom",
    childhood: true,
    household: "shares-a-home",
  });
  await enterLife(page);
  const portrait = page.getByTestId("life-hud").getByTestId("person-portrait");
  await expect(portrait).toBeVisible();
  await expect(portrait).toHaveAttribute("data-likeness", "none");
  await expect(portrait.locator("img")).toHaveCount(0);
  await expect(portrait.locator("strong")).not.toHaveText("");
  const people = page.getByRole("complementary", {
    name: "People in this life",
  });
  await expect(people).toBeVisible();
  await expect(people.getByRole("listitem")).toHaveCount(2);
  await page.getByTestId("elsewhere-people").click();
  fs.mkdirSync(evidenceDir(), { recursive: true });
  await page.screenshot({
    path: path.join(evidenceDir(), "normal-player-people-1440.png"),
  });
  await page.setViewportSize({ width: 1200, height: 720 });
  await expect(portrait).toBeVisible();
  await page.screenshot({
    path: path.join(evidenceDir(), "normal-player-people-1200.png"),
  });
});

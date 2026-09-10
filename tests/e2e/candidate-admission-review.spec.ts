import fs from "fs";
import path from "path";

import { expect, test } from "@playwright/test";

const REVIEW_URL = "/?view=character-proof&set=wave-a";

/**
 * Where the owner review set is written.
 *
 * The screenshots are the deliverable, not a debugging aid: an owner deciding
 * whether to promote body art has to see the body art, and a report that points
 * at a JSON file is not that. They are captured through the real review surface
 * at the real gameplay scale, so what the owner looks at is what the compositor
 * actually drew.
 */
const EVIDENCE_DIRECTORY = path.resolve(
  process.cwd(),
  "docs/agent/evidence/people1",
);

/**
 * Banking this set into tracked evidence is an explicit act.
 *
 * The captures stay the deliverable and every run still produces a complete set
 * — into its own artifact directory, which is what an owner opens. What changed
 * is that an ordinary suite run no longer rewrites the banked historical set as
 * a side effect: replacing it requires `PEOPLE1_EVIDENCE=1` and a commit that
 * says so. Capturing is still not an art approval.
 */
const banksEvidence = Boolean(process.env.PEOPLE1_EVIDENCE);

const OWNER_REVIEW_SET = [
  "pg_body_fl_standing_v1",
  "pg_body_ml_standing_v1",
  "wave_a_average_man_standing_neutral_front_a_v1",
  "wave_a_average_man_standing_neutral_front_b_v1",
  "wave_a_average_woman_standing_neutral_front_a_v1",
  "wave_a_average_woman_standing_neutral_front_b_v1",
  "wave_a_average_woman_seated_front_neutral_v1",
  "wave_a_fat_man_standing_neutral_front_a_v1",
  "wave_a_older_woman_standing_neutral_front_a_v1",
  "wave_a_older_woman_standing_neutral_front_b_v1",
  "wave_a_skinny_man_standing_neutral_front_a_v1",
  "wave_a_skinny_woman_standing_neutral_front_a_v1",
  "wave_a_skinny_woman_standing_neutral_front_b_v1",
  "wave_a_skinny_woman_seated_front_neutral_v1",
] as const;

test.describe("Wave A candidate admission review", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(REVIEW_URL);
  });

  test("shows the admitted bodies as candidates and never as production art", async ({
    page,
  }) => {
    await expect(page.getByTestId("character-proof")).toHaveAttribute(
      "data-proof-set",
      "wave-a",
    );
    const review = page.getByTestId("candidate-admission-review");
    await expect(review).toContainText("CANDIDATE REFERENCE ONLY");
    await expect(review).toContainText("Measurement is not approval");

    const dispositions = page
      .getByTestId("candidate-review-dispositions")
      .locator("tbody tr");
    await expect(dispositions).toHaveCount(51);
    const admitted = await dispositions.evaluateAll(
      (rows) =>
        rows.filter(
          (row) =>
            row.getAttribute("data-disposition") === "admitted-candidate-body",
        ).length,
    );
    expect(admitted).toBe(12);
  });

  test("renders a Wave A body and names every slot it cannot fill", async ({
    page,
  }) => {
    const select = page.getByTestId("candidate-review-body-select");
    await select.selectOption("wave_a_fat_man_standing_neutral_front_a_v1");

    const layers = page
      .getByTestId("candidate-review-character")
      .locator("img.modular-character-layer");
    await expect(layers).toHaveCount(1);
    await expect(layers.first()).toHaveAttribute(
      "data-asset-id",
      "wave_a_fat_man_standing_neutral_front_a_v1",
    );
    await expect
      .poll(() =>
        layers
          .first()
          .evaluate(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
      )
      .toBe(true);

    await expect(page.getByTestId("candidate-review-complete")).toHaveText(
      "false",
    );
    for (const slotId of ["head", "top", "bottom", "footwear"]) {
      const row = page
        .getByTestId("candidate-review-slots")
        .locator(`tr[data-slot-id="${slotId}"]`);
      await expect(row).toHaveAttribute("data-compatible", "0");
      await expect(row).toContainText("wave-a-fat-man");
    }
    await expect(
      page.getByTestId("candidate-review-diagnostics"),
    ).toContainText(
      "Compatibility is undeclared in this library; this does not establish missing pixels",
    );
  });

  test("still finishes a banked pg body in the same surface", async ({
    page,
  }) => {
    await page
      .getByTestId("candidate-review-body-select")
      .selectOption("pg_body_ml_standing_v1");
    await expect(page.getByTestId("candidate-review-complete")).toHaveText(
      "true",
    );
    const layers = page
      .getByTestId("candidate-review-character")
      .locator("img.modular-character-layer");
    expect(await layers.count()).toBeGreaterThanOrEqual(5);
  });

  test("holds identity through a pointer recompose and a second anchor", async ({
    page,
  }) => {
    await page
      .getByTestId("candidate-review-body-select")
      .selectOption("wave_a_skinny_woman_seated_front_neutral_v1");
    const key = await page
      .getByTestId("candidate-review-recipe-key")
      .textContent();
    expect(key).toContain("wave-a-skinny-woman");

    await page.getByTestId("candidate-review-recompose").click();
    await expect(
      page.getByTestId("candidate-review-recipe-key-again"),
    ).toHaveText(key!);
    await expect(
      page.getByTestId("candidate-review-recipe-key-elsewhere"),
    ).toHaveText(key!);

    // Reload: identity survives leaving the page, because it belongs to the
    // appearance rather than to anything this surface is holding in memory.
    await page.reload();
    await page
      .getByTestId("candidate-review-body-select")
      .selectOption("wave_a_skinny_woman_seated_front_neutral_v1");
    await expect(page.getByTestId("candidate-review-recipe-key")).toHaveText(
      key!,
    );
  });

  test("is operable by keyboard alone", async ({ page }) => {
    const select = page.getByTestId("candidate-review-body-select");
    await select.focus();
    await expect(select).toBeFocused();
    // Native type-ahead on a focused listbox: a real key, not a synthetic
    // change event. "w" jumps to the first option whose label starts with
    // "Wave A", which is how a keyboard user reaches the admitted bodies.
    await select.press("w");
    await expect.poll(() => select.inputValue()).toMatch(/^wave_a_/);

    const anchorToggle = page.getByRole("checkbox", {
      name: /Show root and attachment anchors/,
    });
    await anchorToggle.focus();
    await anchorToggle.press("Space");
    await expect(anchorToggle).toBeChecked();
    await expect(
      page
        .getByTestId("candidate-review-character")
        .locator(".character-anchor-marker"),
    ).not.toHaveCount(0);

    const recompose = page.getByTestId("candidate-review-recompose");
    await recompose.focus();
    await expect(recompose).toBeFocused();
    await recompose.press("Enter");
    await expect(page.getByTestId("candidate-review-recipe-key")).toHaveText(
      (await page
        .getByTestId("candidate-review-recipe-key-again")
        .textContent())!,
    );
  });

  test("captures the owner review set", async ({ page }, testInfo) => {
    const target = banksEvidence
      ? EVIDENCE_DIRECTORY
      : testInfo.outputPath("owner-review-set");
    fs.mkdirSync(target, { recursive: true });
    const select = page.getByTestId("candidate-review-body-select");
    for (const assetId of OWNER_REVIEW_SET) {
      await select.selectOption(assetId);
      const stage = page.getByTestId("candidate-review-stage");
      await expect(
        page.getByTestId("candidate-review-compositor"),
      ).toHaveAttribute("data-body-asset-id", assetId);
      const layers = page
        .getByTestId("candidate-review-character")
        .locator("img.modular-character-layer");
      await expect
        .poll(() =>
          layers.evaluateAll(
            (images) =>
              images.length > 0 &&
              images.every(
                (image) =>
                  (image as HTMLImageElement).complete &&
                  (image as HTMLImageElement).naturalWidth > 0,
              ),
          ),
        )
        .toBe(true);
      await stage.screenshot({
        path: path.join(target, `${assetId}.png`),
      });
    }
    expect(fs.readdirSync(target).length).toBeGreaterThanOrEqual(
      OWNER_REVIEW_SET.length,
    );
  });
});

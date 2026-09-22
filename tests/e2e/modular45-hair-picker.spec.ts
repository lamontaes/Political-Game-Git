import { existsSync } from "node:fs";
import { expect, test } from "./fixtures";
import { fillCreator } from "./support/creator";

test.skip(
  !existsSync("art/manifest/character_candidate_engine41_registry.json"),
  "Requires the separately delivered private MODULAR41 candidate bank.",
);

test("current-bank hairstyle cards preview actual compatible hair without changing the draft life", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/?art-preview=candidate");
  await fillCreator(page, {
    age: 26,
    givenName: "Preview",
    familyName: "Check",
    state: "Iowa",
    place: "Mona",
    route: "custom",
    household: "shares-a-home",
    gender: "male",
  });
  const grid = page.getByTestId("person-appearance-hair-grid");
  await expect(grid).toBeVisible();
  const choices = grid.getByRole("radio");
  expect(await choices.count()).toBeGreaterThan(1);
  const originalValue = await grid
    .locator('input[type="radio"]:checked')
    .inputValue();
  const original = await page
    .getByTestId("creator-stage-appearance")
    .getByTestId("person-portrait-character")
    .first()
    .getAttribute("data-recipe-key");
  const alternate = grid
    .locator('input[type="radio"]:not(:checked):not(:disabled)')
    .first();
  const alternateValue = await alternate.inputValue();
  await alternate.focus();
  await page.keyboard.press("Space");
  await expect(
    grid.locator(`input[type="radio"][value="${alternateValue}"]`),
  ).toBeChecked();
  const changed = await page
    .getByTestId("creator-stage-appearance")
    .getByTestId("person-portrait-character")
    .first()
    .getAttribute("data-recipe-key");
  expect(changed).not.toEqual(original);
  const thumbnails = grid.locator(".appearance-hair-preview img");
  await expect
    .poll(() =>
      thumbnails.evaluateAll((images) =>
        images.every(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: test.info().outputPath("current-bank-hair-picker.png"),
  });
  await page.getByRole("button", { name: "Reset appearance" }).click();
  await expect(grid.locator('input[type="radio"]:checked')).toHaveValue(
    originalValue,
  );
});

test("current-bank fuller masculine body and contrasting face render as decoded layers", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.goto("/?art-preview=candidate");
  await fillCreator(page, {
    age: 26,
    givenName: "Fit",
    familyName: "Review",
    state: "Iowa",
    place: "Mona",
    route: "custom",
    household: "shares-a-home",
    gender: "male",
  });
  await page
    .getByTestId("person-appearance-bodyFamily")
    .selectOption("ep41-masc-heavy-body");
  await page
    .getByTestId("outfit-replacement-preview")
    .getByRole("button", { name: "Apply this outfit" })
    .click();
  await page
    .getByTestId("person-appearance-headFamily")
    .selectOption("ep41-masc-heavy-head-heavy");
  const dialog = page.getByTestId("outfit-replacement-preview");
  if (await dialog.isVisible())
    await dialog.getByRole("button", { name: "Apply this outfit" }).click();
  const full = page.getByTestId("outfit-pending-full-body").first();
  await expect(full).toHaveAttribute("data-complete", "true");
  const images = full.locator("img.modular-character-layer");
  await expect
    .poll(() =>
      images.evaluateAll(
        (nodes) =>
          nodes.length > 0 &&
          nodes.every(
            (node) =>
              (node as HTMLImageElement).complete &&
              (node as HTMLImageElement).naturalWidth > 0,
          ),
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: test.info().outputPath("fuller-body-creator.png"),
  });
  await page
    .getByTestId("creator-stage-appearance")
    .getByTestId("person-portrait")
    .first()
    .screenshot({ path: test.info().outputPath("fuller-body-portrait.png") });
});

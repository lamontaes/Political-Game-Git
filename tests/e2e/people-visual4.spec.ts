import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
const dir = path.resolve("docs/agent/evidence/people-visual4");

test("selected canonical candidate keeps identity across wardrobe, portrait, scene and keyboard reload", async ({
  page,
}) => {
  await page.goto("/?view=character-proof&set=visual4");
  await expect(page.getByTestId("people-visual4-review")).toBeVisible();
  await expect(page.getByTestId("visual4-completeness")).toContainText(
    "Complete candidate combination",
  );
  for (const name of ["headFamily", "hairFamily", "bottom", "footwear"]) {
    const control = page.getByRole("combobox", { name, exact: true });
    await control.click();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
  }
  const character = page.getByTestId("candidate-review-character");
  const personId = await character.getAttribute("data-person-id");
  const identity = await character.getAttribute("data-recipe-key");
  const top = page.getByRole("combobox", { name: "top", exact: true });
  const choices = await top
    .locator("option")
    .evaluateAll((options) =>
      options.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
    );
  expect(choices.length).toBeGreaterThan(1);
  await top.selectOption(choices[0]!);
  const layersA = await character
    .locator("img")
    .evaluateAll((imgs) => imgs.map((i) => i.getAttribute("data-asset-id")));
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await top.click();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(top).not.toHaveValue(choices[0]!);
  const layersB = await character
    .locator("img")
    .evaluateAll((imgs) => imgs.map((i) => i.getAttribute("data-asset-id")));
  expect(layersB).not.toEqual(layersA);
  await page
    .getByRole("button", { name: "Reload review", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(top).toHaveValue(choices[0]!);
  expect(
    await character
      .locator("img")
      .evaluateAll((imgs) => imgs.map((i) => i.getAttribute("data-asset-id"))),
  ).toEqual(layersA);
  await expect(character).toHaveAttribute("data-person-id", personId!);
  await expect(character).toHaveAttribute("data-recipe-key", identity!);
  await expect(page.getByTestId("person-portrait")).toHaveAttribute(
    "data-likeness",
    "modular",
  );
  await expect(page.getByTestId("visual4-scene-status")).toContainText(
    "Complete candidate",
  );
  const box = await page.getByTestId("candidate-review-stage").boundingBox();
  expect(box).not.toBeNull();
  for (const image of await character.locator("img").all()) {
    const b = await image.boundingBox();
    expect(b).not.toBeNull();
    expect(b!.x).toBeGreaterThanOrEqual(box!.x - 0.5);
    expect(b!.y).toBeGreaterThanOrEqual(box!.y - 0.5);
    expect(b!.x + b!.width).toBeLessThanOrEqual(box!.x + box!.width + 0.5);
    expect(b!.y + b!.height).toBeLessThanOrEqual(box!.y + box!.height + 0.5);
  }
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, "selected-person-wardrobe-reload.png"),
    fullPage: true,
  });
});

test("every available body can be selected and framed without changing its geometry", async ({
  page,
}) => {
  await page.goto("/?view=character-proof&set=visual4");
  const select = page.getByRole("combobox", {
    name: "bodyFamily",
    exact: true,
  });
  const bodies = await select
    .locator("option")
    .evaluateAll((options) =>
      options.map((o) => (o as HTMLOptionElement).value),
    );
  expect(bodies.length).toBeGreaterThan(1);
  await select.click();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  for (const body of bodies) {
    await select.selectOption(body);
    await expect(select).toHaveValue(body);
    const stage = await page
      .getByTestId("candidate-review-stage")
      .boundingBox();
    expect(stage).not.toBeNull();
    for (const image of await page
      .getByTestId("candidate-review-character")
      .locator("img")
      .all()) {
      const box = await image.boundingBox();
      expect(box!.y).toBeGreaterThanOrEqual(stage!.y - 0.5);
      expect(box!.y + box!.height).toBeLessThanOrEqual(
        stage!.y + stage!.height + 0.5,
      );
    }
  }
  await page.getByRole("checkbox", { name: "Attachment overlay" }).click();
  await expect(
    page.getByTestId("candidate-review-character-root-marker"),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Attachment overlay" }).focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("checkbox", { name: "Attachment overlay" }),
  ).not.toBeChecked();
  const person = page.getByRole("combobox", { name: "Person", exact: true });
  await person.click();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, "all-body-selection-final.png"),
    fullPage: true,
  });
});

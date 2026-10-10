import { expect, test } from "./fixtures";
import { fillCreator, enterLife } from "./support/creator";

test("Calais normal start, the cinematic opening and return-to-title preserve the life", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 853, height: 650 });
  await page.goto("/?art-preview=candidate&seed=u-calais-systemic");
  // Startup now awaits the immutable content snapshot before importing catalogs.
  await page.getByTestId("new-game").waitFor({ timeout: 90_000 });
  const title = page.getByTestId("title-establishing-plate").locator("..");
  await expect(title).toBeVisible();
  await expect(title).toHaveCSS("animation-name", "title-ambient-drift");
  const firstTransform = await title.evaluate(
    (node) => getComputedStyle(node).transform,
  );
  await expect
    .poll(() => title.evaluate((node) => getComputedStyle(node).transform))
    .not.toBe(firstTransform);
  await fillCreator(page, {
    age: 22,
    gender: "male",
    state: "Maine",
    place: "Calais",
    givenName: "Corey",
    familyName: "Chen",
  });
  const begin = page.getByTestId("begin");
  await expect(begin).toBeEnabled();
  await expect(begin).toBeInViewport();
  await page.getByRole("button", { name: "Next Body", exact: true }).click();
  await page.getByTestId("creator-reset-appearance").click();
  await page.screenshot({
    path: info.outputPath("calais-male-creator-853.png"),
  });
  await begin.click();
  const intro = page.getByTestId("world-orientation");
  await expect(intro).toBeVisible({ timeout: 90_000 });
  // The opening is cinematic: it fills the window between black letterbox
  // bars, opaque, not a card over the room, and the picture holds still.
  const layer = await intro.boundingBox();
  expect(layer).toEqual({ x: 0, y: 0, width: 853, height: 650 });
  await expect(intro).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(intro).toHaveAttribute("data-step", "country");
  await expect(
    page.getByRole("button", { name: "Pause motion", exact: true }),
  ).toHaveCount(0);
  // The President and Vice President carry plaques.
  await expect(page.getByTestId("opening-plaque")).toHaveCount(2);
  await page.screenshot({
    path: info.outputPath("calais-country-853.png"),
  });
  // Every number is in the Ledger, closed until asked for.
  const ledger = page.getByTestId("opening-ledger-toggle");
  await expect(ledger).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("opening-ledger")).toHaveCount(0);
  await ledger.click();
  await expect(page.getByTestId("opening-state-population")).toBeVisible();
  await expect(page.getByTestId("opening-state-voting")).toBeVisible();
  await ledger.click();
  await expect(page.getByTestId("opening-ledger")).toHaveCount(0);
  await page.getByTestId("orientation-next").focus();
  await page.keyboard.press("Enter");
  await expect(intro).toHaveAttribute("data-step", "representatives");
  await expect(
    page.locator('.pg-scene-chapter[data-stage="leaving"]'),
  ).toHaveCount(0);
  for (const viewport of [
    { width: 853, height: 650 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByTestId("orientation-next")).toBeInViewport();
    await page.screenshot({
      path: info.outputPath(`calais-representatives-${viewport.width}.png`),
    });
  }
  await page.getByTestId("orientation-back").click();
  await expect(
    page.locator('.pg-scene-chapter[data-stage="leaving"]'),
  ).toHaveCount(0);
  await expect(intro).toHaveAttribute("data-step", "country");
  // Rapid changes coalesce to the last requested cut. A canceled image
  // decode cannot reveal an earlier target or leave duplicate active groups.
  await page.getByTestId("orientation-next").click();
  await page.getByTestId("orientation-next").click();
  await page.getByTestId("orientation-back").click();
  await expect(
    page.locator('.pg-scene-chapter[data-stage="current"]'),
  ).toHaveAttribute("data-chapter", "representatives");
  await expect(page.locator(".pg-scene-chapter")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByTestId("orientation-back").click();
  await expect(page.locator(".pg-scene-chapter")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await enterLife(page);
  // Same event sent by the installed host; ordinary game buttons own the answer.
  expect(
    await page.evaluate(
      () =>
        !window.dispatchEvent(
          new CustomEvent("ocd:request-return-to-title", { cancelable: true }),
        ),
    ),
  ).toBe(true);
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        !window.dispatchEvent(
          new CustomEvent("ocd:request-return-to-title", { cancelable: true }),
        ),
    ),
  ).toBe(true);
  await dialog
    .getByRole("button", { name: "Save and return", exact: true })
    .click();
  await expect(page.getByTestId("continue")).toBeEnabled();
  await page.getByTestId("continue").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("new-game")).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("calais-continued.png") });
});

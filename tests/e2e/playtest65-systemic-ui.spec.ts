import { expect, test } from "./fixtures";
import { fillCreator, enterLife } from "./support/creator";

test("Calais normal start, combined introduction and return-to-title preserve the life", async ({
  page,
}, info) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 853, height: 650 });
  await page.goto("/?art-preview=candidate&seed=u-calais-systemic");
  const title = page.getByTestId("title-establishing-plate");
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
  await expect(page.getByTestId("world-orientation")).toBeVisible({
    timeout: 90_000,
  });
  const openingDate = await page
    .locator(".pg-orientation-kicker")
    .textContent();
  await page.getByTestId("orientation-next").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("orientation-step-state")).toBeVisible();
  await expect(page.getByTestId("opening-state-population")).toBeVisible();
  await expect(page.getByTestId("opening-state-voting")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Population", exact: true }),
  ).toHaveCount(0);
  for (const viewport of [
    { width: 853, height: 650 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByTestId("orientation-next")).toBeInViewport();
    await page.screenshot({
      path: info.outputPath(`calais-state-${viewport.width}.png`),
    });
  }
  await page.getByTestId("orientation-back").click();
  expect(await page.locator(".pg-orientation-kicker").textContent()).toBe(
    openingDate,
  );
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

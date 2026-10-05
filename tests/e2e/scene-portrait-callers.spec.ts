import { randomInt } from "node:crypto";
import { expect, test, type Locator, type Page } from "./fixtures";
import { startLife } from "./support/creator";

const places = [
  { place: "Lexington", state: "Kentucky" },
  { place: "Tucson", state: "Arizona" },
  { place: "Manchester", state: "New Hampshire" },
];
function clothing(key: string) {
  const parts = key.split("|");
  return {
    outfit: parts[6],
    colors: parts.filter((part) => part.includes("=")),
  };
}
async function drawnClothing(control: Locator) {
  const figure = control.locator("[data-engine-recipe]").first();
  await expect(figure).toBeVisible({ timeout: 30_000 });
  return clothing((await figure.getAttribute("data-engine-recipe"))!);
}

async function onscreenFigure(controls: Locator, page: Page) {
  const viewport = page.viewportSize()!;
  for (const control of await controls.all()) {
    const box = await control.boundingBox();
    if (
      box &&
      box.x + box.width / 2 > 0 &&
      box.x + box.width / 2 < viewport.width &&
      box.y + box.height / 2 > 0 &&
      box.y + box.height / 2 < viewport.height
    )
      return control;
  }
  throw new Error("No actual figure has an onscreen click target.");
}

test("opening tour and ordinary scene inspect carry their actual rendered clothes", async ({
  page,
}, info) => {
  const place = places[randomInt(places.length)]!;
  info.annotations.push({
    type: "ordinary-place",
    description: `${place.place}, ${place.state}`,
  });
  await page.goto("/");
  await startLife(page, { ...place, age: 10 });
  const intro = page.getByTestId("world-orientation");
  await expect(intro).toBeVisible({ timeout: 60_000 });
  while ((await intro.getAttribute("data-step")) !== "legislature") {
    const next = intro.getByRole("button", { name: /^(Next|Begin|Done)$/ });
    expect(
      await next.textContent(),
      "tour must include the recorded legislature card",
    ).not.toBe("Begin");
    await next.click();
  }
  const stagedControls = intro
    .getByRole("button")
    .and(intro.getByTestId("scene-place-person"));
  await expect(stagedControls.first()).toBeVisible({ timeout: 30_000 });
  const staged = await onscreenFigure(stagedControls, page);
  const stagedId = await staged.getAttribute("data-person-id");
  const stagedClothes = await drawnClothing(staged);
  await staged.click();
  const card = page.getByTestId("quick-dossier");
  await expect(card).toHaveAttribute("data-person-id", stagedId!);
  expect(await drawnClothing(card)).toEqual(stagedClothes);
  await card.getByTestId("quick-dossier-full").click();
  const expanded = page.getByTestId("full-dossier");
  await expect(expanded).toHaveAttribute("data-person-id", stagedId!);
  expect(await drawnClothing(expanded)).toEqual(stagedClothes);
  // NPC records expand in this same card; only the player has a separate full-record route.
  await expanded.getByTestId("quick-dossier-close").click();
  while (await intro.isVisible())
    await intro.getByRole("button", { name: /^(Next|Begin|Done)$/ }).click();
  const ordinaryControls = page.locator(
    ".scene-person-token, .scene-place-person",
  );
  await expect(ordinaryControls.first()).toBeVisible({ timeout: 30_000 });
  const ordinary = await onscreenFigure(ordinaryControls, page);
  const selectedId =
    (await ordinary.getAttribute("data-person-id")) ??
    (await ordinary.getAttribute("data-testid"))!.replace("scene-person-", "");
  const ordinaryClothes = await drawnClothing(ordinary);
  const clock = await page
    .getByTestId("shell-nav-cluster")
    .getAttribute("aria-label");
  await ordinary.click();
  await expect(card).toHaveAttribute("data-person-id", selectedId);
  expect(await drawnClothing(card)).toEqual(ordinaryClothes);
  expect(
    await page.getByTestId("shell-nav-cluster").getAttribute("aria-label"),
  ).toBe(clock);
  await card.getByTestId("quick-dossier-full").click();
  expect(await drawnClothing(expanded)).toEqual(ordinaryClothes);
  expect(
    await page.getByTestId("shell-nav-cluster").getAttribute("aria-label"),
  ).toBe(clock);
  await expanded.getByTestId("quick-dossier-close").click();
  await expect(expanded).toHaveCount(0);
});

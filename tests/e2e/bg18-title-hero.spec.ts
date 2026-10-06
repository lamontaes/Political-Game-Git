import { expect, test } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import { enterLife, leaveGame, saveLife, startLife } from "./support/creator";

const SEED = "bg18-title-hero-20261006";
const place = drawRandomPlace(
  SEED,
  (candidate) => candidate.scope === "locality",
);

test(`BG-18 puts the recent character in the civic title scene from ${place.displayName}`, async ({
  page,
}, testInfo) => {
  await page.goto(`/?seed=${SEED}`);
  await startLife(page, {
    age: 34,
    state: place.withinName ?? undefined,
    place: place.formalName ?? undefined,
    calibration: "skipped",
  });
  await enterLife(page);
  await saveLife(page);
  await leaveGame(page);

  const stage = page.getByTestId("title-tableau-stage");
  await expect(stage).toHaveAttribute("data-title-kind", "hero-in-tableau");
  await expect(stage).toHaveAttribute("data-civic-kind", /.+/);
  await expect(page.getByTestId("title-hero")).toBeVisible();
  await expect(page.getByTestId("title-hero-engine")).toBeVisible();

  const screenshot = testInfo.outputPath("recent-character-title-hero.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  await testInfo.attach("recent-character-title-hero", {
    path: screenshot,
    contentType: "image/png",
  });
});

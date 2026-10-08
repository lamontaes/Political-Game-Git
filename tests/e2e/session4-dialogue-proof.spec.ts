import { expect, test } from "./fixtures";
import { enterLife, startLife } from "./support/creator";
import { drawRandomPlace } from "../support/random-place";

const seed = "session4-dialogue-oct5";
const place = drawRandomPlace(seed, (p) => p.scope === "locality");

test("Session 4 opens an actual game in a random place", async ({
  page,
}, info) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`/?seed=${seed}`);
  await startLife(page, { age: 34, place: place.displayName, route: "normal" });
  await enterLife(page);
  await expect(page.getByTestId("play-screen")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("random-place-game.png"),
    fullPage: true,
  });
  await info.attach("random-place", {
    body: JSON.stringify({
      seed,
      place: place.displayName,
      placeKey: place.key,
    }),
    contentType: "application/json",
  });
});

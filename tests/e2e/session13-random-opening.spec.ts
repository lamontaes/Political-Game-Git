import { test, expect } from "./fixtures";
import { startLife, enterLife, shellIdentity } from "./support/creator";
import { drawRandomPlace } from "../support/random-place";

const selectionSeed = "session13-election-engine-opening";
const gameSeed = "session13-election-engine-real-game";
const place = drawRandomPlace(
  selectionSeed,
  (candidate) => candidate.scope === "locality",
);
test(`a real new game opens in ${place.displayName}, selection seed ${selectionSeed}`, async ({
  page,
}, info) => {
  await page.goto(`/?seed=${encodeURIComponent(gameSeed)}`);
  await startLife(page, { age: 30, place: place.displayName });
  await enterLife(page);
  await expect(page.getByTestId("play-screen")).toBeVisible();
  const identity = await shellIdentity(page);
  await info.attach("random-place-opening", {
    body: JSON.stringify(
      {
        selectionSeed,
        gameSeed,
        place: place.displayName,
        placeKey: place.key,
        identity,
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  await page.screenshot({ path: info.outputPath("random-place-game.png") });
});

import { expect, test } from "./fixtures";
import { drawRandomPlace } from "../support/random-place";
import {
  chooseCreatorLocation,
  completeCharacterStep,
  openCreator,
} from "./support/creator";

test("BG-21: a fresh Creator does not narrate how its controls work", async ({
  page,
}) => {
  const place = drawRandomPlace(
    "bg21-fresh-creator",
    (candidate) => candidate.scope === "locality",
  );
  if (!place.withinName) throw new Error("The drawn town has no state name.");

  await page.goto("/");
  await openCreator(page);
  await page.getByTestId("start-normal").click();
  await completeCharacterStep(page, 30);

  const creator = page.getByTestId("setup-screen");
  await expect(creator.getByText(/Next fills/)).toHaveCount(0);
  await page.getByTestId("creator-continue-character").click();
  await chooseCreatorLocation(
    page,
    {
      age: 30,
      place: place.displayName.split(",")[0],
      state: place.withinName,
    },
    false,
  );
  await expect(creator.getByText(/Next waits/)).toHaveCount(0);
  await expect(
    creator.getByText(/keep the defaults and continue/i),
  ).toHaveCount(0);
});

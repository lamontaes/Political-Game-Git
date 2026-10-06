import { test, expect } from "./fixtures";
import { completeCharacterStep, openCreator } from "./support/creator";
import { drawRandomPlace } from "../support/random-place";
import { hometownChoiceSubtitle } from "../../src/presentation/creator-hometown-page";
import { placeReferencePopulation } from "../../src/simulation/nationwide-world/place-population";

test("Creator renders recorded town subtitle without list helper copy", async ({
  page,
}) => {
  const place = drawRandomPlace(
    "session6-creator-town-subtitle",
    (candidate) =>
      candidate.scope === "locality" &&
      !!candidate.sourceGeoid &&
      !!placeReferencePopulation(candidate.sourceGeoid),
  );
  await page.goto("/");
  await openCreator(page);
  await page.getByTestId("start-normal").click();
  await completeCharacterStep(page, 30);
  await page.getByTestId("creator-continue-character").click();
  await expect(page.getByTestId("place-prompt")).toHaveCount(0);
  await page.getByTestId("state-search").fill(place.withinName!);
  await page
    .getByTestId(`state-${place.stateJurisdictionKey.slice(-2)}`)
    .click();
  await page.getByTestId("place-search").fill(place.displayName.split(",")[0]!);
  const choice = page.getByTestId("place-choices").getByRole("button", {
    name: `${place.displayName} ${hometownChoiceSubtitle(place)}`,
    exact: true,
  });
  await expect(choice.locator("small")).toHaveText(
    hometownChoiceSubtitle(place),
  );
  await expect(page.getByTestId("place-page-status")).toHaveCount(0);
  await expect(choice).not.toContainText(/estimate|source/i);
});

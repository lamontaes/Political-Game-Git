import { expect, test } from "./fixtures";
import { campaignUntilDecided, fileCandidacy } from "./support/campaign";
import {
  enterLife,
  openElsewhere,
  passShellTime,
  saveLife,
  startLife,
} from "./support/creator";
import { localGoverningBodiesForJurisdiction } from "../../src/simulation";
import { drawRandomPlace } from "../support/random-place";

const seed = "session23-part1-ordinary-mayor-2026-10-06";
const place = drawRandomPlace(
  seed,
  (candidate) =>
    candidate.stateJurisdictionKey !== "US-DC" &&
    localGoverningBodiesForJurisdiction(candidate.context.jurisdiction.id).some(
      (office) =>
        office.seat === "chief-executive" &&
        office.unit.unitType === "municipality",
    ),
);

test("a new life wins the random town's mayoralty and opens the shared desk", async ({
  page,
}, testInfo) => {
  test.setTimeout(600_000);
  const office = localGoverningBodiesForJurisdiction(
    place.context.jurisdiction.id,
  ).find(
    (candidate) =>
      candidate.seat === "chief-executive" &&
      candidate.unit.unitType === "municipality",
  )!;
  console.log(
    JSON.stringify({
      seed,
      place: place.displayName,
      placeKey: place.key,
      officeKey: office.officeKey,
    }),
  );
  await page.goto(`/?seed=${seed}`);
  await startLife(page, {
    age: 40,
    state: place.withinName ?? undefined,
    place: place.formalName ?? undefined,
  });
  // Opening government/courts are still being prepared after Begin returns.
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 180_000,
  });
  await enterLife(page);
  await openElsewhere(page, "campaign");
  await fileCandidacy(page, office.officeKey);
  expect(
    await campaignUntilDecided(page, (target) => passShellTime(target), 45),
  ).toBe(true);
  await expect(page.getByTestId("campaign-result")).toContainText("won");
  // Entry and inbox work occur on the canonical date boundary, not menu open.
  await passShellTime(page);
  await openElsewhere(page, "work");
  const briefing = page.getByTestId("governing-briefing");
  await expect(briefing).toBeVisible();
  await expect(briefing).toContainText("Set the budget request");
  await expect(briefing).toContainText("first priority");
  await page.screenshot({
    path: testInfo.outputPath("new-game-mayor-desk.png"),
    fullPage: true,
  });
  await testInfo.attach("new-game-mayor-desk", {
    path: testInfo.outputPath("new-game-mayor-desk.png"),
    contentType: "image/png",
  });
  console.log(await briefing.innerText());
  await saveLife(page);
});

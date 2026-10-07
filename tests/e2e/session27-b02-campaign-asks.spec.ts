import { expect, test } from "./fixtures";
import { fileCandidacy } from "./support/campaign";
import { enterLife, openElsewhere, startLife } from "./support/creator";
import { localGoverningBodiesForJurisdiction } from "../../src/simulation";
import { drawRandomPlace } from "../support/random-place";

const seed = "session27-b02-asks-random-place-2026-10-06";
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
const office = localGoverningBodiesForJurisdiction(
  place.context.jurisdiction.id,
).find(
  (candidate) =>
    candidate.seat === "chief-executive" &&
    candidate.unit.unitType === "municipality",
)!;

test("a new campaign asks named people for help and contributions", async ({
  page,
}, testInfo) => {
  test.setTimeout(600_000);
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
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 180_000,
  });
  await expect(page.getByTestId("world-orientation")).toBeVisible({
    timeout: 30_000,
  });
  await enterLife(page);
  await openElsewhere(page, "campaign");
  const browser = page.getByTestId("campaign-office-browser");
  await expect(browser).toBeVisible();
  await browser.locator(`input[value="${office.officeKey}"]`).check();
  await expect(page.getByTestId("file-candidacy")).toBeEnabled();
  await fileCandidacy(page, office.officeKey);
  await expect(page.getByTestId("campaign-donors")).toBeVisible();
  await expect(page.getByTestId("campaign-helpers")).toBeVisible();
  const donorButton = page
    .locator('[data-testid^="ask-campaign-donor-"]')
    .first();
  await expect(donorButton).toBeVisible();
  await donorButton.click();
  const donorStatus = page
    .locator("p[role='status']")
    .filter({ hasText: /gave|declined/ })
    .first();
  await expect(donorStatus).toBeVisible();
  await testInfo.attach("campaign-donor-list", {
    body: await page.getByTestId("campaign-donors").screenshot(),
    contentType: "image/png",
  });
  await testInfo.attach("campaign-donor-reason", {
    body: await donorStatus.innerText(),
    contentType: "text/plain",
  });
  const helperButton = page
    .locator('[data-testid^="ask-campaign-helper-"]')
    .first();
  await expect(helperButton).toBeVisible();
  await helperButton.click();
  const helperStatus = page
    .locator("p[role='status']")
    .filter({ hasText: /agreed to help|declined/ })
    .first();
  await expect(helperStatus).toBeVisible();
  await testInfo.attach("campaign-helper-list", {
    body: await page.getByTestId("campaign-helpers").screenshot(),
    contentType: "image/png",
  });
  await testInfo.attach("campaign-helper-reason", {
    body: await helperStatus.innerText(),
    contentType: "text/plain",
  });
  await testInfo.attach("campaign-money-and-helpers-screen", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

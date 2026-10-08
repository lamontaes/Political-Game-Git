import { expect, test } from "./fixtures";
import { fileCandidacy } from "./support/campaign";
import { enterLife, openElsewhere, startLife } from "./support/creator";
import { localGoverningBodiesForJurisdiction } from "../../src/simulation";
import { drawRandomPlace } from "../support/random-place";
import unitPriceResearch from "../../data/research/campaign-reality/campaign-unit-prices.json" with { type: "json" };

const largeCityNames = [
  "Los Angeles",
  "Houston",
  "Phoenix",
  "Philadelphia",
  "San Antonio",
  "San Diego",
  "Dallas",
  "San Jose",
  "Austin",
  "Jacksonville",
  "Chicago",
];
const largeCityJurisdictions: Record<string, string> = {
  "Los Angeles": "US-CA",
  Houston: "US-TX",
  Phoenix: "US-AZ",
  Philadelphia: "US-PA",
  "San Antonio": "US-TX",
  "San Diego": "US-CA",
  Dallas: "US-TX",
  "San Jose": "US-CA",
  Austin: "US-TX",
  Jacksonville: "US-FL",
  Chicago: "US-IL",
};
function coverageTotal(households: number) {
  const units = {
    "yard-sign": Math.max(1, Math.ceil(households / 10)),
    "palm-card": Math.max(1, households),
    postage: Math.max(1, households),
    "print-ad": 1,
    "filing-fee": 1,
  };
  return Object.entries(units).reduce(
    (total, [item, count]) =>
      total +
      unitPriceResearch.prices[item as keyof typeof units].priceMinorUnits *
        count,
    0,
  );
}

let smallTownProof: {
  place: string;
  households: number;
  estimatedCoverageTotalMinorUnits: number;
} | null = null;

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
  test.setTimeout(900_000);
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
  const smallAskDetails = [await donorStatus.innerText()];
  for (let index = 0; index < 2; index += 1) {
    const candidates = page.locator('[data-testid^="ask-campaign-donor-"]');
    const nextButton = candidates.nth(index + 1);
    if (await nextButton.count()) {
      await nextButton.click();
      await expect(donorStatus).toBeVisible();
      smallAskDetails.push(await donorStatus.innerText());
    }
  }
  await testInfo.attach("campaign-donor-list", {
    body: await page.getByTestId("campaign-donors").screenshot(),
    contentType: "image/png",
  });
  await testInfo.attach("campaign-donor-reason", {
    body: smallAskDetails.join("\n"),
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
  await expect(page.getByTestId("campaign-purchases")).toBeVisible();
  const personalContributions = page.getByTestId("campaign-own-money-give");
  if (await personalContributions.count()) {
    const personalContribution = personalContributions.first();
    if (await personalContribution.isEnabled())
      await personalContribution.click();
  }
  await page.getByLabel("Campaign purchase units").fill("1");
  await page.getByRole("button", { name: /Buy 1 card/i }).click();
  await testInfo.attach("campaign-purchase-screen", {
    body: await page.getByTestId("campaign-purchases").screenshot(),
    contentType: "image/png",
  });
  const readHouseholds = async () => {
    const label = await page.getByTestId("campaign-purchases").innerText();
    const match = label.match(/About ([\d,]+) households/);
    if (!match)
      throw new Error(`Could not read the place household estimate: ${label}`);
    return Number(match[1]!.replaceAll(",", ""));
  };
  const smallHouseholds = await readHouseholds();
  smallTownProof = {
    place: place.displayName,
    households: smallHouseholds,
    estimatedCoverageTotalMinorUnits: coverageTotal(smallHouseholds),
  };
  console.log(JSON.stringify({ smallTownCampaignUnitPrices: smallTownProof }));
});

test("a new large-city campaign shows the same prices at large scale", async ({
  page,
}, testInfo) => {
  test.setTimeout(900_000);
  const largeSeed = "session27-b02-large-city-random-2026-10-06";
  const largePlace = drawRandomPlace(
    largeSeed,
    (candidate) =>
      largeCityNames.some(
        (name) =>
          candidate.displayName.startsWith(name) &&
          candidate.stateJurisdictionKey === largeCityJurisdictions[name],
      ) &&
      localGoverningBodiesForJurisdiction(
        candidate.context.jurisdiction.id,
      ).some(
        (item) =>
          item.seat === "chief-executive" &&
          item.unit.unitType === "municipality",
      ),
  );
  const largeOffice = localGoverningBodiesForJurisdiction(
    largePlace.context.jurisdiction.id,
  ).find(
    (item) =>
      item.seat === "chief-executive" && item.unit.unitType === "municipality",
  )!;
  console.log(
    JSON.stringify({
      seed: largeSeed,
      place: largePlace.displayName,
      placeKey: largePlace.key,
      officeKey: largeOffice.officeKey,
    }),
  );
  await page.goto(`/?seed=${largeSeed}`);
  await startLife(page, {
    age: 40,
    state: largePlace.withinName ?? undefined,
    place: largePlace.formalName ?? undefined,
  });
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 180_000,
  });
  await enterLife(page);
  await openElsewhere(page, "campaign");
  const browser = page.getByTestId("campaign-office-browser");
  await expect(browser).toBeVisible();
  await browser.locator(`input[value="${largeOffice.officeKey}"]`).check();
  await fileCandidacy(page, largeOffice.officeKey);
  await expect(page.getByTestId("campaign-donors")).toBeVisible();

  const largeAskDetails: string[] = [];
  for (let index = 0; index < 3; index += 1) {
    const donor = page
      .locator('[data-testid^="ask-campaign-donor-"]')
      .nth(index);
    if (!(await donor.count())) break;
    await donor.click();
    const status = page
      .locator("p[role='status']")
      .filter({ hasText: /gave|declined/ })
      .first();
    await expect(status).toBeVisible();
    largeAskDetails.push(await status.innerText());
  }
  await testInfo.attach("large-city-ask-reasons", {
    body: largeAskDetails.join("\n"),
    contentType: "text/plain",
  });
  await testInfo.attach("large-city-donor-list", {
    body: await page.getByTestId("campaign-donors").screenshot(),
    contentType: "image/png",
  });
  const helper = page.locator('[data-testid^="ask-campaign-helper-"]').first();
  if (await helper.count()) await helper.click();
  if (await page.getByTestId("campaign-helpers").count()) {
    await testInfo.attach("large-city-helper-list", {
      body: await page.getByTestId("campaign-helpers").screenshot(),
      contentType: "image/png",
    });
  }
  const managerSection = page.getByTestId("campaign-manager-offers");
  if (await managerSection.count()) {
    await testInfo.attach("campaign-manager-offer", {
      body: await managerSection.screenshot(),
      contentType: "image/png",
    });
    const offer = managerSection
      .locator('[data-testid^="offer-campaign-manager-"]')
      .first();
    if ((await offer.count()) && (await offer.isEnabled())) {
      await offer.click();
      const plan = page.getByTestId("campaign-planning");
      if (await plan.count())
        await testInfo.attach("campaign-manager-plan", {
          body: await plan.screenshot(),
          contentType: "image/png",
        });
    }
  }
  await expect(page.getByTestId("campaign-purchases")).toBeVisible();
  const purchases = page.getByTestId("campaign-purchases");
  const purchaseScreen = await purchases.screenshot();
  await testInfo.attach("large-city-campaign-purchase-screen", {
    body: purchaseScreen,
    contentType: "image/png",
  });
  const label = await purchases.innerText();
  const match = label.match(/About ([\d,]+) households/);
  if (!match)
    throw new Error(
      `Could not read the large-city household estimate: ${label}`,
    );
  const largeHouseholds = Number(match[1]!.replaceAll(",", ""));
  expect(smallTownProof).not.toBeNull();
  expect(largeHouseholds).toBeGreaterThan(smallTownProof!.households);
  const proof = {
    unitPricesMinorUnits: Object.fromEntries(
      Object.entries(unitPriceResearch.prices).map(([item, price]) => [
        item,
        price.priceMinorUnits,
      ]),
    ),
    smallTown: smallTownProof!,
    largeCity: {
      place: largePlace.displayName,
      households: largeHouseholds,
      estimatedCoverageTotalMinorUnits: coverageTotal(largeHouseholds),
    },
  };
  expect(proof.largeCity.estimatedCoverageTotalMinorUnits).toBeGreaterThan(
    proof.smallTown.estimatedCoverageTotalMinorUnits,
  );
  console.log(JSON.stringify({ campaignUnitPriceComparison: proof }));
  await testInfo.attach("campaign-unit-prices-and-place-totals", {
    body: JSON.stringify(proof, null, 2),
    contentType: "application/json",
  });
});

test("the existing campaign screen offers and shows an experienced manager's plan", async ({
  page,
}, testInfo) => {
  await page.goto("/tests/e2e/fixtures/campaign-manager-workspace.html");
  const purchases = page.getByTestId("campaign-purchases");
  await expect(purchases).toBeVisible();
  await page.getByLabel("Campaign purchase units").fill("1");
  await page.getByRole("button", { name: /Buy 1 card/i }).click();
  const purchaseList = purchases.locator("ul[aria-label='Campaign purchases']");
  await expect(purchaseList).toBeVisible();
  await expect(purchaseList).toContainText("1 card");
  await testInfo.attach("campaign-purchase-record", {
    body: await purchases.screenshot(),
    contentType: "image/png",
  });
  const managerId = await page
    .locator("body")
    .getAttribute("data-manager-candidate-id");
  expect(managerId).toBeTruthy();
  const offers = page.getByTestId("campaign-manager-offers");
  await expect(offers).toBeVisible();
  const managerOffer = page.getByTestId(`offer-campaign-manager-${managerId}`);
  await expect(managerOffer).toBeEnabled();
  await testInfo.attach("campaign-manager-offer", {
    body: await offers.screenshot(),
    contentType: "image/png",
  });
  await managerOffer.click();
  await expect(
    page
      .locator("p[role='status']")
      .filter({ hasText: /accepted the manager job/ }),
  ).toBeVisible();
  const strategy = page.getByTestId("campaign-strategy");
  await expect(strategy).toBeVisible();
  await expect(page.getByTestId("campaign-strategy-attribution")).toContainText(
    "active campaign staff member",
  );
  await expect(page.getByTestId("campaign-strategy-proposal")).toBeVisible();
  await testInfo.attach("campaign-manager-plan", {
    body: await strategy.screenshot(),
    contentType: "image/png",
  });
});

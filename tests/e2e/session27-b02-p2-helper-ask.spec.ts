import { mkdir, writeFile } from "node:fs/promises";
import { expect, test } from "./fixtures";
import { fileCandidacy } from "./support/campaign";
import {
  chooseCreatorLocation,
  completeCharacterStep,
  enterLife,
  openCreator,
  openElsewhere,
} from "./support/creator";
import { localGoverningBodiesForJurisdiction } from "../../src/simulation";
import { drawRandomPlace } from "../support/random-place";

const seed = "session27-b02-p2-helper-ask-random-place-2026-10-06";
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

test("a new random-place campaign asks a named person to help", async ({
  page,
}, testInfo) => {
  test.setTimeout(600_000);
  console.info(
    JSON.stringify({ seed, place: place.displayName, placeKey: place.key }),
  );
  await page.goto(`/?seed=${seed}`);
  await openCreator(page);
  await page.getByTestId("start-normal").click();
  await expect(page.getByTestId("creator-stage-character")).toBeVisible();
  await completeCharacterStep(page, 40);
  await page.getByTestId("creator-continue-character").click();
  const life = {
    age: 40,
    state: place.withinName ?? undefined,
    place: place.formalName ?? undefined,
  };
  await chooseCreatorLocation(page, life, false);
  await expect(page.getByTestId("creator-stage-difficulty")).toBeVisible();
  await page.getByTestId("creator-skip-difficulty").click();
  await expect(page.getByTestId("creator-stage-whoareyou")).toBeVisible();
  await page.getByTestId("whoareyou-play").click();
  await expect(page.getByTestId("begin")).toBeEnabled();
  await page.getByTestId("begin").click();
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 180_000,
  });
  await enterLife(page);
  await openElsewhere(page, "campaign");
  const officeBrowser = page.getByTestId("campaign-office-browser");
  await expect(officeBrowser).toBeVisible();
  await officeBrowser.locator(`input[value="${office.officeKey}"]`).check();
  await expect(page.getByTestId("file-candidacy")).toBeEnabled();
  await fileCandidacy(page, office.officeKey);

  const helperSection = page.getByTestId("campaign-helpers");
  await expect(helperSection).toBeVisible();
  const askButton = page
    .locator('[data-testid^="ask-campaign-helper-"]')
    .first();
  await expect(askButton).toBeVisible();
  const askedPerson = (await askButton.innerText()).replace(
    /^Ask\s+|\s+to help$/g,
    "",
  );
  await askButton.click();
  const status = page
    .locator("p[role='status']")
    .filter({ hasText: /agreed to help|declined|still deciding/ })
    .first();
  await expect(status).toBeVisible();
  const result = await status.innerText();
  console.info(
    JSON.stringify({
      place: place.displayName,
      askedPerson,
      result,
    }),
  );
  expect(result.startsWith(`${askedPerson} `)).toBe(true);
  const screenshot = await helperSection.screenshot();
  await testInfo.attach("campaign-helper-ask", {
    body: screenshot,
    contentType: "image/png",
  });
  await testInfo.attach("campaign-helper-ask-result", {
    body: `${seed}\n${place.displayName} (${place.key})\n${askedPerson}: ${result}\n`,
    contentType: "text/plain",
  });

  const evidenceDir = "docs/codex/evidence/b02-money-helpers";
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(`${evidenceDir}/campaign-helper-ask.png`, screenshot);
  await writeFile(
    `${evidenceDir}/campaign-helper-ask.txt`,
    `${seed}\n${place.displayName} (${place.key})\n${askedPerson}: ${result}\n`,
  );
  expect(result).toMatch(/agreed to help|declined|still deciding/);
});

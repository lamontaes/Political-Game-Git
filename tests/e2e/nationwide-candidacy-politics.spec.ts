import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import {
  enterLife,
  openShellMenu,
  saveLife,
  startLife,
} from "./support/creator";
import { drawRandomPlace } from "../support/random-place";
import { placeLocalGovernmentUnits } from "../../src/simulation/nationwide-world/local-governments";

test.setTimeout(120_000);

const STATE_SERVICE_SEED = "session8-atu-state-service-2026-10-05";
const STATE_SERVED_PLACE = drawRandomPlace(STATE_SERVICE_SEED, (place) => {
  if (place.stateJurisdictionKey !== "US-AK" || place.scope !== "locality")
    return false;
  const units = placeLocalGovernmentUnits(place);
  return (
    units.municipal.length === 0 &&
    units.townships.length === 0 &&
    units.counties.length === 0
  );
});
if (!STATE_SERVED_PLACE.stateJurisdictionKey)
  throw new Error(
    `seed ${STATE_SERVICE_SEED} must select an Alaska locality with state identity`,
  );

async function openCandidacy(page: Page, activation: "pointer" | "keyboard") {
  await openShellMenu(page);
  const politics = page.getByTestId("nav-politics");
  if (activation === "keyboard") await politics.press("Enter");
  else await politics.click();
  const destination = page.getByTestId("politics-tab-campaigns");
  if (activation === "keyboard") {
    await destination.focus();
    await destination.press("Enter");
  } else await destination.click();
  await expect(page.getByTestId("candidacy-workspace")).toBeVisible();
}

async function continueSavedLife(page: Page) {
  await page.goto("/");
  await page.getByTestId("continue").click();
  await enterLife(page);
}

test("a saved city life reaches its actual government and state candidacy by keyboard", async ({
  page,
}) => {
  await page.goto("/?seed=nationwide-politics-lexington");
  await startLife(page, {
    age: 40,
    place: "Lexington",
    state: "Kentucky",
  });
  await enterLife(page);
  await saveLife(page);

  await openCandidacy(page, "keyboard");
  const home = page.getByTestId("home-governments");
  await expect(home).toHaveAttribute("data-place-scope", "locality");
  await expect(home.getByTestId("home-municipal")).toContainText(
    "Urban County Government of Lexington-Fayette",
  );
  await expect(home.locator('[data-unit-id="gus2025:165831"]')).toBeVisible();
  const candidacy = page.getByTestId("state-executive-candidacy");
  await expect(candidacy).toHaveAttribute("data-office-key", "us-ky-governor");
  await expect(candidacy).toHaveAttribute("data-eligible", "true");

  await page.getByTestId("file-state-executive").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("state-executive-status")).toHaveAttribute(
    "data-status",
    "pending-election",
  );
  await saveLife(page);

  await continueSavedLife(page);
  await openCandidacy(page, "pointer");
  await expect(page.locator('[data-unit-id="gus2025:165831"]')).toBeVisible();
  await expect(page.getByTestId("state-executive-candidacy")).toHaveAttribute(
    "data-office-key",
    "us-ky-governor",
  );
  await expect(page.getByTestId("state-executive-status")).toHaveAttribute(
    "data-status",
    "pending-election",
  );
  await page.getByTestId("open-campaign").click();
  await expect(page.getByTestId("work-section-campaign")).toBeVisible();
});

test("a place without a city government keeps its county and candidacy distinct", async ({
  page,
}) => {
  await page.goto("/?seed=nationwide-politics-alamo");
  await startLife(page, {
    age: 40,
    place: "Alamo",
    state: "Nevada",
  });
  await enterLife(page);
  await saveLife(page);

  await openCandidacy(page, "pointer");
  const home = page.getByTestId("home-governments");
  await expect(home.getByTestId("home-no-municipal")).toBeVisible();
  await expect(home.getByTestId("home-counties")).toContainText(
    "Lincoln County",
  );
  await expect(home.locator('[data-unit-id="gus2025:108905"]')).toBeVisible();
  await expect(page.getByTestId("state-executive-candidacy")).toHaveAttribute(
    "data-office-key",
    "us-nv-governor",
  );

  await continueSavedLife(page);
  await openCandidacy(page, "keyboard");
  await expect(page.getByTestId("home-no-municipal")).toBeVisible();
  await expect(page.locator('[data-unit-id="gus2025:108905"]')).toBeVisible();
  await expect(page.getByTestId("state-executive-candidacy")).toHaveAttribute(
    "data-office-key",
    "us-nv-governor",
  );
});

test(`state service is named for ${STATE_SERVED_PLACE.displayName} (seed ${STATE_SERVICE_SEED})`, async ({
  page,
}, testInfo) => {
  await page.goto(`/?seed=${STATE_SERVICE_SEED}`);
  await startLife(page, {
    age: 40,
    place: STATE_SERVED_PLACE.formalName ?? STATE_SERVED_PLACE.displayName,
    state: "Alaska",
  });
  await enterLife(page);
  await openCandidacy(page, "pointer");

  const home = page.getByTestId("home-governments");
  await expect(home).toHaveAttribute("data-place-scope", "locality");
  await expect(home.getByTestId("home-no-municipal")).toBeVisible();
  await expect(home.getByTestId("home-state-served")).toContainText(
    "State government: Alaska serves this place.",
  );
  const screenshot = testInfo.outputPath("state-served-place.png");
  await home.screenshot({ path: screenshot });
  await testInfo.attach("state-served-place", {
    path: screenshot,
    contentType: "image/png",
  });
});

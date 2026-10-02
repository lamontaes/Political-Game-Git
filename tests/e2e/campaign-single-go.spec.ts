import { CAMPAIGN_LIFE_CATALOG } from "../../src/simulation/campaign-life-catalog";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import { drawRandomPlace } from "../support/random-place";
import { expect, test } from "./fixtures";
import { enterLife, openElsewhere, startLife } from "./support/creator";

const SEED = "item41-campaign-single-go";
const PLACE = drawRandomPlace(SEED, (place) => place.scope === "locality");
const STATE = stateJurisdictionForKey(PLACE.stateJurisdictionKey!);
if (!STATE)
  throw new Error("The drawn hometown needs its recorded jurisdiction.");

test(`a scheduled chapter meeting offers one Go (${PLACE.displayName}, ${STATE.name}, seed ${SEED})`, async ({
  page,
}, info) => {
  await page.goto(`/?seed=${SEED}`);
  await startLife(page, {
    age: 34,
    state: STATE.name,
    place: PLACE.displayName,
    placeQuery: PLACE.displayName,
  });
  await enterLife(page);
  await openElsewhere(page, "campaign");
  const work = page.getByTestId("party-work");
  await expect(work).toBeVisible();
  const rows = work.locator('li[data-testid^="party-work-"]');
  const before = await rows.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-testid")),
  );
  await work
    .locator('[data-testid^="party-work-request-organization-meeting-"]')
    .first()
    .click();
  await expect(rows).toHaveCount(before.length + 1);
  const after = await rows.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-testid")),
  );
  const addedId = after.find((id) => id !== null && !before.includes(id));
  if (!addedId)
    throw new Error("The meeting request needs its saved activity row.");
  const row = work.getByTestId(addedId);
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute("data-state", "accepted");
  await expect(row).toContainText(
    CAMPAIGN_LIFE_CATALOG["organization-meeting"].title,
  );
  const details = row.locator(".game-campaign-life-line");
  await expect(details.first()).toContainText(/with .+ · .+/);
  await expect(details.first()).toContainText(/[A-Z][a-z]+ \d{1,2}, \d{4}/);
  await expect(details.nth(1)).toBeVisible();
  await expect(details.nth(1)).not.toHaveText("");
  await expect(
    row.getByRole("button", { name: "Go", exact: true }),
  ).toHaveCount(1);
  await expect(row.locator('[data-testid^="party-work-attend-"]')).toHaveCount(
    1,
  );
  await expect(
    row.locator('[data-testid^="party-work-attend-condensed-"]'),
  ).toHaveCount(0);
  await expect(
    row.getByRole("button", { name: "Go briefly", exact: true }),
  ).toHaveCount(0);
  await expect(row).not.toContainText(
    /20-minute|no fare|going briefly|less of the evening/i,
  );
  await page.screenshot({
    path: info.outputPath("chapter-meeting-single-go.png"),
  });
});

// TODO: Follow the actual Go interaction when its scheduled event is reached,
// capture that event, and verify its recorded outcome through save/reopen.
// This draft stops at the real accepted calendar row and does not manufacture
// attendance, advance time to a guessed event, or claim visual approval.

import { CAMPAIGN_LIFE_CATALOG } from "../../src/simulation/campaign-life-catalog";
import { stateJurisdictionForKey } from "../../src/simulation/life-places";
import { drawRandomPlace } from "../support/random-place";
import { expect, test } from "./fixtures";
import {
  enterLife,
  openElsewhere,
  saveLife,
  startLife,
} from "./support/creator";

const SEED = "item40-campaign-request-results";
const PLACE = drawRandomPlace(SEED, (place) => place.scope === "locality");
const STATE = stateJurisdictionForKey(PLACE.stateJurisdictionKey!);
if (!STATE)
  throw new Error("The drawn hometown needs its recorded jurisdiction.");

const FORMS = [
  "organization-meeting",
  "door-canvass",
  "phone-shift",
  "candidate-guidance",
  "town-hall",
] as const;

test(`chapter requests remain visible and survive saving (${PLACE.displayName}, ${STATE.name}, seed ${SEED})`, async ({
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
  const chapter = work.locator('[data-testid^="party-work-requests-"]').first();
  await expect(chapter).toBeVisible();
  const chapterTestId = await chapter.getAttribute("data-testid");
  if (!chapterTestId)
    throw new Error("The chapter card needs its existing test ID.");
  const chapterId = chapterTestId.slice("party-work-requests-".length);
  const savedRows: { id: string; text: string }[] = [];

  for (const form of FORMS) {
    const rows = work.locator('li[data-testid^="party-work-"]');
    const priorIds = await rows.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-testid")),
    );
    const request = chapter.getByTestId(
      `party-work-request-${form}-${chapterId}`,
    );
    await expect(request).toBeEnabled();
    await request.click();
    await expect(work.getByTestId("party-work-message")).toBeVisible();
    await expect(work.getByTestId("party-work-message")).toContainText(
      CAMPAIGN_LIFE_CATALOG[form].title,
    );
    await expect(rows).toHaveCount(priorIds.length + 1);
    const nextIds = await rows.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-testid")),
    );
    const addedId = nextIds.find((id) => id !== null && !priorIds.includes(id));
    if (!addedId)
      throw new Error(`The ${form} request did not create an activity row.`);
    const added = work.getByTestId(addedId);
    await expect(added).toHaveAttribute("data-state", "accepted");
    await expect(added).toContainText(CAMPAIGN_LIFE_CATALOG[form].title);
    savedRows.push({ id: addedId, text: await added.innerText() });
    await expect(work.getByTestId(chapterTestId)).toBeVisible();
  }

  // Every ordinary chapter form now has a saved calendar activity. The chapter
  // must remain visible even when none of those forms can be requested again.
  await expect(work.getByTestId(chapterTestId)).toBeVisible();
  await page.screenshot({
    path: info.outputPath("chapter-requests-scheduled.png"),
  });
  await saveLife(page);
  await page.reload();
  await expect(page.getByTestId("continue")).toBeEnabled();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openElsewhere(page, "campaign");
  await expect(work.getByTestId(chapterTestId)).toBeVisible();
  for (const saved of savedRows) {
    const row = work.getByTestId(saved.id);
    await expect(row).toHaveAttribute("data-state", "accepted");
    await expect(row).toHaveText(saved.text, { useInnerText: true });
  }
  await page.screenshot({
    path: info.outputPath("chapter-requests-reopened.png"),
  });
});

// TODO: Add the actual clerk filing journey after its canonical interaction
// contract is available. This draft proves requested calendar records, not
// attendance outcomes, clerk execution, filing, or human visual approval.

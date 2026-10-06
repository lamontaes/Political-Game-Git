import { expect, test, type Page } from "./fixtures";
import { campaignUntilDecided, fileCandidacy } from "./support/campaign";
import {
  enterLife,
  leaveGame,
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
  // The fresh-life introduction hides shell navigation while its view loads.
  await expect(page.getByTestId("world-orientation")).toBeVisible({ timeout: 30_000 });
  await enterLife(page);
  await openElsewhere(page, "campaign");
  const browser = page.getByTestId("campaign-office-browser");
  await expect(browser).toBeVisible();
  await expect(browser.locator(`input[value="${office.officeKey}"]`)).toBeAttached();
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
  await briefing.locator('[data-testid="governing-option"][data-option^="priority:"]:not([data-option="priority:none"])').first().click();
  await expect(briefing.getByTestId("governing-recent")).toBeVisible();
  await saveLife(page);
  const before = await savedDeskEvidence(page);
  expect(before.seed).toBe(seed);
  expect(before.matters.map(m => m.family)).toEqual(expect.arrayContaining(["agenda", "budget"]));
  expect(before.matters.some(m => m.family === "agenda" && m.status === "decided")).toBe(true);
  console.log(JSON.stringify(before));
  await testInfo.attach("mayor-record-lines", {body: JSON.stringify(before, null, 2), contentType: "application/json"});
  await leaveGame(page);
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openElsewhere(page, "work");
  await expect(page.getByTestId("governing-briefing")).toContainText("Set the budget request");
  expect((await savedDeskEvidence(page)).matters).toEqual(before.matters);
});

/** Read the retained world through the canonical save reader; no world edits. */
async function savedDeskEvidence(page: Page) {
  return page.evaluate(async () => {
    const storePath = "/src/presentation/browser-world-repository.ts";
    const governingPath = "/src/simulation/governing/state-governing.ts";
    const {BrowserSaveStore}: typeof import("../../src/presentation/browser-world-repository") = await import(/* @vite-ignore */ storePath);
    const governing: typeof import("../../src/simulation/governing/state-governing") = await import(/* @vite-ignore */ governingPath);
    const store = new BrowserSaveStore();
    const recent = await store.mostRecent();
    if (!recent) throw new Error("The new life was not retained.");
    const world = await store.load(recent.saveId);
    if (!world || world.control.kind !== "person") throw new Error("No controlled world was saved.");
    const office = governing.governingOfficeForPerson(world, world.control.personId);
    if (!office) throw new Error("The saved life has no executive office.");
    return {
      seed: world.seed, worldId: world.id, date: world.currentDate,
      currentMoment: world.currentMoment, personId: world.control.personId,
      officeKey: office.officeKey, organizationId: office.organizationId,
      jurisdictionId: office.jurisdictionId, termId: office.termId,
      matters: governing.governingMatters(world, office.officeKey).map(m => ({id:m.id, family:m.family, status:m.status, openedEventId:m.openedEvent.id})),
      records: world.history.events.filter(event => event.tags.includes(`office:${office.officeKey}`)).map(event => ({id:event.id, date:event.occurredAt, type:event.type, summary:event.summary})),
    };
  });
}

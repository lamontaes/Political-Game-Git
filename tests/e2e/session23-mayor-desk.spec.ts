import { expect, test, type Page } from "./fixtures";
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
import type { TestInfo } from "@playwright/test";
import type * as MayorDeskFixture from "../fixtures/session23-mayor-desk";
import type * as SaveRepository from "../../src/presentation/browser-world-repository";
import type * as Governing from "../../src/simulation/governing/state-governing";

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

test.use({ actionTimeout: 30_000 });

test("a new life obeys the recorded mayor filing qualifications", async ({
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
  await expect(page.getByTestId("world-orientation")).toBeVisible({
    timeout: 30_000,
  });
  await enterLife(page);
  await openElsewhere(page, "campaign");
  const browser = page.getByTestId("campaign-office-browser");
  await expect(browser).toBeVisible();
  await expect(
    browser.locator(`input[value="${office.officeKey}"]`),
  ).toBeAttached();
  await browser.locator(`input[value="${office.officeKey}"]`).check();
  const filing = page.getByTestId("file-candidacy");
  if ((await filing.count()) === 0) {
    const status = page.getByTestId(
      `campaign-office-status-${office.officeKey}`,
    );
    await expect(status).toContainText("Read from RULES at filing time");
    await testInfo.attach("actual-filing-refusal", {
      body: await browser.innerText(),
      contentType: "text/plain",
    });
    console.log("NATURAL ROUTE UNAVAILABLE: " + (await status.innerText()));
    return;
  }
  await expect(filing).toBeEnabled();
  await fileCandidacy(page, office.officeKey);
  expect(
    await campaignUntilDecided(page, (target) => passShellTime(target), 45),
  ).toBe(true);
  await expect(page.getByTestId("campaign-result")).toContainText("won");
  // Entry and inbox work occur on the canonical date boundary, not menu open.
  await passShellTime(page);
  await openElsewhere(page, "work");
  await assertSavedMayorDesk(page, testInfo);
});

test("controlled downstream preview: the new life's recorded mayor gets the shared desk", async ({
  page,
}, testInfo) => {
  test.setTimeout(300_000);
  await page.goto(`/?seed=${seed}`);
  await startLife(page, {
    age: 40,
    state: place.withinName ?? undefined,
    place: place.formalName ?? undefined,
  });
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 180_000,
  });
  await enterLife(page);
  await saveLife(page);
  await page.reload();
  await expect(page.getByTestId("title-screen")).toBeVisible({
    timeout: 30_000,
  });
  await page.evaluate(async () => {
    const fixturePath = "/tests/fixtures/session23-mayor-desk.ts";
    const storePath = "/src/presentation/browser-world-repository.ts";
    const fixture: typeof MayorDeskFixture = await import(
      /* @vite-ignore */ fixturePath
    );
    const { BrowserSaveStore }: typeof SaveRepository = await import(
      /* @vite-ignore */ storePath
    );
    const store = new BrowserSaveStore();
    const recent = await store.mostRecent();
    if (!recent) throw new Error("The new game has no retained world.");
    const world = await store.load(recent.saveId);
    if (!world) throw new Error("The new game could not be read.");
    const preview = fixture.recordedMayorDeskPreview(world);
    const saved = await store.save(preview, recent.saveId);
    if (saved.status !== "saved")
      throw new Error(`The preview was refused: ${saved.status}`);
  });
  await page.reload();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 180_000,
  });
  await enterLife(page);
  await openElsewhere(page, "work");
  await assertSavedMayorDesk(page, testInfo);
});

async function assertSavedMayorDesk(page: Page, testInfo: TestInfo) {
  const briefing = page.getByTestId("governing-briefing");
  await expect(briefing).toBeVisible();
  await expect(briefing).toContainText("Set the budget request");
  await expect(briefing).toContainText("first priority");
  await briefing
    .getByRole("heading", { name: "Set the budget request", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("new-game-mayor-desk.png"),
    fullPage: true,
  });
  await testInfo.attach("new-game-mayor-desk", {
    path: testInfo.outputPath("new-game-mayor-desk.png"),
    contentType: "image/png",
  });
  await briefing
    .getByRole("heading", { name: "Set the first priority", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("new-game-mayor-agenda.png"),
    fullPage: true,
  });
  await testInfo.attach("new-game-mayor-agenda", {
    path: testInfo.outputPath("new-game-mayor-agenda.png"),
    contentType: "image/png",
  });
  await briefing
    .locator(
      '[data-testid="governing-option"][data-option^="priority:"]:not([data-option="priority:none"])',
    )
    .first()
    .click();
  await expect(briefing.getByTestId("governing-recent")).toBeVisible();
  await saveLife(page);
  const before = await savedDeskEvidence(page);
  // The canonical creator binds the caller's seed and setup into world.seed.
  expect(JSON.parse(before.seed.slice(before.seed.indexOf("{")))).toMatchObject(
    {
      seed,
      placeKey: place.key,
      startAge: 40,
      startingLife: "ordinary-life",
    },
  );
  expect(before.matters.map((m) => m.family)).toEqual(
    expect.arrayContaining(["agenda", "budget"]),
  );
  expect(
    before.matters.some((m) => m.family === "agenda" && m.status === "decided"),
  ).toBe(true);
  console.log(JSON.stringify(before));
  await testInfo.attach("mayor-record-lines", {
    body: JSON.stringify(before, null, 2),
    contentType: "application/json",
  });
  await page.reload();
  await expect(page.getByTestId("title-screen")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 180_000,
  });
  await enterLife(page);
  await openElsewhere(page, "work");
  await expect(page.getByTestId("governing-briefing")).toContainText(
    "Set the budget request",
  );
  expect((await savedDeskEvidence(page)).matters).toEqual(before.matters);
}

/** Read the retained world through the canonical save reader; no world edits. */
async function savedDeskEvidence(page: Page) {
  return page.evaluate(async () => {
    const storePath = "/src/presentation/browser-world-repository.ts";
    const governingPath = "/src/simulation/governing/state-governing.ts";
    const { BrowserSaveStore }: typeof SaveRepository = await import(
      /* @vite-ignore */ storePath
    );
    const governing: typeof Governing = await import(
      /* @vite-ignore */ governingPath
    );
    const store = new BrowserSaveStore();
    const recent = await store.mostRecent();
    if (!recent) throw new Error("The new life was not retained.");
    const world = await store.load(recent.saveId);
    if (!world || world.control.kind !== "person")
      throw new Error("No controlled world was saved.");
    const office = governing.governingOfficeForPerson(
      world,
      world.control.personId,
    );
    if (!office) throw new Error("The saved life has no executive office.");
    return {
      seed: world.seed,
      worldId: world.id,
      date: world.currentDate,
      currentMoment: world.currentMoment,
      personId: world.control.personId,
      officeKey: office.officeKey,
      organizationId: office.organizationId,
      jurisdictionId: office.jurisdictionId,
      termId: office.termId,
      matters: governing.governingMatters(world, office.officeKey).map((m) => ({
        id: m.id,
        family: m.family,
        status: m.status,
        openedEventId: m.openedEvent.id,
      })),
      records: world.history.events
        .filter((event) => event.tags.includes(`office:${office.officeKey}`))
        .map((event) => ({
          id: event.id,
          date: event.occurredAt,
          type: event.type,
          summary: event.summary,
        })),
    };
  });
}

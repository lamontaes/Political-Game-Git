import { expect, test } from "./fixtures";
import {
  enterLife,
  openElsewhere,
  saveLife,
  startLife,
} from "./support/creator";
import { drawRandomPlace } from "../support/random-place";
import type { Page } from "./fixtures";
import type { TestInfo } from "@playwright/test";
import type * as BillDeskFixture from "../fixtures/session23-executive-bill";
import type * as SaveRepository from "../../src/presentation/browser-world-repository";
import type * as Governing from "../../src/simulation/governing/state-governing";

const seed = "session23-part2-shared-bill-new-game-2026-10-06";
const place = drawRandomPlace(
  seed,
  (candidate) => candidate.scope === "locality",
);
test.use({ actionTimeout: 120_000 });

test("controlled downstream preview: a sourced council bill uses the shared executive desk", async ({
  page,
}, testInfo) => {
  test.setTimeout(600_000);
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
    const fixturePath = "/tests/fixtures/session23-executive-bill.ts";
    const storePath = "/src/presentation/browser-world-repository.ts";
    const fixture: typeof BillDeskFixture = await import(
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
    const preview = fixture.recordedCouncilBillPreview(
      world,
      "session23-part2-shared-bill-browser",
    ).world;
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
  await assertSavedBillDesk(page, testInfo);
});

async function assertSavedBillDesk(page: Page, testInfo: TestInfo) {
  const briefing = page.getByTestId("governing-briefing");
  await expect(briefing).toBeVisible();
  const sign = briefing.locator(
    '[data-testid="governing-option"][data-option="bill:sign"]',
  );
  const more = briefing.getByTestId("governing-more");
  if (await more.count())
    await more.evaluate(
      (details) => ((details as HTMLDetailsElement).open = true),
    );
  await expect(sign).toBeVisible();
  await sign.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("new-game-shared-bill-desk.png"),
    fullPage: true,
  });
  await testInfo.attach("new-game-shared-bill-desk", {
    path: testInfo.outputPath("new-game-shared-bill-desk.png"),
    contentType: "image/png",
  });
  await sign.click();
  await expect(briefing.getByTestId("governing-recent")).toBeVisible();
  await saveLife(page);
  const before = await savedDeskEvidence(page);
  expect(JSON.parse(before.seed.slice(before.seed.indexOf("{")))).toMatchObject(
    { seed, placeKey: place.key, startAge: 40, startingLife: "ordinary-life" },
  );
  expect(
    before.matters.some(
      (matter) => matter.family === "bill" && matter.status === "decided",
    ),
  ).toBe(true);
  console.log(
    JSON.stringify({
      randomPlace: place.displayName,
      randomPlaceKey: place.key,
      proofKind: "controlled actual incumbent and supplied council roll calls",
      ...before,
    }),
  );
  await testInfo.attach("bill-record-lines", {
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
      measures: world.history.legislativeMeasures
        ?.filter((measure) =>
          governing
            .governingMatters(world, office.officeKey)
            .some((matter) => matter.measureId === measure.id),
        )
        .map((measure) => ({
          id: measure.id,
          designation: measure.designation,
          rulePackId: measure.rulePackId,
          actions: world.history.legislativeActions
            ?.filter((action) => action.measureId === measure.id)
            .map((action) => ({
              id: action.id,
              kind: action.kind,
              eventId: action.eventId,
              date: action.occurredAt,
            })),
          enactment: world.history.legislativeEnactments?.find(
            (enactment) => enactment.measureId === measure.id,
          ),
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

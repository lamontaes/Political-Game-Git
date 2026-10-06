import { expect, test, type Page } from "./fixtures";
import {
  enterLife,
  openElsewhere,
  saveLife,
  startLife,
} from "./support/creator";
import { drawRandomPlace } from "../support/random-place";
import type * as Fixture from "../fixtures/session23-executive-budget";
import type * as Store from "../../src/presentation/browser-world-repository";
import type * as Budget from "../../src/simulation/governing/executive-budget-requests";
import type * as Governing from "../../src/simulation/governing/state-governing";
const seed = "session23-part4-dollar-budget-new-game-2026-10-06";
const place = drawRandomPlace(
  seed,
  (candidate) => candidate.scope === "locality",
);
test.use({ actionTimeout: 120_000 });

test("authored governor seat: a new life requests dollars and reloads a different enacted amount", async ({
  page,
}, info) => {
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
  await alterSave(page, "prepare");
  await resume(page);
  await openElsewhere(page, "work");
  const briefing = page.getByTestId("governing-briefing");
  await expect(briefing).toBeVisible();
  const editor = briefing.getByTestId("executive-budget-editor");
  await editor.locator("summary").first().click();
  await editor.getByLabel("Budget request begins").fill("2026-01-05");
  await editor.getByLabel("Budget request ends").fill("2027-01-05");
  await editor
    .getByLabel("Budget program family")
    .selectOption("transit-access");
  await editor.getByLabel("Requested dollars").fill("4000000.25");
  await editor
    .getByRole("button", { name: "Add or replace amount", exact: true })
    .click();
  await editor
    .getByRole("button", { name: "Send dollar request", exact: true })
    .click();
  await expect(
    briefing.getByTestId("executive-budget-comparison"),
  ).toContainText("$4,000,000.25");
  await saveLife(page);
  await page.reload();
  await expect(page.getByTestId("title-screen")).toBeVisible({
    timeout: 30_000,
  });
  await alterSave(page, "enact");
  await resume(page);
  await openElsewhere(page, "work");
  const comparison = page
    .getByTestId("governing-briefing")
    .getByTestId("executive-budget-comparison");
  await expect(comparison).toContainText("$4,000,000.25");
  await expect(comparison).toContainText("$3,000,000.00");
  await comparison.scrollIntoViewIfNeeded();
  const capture = info.outputPath("new-game-dollar-budget-desk.png");
  await page.screenshot({ path: capture, fullPage: true });
  await info.attach("new-game-dollar-budget-desk", {
    path: capture,
    contentType: "image/png",
  });
  await saveLife(page);
  // Read the saved records from the title screen, without keeping a second
  // deserialized whole World beside the actively played one in this renderer.
  await page.reload();
  await expect(page.getByTestId("title-screen")).toBeVisible({
    timeout: 30_000,
  });
  const before = await evidence(page);
  expect(JSON.parse(before.seed.slice(before.seed.indexOf("{")))).toMatchObject(
    { seed, placeKey: place.key, startAge: 40, startingLife: "ordinary-life" },
  );
  expect(before.requests[0]!.lines[0]!.amount.minorUnits).toBe(4_000_000_25);
  expect(before.appropriations[0]!.amount.minorUnits).toBe(3_000_000_00);
  console.log(
    JSON.stringify({
      randomPlace: place.displayName,
      randomPlaceKey: place.key,
      proofKind:
        "authored governor seat for the original new life and supplied legislative votes; no natural election or NPC bargaining proof",
      ...before,
    }),
  );
  await info.attach("budget-record-lines", {
    body: JSON.stringify(before, null, 2),
    contentType: "application/json",
  });
  await page.reload();
  await expect(page.getByTestId("title-screen")).toBeVisible({
    timeout: 30_000,
  });
  await resume(page);
  await openElsewhere(page, "work");
  await expect(
    page
      .getByTestId("governing-briefing")
      .getByTestId("executive-budget-comparison"),
  ).toContainText("$3,000,000.00");
  await page.reload();
  await expect(page.getByTestId("title-screen")).toBeVisible({
    timeout: 30_000,
  });
  expect(await evidence(page)).toEqual(before);
});

async function resume(page: Page) {
  await page.reload();
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 180_000,
  });
  await enterLife(page);
}
async function alterSave(page: Page, action: "prepare" | "enact") {
  await page.evaluate(
    async ({ action, seed }) => {
      const fixturePath = "/tests/fixtures/session23-executive-budget.ts";
      const storePath = "/src/presentation/browser-world-repository.ts";
      const fixture: typeof Fixture = await import(
        /* @vite-ignore */ fixturePath
      );
      const { BrowserSaveStore }: typeof Store = await import(
        /* @vite-ignore */ storePath
      );
      const store = new BrowserSaveStore();
      const recent = await store.mostRecent();
      if (!recent) throw new Error("No retained new game.");
      const world = await store.load(recent.saveId);
      if (!world) throw new Error("No retained world.");
      const next =
        action === "prepare"
          ? fixture.recordedGovernorBudgetPreview(world, seed)
          : fixture.enactedBudgetComparisonPreview(world, seed);
      const result = await store.save(next, recent.saveId);
      if (result.status !== "saved")
        throw new Error(`Preview refused: ${result.status}`);
    },
    { action, seed },
  );
}
async function evidence(page: Page) {
  return page.evaluate(async () => {
    const storePath = "/src/presentation/browser-world-repository.ts";
    const budgetPath = "/src/simulation/governing/executive-budget-requests.ts";
    const governingPath = "/src/simulation/governing/state-governing.ts";
    const { BrowserSaveStore }: typeof Store = await import(
      /* @vite-ignore */ storePath
    );
    const budget: typeof Budget = await import(/* @vite-ignore */ budgetPath);
    const governing: typeof Governing = await import(
      /* @vite-ignore */ governingPath
    );
    const store = new BrowserSaveStore();
    const recent = await store.mostRecent();
    if (!recent) throw new Error("No retained save.");
    const world = await store.load(recent.saveId);
    if (!world) throw new Error("No retained world.");
    const requests = budget.executiveBudgetRequests(world);
    const request = requests[0]!;
    const appropriations = budget.enactedFamilyAppropriations(
      world,
      request,
      "transit-access",
    );
    return {
      seed: world.seed,
      worldId: world.id,
      moment: world.currentMoment,
      controlledPersonId:
        world.control.kind === "person" ? world.control.personId : null,
      office: governing.governingOfficeForPerson(world, request.personId),
      requests,
      appropriations,
      matters: governing
        .governingMatters(world)
        .filter((matter) => matter.id === request.matterId)
        .map((matter) => ({
          id: matter.id,
          status: matter.status,
          decision: matter.decision,
        })),
      enactments: (world.history.legislativeEnactments ?? []).filter((row) =>
        appropriations.some(
          (record) => record.sourceMeasureId === row.measureId,
        ),
      ),
    };
  });
}

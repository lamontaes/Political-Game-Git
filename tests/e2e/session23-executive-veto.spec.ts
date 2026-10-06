import { expect, test, type Page } from "./fixtures";
import {
  enterLife,
  openElsewhere,
  saveLife,
  startLife,
} from "./support/creator";
import { drawRandomPlace } from "../support/random-place";
import type * as VetoFixture from "../fixtures/session23-executive-veto";
import type * as SaveRepository from "../../src/presentation/browser-world-repository";
import type * as Results from "../../src/presentation/executive-bill-results";
import type * as ItemVeto from "../../src/simulation/governing/item-veto";
import type * as Governing from "../../src/simulation/governing/state-governing";

test.use({ actionTimeout: 120_000 });
for (const jurisdiction of ["US-NE", "US-IN"]) {
  const seed = `session23-part5-veto-new-game-${jurisdiction}-2026-10-06`;
  const place = drawRandomPlace(
    seed,
    (candidate) =>
      candidate.scope === "locality" &&
      candidate.stateJurisdictionKey === jurisdiction,
  );
  test(`authored governor desk: actual override result in ${jurisdiction}`, async ({
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
    await savedTitle(page);
    await prepare(page, seed, "present");
    await resumeDesk(page);
    const briefing = page.getByTestId("governing-briefing");
    const more = briefing.getByTestId("governing-more");
    if (await more.count())
      await more.evaluate(
        (details) => ((details as HTMLDetailsElement).open = true),
      );
    const veto = briefing.locator(
      '[data-testid="governing-option"][data-option="bill:return"]',
    );
    await expect(veto).toBeVisible();
    await veto.click();
    await savedTitle(page);
    const evidence = await prepare(page, seed, "override");
    expect(evidence.itemPower !== null).toBe(jurisdiction === "US-NE");
    expect(evidence.results).toHaveLength(1);
    expect(evidence.results[0]!.overrideForecast).toBeNull();
    expect(
      evidence.results[0]!.overrideVotes.every(
        (vote) => vote.outcome === "passed",
      ),
    ).toBe(true);
    expect(evidence.results[0]!.overrideActions.at(-1)!.kind).toBe(
      "override-succeeded",
    );
    await resumeDesk(page);
    const desk = page.getByTestId("executive-bill-results");
    await expect(
      desk.getByTestId("executive-override-roll-calls"),
    ).toBeVisible();
    await expect(desk.getByTestId("executive-override-result")).toHaveText(
      "The legislature overrode the veto.",
    );
    await desk.scrollIntoViewIfNeeded();
    const screenshot = testInfo.outputPath("new-game-veto-override-desk.png");
    await page.screenshot({ path: screenshot, fullPage: true });
    await testInfo.attach("new-game-veto-override-desk", {
      path: screenshot,
      contentType: "image/png",
    });
    console.log(
      JSON.stringify({
        randomPlace: place.displayName,
        randomPlaceKey: place.key,
        proofKind:
          "ordinary new life, authored original-player governor seat, supplied actual roll calls",
        ...evidence,
      }),
    );
    await testInfo.attach("veto-record-lines", {
      body: JSON.stringify(evidence, null, 2),
      contentType: "application/json",
    });
    await savedTitle(page);
    expect(await prepare(page, seed, "read")).toEqual(evidence);
    await resumeDesk(page);
    await expect(page.getByTestId("executive-override-result")).toHaveText(
      "The legislature overrode the veto.",
    );
  });
}

async function savedTitle(page: Page) {
  await saveLife(page);
  await page.reload();
  await expect(page.getByTestId("title-screen")).toBeVisible({
    timeout: 30_000,
  });
}
async function resumeDesk(page: Page) {
  await page.getByTestId("continue").click();
  await expect(page.getByTestId("play-screen")).toBeVisible({
    timeout: 180_000,
  });
  await enterLife(page);
  await openElsewhere(page, "work");
}
async function prepare(
  page: Page,
  seed: string,
  action: "present" | "override" | "read",
) {
  return page.evaluate(
    async ({ seed, action }) => {
      const fixturePath = "/tests/fixtures/session23-executive-veto.ts";
      const storePath = "/src/presentation/browser-world-repository.ts";
      const resultsPath = "/src/presentation/executive-bill-results.ts";
      const itemPath = "/src/simulation/governing/item-veto.ts";
      const governingPath = "/src/simulation/governing/state-governing.ts";
      const fixture: typeof VetoFixture = await import(
        /* @vite-ignore */ fixturePath
      );
      const { BrowserSaveStore }: typeof SaveRepository = await import(
        /* @vite-ignore */ storePath
      );
      const { projectExecutiveBillResults }: typeof Results = await import(
        /* @vite-ignore */ resultsPath
      );
      const { itemVetoPower }: typeof ItemVeto = await import(
        /* @vite-ignore */ itemPath
      );
      const governing: typeof Governing = await import(
        /* @vite-ignore */ governingPath
      );
      const store = new BrowserSaveStore();
      const recent = await store.mostRecent();
      if (!recent) throw new Error("The ordinary new life was not retained.");
      const saved = await store.load(recent.saveId);
      if (!saved || saved.control.kind !== "person")
        throw new Error("The new life has no controlled save.");
      const world =
        action === "present"
          ? fixture.recordedGovernorVetoPreview(saved, seed)
          : action === "override"
            ? fixture.recordedOverridePreview(saved, seed)
            : saved;
      if (world.control.kind !== "person")
        throw new Error("The proof lost its original controlled person.");
      if (action !== "read") {
        const result = await store.save(world, recent.saveId);
        if (result.status !== "saved")
          throw new Error(`The save was refused: ${result.status}`);
      }
      const results = projectExecutiveBillResults(
        world,
        world.control.personId,
      );
      const measure = world.history.legislativeMeasures?.find(
        (entry) => entry.stableKey === `${seed}:veto-bill`,
      );
      if (!measure) throw new Error("The actual proof bill is absent.");
      const office = governing.governingOfficeForPerson(
        world,
        world.control.personId,
      );
      if (!office)
        throw new Error("The proof lacks its actual recorded office.");
      return {
        seed: world.seed,
        worldId: world.id,
        personId: world.control.personId,
        date: world.currentDate,
        moment: world.currentMoment,
        measureId: measure.id,
        rulePackId: measure.rulePackId,
        officeKey: office.officeKey,
        organizationId: office.organizationId,
        jurisdictionId: office.jurisdictionId,
        termId: office.termId,
        billMatters: governing
          .governingMatters(world, office.officeKey)
          .filter(
            (matter) =>
              matter.measureId === measure.id && matter.family === "bill",
          )
          .map((matter) => ({
            id: matter.id,
            openedEventId: matter.openedEvent.id,
            decisionEventId: matter.decision?.id ?? null,
            status: matter.status,
          })),
        itemPower: itemVetoPower(measure.rulePackId),
        results,
      };
    },
    { seed, action },
  );
}

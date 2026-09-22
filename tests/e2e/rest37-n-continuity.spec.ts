import type { WorkRelationship } from "../../src/simulation";
import { test, expect } from "./fixtures";
import { enterLife, openElsewhere, saveLife } from "./support/creator";

/** Supplied recorded-result save input. The campaign/result producer is tested separately. */
test("recorded result enters its supported term through ordinary Work and files/reopens through S", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await expect(page.getByTestId("new-game")).toBeVisible();
  const seed = await page.evaluate(async () => {
    const fixturePath = "/tests/fixtures/recorded-legislative-term.ts";
    const storePath = "/src/presentation/browser-world-repository.ts";
    const { recordedTermFixture, moveToTermDate } = await import(
      /* @vite-ignore */ fixturePath
    );
    const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
    const fixture = recordedTermFixture();
    const world = moveToTermDate(fixture.world, "2026-12-31");
    const store = new BrowserSaveStore();
    const saveId = store.newSaveId(world);
    const saved = await store.save(world, saveId);
    if (saved.status !== "saved")
      throw new Error(`Fixture save refused: ${saved.status}`);
    return {
      saveId,
      householdLocations: JSON.stringify(world.history.householdLocations),
      worldId: world.id,
      personId: fixture.personId,
      resultId: world.history.electionContestResults.at(-1).id,
      fixtureKind: "supplied-fictional-recorded-result",
    };
  });
  await test.info().attach("supplied-result-boundary", {
    body: JSON.stringify(seed),
    contentType: "application/json",
  });
  await page.reload();
  await page.getByTestId("continue").focus();
  await page.keyboard.press("Enter");
  await enterLife(page);
  await openElsewhere(page, "campaign");
  await expect(page.getByTestId("campaign-afterword")).toContainText(
    "2027-01-01",
  );
  await expect(page.getByTestId("open-legislation")).toHaveCount(0);
  // Time moves from the shell's own Day control: Work and Campaigns stopped
  // carrying a second pass-day button of their own with the client line.
  await page.getByTestId("shell-pass-day").focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("story-when")).toContainText("January 1, 2027");
  // The day was passed on Campaigns, and Campaigns is where the player stays.
  // The office opens the way a player opens it: the "Your office" tab.
  await page.getByTestId("politics-tab-office").click();
  await expect(page.getByTestId("office-section")).toContainText(
    "Kentucky legislature",
  );
  await page.getByTestId("open-drafting-table").click();
  const option = page.getByTestId(
    "drafting-option-education-facilities-school-repair-authorization",
  );
  await option.click();
  const file = page.getByTestId("file-the-draft");
  await expect(file).toBeEnabled();
  await file.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("docket-error")).toHaveCount(0);
  await expect(page.getByTestId("docket-role")).toContainText(
    "You are the sponsor of record.",
  );
  await saveLife(page);
  const filed = await page.evaluate(
    async ({ saveId, personId, householdLocations }) => {
      const storePath = "/src/presentation/browser-world-repository.ts";
      const simulationPath = "/src/simulation/index.ts";
      const { BrowserSaveStore } = await import(/* @vite-ignore */ storePath);
      const { activeLegislativeTermEvidence } = await import(
        /* @vite-ignore */ simulationPath
      );
      const world = await new BrowserSaveStore().load(saveId);
      if (!world) throw new Error("Missing filed office save.");
      const bill = world.history.legislativeMeasures.at(-1);
      const term = world.history.workRelationships
        .map((work: WorkRelationship) =>
          activeLegislativeTermEvidence(world, work.id),
        )
        .find(Boolean);
      if (
        !bill ||
        !term ||
        bill.sponsorPersonId !== personId ||
        term.result.winnerPersonId !== personId
      )
        throw new Error("Filed bill and entered winner do not reconcile.");
      if (
        JSON.stringify(world.history.householdLocations) !== householdLocations
      )
        throw new Error("Term entry unexpectedly changed residence.");
      if (
        world.control.kind !== "person" ||
        world.control.personId !== personId
      )
        throw new Error("Term entry changed the controlled character.");
      return {
        worldId: world.id,
        personId,
        resultId: term.result.id,
        workId: term.relationship.id,
        termEntry: term.startsAt,
        termExpiry: term.endsAt,
        moment: world.currentMoment,
        billId: bill.id,
        designation: bill.designation,
        docketKey: bill.stableKey.replace(/:measure$/, ""),
        sponsorPersonId: bill.sponsorPersonId,
        noResidenceChange: true,
      };
    },
    seed,
  );
  await test.info().attach("term-office-action-continuity", {
    body: JSON.stringify(filed),
    contentType: "application/json",
  });
  await openElsewhere(page, "work");
  await page.getByTestId("docket-bill").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("term-office-filed.png"),
  });
  await page.reload();
  await page.getByTestId("continue").click();
  await enterLife(page);
  await openElsewhere(page, "work");
  await expect(page.getByTestId("office-section")).toContainText(
    "Kentucky legislature",
  );
  await page.getByTestId(`docket-open-${filed.docketKey}`).click();
  await expect(page.getByTestId("docket-bill")).toContainText(
    filed.designation,
  );
  await expect(page.getByTestId("docket-role")).toContainText(
    "You are the sponsor of record.",
  );
  await expect(page.getByTestId("docket-filed-on")).toHaveText(filed.termEntry);
  await page.getByTestId("docket-bill").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("filed-bill-reopened.png"),
  });
  await page.getByTestId("open-legislation").click();
  await expect(page.getByTestId("legislation-workspace")).toBeVisible();
  await expect(page.getByTestId("legislation-error")).toHaveCount(0);
  await page.screenshot({
    path: test.info().outputPath("term-office-reopened.png"),
  });
});
